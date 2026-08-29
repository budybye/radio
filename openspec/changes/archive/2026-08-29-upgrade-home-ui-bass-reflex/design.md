## Context

Home (`workers/app/pages/Home.tsx`) はブームボックス風シェル・VU メーター・簡易 `Speaker` コンポーネント（円形グリル）で構成されている。スタイルは `workers/app/style.css` のユーティリティ（`boombox-shell`, `speaker-grill`, `lcd-panel` 等）に集約。現在曲は MpdAgent DO の `setState` → `useMpdAgentWatch` → `use-radio-player` でライブ更新済み。

MPD `status` は DO の `pollTick` で既に取得しているが、`parseMpdStatus` は `songid` / `state` のみを型付けしており `listeners` は捨てている。要件ドキュメントではリスナー数モニタリングがバックログ。

動機は proposal.md の Why を参照。

## Goals / Non-Goals

**Goals:**

- モバイル・デスクトップ双方で視認性・タッチ操作性を改善した Home UI
- バスレフ型スピーカーのリアルな外観（CSS/SVG、画像アセット不要を優先）
- MPD `listeners` を Home に表示し、MpdAgent state push でライブ更新
- 既存の再生・曲メタデータ経路を維持（Agents SDK のみ、新 RPC 層なし）

**Non-Goals:**

- 管理 UI（`/posts`）への統計ダッシュボード
- 接続履歴・視聴時間ログの永続化
- WebSocket 以外のポーリング経路追加
- 画像ベースの 3D アセットや外部 UI ライブラリ導入

## Decisions

### 1. 接続数のデータソース: MPD `status.listeners`

**決定**: MpdAgent の既存 `pollTick` で取得する `status` レスポンスから `listeners` をパースし、`MpdAgentState.listenerCount: number` として保持・ブロードキャストする。

**理由**: 追加の HTTP エンドポイントや DO `@callable` を増やさず、既存ポーリングと state push を再利用できる。

**代替案**:

- `GET /status` をクライアントからポーリング → 公開診断 API は Basic 認証のため不適
- Cloudflare Analytics / Tunnel メトリクス → MPD ストリーム接続数と一致しない可能性

**変更点**:

- `mpdStatusSchema` に `listeners: optional(string())` を追加し、数値にパース（失敗時 `0`）
- `tick()` の `changed` 判定に `listenerCount` 変化を含める
- SSR: `fetchCurrentSong` と同様に stub から初期 state を読むか、専用 `fetchListenerCount` を `index.tsx` で並列取得

### 2. スピーカー UI: CSS コンポーネント + 既存テーマ

**決定**: `BassReflexSpeaker` を `Home.tsx` 内または `workers/app/components/` に分割。外観は `style.css` に `@utility bass-reflex-speaker` 等を追加し、ドライバー（同心円 + コーン影）、ポート（下部スロット + 内側グラデ）、筐体（ベベル + インセットシャドウ）をレイヤーで表現。

**理由**: 現行スタック（Tailwind 4 + daisyUI カスタムテーマ）と整合。ビルドパイプライン変更なし。

**代替案**:

- インライン SVG → メンテは容易だが CSS テーマ変数との連携が弱い
- `<img>` アセット → ダークテーマ・スケール対応が難しい

**モーション**: 再生中は `isPlaying` prop で `speaker-cone-pulse`（低振幅 scale）を適用。`prefers-reduced-motion` では無効化（既存 VU/LED パターンに合わせる）。

### 3. レイアウト: モバイルファーストのグリッド調整

**決定**:

- `<768px`: スピーカーは LCD 下に 2 列グリッド（現状維持しつつバスレフ化）、ヘッダーにリスナー数バッジ
- `≥768px`: 3 列（スピーカー | LCD | スピーカー）、フッター dock は safe-area + タッチターゲット 56px 維持

**理由**: 既存 `md:grid-cols-[...]` 構造を活かし差分を最小化。

### 4. クライアント state の配線

**決定**: `useMpdAgentWatch` の `onStateUpdate` で `listenerCount` をコールバックまたは返り値に含め、`useRadioPlayer` が `listenerCount` state を保持。Home は props 経由で表示。

**理由**: 曲メタデータと同じ単一 WS 接続・単一更新経路。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| MPD `listeners` が環境によって常に `0` | ドキュメントに MPD HTTP 出力設定依存を明記；UI は `0` を正常表示 |
| `listenerCount` 変化で `setState` 頻度増 | 値が変わったときのみ `changed: true`（既存 tick パターン） |
| 装飾 CSS が肥大化 | コンポーネント + utility に分割；Home.tsx は構造のみ |
| SSR とクライアント初期値のずれ | SSR で stub から取得；初回 `onStateUpdate` で収束 |

## Migration Plan

1. バックエンド型・パース・DO state 拡張を先にデプロイ（後方互換: 古いクライアントは未知フィールドを無視）
2. フロント UI 差し替えを同リリースまたは直後にデプロイ
3. ロールバック: UI のみ revert 可能；DO state 追加フィールドは無害

## Open Questions

（なし — 接続数は MPD `listeners`、表示場所は Home ヘッダーバッジ + デスクトップ LCD 付近の二重表示は実装時にデザイン調整で一本化可）
