# radio — Docker MPD stack + Workers test entrypoints
# Run `make` or `make help` for targets.

SHELL := /bin/bash
.DEFAULT_GOAL := help

DC      := docker compose
MPC     := $(DC) exec mpd mpc
SCRIPTS := scripts
E2E     := $(SCRIPTS)/e2e

.PHONY: help setup \
        up up-build up-tunnel down restart logs build clean \
        play stop pause next prev random sequential status reload ncmpcpp .check-mpd \
        lint test test-workers test-all test-e2e-workers test-e2e-prod

# ─── Help ────────────────────────────────────────────────────────────────────

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "Lifecycle:"
	@echo "  up            Start mpd + mpc-bridge (no tunnel)"
	@echo "  up-build      Build & start core services"
	@echo "  up-tunnel     Start core + Cloudflare tunnel (needs TUNNEL_TOKEN)"
	@echo "  down          Stop & remove containers"
	@echo "  restart       Restart all services"
	@echo "  logs          Tail logs (Ctrl-C to quit)"
	@echo "  build         Rebuild images (no cache)"
	@echo "  clean         Stop & remove containers + volumes"
	@echo ""
	@echo "Setup:"
	@echo "  setup         Create .env + music/"
	@echo ""
	@echo "Playback:  (requires: make up)"
	@echo "  play          Resume playback"
	@echo "  stop          Stop playback"
	@echo "  pause         Toggle pause"
	@echo "  next / prev   Skip track"
	@echo "  random        Enable shuffle"
	@echo "  sequential    Disable shuffle"
	@echo "  status        Show current track & state"
	@echo ""
	@echo "Library:"
	@echo "  reload        Re-scan music/ & rebuild queue"
	@echo ""
	@echo "Tools:"
	@echo "  ncmpcpp       Open TUI player"
	@echo ""
	@echo "Workers:"
	@echo "  lint          Workers lint (vp lint + anti-slop)"
	@echo ""
	@echo "Test:"
	@echo "  test          Docker integration tests"
	@echo "  test-workers  Workers unit tests (vitest)"
	@echo "  test-all      test-workers + test"
	@echo "  test-e2e-workers  Deployed smoke (HTTP + opencli when installed)"
	@echo "  test-e2e-prod     Prod HTTP smoke (RADIO_E2E_PROD_URL)"

# ─── Guards ──────────────────────────────────────────────────────────────────

.check-mpd:
	@$(DC) ps --status running --services mpd 2>/dev/null | grep -q mpd \
		|| { echo "Error: mpd not running — run: make up" >&2; exit 1; }

# ─── Lifecycle ───────────────────────────────────────────────────────────────

up:
	$(DC) up -d

up-build:
	$(DC) up -d --build

up-tunnel:
	$(DC) --profile tunnel up -d

down:
	$(DC) down

restart:
	$(DC) restart

logs:
	$(DC) logs -f

build:
	$(DC) build --no-cache

clean:
	$(DC) down -v

# ─── Setup ───────────────────────────────────────────────────────────────────

setup:
	@test -f .env || (cp .env.example .env && echo "Created .env — set TUNNEL_TOKEN.")
	@test -f workers/.env || (cp workers/.env.example workers/.env && echo "Created workers/.env — set MPD_HOST / MPC_HOST.")
	@mkdir -p music
	@echo "Drop files in ./music/ → make up"

# ─── Playback (needs running mpd) ────────────────────────────────────────────

play stop pause next prev random sequential status reload ncmpcpp: .check-mpd

play:
	$(MPC) play

stop:
	$(MPC) stop

pause:
	$(MPC) pause

next:
	$(MPC) next

prev:
	$(MPC) prev

random:
	$(MPC) random on

sequential:
	$(MPC) random off

status:
	$(MPC) status

reload:
	$(MPC) update --wait
	$(MPC) clear
	$(MPC) ls | $(DC) exec -T mpd mpc add
	$(MPC) play

ncmpcpp:
	$(DC) exec -it mpd ncmpcpp

# ─── Workers ─────────────────────────────────────────────────────────────────

lint:
	@cd workers && bun run lint

# ─── Test ────────────────────────────────────────────────────────────────────

test:
	@bash $(SCRIPTS)/test.sh

test-workers:
	@cd workers && bun run test

test-all: test-workers test


test-e2e-workers:
	@bash $(E2E)/smoke-deployed.sh workers

test-e2e-prod:
	@bash $(E2E)/smoke-deployed.sh prod
