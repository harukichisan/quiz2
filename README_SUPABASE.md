# Supabaseデータベース設定ガイド

## 🎯 セットアップ手順

### 1. データベースの初期化

Supabaseダッシュボードで以下の手順を実行してください：

1. **Supabaseプロジェクトにアクセス**
   - https://supabase.com/dashboard にアクセス
   - プロジェクト「gaghrdddgzbivjaywqiu」を開く

2. **SQL Editorを開く**
   - 左サイドバーから「SQL Editor」をクリック
   - 「New Query」をクリック

3. **初期化SQLを実行**
   - `supabase-init.sql` ファイルの内容をコピー
   - SQL Editorに貼り付け
   - 「Run」ボタンをクリックして実行

### 2. データの確認

1. 左サイドバーから「Table Editor」をクリック
2. `questions` テーブルを選択
3. 30件の問題データが登録されていることを確認

### 3. アプリの起動

```bash
npm run dev
```

アプリが起動したら、「ゲームを始める」ボタンをクリックしてデータベースから問題が読み込まれることを確認してください。

## 📝 データベース構造

### questionsテーブル

| カラム名 | 型 | 説明 |
|---------|-----|------|
| id | UUID | 主キー（自動生成） |
| question | TEXT | 問題文 |
| answer | TEXT | 正解（ひらがな） |
| category | TEXT | カテゴリ（地理、文学など） |
| created_at | TIMESTAMP | 作成日時 |

### インデックス
- `idx_questions_category`: カテゴリ別検索を高速化

### セキュリティ設定
- Row Level Security (RLS) 有効化
- 全ユーザーが問題を閲覧可能（SELECT権限）

## 🔧 環境変数

プロジェクトルートの `.env` ファイルに以下が設定されています：

```
VITE_SUPABASE_URL=https://gaghrdddgzbivjaywqiu.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 🔐 シークレット管理
- `.env` はリポジトリにコミットしないでください（`.gitignore` で除外済み）。必要に応じて `.env.example` をコピーして値を設定します。
- 本番環境では Vercel や Netlify などのデプロイ先ダッシュボードで `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` を環境変数として登録します。ファイルを直接アップロードしないでください。
- `VITE_` で始まる値はフロントエンドにバンドルされます。SupabaseのAnon Keyは公開前提ですが、それ以外の秘匿値はここに含めないでください。

## 📦 追加された依存関係

- `@supabase/supabase-js`: Supabaseクライアントライブラリ

## 📂 新規作成ファイル

```
src/
  ├─ lib/
  │   └─ supabase.ts         # Supabaseクライアント設定
  ├─ types/
  │   └─ database.types.ts   # データベース型定義
  └─ vite-env.d.ts           # Vite環境変数型定義
```

## 🎮 変更されたファイル

- `src/App.tsx`: Supabaseからデータを取得するように変更
- `package.json`: `@supabase/supabase-js` を追加

## 🚀 問題の追加・編集

Supabaseダッシュボードの「Table Editor」から直接問題を追加・編集できます：

1. `questions` テーブルを開く
2. 「Insert row」で新しい問題を追加
3. 既存の行をクリックして編集

## ⚠️ トラブルシューティング

### エラー: 「Supabase環境変数が設定されていません」
- `.env` ファイルが存在することを確認
- 開発サーバーを再起動（`npm run dev`）

### エラー: 「問題データが見つかりませんでした」
- Supabaseダッシュボードで `questions` テーブルにデータが存在するか確認
- SQL初期化スクリプトが正しく実行されたか確認

### 接続エラー
- SUPABASE_URLが正しいか確認
- SUPABASE_ANON_KEYが正しいか確認
- Supabaseプロジェクトが有効か確認
