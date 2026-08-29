package main

import (
	"net/http/httptest"
	"testing"
)

func TestMpdHandlerRejectsControlCharacters(t *testing.T) {
	for _, command := range []string{"status%00clear", "status%0Aclear", "status%0Dclear"} {
		req := httptest.NewRequest("GET", "/mpd.cgi?cmd="+command, nil)
		res := httptest.NewRecorder()

		mpdHandler(nil)(res, req)

		if res.Code != 200 || res.Body.String() != ackInvalid {
			t.Fatalf("command %q: got status %d body %q", command, res.Code, res.Body.String())
		}
	}
}
