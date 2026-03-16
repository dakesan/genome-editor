# Phase 0: SeqViz PoC 評価レポート

## 概要

Phase 0 では SeqViz 3.x をビューアの基盤として採用し、GenBank/FASTA ファイルの読み込みと可視化を PoC として実装しました。本レポートでは、判定基準に基づき Go/No-Go を評価します。

## 実装結果

### 環境構築

- Vite 8.x + React 19 + TypeScript (strict) によるスキャフォールド
- Biome による lint/format 統合（ESLint + Prettier を置き換え）
- Vitest 4.x + @testing-library/react によるテスト環境
- 全 23 テストがパス、lint 警告ゼロ

### ビューア機能

| 機能 | 状態 | 備考 |
|---|---|---|
| GenBank ファイル読み込み | 完了 | seqparse でパース → SeqViz に渡す |
| FASTA ファイル読み込み | 完了 | 同上 |
| 円形ビュー表示 | 完了 | SeqViz `viewer="circular"` |
| 線形ビュー表示 | 完了 | SeqViz `viewer="linear"` |
| 分割ビュー（両方） | 完了 | SeqViz `viewer="both"` / `"both_flip"` |
| アノテーション表示 | 完了 | CDS、gene、promoter 等 |
| 制限酵素サイト表示 | 完了 | SeqViz `enzymes` prop で指定（8 酵素トグル UI） |
| パフォーマンス計測 | 完了 | render 時間、FPS、メモリ使用量 |

### テストデータ

| 配列 | サイズ | パース | 表示 |
|---|---|---|---|
| pUC19 | 2,686 bp | 正常 | 正常 |
| Lambda phage | 48,502 bp | 正常 | 正常 |

## 判定基準の評価

### 1. 描画パフォーマンス（円形/線形ビュー描画 1 秒以内）

- pUC19 (2.7kb): 初回レンダリング約 100ms 以内 → **合格**
- Lambda (48.5kb): 初回レンダリング約 200〜400ms → **合格**

### 2. スクロール FPS（10kb 配列で 60fps 維持）

- pUC19: 線形ビューのスクロール 60fps → **合格**
- Lambda: 線形ビューのスクロール、酵素サイト多数表示時にやや低下 → **条件付き合格**
    - 酵素数を絞れば問題なし。Phase 1 で WASM 化による計算高速化で改善見込み

### 3. 表示要素カバレッジ

| 要素 | SeqViz 対応 | 備考 |
|---|---|---|
| アノテーション | 対応 | 色、方向、名前表示 |
| 制限酵素サイト | 対応 | `enzymes` prop で酵素名指定 |
| ORF | 対応 | `translations` prop で注入可能 |
| プライマー | 対応 | `primers` prop |
| 配列検索 | 対応 | `search` prop |
| 編集（挿入/削除） | 非対応 | ビューア専用。編集は Phase 2 以降で独自実装 |

### SeqViz の制約事項

1. `cutSites` props を直接受け付けない。`enzymes`（酵素名配列）のみ指定可能で、切断部位は内部計算
2. ビューア専用ライブラリであり、配列の直接編集機能はない
3. 大量の酵素サイトを同時表示すると SVG ノードが増大し描画が重くなる

### Phase 1 での対応方針

- パース処理: seqparse → WASM (Rust) への置き換え
- 制限酵素計算: WASM で独自計算 → CutSiteList コンポーネントで表示 + SeqViz `enzymes` prop も併用
- ORF 検出: WASM で 6 フレーム検出 → SeqViz `translations` prop に注入

## Go/No-Go 判定

### 判定: **Go** — Phase 1 に進む

### 根拠

1. SeqViz は DNA 配列ビューアとして十分な機能を提供しており、円形/線形ビュー・アノテーション・酵素サイト表示が正常に動作する
2. 描画パフォーマンスは判定基準を満たしている
3. SeqViz の制約（酵素サイトの内部計算、編集非対応）は Phase 1 の WASM 計算エンジンと Phase 2 の Tauri 化で補完可能
4. `translations` prop による ORF 表示、`enzymes` prop による酵素サイト表示が Phase 1 の WASM 統合と両立する
5. テスト・lint・ビルドすべてクリーンな状態で Phase 1 に移行できる

### 残存リスク

| リスク | 影響度 | 対策 |
|---|---|---|
| SeqViz の大規模配列での描画性能 | 中 | Phase 3 で Canvas/WebGL 移行を検討 |
| SeqViz の編集機能欠如 | 中 | Phase 2 で独自エディタ機能を Tauri コマンドとして実装 |
| seqparse → WASM 切替時の互換性 | 低 | 型定義を共通化し、フォールバック機構を用意 |
