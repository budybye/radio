package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strings"
	"time"
)

const (
	dialTimeout = 5 * time.Second
	readTimeout = 10 * time.Second
)

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mpdCommand(host, port, cmd string) (string, error) {
	conn, err := net.DialTimeout("tcp", net.JoinHostPort(host, port), dialTimeout)
	if err != nil {
		return "", err
	}
	defer conn.Close()

	if err := conn.SetDeadline(time.Now().Add(readTimeout)); err != nil {
		return "", err
	}

	reader := bufio.NewReader(conn)
	if _, err := reader.ReadString('\n'); err != nil {
		return "", fmt.Errorf("mpd greeting: %w", err)
	}
	if _, err := fmt.Fprintf(conn, "%s\n", cmd); err != nil {
		return "", err
	}

	var out strings.Builder
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			return "", err
		}
		out.WriteString(line)
		if line == "OK\n" || strings.HasPrefix(line, "ACK") {
			break
		}
	}
	return out.String(), nil
}

func mpdHandler(mpdHost, mpdPort string) http.HandlerFunc {
	const (
		invalid     = "ACK [4@0] invalid command\n"
		unreachable = "ACK [52@0] mpc-bridge: mpd unreachable\n"
	)

	return func(w http.ResponseWriter, r *http.Request) {
		cmd := r.URL.Query().Get("cmd")
		if cmd == "" || strings.ContainsAny(cmd, "\r\n") {
			w.Header().Set("Content-Type", "text/plain")
			_, _ = w.Write([]byte(invalid))
			return
		}

		if cmd == "ping" {
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
			return
		}

		raw, err := mpdCommand(mpdHost, mpdPort, cmd)
		w.Header().Set("Content-Type", "text/plain")
		if err != nil || raw == "" {
			_, _ = w.Write([]byte(unreachable))
			return
		}
		_, _ = w.Write([]byte(raw))
	}
}

func main() {
	mpdHost := getenv("MPD_HOST", "mpd")
	mpdPort := getenv("MPD_PORT", "6600")
	listen := ":" + getenv("PORT", "8080")

	log.Printf("mpc-bridge listening on %s (mpd=%s:%s)", listen, mpdHost, mpdPort)
	log.Fatal(http.ListenAndServe(listen, mpdHandler(mpdHost, mpdPort)))
}
