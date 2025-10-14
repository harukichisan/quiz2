# 早押し2人対戦クイズ - 実装概要

このドキュメントは、早押し2人対戦クイズ機能の実装概要を説明します。

## 📁 実装ファイル一覧

### データベース層
- `supabase/migrations/001_battle_mode.sql` - テーブル定義、RPC、RLS

### 型定義
- `src/types/database.types.ts` - Supabase型定義（battle_rooms, battle_answers追加）
- `src/types/battle.types.ts` - 対戦モード専用型定義

### サービス層
- `src/services/battle-room.service.ts` - ルーム作成・参加・管理
- `src/services/battle-answer.service.ts` - 回答記録・統計取得
- `src/services/battle-realtime.service.ts` - Realtime同期

### カスタムフック
- `src/hooks/useSessionId.ts` - セッションID管理（デバイス識別）
- `src/hooks/useBattleRoom.ts` - ルーム状態管理
- `src/hooks/useRealtimeSync.ts` - リアルタイム同期
- `src/hooks/useBattleGame.ts` - ゲームロジック・タイマー

### ユーティリティ
- `src/lib/battleUtils.ts` - 選択肢生成、スコア計算など

### UIコンポーネント
- `src/components/BattleMode/ModeSelectScreen.tsx` - モード選択画面
- `src/components/BattleMode/BattleLobby.tsx` - ルーム作成・参加画面
- `src/components/BattleMode/BattleWaitingRoom.tsx` - 待機室
- `src/components/BattleMode/BattleGameScreen.tsx` - 対戦画面
- `src/components/BattleMode/BattleResultScreen.tsx` - 結果表示画面
- `src/components/BattleMode/BattleModeController.tsx` - 統合コントローラ

## 🗄️ データベース設計

### battle_rooms テーブル
対戦ルームの情報を管理するテーブル。

主要フィールド:
- `room_code` (TEXT): 6桁のルームコード（ユニーク）
- `difficulty` (TEXT): 難易度 (C/B/A/S)
- `host_user_id` / `guest_user_id` (UUID): プレイヤーID
- `host_session_id` / `guest_session_id` (TEXT): セッションID
- `status` (TEXT): ルーム状態 (waiting/ready/playing/finished/abandoned)
- `question_ids` (UUID[]): 出題される問題IDの配列
- `host_score` / `guest_score` (INT): スコア
- `expires_at` (TIMESTAMPTZ): ルーム有効期限（30分）

### battle_answers テーブル
対戦中の回答を記録するテーブル。

主要フィールド:
- `room_id` (UUID): 対戦ルームID
- `player_user_id` (UUID): 回答者ID
- `question_index` (INT): 問題番号
- `is_correct` (BOOLEAN): 正解かどうか
- `answer_time_ms` (INT): 回答時間（ミリ秒）

### RPC関数

#### advance_battle_room(p_room_id UUID)
両者の回答が揃ったときにスコアを計算し、次の問題へ進む。
- 両方正解の場合は早い方にポイント
- 片方正解の場合はその人にポイント
- 全問題終了でステータスを'finished'に変更

#### delete_expired_battle_rooms()
期限切れまたは放棄されたルームを自動削除。
Supabase Schedulerで1分ごとに実行することを推奨。

## 🔐 セキュリティ設計

### Row Level Security (RLS)
- **battle_rooms**: ホストまたはゲストとして参加しているルームのみ閲覧・更新可能
- **battle_answers**: 参加しているルームの回答のみ閲覧・記録可能

### 認証
- Supabase Auth を使用してユーザーを識別
- 非ログインユーザーはセッションIDのみで動作可能（ゲストモード）

## 🎮 ゲームフロー

```
1. モード選択
   ↓
2. ルーム作成 or ルーム参加
   ↓
3. 待機室（ホストがゲストを待つ）
   ↓
4. ゲーム開始（ホストがトリガー）
   ↓
5. 問題表示 → 回答 → 判定（10問繰り返し）
   ↓
6. 結果表示
   ↓
7. 再戦 or ロビーに戻る
```

## 🔄 リアルタイム同期

Supabase Realtimeを使用して以下を監視:
- **battle_rooms** の更新（ステータス変更、スコア更新）
- **battle_answers** の挿入（相手の回答）
- **Presence API** による接続状態の監視

## 🎯 主要機能

### 1. ルーム管理
- ランダムな6桁ルームコード生成
- ルームの有効期限管理（30分）
- ホスト退出時のルーム放棄処理

### 2. 問題管理
- 難易度ごとにランダムに10問を選出
- 問題IDを配列で保持し、順番に出題

### 3. 回答処理
- requestAnimationFrameベースの高精度タイマー
- 両者回答後に自動的に次の問題へ進行
- タイムアウト時は自動的に不正解として記録

### 4. スコア計算
- 両方正解: 早い方にポイント（同タイムの場合は両方）
- 片方正解: その人にポイント
- 両方不正解: 加点なし

### 5. 統計表示
- 正解数
- 平均回答時間
- 最速回答時間

## 🚀 セットアップ手順

### クイックスタート（推奨）

詳細な手順は **[SUPABASE_DASHBOARD_SETUP.md](./SUPABASE_DASHBOARD_SETUP.md)** を参照してください。

#### 1. データベースセットアップ

Supabase Dashboardの SQL Editor で以下のファイルを実行:
- **`supabase-battle-mode-setup.sql`** - 全ての設定を含む完全なセットアップSQL

#### 2. 認証設定

Supabase Dashboard → Authentication → Providers:
- **Anonymous sign-ins** を有効化

#### 3. アプリケーション起動

```bash
npm run dev
```

#### 4. 動作確認

2つのブラウザで対戦テストを実施

---

### 代替方法: Supabase CLI

Supabase CLIを使用する場合:

```bash
# プロジェクトにリンク（初回のみ）
npx supabase link --project-ref gaghrdddgzbivjaywqiu

# マイグレーション実行
npx supabase db push
```

**注意**: CLI使用にはSupabaseへのログインが必要です。

---

## ✅ 実装完了項目

以下の項目は既に実装済みです:

- ✅ データベース設計（テーブル、RPC、RLS）
- ✅ 型定義（TypeScript）
- ✅ サービス層（ルーム管理、回答記録、Realtime）
- ✅ カスタムフック（状態管理、リアルタイム同期、ゲームロジック）
- ✅ UIコンポーネント（全画面実装済み）
- ✅ スタイリング（CSS完全実装）
- ✅ 問題取得ロジック
- ✅ メインAppへの統合
- ✅ Anonymous認証の自動初期化
- ✅ モード選択画面

---

## 📋 残りのステップ（ユーザー側で実施）

1. **データベースマイグレーション実行** ← [SUPABASE_DASHBOARD_SETUP.md](./SUPABASE_DASHBOARD_SETUP.md) を参照
2. **Anonymous認証の有効化** ← 上記ドキュメントに手順あり
3. **Realtime設定の確認** ← 上記ドキュメントに手順あり
4. **動作テスト** ← 2つのブラウザで対戦テスト

## 📝 注意事項

1. **エラーハンドリング**
   ネットワークエラーや切断時の再接続処理は今後の改善項目です。

2. **パフォーマンス**
   大量の同時接続を想定する場合は、Supabaseのリソースプランを確認してください。

3. **セキュリティ**
   本番環境では、RLSポリシーとサービスロールキーの管理に注意してください。

4. **ブラウザ互換性**
   - `crypto.randomUUID()` が利用できない環境では自動的にポリフィルを使用します
   - `navigator.clipboard.writeText()` が利用できない環境ではコピー機能が制限されます

## 🐛 トラブルシューティング

### Realtimeが動作しない
- Supabase DashboardでRealtimeが有効化されているか確認
- ブラウザのコンソールでWebSocket接続エラーを確認

### ルームが見つからない
- ルームコードの大文字小文字を確認
- ルームの有効期限（30分）が切れていないか確認

### スコアが正しく計算されない
- RPC関数 `advance_battle_room` のログを確認
- 両者の回答が正しく記録されているか確認

## 📚 参考資料

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Array Types](https://www.postgresql.org/docs/current/arrays.html)
