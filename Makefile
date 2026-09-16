# radio — Docker MPD stack + Workers test entrypoints
# GNU Make 3.81+ (macOS Xcode Make / Linux). Recipe shell is POSIX sh.
# Run `make` or `make help` for targets.

SHELL := /bin/sh
.DEFAULT_GOAL := help

# Compose v2 plugin (`docker compose`) on Docker Desktop / current Engine;
# fall back to v1 (`docker-compose`) on older Linux installs.
DC ?= $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo docker-compose)
MPC     := $(DC) exec -T mpd mpc
SCRIPTS := scripts
E2E     := $(SCRIPTS)/e2e
WORKERS := workers

.PHONY: help setup \
	up up-build up-tunnel down restart logs build clean \
	play stop pause next prev random sequential status reload ncmpcpp \
	lint test test-workers test-all test-e2e-workers test-e2e-prod check-mpd

##@ Usage
help: ## List targets
	@awk 'BEGIN { print "Usage: make <target>" } \
	/^##@/ { sub(/^##@[ \t]*/, ""); printf "\n%s\n", $$0; next } \
	/^[a-zA-Z0-9_-][a-zA-Z0-9_-]*:.*##[ \t]/ { name=$$0; desc=$$0; sub(/:.*$$/, "", name); sub(/.*##[ \t]*/, "", desc); printf "  %-18s %s\n", name, desc }' $(MAKEFILE_LIST)

##@ Lifecycle
up: ## Start mpd + mpc-bridge (no tunnel)
	$(DC) up -d

up-build: ## Build and start core services
	$(DC) up -d --build

up-tunnel: ## Start core + Cloudflare tunnel (needs TUNNEL_TOKEN)
	$(DC) --profile tunnel up -d

down: ## Stop and remove containers
	$(DC) down

restart: ## Restart all services
	$(DC) restart

logs: ## Tail logs (Ctrl-C to quit)
	$(DC) logs -f

build: ## Rebuild images (no cache)
	$(DC) build --no-cache

clean: ## Stop and remove containers + volumes
	$(DC) down -v

##@ Setup
setup: ## Create .env, workers/.env, and music/
	@test -f .env || (cp .env.example .env && echo "Created .env -- set TUNNEL_TOKEN.")
	@test -f workers/.env || (cp workers/.env.example workers/.env && echo "Created workers/.env -- set MPD_HOST / MPC_HOST.")
	@mkdir -p music
	@echo "Drop files in ./music/ then run: make up"

##@ Playback (requires: make up)
play stop pause next prev random sequential status reload ncmpcpp: check-mpd

check-mpd:
	@$(DC) exec -T mpd mpc status >/dev/null 2>&1 || { \
		echo "Error: mpd is not running. Run: make up" >&2; \
		exit 1; \
	}

play: ## Resume playback
	$(MPC) play

stop: ## Stop playback
	$(MPC) stop

pause: ## Toggle pause
	$(MPC) pause

next: ## Skip to next track
	$(MPC) next

prev: ## Skip to previous track
	$(MPC) prev

random: ## Enable shuffle
	$(MPC) random on

sequential: ## Disable shuffle
	$(MPC) random off

status: ## Show current track and state
	$(MPC) status

##@ Library
reload: ## Re-scan music/ and rebuild the queue
	$(MPC) update --wait
	$(MPC) clear
	$(MPC) ls | $(MPC) add
	$(MPC) play

##@ Tools
ncmpcpp: ## Open TUI player
	$(DC) exec -it mpd ncmpcpp

##@ Workers
lint: ## Workers lint (vp lint + anti-slop)
	cd $(WORKERS) && bun run lint

##@ Test
test: ## Docker integration tests
	bash $(SCRIPTS)/test.sh

test-workers: ## Workers unit tests (Vite+ / Vitest 4.1.11)
	cd $(WORKERS) && bun run test

test-all: test-workers test ## test-workers then test

test-e2e-workers: ## Deployed smoke (HTTP + opencli when installed)
	bash $(E2E)/smoke-deployed.sh workers

test-e2e-prod: ## Prod HTTP smoke (RADIO_E2E_PROD_URL)
	bash $(E2E)/smoke-deployed.sh prod
