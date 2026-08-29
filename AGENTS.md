# AGENTS.md

> Dockerized internet radio: MPD + Cloudflare Tunnel. Stream your music files publicly via HTTP MP3.

---

## New Here? Start Here (30 seconds)

```bash
make setup    # Creates .env + music/
make up-build # First time: build + start + auto-queue + random play
make up       # Next runs: start only (faster)
make test     # Health checks
```

Drop files in `music/` and run `make up` — you're live. Set `TUNNEL_TOKEN` in `.env` if you want public access.

**Prerequisites**: Docker Engine 24.0+, Docker Compose 2.20+

---

## Golden Rules (Read Before Any Change)

| #   | Rule                                                      | Why                                                                              |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | **Never commit `.env` or any secret file**                | `TUNNEL_TOKEN` must stay local-only                                              |
| 2   | **Never uncomment `ports:` without `127.0.0.1:` prefix**  | Never use `0.0.0.0` — security risk                                              |
| 3   | **Never bake music into the image**                       | Always use `./music:/music` volume mount                                         |
| 4   | **Never edit `/etc/mpd.conf` inside a running container** | Edit `config/mpd.conf` on host, then `make restart`                              |
| 5   | **Never set `mixer_type` to anything other than `none`**  | Container has no hardware audio device                                           |
| 6   | **Never expose `ports:` to host while queue is empty**    | HTTPD doesn't bind port 8000 until playback starts. Verify streaming works first |

---

## Documentation & OpenSpec

| What | Where |
|------|-------|
| Doc index | [`docs/README.md`](docs/README.md) |
| OpenSpec workflow | [`docs/openspec.md`](docs/openspec.md) |
| Code patterns | [`docs/patterns/README.md`](docs/patterns/README.md) |
| Active changes | `openspec list` → `openspec/changes/<name>/tasks.md` |
| Behavior specs | `openspec/specs/` (after archive) |

**Rule**: アクティブな実装タスクは `docs/tasks.md` に書かず、OpenSpec change の `tasks.md` を正本とする。恒久リファレンスのみ `docs/` を更新する。

---

## Quick Reference

| File                    | Role                                   | Change Frequency |
| ----------------------- | -------------------------------------- | ---------------- |
| `config/mpd.conf`       | MPD settings (ports, encoder, outputs) | Low              |
| `config/config`         | ncmpcpp UI settings                    | Low              |
| `compose.yaml`          | Service definitions, mounts, env vars  | Medium           |
| `Dockerfile`            | Alpine base image build                | Low              |
| `mpc-bridge/main.go`    | HTTP→MPD TCP pool (Workers/Tunnel)     | Medium           |
| `Makefile`              | Operational commands                   | Medium           |
| `scripts/entrypoint.sh` | Auto-queue + random play on startup    | Low              |
| `scripts/test.sh`       | Integration tests (7 checks)           | Medium           |
| `music/`                | Music files (bind mount, gitignored)   | High             |
| `.env`                  | Secret tokens (gitignored)             | First setup only |

Full directory layout → [`docs/directory.md`](docs/directory.md) · doc index → [`docs/README.md`](docs/README.md)

---
