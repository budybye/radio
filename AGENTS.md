# AGENTS.md

## Golden Rules (Read Before Any Change)

| #   | Rule                                                      | Why                                                                              |
| --- | --------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | **Never commit `.env` or any secret file**                | `TUNNEL_TOKEN` must stay local-only                                              |
| 2   | **Never uncomment `ports:` without `127.0.0.1:` prefix**  | Never use `0.0.0.0` — security risk                                              |
| 3   | **Never bake music into the image**                       | Always use `./music:/music` volume mount                                         |
| 4   | **Never edit `/etc/mpd.conf` inside a running container** | Edit `config/mpd.conf` on host, then `make restart`                              |
| 5   | **Never set `mixer_type` to anything other than `none`**  | Container has no hardware audio device                                           |
| 6   | **Keep `ports:` commented unless host-side access is required** | Default access is through the Tunnel or `docker compose exec`; if enabled, use the `127.0.0.1:` prefix |

## Reading order

Setup, commands and document ownership: [README.md](README.md#ドキュメント). Read only the document matching the task; file placement is owned by [docs/directory.md](docs/directory.md).

Intent belongs in the owning document; runtime facts come from code, CI and manifests.
OpenSpec is optional local planning only. If present, its `config.yaml` points to these docs; keep plans and archives out of Git. Public docs remain usable without OpenSpec.
