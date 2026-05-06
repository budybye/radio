.PHONY: up down logs setup play stop pause random sequential next prev status volume ncmpcpp test build clean restart

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f

restart:
	docker compose restart

setup:
	@echo "=== Radio Setup ==="
	@test -f .env || (cp .env.example .env && echo "Created .env from template. Edit it to set TUNNEL_TOKEN.")
	@mkdir -p music
	@echo "Place your music files in ./music/"
	@echo "Run 'make up' to start. Music auto-queues and plays automatically."

play:
	docker compose exec mpd mpc update
	docker compose exec mpd mpc ls | docker compose exec -T mpd mpc add
	docker compose exec mpd mpc play

stop:
	docker compose exec mpd mpc stop

pause:
	docker compose exec mpd mpc pause

random:
	docker compose exec mpd mpc random on

sequential:
	docker compose exec mpd mpc random off

next:
	docker compose exec mpd mpc next

prev:
	docker compose exec mpd mpc prev

status:
	docker compose exec mpd mpc status

volume:
	@echo "Note: mixer_type is 'none' — adjust volume on the client side (VLC, browser, etc.)"
	@docker compose exec mpd mpc volume

ncmpcpp:
	docker compose exec -it mpd ncmpcpp

test:
	@bash scripts/test.sh

build:
	docker compose build --no-cache

clean:
	docker compose down -v
