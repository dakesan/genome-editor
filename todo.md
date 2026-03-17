# Genome Editor: Implementation Tasks

凡例は以下のとおりです。

- Priority: P0（ブロッカー）、P1（必須）、P2（重要）、P3（あれば良い）
- Status: `[ ]` 未着手、`[x]` 完了、`[-]` スキップ

## Phase 0: SeqViz PoC（1〜2 週間）

### 環境構築

- [x] P0: Vite + React + TypeScript プロジェクトのスキャフォールド
- [x] P0: SeqViz パッケージのインストールと動作確認
- [x] P1: Biome 設定（ESLint/Prettier の代替として採用）

### ビューア PoC

- [x] P0: GenBank ファイル読み込み → SeqViz 表示（円形ビュー）
- [x] P0: GenBank ファイル読み込み → SeqViz 表示（線形ビュー）
- [x] P1: アノテーション表示の確認
- [x] P1: 制限酵素サイト表示の確認
- [x] P2: カスタムスタイリング（カラーテーマ）の適用

### パフォーマンス計測

- [x] P0: テスト用配列データの準備（pUC19: 2.7kb、Lambda: 48.5kb）
- [x] P0: 描画パフォーマンス計測（初回レンダリング、スクロール fps）
- [x] P1: メモリ使用量の計測

### Go/No-Go 判定

- [x] P0: Phase 0 評価レポート作成（`docs/phase0-evaluation.md`）
    - SeqViz はビューアとして十分 → Go 判定
    - Phase 1（Rust/WASM 計算エンジン）に進む

## Phase 1: Rust/WASM 計算エンジン（2〜3 人月）

依存関係: Phase 0 完了後に開始します。

### Rust ワークスペース構築

- [x] P0: Cargo workspace 設定（6 crates: core・parser・enzyme・orf・alignment・wasm）
- [x] P0: CI/CD パイプライン（GitHub Actions: test, lint, WASM build）
- [x] P1: criterion ベンチマークフレームワーク導入
- [x] P1: テストデータ収集（pUC19.gb, lambda.gb）

### crates/core（共通型定義）

- [x] P0: Sequence 型の定義
- [x] P0: Annotation 型の定義
- [x] P0: RestrictionEnzyme / CutSite 型の定義
- [x] P0: Orf 型の定義
- [x] P1: serde Serialize/Deserialize 実装
- [x] P1: wasm-bindgen 互換型（tsify-next 導出）

### crates/parser（GenBank/FASTA パーサー）

依存: crates/core です。

- [x] P0: gb-io による GenBank パース → Sequence + Vec<Annotation> 変換
- [x] P0: FASTA パース
- [x] P1: GenBank ライター（編集後の保存用）
- [x] P1: FASTA ライター
- [ ] P2: SnapGene (.dna) フォーマット対応
- [x] P1: パーサーユニットテスト（42 テストパス）
- [x] P2: パースベンチマーク（JS 版との比較）

### crates/enzyme（制限酵素エンジン）

依存: crates/core です。

- [x] P0: REBASE データのパース＆埋め込み（include_str + JSON）
- [x] P0: Aho-Corasick オートマトン構築（複数の酵素を同時検索）
- [x] P0: 回文配列・非回文配列の両方をサポート
- [x] P0: 環状配列での切断サイト検出（境界をまたぐケース）
- [x] P1: 選択酵素によるフィルタリング
- [x] P1: 単一切断サイト酵素の抽出（クローニング用）
- [x] P1: ユニットテスト（pUC19 EcoRI 検証、34 テストパス）
- [x] P2: ベンチマーク（全酵素 × Lambda phage 48.5kb）

### crates/orf（ORF 検出）

依存: crates/core です。

- [x] P0: 6 フレーム ORF 検出（3 forward + 3 reverse）
- [x] P0: 最小長フィルタリング
- [x] P1: 環状配列での ORF 検出（境界をまたぐ ORF）
- [x] P1: カスタム開始/終止コドンのサポート
- [x] P1: ユニットテスト（13 テストパス）
- [x] P2: ベンチマーク

### crates/alignment（配列アライメント）

依存: crates/core です。

- [x] P1: rust-bio による Pairwise アライメント（Smith-Waterman）
- [x] P1: 部分配列検索（ミスマッチ許容）
- [x] P2: CIGAR 文字列生成
- [x] P2: ユニットテスト（12 テストパス）

### crates/wasm（WASM エントリポイント）

依存: crates/parser, enzyme, orf, alignment です。

- [x] P0: wasm-pack ビルド設定
- [x] P0: parse_genbank_wasm 関数
- [x] P0: find_cut_sites_wasm 関数
- [x] P0: find_orfs_wasm 関数
- [x] P1: align_sequences_wasm 関数
- [x] P1: wasm-bindgen-test による自動テスト（10 テスト、CI 統合済み）
- [x] P1: WASM バンドルサイズ 404KB（< 2MB 基準達成）

### Frontend 統合

依存: crates/wasm ビルド完了が前提です。

- [x] P0: WASM モジュール初期化（`src/wasm/init.ts`）
- [x] P0: React hooks（useWasmParser, useEnzymes, useOrfs）の実装
- [x] P0: SeqViz コンポーネントとの結合（translations prop で ORF 表示）
- [x] P1: CutSiteList / LoadingOverlay コンポーネント
- [x] P1: WASM/JS フォールバック切り替え（useGenBankParser）
- [ ] P2: WASM vs JS のパフォーマンス比較ダッシュボード

## Phase 2: Tauri 化（1〜2 人月）

依存関係: Phase 1 完了後に開始します。

### Tauri プロジェクト構築（Wave 1）

- [x] P0: Tauri v2 プロジェクトスキャフォールド（src-tauri/）
- [x] P0: tauri.conf.json 設定（ウィンドウサイズ、権限、アイコン）
- [x] P0: Phase 1 の Rust crates を Tauri バックエンドに統合（path 依存）
- [x] P0: vite.config.ts Tauri 対応（clearScreen, host, envPrefix）
- [x] P1: Tauri プラグイン導入（dialog, fs, window-state）
- [x] P1: capabilities/default.json（dialog, fs 権限設定）

### Tauri コマンド実装（Wave 2）

- [x] P0: open_file コマンド（GenBank/FASTA パース）
- [x] P0: save_file コマンド（GenBank 形式で保存）
- [x] P0: compute_cut_sites コマンド（enzyme crate 直接呼び出し）
- [x] P0: get_enzyme_names コマンド
- [x] P0: detect_orfs コマンド（orf crate 直接呼び出し）
- [x] P1: align_sequences コマンド（alignment crate 直接呼び出し）
- [x] P1: AppState による EnzymeDatabase シングルトン管理
- [ ] P2: ファイル監視（watchdog）イベント

### Frontend Backend Abstraction（Wave 3）

- [x] P0: GenomeBackend インターフェース定義（src/backend/types.ts）
- [x] P0: 環境検出（isTauri）+ getBackend() シングルトン（src/backend/index.ts）
- [x] P0: WasmBackend 実装（既存 WASM ロジック抽出）
- [x] P0: TauriBackend 実装（invoke() ラッパー）
- [x] P0: hooks リファクタリング（useGenBankParser, useEnzymes, useOrfs）
- [x] P1: 既存テスト 23 件全パス維持（jsdom → WASM path → JS fallback）

### 統合 + ネイティブ体験（Wave 4）

- [x] P0: ネイティブメニューバー（File: Open/Save, Edit, View）
- [x] P1: キーボードショートカット（Cmd+O, Cmd+S）
- [x] P1: ドラッグ & ドロップによるファイル読み込み
- [x] P1: Window state プラグイン統合（位置・サイズ記憶）
- [x] P1: index.html タイトル "Genome Editor" に変更
- [ ] P2: 最近開いたファイル履歴

### ビルド・CI（Wave 5）

- [x] P0: GitHub Actions Tauri ビルド CI（macOS + Linux）
- [x] P0: rust.yml パス更新（src-tauri 追加）
- [ ] P1: macOS .app ビルド＋サイズ確認（< 15MB）
- [ ] P1: macOS コード署名（Apple Developer Program 必要）
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

- [x] P2: Zustand 導入（useState → 集中ストア移行、56 テストパス）
- [ ] P2: セレクター最適化（不要な再計算の排除）
- [-] P3: Immutable.js の除去（使用していないためスキップ）

### バンドル最適化

- [ ] P2: コード分割（lazy import）
- [ ] P2: Tree shaking の徹底
- [-] P3: BlueprintJS → 軽量 UI ライブラリへの移行（使用していないためスキップ）

## Phase 3+4: エディタ機能（進行中）

### W1: Zustand + サイドバーレイアウト

- [x] P1: Zustand ストア導入（全アプリ状態の集中管理）
- [x] P1: hooks リファクタリング（useGenBankParser, useEnzymes, useOrfs）
- [x] P1: サイドバーレイアウト（320px collapsible panel）
- [x] P1: ストアユニットテスト（8 テスト）

### W2: 配列選択 & 情報パネル

- [x] P1: SeqViz onSelection コールバック接続
- [x] P1: SelectionInfoPanel コンポーネント（位置/長さ/配列表示）
- [x] P1: Cmd+C コピーイベント対応
- [x] P1: SelectionInfoPanel テスト（7 テスト）

### W3: 配列検索

- [x] P1: SearchPanel コンポーネント（debounce 入力、ミスマッチ許容）
- [x] P1: SeqViz search + onSearch + highlights 接続
- [x] P1: 検索結果ナビゲーション（Prev/Next、循環）
- [x] P1: Cmd+F ショートカット（サイドバー自動オープン）
- [x] P1: SearchPanel テスト（7 テスト）

### W4: アノテーション管理パネル（未着手）

- [ ] P1: アノテーション一覧パネル
- [ ] P1: アノテーションフィルタ
- [ ] P2: アノテーション新規追加 UI

### W5: 配列編集（未着手）

- [ ] P1: 配列挿入・削除・置換
- [ ] P1: Undo/Redo
- [ ] P2: Rust 側 mutation 処理

### W6: ファイル保存（未着手）

- [ ] P1: GenBank/FASTA エクスポート
- [ ] P2: Save As ダイアログ統合
