package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

const (
	defaultDialTimeout = 5 * time.Second
	defaultReadTimeout = 10 * time.Second
	defaultPoolSize    = 4

	ackInvalid     = "ACK [4@0] invalid command\n"
	ackUnreachable = "ACK [52@0] mpc-bridge: mpd unreachable\n"
)

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

type mpdConnection struct {
	conn   net.Conn
	reader *bufio.Reader
	mu     sync.Mutex
}

func dialMpd(host, port string) (*mpdConnection, error) {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), defaultDialTimeout)
	if err != nil {
		return nil, err
	}
	reader := bufio.NewReader(conn)
	if _, err := reader.ReadString('\n'); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("mpd greeting: %w", err)
	}
	return &mpdConnection{conn: conn, reader: reader}, nil
}

func (c *mpdConnection) close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		_ = c.conn.Close()
		c.conn = nil
	}
}

func (c *mpdConnection) exec(command string, readTimeout time.Duration) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return "", fmt.Errorf("connection closed")
	}
	if err := c.conn.SetDeadline(time.Now().Add(readTimeout)); err != nil {
		return "", err
	}
	if _, err := fmt.Fprintf(c.conn, "%s\n", command); err != nil {
		return "", err
	}

	var responseBuilder strings.Builder
	for {
		line, err := c.reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		responseBuilder.WriteString(line)
		if line == "OK\n" || strings.HasPrefix(line, "ACK") {
			break
		}
	}
	_ = c.conn.SetDeadline(time.Time{})
	return responseBuilder.String(), nil
}

type mpdConnectionPool struct {
	host        string
	port        string
	readTimeout time.Duration
	idle        chan *mpdConnection
}

func newMpdPool(host, port string, size int, readTimeout time.Duration) *mpdConnectionPool {
	p := &mpdConnectionPool{
		host:        host,
		port:        port,
		readTimeout: readTimeout,
		idle:        make(chan *mpdConnection, size),
	}
	for i := 0; i < size; i++ {
		c, err := dialMpd(host, port)
		if err != nil {
			log.Printf("mpd pool warm-up conn %d failed: %v", i, err)
			continue
		}
		p.idle <- c
	}
	return p
}

func (p *mpdConnectionPool) acquire() (*mpdConnection, error) {
	select {
	case c := <-p.idle:
		if c != nil && c.conn != nil {
			return c, nil
		}
	default:
	}
	return dialMpd(p.host, p.port)
}

func (p *mpdConnectionPool) release(c *mpdConnection, broken bool) {
	if c == nil {
		return
	}
	if broken {
		c.close()
		return
	}
	select {
	case p.idle <- c:
	default:
		c.close()
	}
}

func (p *mpdConnectionPool) command(command string) (string, error) {
	c, err := p.acquire()
	if err != nil {
		return "", err
	}
	rawResponse, err := c.exec(command, p.readTimeout)
	p.release(c, err != nil)
	return rawResponse, err
}

func withStreamListenerCount(rawResponse string, listenerCount int) string {
	if listenerCount < 0 {
		return rawResponse
	}

	responseLines := strings.Split(rawResponse, "\n")
	outputLines := make([]string, 0, len(responseLines)+1)
	hasListenerField := false
	hasOKTerminator := false
	for _, line := range responseLines {
		if line == "OK" {
			hasOKTerminator = true
			continue
		}
		if strings.HasPrefix(line, "listeners:") {
			hasListenerField = true
			outputLines = append(outputLines, fmt.Sprintf("listeners: %d", listenerCount))
			continue
		}
		if line != "" {
			outputLines = append(outputLines, line)
		}
	}
	if !hasListenerField {
		outputLines = append(outputLines, fmt.Sprintf("listeners: %d", listenerCount))
	}
	if hasOKTerminator {
		outputLines = append(outputLines, "OK")
	}
	return strings.Join(outputLines, "\n") + "\n"
}

func fetchStreamListenerCount(statsURL string, httpClient *http.Client) int {
	if statsURL == "" {
		return -1
	}
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 2 * time.Second}
	}
	response, err := httpClient.Get(statsURL)
	if err != nil {
		return -1
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return -1
	}
	responseBody, err := io.ReadAll(io.LimitReader(response.Body, 16))
	if err != nil {
		return -1
	}
	listenerCount, err := strconv.Atoi(strings.TrimSpace(string(responseBody)))
	if err != nil || listenerCount < 0 {
		return -1
	}
	return listenerCount
}

func mpdHandler(pool *mpdConnectionPool, streamStatsURL string, statsClient *http.Client) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		command := r.URL.Query().Get("cmd")
		if command == "" || strings.ContainsAny(command, "\r\n\x00") {
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write([]byte(ackInvalid))
			return
		}

		if command == "ping" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
			return
		}

		rawResponse, err := pool.command(command)
		w.Header().Set("Content-Type", "text/plain")
		if err != nil || rawResponse == "" {
			_, _ = w.Write([]byte(ackUnreachable))
			return
		}
		if command == "status" {
			if listeners := fetchStreamListenerCount(streamStatsURL, statsClient); listeners >= 0 {
				rawResponse = withStreamListenerCount(rawResponse, listeners)
			}
		}
		_, _ = w.Write([]byte(rawResponse))
	}
}

func main() {
	mpdHost := getEnv("MPD_HOST", "mpd")
	mpdPort := getEnv("MPD_PORT", "6600")
	poolSize := getEnvInt("POOL_SIZE", defaultPoolSize)
	readTimeout := time.Duration(getEnvInt("READ_TIMEOUT_SEC", int(defaultReadTimeout/time.Second))) * time.Second
	listen := ":" + getEnv("PORT", "8080")

	pool := newMpdPool(mpdHost, mpdPort, poolSize, readTimeout)
	streamStatsURL := getEnv("MPD_STREAM_STATS_URL", "")
	log.Printf(
		"mpc-bridge listening on %s (mpd=%s:%s pool=%d read_timeout=%s stream_stats=%s)",
		listen, mpdHost, mpdPort, poolSize, readTimeout, streamStatsURL,
	)
	log.Fatal(http.ListenAndServe(listen, mpdHandler(pool, streamStatsURL, nil)))
}
