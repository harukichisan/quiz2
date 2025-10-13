# Quiz2 プロジェクト概要

## プロジェクト構成
- **技術スタック**: React + TypeScript + Vite
- **データベース**: Supabase (PostgreSQL)
- **スタイリング**: CSS (カスタムデザイン、モダンなグラデーション)
- **目的**: ひらがな4択クイズアプリ (20問/ゲーム)

## ファイル構造
```
/
├─ src/
│  ├─ App.tsx              # メインアプリロジック
│  ├─ main.tsx             # エントリポイント
│  ├─ styles.css           # スタイリング
│  ├─ lib/
│  │  └─ supabase.ts       # Supabase クライアント
│  └─ types/
│     └─ database.types.ts # DB型定義
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
├─ supabase-init.sql       # DB初期化スクリプト
└─ 仕様書.md               # 詳細仕様書
```

## 実装済み機能
- ✅ Supabaseからの問題データ取得
- ✅ ひらがな4択選択システム
- ✅ 10秒タイマー (文字ごとにリセット)
- ✅ スコア管理 (20問中の正解数)
- ✅ 結果画面 (円グラフ、評価メッセージ)
- ✅ レスポンシブデザイン

## 技術的特徴
- React Hooks (useState, useEffect, useCallback, useMemo)
- TypeScript strict mode有効
- Vite高速ビルド
- モダンCSS (カスタムプロパティ、グラデーション、アニメーション)
