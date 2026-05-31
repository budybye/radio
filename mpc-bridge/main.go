package main

import (
	"bufio"
	"encoding/json"
	"fmt"
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

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
}

type mpdConn struct {
	conn   net.Conn
	reader *bufio.Reader
	mu     sync.Mutex
}

func dialMpd(host, port string) (*mpdConn, error) {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), defaultDialTimeout)
	if err != nil {
		return nil, err
	}
	reader := bufio.NewReader(conn)
	if _, err := reader.ReadString('\n'); err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("mpd greeting: %w", err)
	}
	return &mpdConn{conn: conn, reader: reader}, nil
}

func (c *mpdConn) close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn != nil {
		_ = c.conn.Close()
		c.conn = nil
	}
}

func (c *mpdConn) exec(cmd string, readTimeout time.Duration) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.conn == nil {
		return "", fmt.Errorf("connection closed")
	}
	if err := c.conn.SetDeadline(time.Now().Add(readTimeout)); err != nil {
		return "", err
	}
	if _, err := fmt.Fprintf(c.conn, "%s\n", cmd); err != nil {
		return "", err
	}

	var out strings.Builder
	for {
		line, err := c.reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		out.WriteString(line)
		if line == "OK\n" || strings.HasPrefix(line, "ACK") {
			break
		}
	}
	_ = c.conn.SetDeadline(time.Time{})
	return out.String(), nil
}

type mpdPool struct {
	host        string
	port        string
	readTimeout time.Duration
	idle        chan *mpdConn
}

func newMpdPool(host, port string, size int, readTimeout time.Duration) *mpdPool {
	p := &mpdPool{
		host:        host,
		port:        port,
		readTimeout: readTimeout,
		idle:        make(chan *mpdConn, size),
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

func (p *mpdPool) acquire() (*mpdConn, error) {
	select {
	case c := <-p.idle:
		if c != nil && c.conn != nil {
			return c, nil
		}
	default:
	}
	return dialMpd(p.host, p.port)
}

func (p *mpdPool) release(c *mpdConn, broken bool) {
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

func (p *mpdPool) command(cmd string) (string, error) {
	c, err := p.acquire()
	if err != nil {
		return "", err
	}
	raw, err := c.exec(cmd, p.readTimeout)
	p.release(c, err != nil)
	return raw, err
}

func mpdHandler(pool *mpdPool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cmd := r.URL.Query().Get("cmd")
		if cmd == "" || strings.ContainsAny(cmd, "\r\n") {
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write([]byte(ackInvalid))
			return
		}

		if cmd == "ping" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
			return
		}

		raw, err := pool.command(cmd)
		w.Header().Set("Content-Type", "text/plain")
		if err != nil || raw == "" {
			_, _ = w.Write([]byte(ackUnreachable))
			return
		}
		_, _ = w.Write([]byte(raw))
	}
}

func main() {
	mpdHost := getenv("MPD_HOST", "mpd")
	mpdPort := getenv("MPD_PORT", "6600")
	poolSize := getenvInt("POOL_SIZE", defaultPoolSize)
	readTimeout := time.Duration(getenvInt("READ_TIMEOUT_SEC", int(defaultReadTimeout/time.Second))) * time.Second
	listen := ":" + getenv("PORT", "8080")

	pool := newMpdPool(mpdHost, mpdPort, poolSize, readTimeout)
	log.Printf(
		"mpc-bridge listening on %s (mpd=%s:%s pool=%d read_timeout=%s)",
		listen, mpdHost, mpdPort, poolSize, readTimeout,
	)
	log.Fatal(http.ListenAndServe(listen, mpdHandler(pool)))
}
