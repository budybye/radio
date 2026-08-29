## Why

リスナー向け Home 画面（`GET /`）はブームボックス風の骨格はあるが、スピーカー表現がフラットで「ラジオ機器」らしさが弱い。モバイルとデスクトップでレイアウトの密度・視認性も揃っていない。加えて、要件上バックログにある「リスナー数モニタリング」をリスナー画面でも見せたいニーズがある。公開ラジオとしての没入感と、配信中の盛り上がり（接続数）を同時に満たす UI 刷新が必要。

## What Changes

- Home のビジュアルをモバイル・デスクトップ双方で洗練（タイポ、余白、階層、タッチターゲット、safe-area）
- 左右スピーカーを **バスレフ（ported）** 型のリアルな外観に差し替え（ドライバー、ポート、筐体の陰影・質感）
- 再生中はスピーカー／VU／ネオンリムのモーションを控えめに連動（`prefers-reduced-motion` 尊重）
- **ストリーム接続数**（MPD `status` の `listeners`）を Home に常時表示（SSR 初期値 + MpdAgent state push で更新）
- MpdAgent の公開 state に `listenerCount` を追加し、既存の曲メタデータ push と同じ経路で配信
- 管理画面専用の詳細統計は対象外（Home 向けの単一メトリクス表示に限定）

## Capabilities

### New Capabilities

- `listener-home-ui`: リスナー Home のレスポンシブ UI、バスレフスピーカー表現、接続数表示、および MpdAgent 経由のライブ更新

### Modified Capabilities

（既存 `openspec/specs/` なし — 新規 capability のみ）

## Impact

- **フロント**: `workers/app/pages/Home.tsx`（コンポーネント分割）、`workers/app/style.css`（スピーカー／シェル用ユーティリティ）
- **クライアント状態**: `workers/app/lib/radio/use-radio-player.ts`（接続数 state）、`use-mpd-agent.ts`（state から接続数を反映）
- **DO / 型**: `workers/worker/mpd-agent.ts`（`status` から `listeners` 取得、`MpdAgentState` 拡張）、`mpd-agent-types.ts`
- **パース**: `workers/app/server/mpd/parse.ts`（`mpdStatusSchema` に `listeners` 追加）
- **SSR**: `workers/app/server/index.tsx` / Inertia props（初期 `listenerCount`）
- **ドキュメント**: `docs/requirements.md` のリスナー数モニタリング項目を一部充足として追記可能
- **非目標**: 管理 UI の統計ダッシュボード、履歴ログ、Cap'n Web / 新 RPC 層の追加
