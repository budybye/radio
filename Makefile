DC := docker compose
MPC := $(DC) exec mpd mpc

.DEFAULT_GOAL := help

.PHONY: help up up-build down restart logs status setup build clean test \
        play stop pause next prev random sequential reload ncmpcpp

# === Help ===
help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Lifecycle:"
	@echo "  up          Start all services (no rebuild)"
	@echo "  up-build    Build & start all services"
	@echo "  down        Stop & remove containers"
	@echo "  restart     Restart all services"
	@echo "  logs        Tail logs (Ctrl-C to quit)"
	@echo "  build       Rebuild images (no cache)"
	@echo "  clean       Stop & remove containers + volumes"
	@echo ""
	@echo "Setup:"
	@echo "  setup       Create .env + music/"
	@echo ""
	@echo "Playback:"
	@echo "  play        Resume playback"
	@echo "  stop        Stop playback"
	@echo "  pause       Toggle pause"
	@echo "  next/prev   Skip track"
	@echo "  random      Enable shuffle"
	@echo "  sequential  Disable shuffle"
	@echo "  status      Show current track & state"
	@echo ""
	@echo "Library:"
	@echo "  reload      Re-scan music/ & rebuild queue"
	@echo ""
	@echo "Tools:"
	@echo "  ncmpcpp     Open TUI player"
	@echo "  test        Run integration tests"

# === Lifecycle ===
up:      ; $(DC) up -d
up-build:; $(DC) up -d --build
down:    ; $(DC) down
restart: ; $(DC) restart
logs:    ; $(DC) logs -f
build:   ; $(DC) build --no-cache
clean:   ; $(DC) down -v

# === Setup ===
setup:
	@test -f .env || (cp .env.example .env && echo "Created .env — set TUNNEL_TOKEN.")
	@mkdir -p music
	@echo "Drop files in ./music/ → make up"

# === Playback ===
play:    ; $(MPC) play
stop:    ; $(MPC) stop
pause:   ; $(MPC) pause
next:    ; $(MPC) next
prev:    ; $(MPC) prev
random:  ; $(MPC) random on
sequential: ; $(MPC) random off
status:  ; $(MPC) status

# === Library ===
reload:
	$(MPC) update --wait
	$(MPC) clear
	$(MPC) ls | $(DC) exec -T mpd mpc add
	$(MPC) play

# === Tools ===
ncmpcpp: ; $(DC) exec -it mpd ncmpcpp
test:    ; @bash scripts/test.sh
