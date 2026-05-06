# AGENTS.md

> Dockerized internet radio: MPD + Cloudflare Tunnel. Stream your music files publicly via HTTP MP3.

---

## New Here? Start Here (30 seconds)

```bash
make setup   # Creates .env + music/
make up      # Build, start, auto-queue, random play
make test    # Health checks
```

Drop files in `music/` and run `make up` — you're live. Set `TUNNEL_TOKEN` in `.env` if you want public access.

**Prerequisites**: Docker Engine 24.0+, Docker Compose 2.20+

---

## Golden Rules (Read Before Any Change)

| # | Rule | Why |
|---|------|-----|
| 1 | **Never commit `.env` or any secret file** | `TUNNEL_TOKEN` must stay local-only |
| 2 | **Never uncomment `ports:` without `127.0.0.1:` prefix** | Never use `0.0.0.0` — security risk |
| 3 | **Never bake music into the image** | Always use `./music:/music` volume mount |
| 4 | **Never edit `/etc/mpd.conf` inside a running container** | Edit `config/mpd.conf` on host, then `make restart` |
| 5 | **Never set `mixer_type` to anything other than `none`** | Container has no hardware audio device |
| 6 | **Never expose `ports:` to host while queue is empty** | HTTPD doesn't bind port 8000 until playback starts. Verify streaming works first |

---

## Quick Reference

| File | Role | Change Frequency |
|------|------|------------------|
| `config/mpd.conf` | MPD settings (ports, encoder, outputs) | Low |
| `config/config` | ncmpcpp UI settings | Low |
| `compose.yaml` | Service definitions, mounts, env vars | Medium |
| `Dockerfile` | Alpine base image build | Low |
| `Makefile` | Operational commands | Medium |
| `scripts/entrypoint.sh` | Auto-queue + random play on startup | Low |
| `scripts/test.sh` | Integration tests (7 checks) | Medium |
| `music/` | Music files (bind mount, gitignored) | High |
| `.env` | Secret tokens (gitignored) | First setup only |

Full directory layout → [`docs/directory.md`](docs/directory.md)

---

## Architecture

```
Listener (VLC/browser) ──► Cloudflare Tunnel ──► cloudflared
                                                        │
                                                  ┌─────┴─────┐
                                                  │ MPD:6600  │
                                                  │ HTTPD:8000│
                                                  └─────┬─────┘
                                                        │
                                                  ┌─────┴─────┐
                                                  │ ./music/  │
                                                  └───────────┘
```

**Control**: `mpc` / `ncmpcpp` → `mpd:6600`  
**Stream**: HTTP MP3 (320kbps) → `mpd:8000`  
**Public**: Cloudflare Tunnel → `http://mpd:8000`

Details → [`docs/design.md`](docs/design.md)  
Full config reference → [`docs/tech.md`](docs/tech.md)

---

## Development Policy

### Coding Style

- Infrastructure-as-Code: `compose.yaml` + `Dockerfile`
- Declarative config: `config/mpd.conf` is the SSOT for MPD behavior
- Prefer read-only mounts (`:ro`) for config files
- All commands in docs must be copy-paste ready

### Commit Convention

Conventional Commits: `type(scope): description`

- `feat(config): increase max_clients to 20`
- `fix(docker): correct mpd.conf mount path`
- `docs(readme): add client app recommendations`

### Branching

GitHub Flow — short-lived feature branches from `main`.

---

## Test-Driven Development

1. Add one validation to `scripts/test.sh`
2. Red → Green → Refactor
3. Full strategy → [`docs/test.md`](docs/test.md)

---

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Can't hear stream via Tunnel | MPD stopped / wrong Tunnel URL | `docker compose logs mpd tunnel` |
| Tunnel `ERR` | Missing/invalid `TUNNEL_TOKEN` | Check `.env` → `docker compose logs tunnel` |
| No music in library | `auto_update` not triggered | `make play` for manual refresh |
| `ncmpcpp` garbled | Missing TTY | Use `-it`: `docker compose exec -it mpd ncmpcpp` |
| `mpc volume` has no effect | `mixer_type none` | Adjust on client side (VLC, browser) |
| Stream disconnects on stop | `always_on "no"` | Set `"yes"` in `config/mpd.conf` |
| `max_clients` exceeded | 10 listener limit | [`docs/problems.md`](docs/problems.md) P-003 |

Full problem-solving guide → [`docs/problems.md`](docs/problems.md)  
Config change precautions → [`docs/tech.md`](docs/tech.md)
