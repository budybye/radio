# テスト方針

## テスト戦略

本プロジェクトはインフラ構成（Docker + MPD + Tunnel）が主体で、アプリケーションコードが存在しない。そのため、テストピラミッドは以下のように限定される：

```
        ┌─────────┐
        │   E2E   │  実際のクライアント接続テスト
        │ （手動+ │  （ブラウザ・音楽プレイヤーでストリーム再生）
        │  自動）  │
       ┌┴─────────┴┐
       │ Integration │  コンテナ間連携・エンドポイント到達性
       │   （自動）   │  （curl / nc での接続確認）
      ┌┴─────────────┴┐
      │    Unit/Static  │  設定ファイル構文検証・ビルドテスト
      │    （自動）      │  （Dockerfile lint、MPD --test）
      └─────────────────┘
```

## テスト環境

- **フレームワーク**: なし（シェルスクリプト + `docker compose` コマンドベース）
- **モック**: 不要（インフラ構成テストのため）
- **テスト対象データベース**: なし（MPD の SQLite DB は named volume 永続化）

## テストカテゴリ

### Unit / 静的テスト

| テスト項目 | 方法 | 期待結果 |
|-----------|------|----------|
| Dockerfile 構文検証 | `docker build --no-cache .` | エラーなくイメージがビルドされる |
| MPD デーモン応答 | `docker compose exec mpd mpc status` | ステータス情報が返る |
| compose.yaml 検証 | `docker compose config` | 構文エラーがなく、環境変数が正しく解決される |
| ボリュームマウント確認 | `docker compose exec mpd ls -la /music` | music/ 内のファイルが read-only で見える |

### 統合テスト

統合テストは `scripts/test.sh` に集約して実行する：

```bash
make test
```

詳細な検証内容は [テスト実行](#テスト実行) セクションを参照。

手動での追加確認（オプション）：

| テスト項目 | 方法 | 期待結果 |
|-----------|------|----------|
| 外部公開到達性 | `curl -s -o /dev/null -w "%{http_code}" https://<tunnel-domain>/` | HTTP 200 が返る（手動実行推奨） |

### E2E テスト

| テスト項目 | 方法 | 期待結果 |
|-----------|------|----------|
| 音楽再生フロー | `mpc add → mpc play → curl でストリーム取得` | ストリームバイトが継続的に返る |
| タグ情報伝送 | VLC / ブラウザでストリーム再生 | アーティスト名・曲名が表示される |
| 常時接続維持 | `mpc stop` 後も curl で接続 | 接続が維持され、HTTP 200 が返る（無音ストリーム） |
| ncmpcpp 操作 | `docker compose exec -it mpd ncmpcpp` | TUI が起動し、プレイリスト操作が可能 |

## カバレッジ目標

- **設定ファイル構文**: 100%（全設定変更時に `--test` を実行）
- **コンテナ起動フロー**: 100%（CI または手動で `docker compose up --build` を毎回検証）
- **ストリーミング品質**: 手動確認（主観的な音質チェック、メタデータ表示確認）

> 数値カバレッジ（行数等）は対象外 — 本プロジェクトにアプリケーションコードが存在しないため。

## テスト実行

### ローカル実行

```bash
make test
```

または直接：

```bash
bash scripts/test.sh
```

### テスト内容

`scripts/test.sh` は以下を検証する：

| # | 項目 | 判定 |
|---|------|------|
| 1 | MPD コンテナ起動 | PASS / FAIL |
| 2 | MPD デーモン応答 | PASS / FAIL |
| 3 | 制御ポート（6600）到達性 | PASS / FAIL |
| 4 | HTTPD 出力（Radio Stream）有効 | PASS / FAIL |
| 5 | 音楽ライブラリ存在 | PASS / WARN |
| 6 | Tunnel コンテナ起動 | PASS / WARN |
| 7 | ncmpcpp 設定ファイルマウント | PASS / FAIL |

## CI/CD でのテスト実行

現時点では CI/CD は未設定。推奨される GitHub Actions ワークフロー：

```yaml
# 概念的な CI パイプライン（将来導入時の参考）
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose config  # compose.yaml 構文検証
  build:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - run: docker compose up -d --build
      - run: sleep 5
      - run: docker compose exec mpd mpc status
      - run: docker compose exec mpd mpc outputs | grep -q "Radio Stream"
```
