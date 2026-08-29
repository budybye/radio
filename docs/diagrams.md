# 図解（Mermaid）

radio のアーキテクチャ・認証・デプロイ・テスト・ドキュメント階層を **1 ファイルに集約**。各 doc からはここへリンクする。

## システムトポロジ {#system-topology}

```mermaid
flowchart TB
  subgraph clients["クライアント"]
    Browser["ブラウザ / VLC / アプリ"]
    Admin["管理 UI 操作者"]
  end

  subgraph cf["Cloudflare"]
  Workers["Workers<br/>Hono + Inertia + MpdAgent DO<br/>044g.com"]
  Tunnel["Tunnel エッジ"]
  Access["Access<br/>mpc.* のみ"]
  end

  subgraph docker["Docker ホスト"]
    MPD["MPD :8000 HTTPD<br/>MP3 ストリーム"]
    Bridge["mpc-bridge :8080<br/>/mpd.cgi?cmd="]
    Cloudflared["cloudflared"]
    Music[("music/")]
  end

  Browser -->|HTTPS 聴取| Workers
  Browser -->|HTTPS ストリーム| Tunnel
  Admin -->|Basic / Bearer| Workers
  Workers -->|fetch + CF-Access-*| Access
  Access --> Tunnel
  Tunnel --> Cloudflared
  Cloudflared --> MPD
  Cloudflared --> Bridge
  Bridge -->|TCP 6600| MPD
  MPD --> Music
  Workers -->|DO RPC poll| Bridge
```

**制御の原則**: ブラウザは MPD TCP に直接触れない。ポーリングとライブ push は **MpdAgent DO 1 本**。キュー CRUD は Workers → mpc-bridge → MPD。

## 認証マトリクス {#auth-matrix}

```mermaid
flowchart LR
  subgraph public["公開（認証なし）"]
    Home["GET /"]
    Agents["/agents/*"]
    Stream["mpd.* ストリーム"]
  end

  subgraph basic["Basic Auth"]
    Diag["/status /currentsong /mpd/ping"]
    PostsRead["GET /posts*"]
  end

  subgraph write["Basic or Bearer"]
    PostsWrite["POST/PATCH/DELETE /posts*"]
  end

  subgraph access["Cloudflare Access"]
    Mpc["mpc.* → mpc-bridge"]
  end

  Listener["リスナー"] --> Home
  Listener --> Stream
  Ops["運用者"] --> Diag
  Admin["管理者"] --> PostsRead
  Admin --> PostsWrite
  Workers["Workers fetch"] -->|Service Token| Mpc
```

| 経路 | 認証 | 備考 |
|------|------|------|
| `GET /`, `/agents/*` | なし | 公開ラジオ前提 |
| `mpd.*` ストリーム | なし | 聴取のみ |
| `/status`, `/currentsong`, `/mpd/ping` | Basic | ops / curl |
| `GET /posts*` | Basic | 管理 UI 閲覧 |
| `POST/PATCH/DELETE /posts*` | Basic or Bearer | キュー CRUD |
| `mpc.*` → mpc-bridge | Access Service Token | Workers のみ Allow |

## デプロイフロー（フォーク vs メンテナ） {#deploy-flow}

```mermaid
flowchart TD
  Fork["フォーク利用者"]
  Maintainer["メンテナ（044g.com）"]
  Btn["Deploy to Cloudflare ボタン"]
  WranglerDefault["wrangler deploy<br/>（env なし）"]
  BunDeploy["bun run deploy<br/>--env production"]
  ForkVars["vars: mpd.example.com<br/>workers_dev: true"]
  ProdVars["vars: mpd.044g.com<br/>workers_dev: false"]
  ForkWorker["*.workers.dev"]
  ProdWorker["044g.com"]

  Fork --> Btn
  Btn --> WranglerDefault
  WranglerDefault --> ForkVars
  ForkVars --> ForkWorker

  Maintainer --> BunDeploy
  BunDeploy --> ProdVars
  ProdVars --> ProdWorker

  Fork -.->|⚠️ 避ける| BunDeploy
```

| コマンド | 向き先 | 利用者 |
|----------|--------|--------|
| Deploy ボタン → 既定 env | `mpd.example.com` プレースホルダ | フォーク |
| `wrangler deploy`（env なし） | 同上 | フォーク |
| `bun run deploy` | `--env production`（044g.com） | **メンテナのみ** |

詳細: [deploy-fork.md](deploy-fork.md)

## テストピラミッド {#test-pyramid}

```mermaid
flowchart TB
  subgraph e2e["E2E（opencli + HTTP smoke）"]
    Local["local: 127.0.0.1:5173 + mpd-stub"]
    Preview["preview: workers.dev"]
    Prod["prod: 044g.com（読み取り専用）"]
  end

  subgraph integration["Integration"]
    MakeTest["make test（Docker MPD）"]
    MpdStub["mpd-stub contract（CI）"]
  end

  subgraph unit["Unit / Static"]
    Vitest["vitest（workers/）"]
    Lint["vp lint + tsc"]
    Build["vpr build"]
  end

  e2e --> integration
  integration --> unit
```

| 層 | コマンド | 備考 |
|----|----------|------|
| Unit | `cd workers && bun run test` | serialize, parse, bridge 等 |
| Integration | `make test` | Docker MPD ヘルスチェック |
| CI | `.github/workflows/workers-ci.yaml` | unit → lint → build → mpd-stub |
| E2E local | `make test-e2e-local` | ダミー mpc-bridge 推奨 |
| E2E preview | `make test-e2e-preview` | `radio.*` または `radio-preview.*.workers.dev` |

詳細: [test.md](test.md) · preview フロー: [e2e-preview-flow](#e2e-preview-flow)

## ドキュメント三層モデル {#docs-layers}

```mermaid
flowchart TB
  subgraph specs["openspec/specs/"]
    Spec["振る舞い要件の正本<br/>SHALL / MUST"]
  end

  subgraph changes["openspec/changes/"]
    Change["進行中 change<br/>proposal / design / tasks"]
    Archive["archive/ 完了 change"]
  end

  subgraph docs["docs/"]
    Ref["恒久リファレンス<br/>tech / design / deploy-fork"]
    Patterns["patterns/ コードテンプレート"]
  end

  Change -->|archive| Spec
  Change -->|archive| Archive
  Spec -.->|リンク| Ref
  Change -.->|作業中| Ref
```

| 層 | 正本 | 例 |
|----|------|-----|
| 振る舞い仕様 | `openspec/specs/` | `listener-home-ui/spec.md` |
| 変更計画 | `openspec/changes/<name>/` | `consolidate-docs/tasks.md` |
| 恒久ドキュメント | `docs/` | 本ファイル、`tech.md` |

詳細: [openspec.md](openspec.md)

## Home UI レイアウト {#home-ui-layout}

```mermaid
flowchart TB
  subgraph header["ヘッダー（sticky）"]
    Title["mpd radio"]
    Badge["LISTENERS バッジ"]
    Status["ON AIR / STANDBY"]
  end

  subgraph main["メイン（中央カラム）"]
    Globe["GlobeSpeaker<br/>.globe-speaker canvas"]
    LCD["Now playing LCD<br/>title / artist / album"]
  end

  subgraph dock["フッター dock"]
    Meta["曲名 + サブステータス"]
    Mute["Mute"]
    Play["Play / Stop"]
    DockStatus["接続ステータス"]
  end

  header --> main --> dock
```

- スピーカー: 中央 **GlobeSpeaker**（cobe 3D 地球儀）
- 再生制御: 下部 dock（`size-12` / `size-14` = 44px+ タッチターゲット）
- 仕様: `openspec/specs/listener-home-ui/spec.md`

## MPD Home データフロー {#mpd-home-data-flow}

```mermaid
sequenceDiagram
  participant Browser
  participant Worker as Workers SSR
  participant DO as MpdAgent DO
  participant Bridge as mpc-bridge
  participant MPD

  Note over Browser,MPD: SSR（初回ページロード）
  Browser->>Worker: GET /
  par 並列
    Worker->>DO: getCurrentSongView()
    DO->>Bridge: status + currentsong（冷起動時 1 tick）
    Bridge->>MPD: TCP 6600
  and
    Worker->>Bridge: status（fetchListenerCount）
    Bridge->>MPD: TCP 6600
  end
  Worker-->>Browser: Inertia shell（song, listenerCount）

  Note over Browser,MPD: CSR（Play ホバー後 lazy connect）
  Browser->>DO: WebSocket /agents/mpd-agent/radio
  Browser->>DO: setWatchActive(true)
  loop pollTick（接続中のみ）
    DO->>Bridge: status + currentsong
    Bridge->>MPD: TCP 6600
    DO-->>Browser: onStateUpdate（変化時のみ）
  end
```

| 経路 | 曲メタ | リスナー数 | 備考 |
|------|--------|-----------|------|
| SSR | DO RPC（冷起動 1 tick） | bridge 直叩き | preview HTTP smoke はここ |
| CSR | DO state push | DO state push | opencli E2E はハイドレーション後 |

## E2E preview フロー {#e2e-preview-flow}

```mermaid
flowchart LR
  Deploy["bun run deploy<br/>*.workers.dev"]
  Http["http-smoke.sh"]
  Opencli["opencli-home.sh"]

  subgraph http_checks["HTTP 200 + Inertia shell"]
    H1['"component":"Home"']
    H2['"listenerCount" prop']
    H3["titleFallback"]
  end

  subgraph browser_checks["ハイドレーション後"]
    B1["LISTENERS テキスト"]
    B2[".globe-speaker"]
  end

  Deploy --> Http --> http_checks
  Http --> Opencli --> browser_checks
```

```bash
export RADIO_E2E_PREVIEW_URL=https://radio.<account>.workers.dev
make test-e2e-preview
```

詳細: [test.md](test.md)
