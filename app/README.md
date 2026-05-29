# template

新規 Worker 作成用の最小テンプレート。Vite + Hono + capnweb RPC による SPA 構成。

## クイックスタート

```txt
bun install
bun run dev
```

```txt
bun run deploy
```

## テスト

Vitest（Workers プール）と capnweb / `SELF` の使い分けは [tests/README.md](tests/README.md) を参照。

## 構成

| 技術                | 用途                                          |
| ------------------- | --------------------------------------------- |
| Vite                | ビルド・開発サーバ                            |
| Hono                | Web フレームワーク、ルーティング              |
| capnweb             | WebSocket / HTTP RPC（Worker ↔ クライアント） |
| vite-ssr-components | Hono JSX SSR                                  |
| DaisyUI             | UI コンポーネント                             |

---

## Hono JSX の独自性

このテンプレートは **React をインストールせず**、Hono 内蔵の JSX で UI を構築する。

### React 非依存

`vite.config.ts` で `react` / `react-dom` を `hono/jsx/dom` に alias している。`package.json` に react がなくても、JSX と hooks 風 API（`useState`, `useEffect` 等）が使える。

```ts
// vite.config.ts
resolve: {
  alias: {
    react: "hono/jsx/dom",
    "react-dom": "hono/jsx/dom",
    "use-sync-external-store/shim/index.js": "hono/jsx/dom",
  },
}
```

### 役割の分離

| 用途         | インポート元        | 備考                                                      |
| ------------ | ------------------- | --------------------------------------------------------- |
| サーバー SSR | `hono/jsx`          | `FC`、`Fragment`、`memo`、`PropsWithChildren`             |
| クライアント | `hono/jsx/dom`      | `render`、`useState`、`useEffect`（React 互換 API）       |
| レンダラー   | `hono/jsx-renderer` | `jsxRenderer` でレイアウトと `c.setRenderer` を組み合わせ |

### 利点

- **軽量**: React をバンドルしないため、エッジ向けに最適
- **エッジ最適**: Workers 上で SSR とクライアント hydration が同一ランタイムで動作
- **React 知識の流用**: `useState`、`useEffect` 等の API が React と似ている
- **メタデータホイスティング**: `<title>`、`<meta>`、`<link>` は `<head>` 外に書いても自動で head に移動

### 注意点

- **完全互換ではない**: Suspense、一部 Context 等は React と挙動が異なる場合がある
- **React エコシステム**: サードパーティの React hooks を導入する際は、hono/jsx との互換性を確認すること

参照: [tech.md](../docs/tech.md) §6、[Hono - JSX](https://hono.dev/docs/guides/jsx)

---

## wrangler.jsonc

Cloudflare Workers の設定ファイル。主要フィールドは以下。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "worker", // Worker 名（デプロイ時の識別子）
  "workers_dev": false, // workers.dev サブドメインを無効化
  "compatibility_date": "2026-01-20", // ランタイム互換日
  "main": "./src/index.tsx", // エントリポイント
  "observability": { "enabled": true },
  "vars": {
    // 環境変数（プレーンテキスト）
    "API_URL": "https://worker.589.workers.dev",
  },
}
```

### 主要フィールド

| フィールド            | 説明                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `name`                | Worker の識別名。デプロイ先のサブドメインや `wrangler deploy` のターゲットに使われる                   |
| `workers_dev`         | `workers.dev` サブドメイン（`<name>.workers.dev`）へのデプロイを有効にするか。`false` で無効化         |
| `main`                | ビルド後のエントリポイント。Vite の場合は `vite.config.ts` の `build.rollupOptions.input` と整合させる |
| `compatibility_date`  | Workers ランタイムの互換日。新機能利用時は更新する                                                     |
| `compatibility_flags` | `nodejs_compat` 等。Node.js API が必要な場合に有効化                                                   |
| `vars`                | リクエストごとに渡される環境変数。シークレットは `wrangler secret` で設定                              |
| `observability`       | トレース・メトリクス。本番では `enabled: true` を推奨                                                  |

### workers_dev について

- **`true`（デフォルト）**: デプロイ時に `<name>.workers.dev` に自動公開される。カスタムドメイン不要で手軽に試せる
- **`false`**: `workers.dev` への公開を無効化。カスタムドメインや `routes` のみで公開する場合に指定
- 本番ではカスタムドメインや Workers ルートを推奨。`workers.dev` は個人・検証用途向け
- `routes` を設定すると、未指定時は `workers_dev` が `false` と解釈される
- 無効化しても Preview URL（`wrangler dev` 等）には影響しない

### placement（実行場所）

`locations` は wrangler スキーマから削除済み。**`placement`** のみ使用する。

| オプション          | 用途                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `mode: "smart"`     | トラフィックを分析し自動で最適配置                                                                                  |
| `region`            | クラウドリージョンを明示。形式は `{provider}:{region}`（例: `gcp:asia-northeast1` 東京、`aws:ap-northeast-1` 東京） |
| `host` / `hostname` | 外部ホストを probe して近くに配置（実験的）                                                                         |

`region` に `jp-nrt` 等の Cloudflare データセンターコードは使えない。GCP/AWS/Azure のリージョン識別子を使う。

### 型生成

`CloudflareEnv` は `wrangler types` で自動生成される。`package.json` の `cf:typegen` を実行すると `worker-configuration.d.ts` が更新される。

```txt
bun run cf:typegen
```

Hono の型には `env.d.ts` で定義した `Env` を渡す。

```ts
const app = new Hono<Env>();
```

---

## Service Binding

Service Binding は Worker 間を in-process で通信する仕組み。REST 経由よりレイテンシが小さい。

### BFF パターン

```text
Client (BFF)  ──Service Binding──►  Server (内部 API)
     │                                    │
     └── 公開 URL のみ                    └── 直接参照されない
```

- **Client**: エントリポイント。外部からのリクエストを受け、Server に転送または集約
- **Server**: ビジネスロジック。Client 経由でのみ呼ばれる

### wrangler.jsonc への追加

呼び出し側（BFF）の `wrangler.jsonc` に `services` を追加する。

```jsonc
{
  "name": "client",
  "main": "./src/index.ts",
  "services": [
    {
      "binding": "SERVER_SERVICE",
      "service": "server",
    },
  ],
}
```

| フィールド | 説明                                                            |
| ---------- | --------------------------------------------------------------- |
| `binding`  | コード内で参照する名前。`c.env.SERVER_SERVICE` でアクセス       |
| `service`  | バインド先 Worker の `name`。同一アカウント内の Worker 名を指定 |

### コードでの利用

```ts
// HTTP 転送
const res = await c.env.SERVER_SERVICE.fetch(c.req.raw);

// RPC（WorkerEntrypoint の場合）
const result = await c.env.SERVER_SERVICE.add(a, b);
```

### デプロイ順序

**バインド先（Server）を先にデプロイする。**

1. `server` をデプロイ
2. `client` をデプロイ

参照: [design.md](../docs/design.md) §6、[example/client](../example/client)

---

## 拡張のヒント

| 機能                              | 参照                                |
| --------------------------------- | ----------------------------------- |
| RivetKit（AI エージェント）       | `service/rivet`、`service/app`      |
| Cloudflare Actors（ステートフル） | `service/actors`、`service/pizza`   |
| BFF + Service Binding             | `example/client`、`example/server`  |
| 設計書                            | [docs/README.md](../docs/README.md) |

---

## 参考

- [Cloudflare Workers - Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Service Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/service-bindings/)
- [Hono - RPC](https://hono.dev/docs/guides/rpc)
