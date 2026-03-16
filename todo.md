# Genome Editor: Implementation Tasks

凡例は以下のとおりです。

- Priority: P0（ブロッカー）、P1（必須）、P2（重要）、P3（あれば良い）
- Status: `[ ]` 未着手、`[x]` 完了、`[-]` スキップ

## Phase 0: SeqViz PoC（1〜2 週間）

### 環境構築

- [ ] P0: Vite + React + TypeScript プロジェクトのスキャフォールド
- [ ] P0: SeqViz パッケージのインストールと動作確認
- [ ] P1: ESLint / Prettier 設定

### ビューア PoC

- [ ] P0: GenBank ファイル読み込み → SeqViz 表示（円形ビュー）
- [ ] P0: GenBank ファイル読み込み → SeqViz 表示（線形ビュー）
- [ ] P1: アノテーション表示の確認
- [ ] P1: 制限酵素サイト表示の確認
- [ ] P2: カスタムスタイリング（カラーテーマ）の適用

### パフォーマンス計測

- [ ] P0: テスト用配列データの準備（pUC19: 2.7kb、Lambda: 48.5kb）
- [ ] P0: 描画パフォーマンス計測（初回レンダリング、スクロール fps）
- [ ] P1: メモリ使用量の計測

### Go/No-Go 判定

- [ ] P0: Phase 0 評価レポート作成
    - SeqViz で十分か、カスタマイズが必要か
    - Phase 1 に進むべきか、代替アプローチが必要か

## Phase 1: Rust/WASM 計算エンジン（2〜3 人月）

依存関係: Phase 0 完了後に開始します。

### Rust ワークスペース構築

- [ ] P0: Cargo workspace 設定（6 crates: core・parser・enzyme・orf・alignment・wasm）
- [ ] P0: CI/CD パイプライン（GitHub Actions: test, lint, WASM build）
- [ ] P1: criterion ベンチマークフレームワーク導入
- [ ] P1: テストデータ収集（pUC19.gb, lambda.gb, 大規模プラスミド）

### crates/core（共通型定義）

- [ ] P0: Sequence 型の定義
- [ ] P0: Annotation 型の定義
- [ ] P0: RestrictionEnzyme / CutSite 型の定義
- [ ] P0: Orf 型の定義
- [ ] P1: serde Serialize/Deserialize 実装
- [ ] P1: wasm-bindgen 互換型（JsValue 変換）

### crates/parser（GenBank/FASTA パーサー）

依存: crates/core です。

- [ ] P0: gb-io による GenBank パース → Sequence + Vec<Annotation> 変換
- [ ] P0: FASTA パース
- [ ] P1: GenBank ライター（編集後の保存用）
- [ ] P1: FASTA ライター
- [ ] P2: SnapGene (.dna) フォーマット対応
- [ ] P1: パーサーユニットテスト（既知配列で検証）
- [ ] P2: パースベンチマーク（JS 版との比較）

### crates/enzyme（制限酵素エンジン）

依存: crates/core です。

- [ ] P0: REBASE データのパース＆埋め込み（build.rs or include_str）
- [ ] P0: Aho-Corasick オートマトン構築（複数の酵素を同時検索）
- [ ] P0: 回文配列・非回文配列の両方をサポート
- [ ] P0: 環状配列での切断サイト検出（境界をまたぐケース）
- [ ] P1: 選択酵素によるフィルタリング
- [ ] P1: 単一切断サイト酵素の抽出（クローニング用）
- [ ] P1: ユニットテスト（pUC19 の既知切断サイトで検証）
- [ ] P2: ベンチマーク（全酵素 × Lambda phage 48.5kb）

### crates/orf（ORF 検出）

依存: crates/core です。

- [ ] P0: 6 フレーム ORF 検出（3 forward + 3 reverse）
- [ ] P0: 最小長フィルタリング
- [ ] P1: 環状配列での ORF 検出（境界をまたぐ ORF）
- [ ] P1: カスタム開始/終止コドンのサポート
- [ ] P1: ユニットテスト
- [ ] P2: ベンチマーク

### crates/alignment（配列アライメント）

依存: crates/core です。

- [ ] P1: rust-bio による Pairwise アライメント（Smith-Waterman）
- [ ] P1: 部分配列検索（ミスマッチ許容）
- [ ] P2: CIGAR 文字列生成
- [ ] P2: ユニットテスト

### crates/wasm（WASM エントリポイント）

依存: crates/parser, enzyme, orf, alignment です。

- [ ] P0: wasm-pack ビルド設定
- [ ] P0: parse_genbank_wasm 関数
- [ ] P0: find_cut_sites_wasm 関数
- [ ] P0: find_orfs_wasm 関数
- [ ] P1: align_sequences_wasm 関数
- [ ] P1: wasm-bindgen-test による自動テスト
- [ ] P1: WASM バンドルサイズ最適化（wasm-opt）

### Frontend 統合

依存: crates/wasm ビルド完了が前提です。

- [ ] P0: Web Worker での WASM モジュールロード
- [ ] P0: React hooks（useEnzymes, useOrfs 等）の実装
- [ ] P0: SeqViz コンポーネントとの結合
- [ ] P1: ローディング状態・エラーハンドリング UI
- [ ] P1: 既存 JS ロジックとのフォールバック切り替え
- [ ] P2: WASM vs JS のパフォーマンス比較ダッシュボード

## Phase 2: Tauri 化（1〜2 人月）

依存関係: Phase 1 完了後に開始します。

### Tauri プロジェクト構築

- [ ] P0: `tauri init` によるプロジェクトスキャフォールド
- [ ] P0: tauri.conf.json 設定（ウィンドウサイズ、権限、アイコン）
- [ ] P0: Phase 1 の Rust crates を Tauri バックエンドに統合
- [ ] P1: 開発用ホットリロード設定

### Tauri コマンド実装

- [ ] P0: open_file コマンド（ネイティブファイルダイアログ）
- [ ] P0: save_file コマンド
- [ ] P0: compute_cut_sites コマンド
- [ ] P0: detect_orfs コマンド
- [ ] P1: export_file コマンド（複数フォーマット対応）
- [ ] P1: align_sequences コマンド
- [ ] P2: ファイル監視（watchdog）イベント

### Frontend 適応

- [ ] P0: WASM 呼び出しから Tauri invoke への切り替えレイヤー
- [ ] P0: ネイティブメニューバーの実装
- [ ] P1: キーボードショートカット（Cmd+O, Cmd+S 等）
- [ ] P1: ドラッグ & ドロップによるファイル読み込み
- [ ] P2: 最近開いたファイル履歴

### ビルド・配布

- [ ] P0: macOS ビルド＋コード署名
- [ ] P1: Windows ビルド（NSIS インストーラー）
- [ ] P1: Linux ビルド（AppImage / deb）
- [ ] P2: 自動アップデート機能（tauri-plugin-updater）
- [ ] P2: GitHub Releases への自動デプロイ（CI/CD）

## Phase 3: フロントエンド最適化（必要に応じて）

依存関係: Phase 2 完了後、ベンチマーク結果に基づいて判断します。

### 描画最適化

- [ ] P2: SVG → Canvas 移行の PoC
- [ ] P2: 仮想スクロール導入
- [ ] P3: WebGL による大規模配列レンダリング
- [ ] P3: OffscreenCanvas による Web Worker レンダリング

### 状態管理の最適化

- [ ] P2: Redux → Zustand/Jotai 移行
- [ ] P2: セレクター最適化（不要な再計算の排除）
- [ ] P3: Immutable.js の除去（構造的共有を自前実装）

### バンドル最適化

- [ ] P2: コード分割（lazy import）
- [ ] P2: Tree shaking の徹底
- [ ] P3: BlueprintJS → 軽量 UI ライブラリへの移行
