package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMpdHandlerRejectsControlCharacters(t *testing.T) {
	for _, command := range []string{"status%00clear", "status%0Aclear", "status%0Dclear"} {
		req := httptest.NewRequest("GET", "/mpd.cgi?cmd="+command, nil)
		res := httptest.NewRecorder()

		mpdHandler(nil, "", nil)(res, req)

		if res.Code != 200 || res.Body.String() != ackInvalid {
			t.Fatalf("command %q: got status %d body %q", command, res.Code, res.Body.String())
		}
	}
}

func TestInjectStreamListenersAppendsWhenMissing(t *testing.T) {
	raw := "state: play\nsongid: 1\nOK\n"
	got := injectStreamListeners(raw, 3)
	want := "state: play\nsongid: 1\nlisteners: 3\nOK\n"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestInjectStreamListenersReplacesExisting(t *testing.T) {
	raw := "state: play\nlisteners: 0\nOK\n"
	got := injectStreamListeners(raw, 5)
	want := "state: play\nlisteners: 5\nOK\n"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestFetchStreamListenerCount(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = w.Write([]byte("4"))
	}))
	defer server.Close()

	if got := fetchStreamListenerCount(server.URL, server.Client()); got != 4 {
		t.Fatalf("got %d want 4", got)
	}
	if got := fetchStreamListenerCount("", nil); got != -1 {
		t.Fatalf("empty url should skip, got %d", got)
	}
}
