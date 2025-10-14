# Supabase Dashboard セットアップ手順

Supabase CLIを使用せず、Webブラウザから直接セットアップする方法です。

## 📋 準備

1. Supabaseプロジェクトにアクセス: https://app.supabase.com/
2. プロジェクトを選択（プロジェクトREF: `gaghrdddgzbivjaywqiu`）

## 🔧 ステップ1: SQLマイグレーションの実行

### 1.1 SQL Editorを開く

1. 左メニューから **「SQL Editor」** をクリック
2. **「New query」** ボタンをクリック

### 1.2 SQLファイルの内容をコピー

`supabase-battle-mode-setup.sql` ファイルの内容を全てコピーします。

```bash
# macOSのターミナルでコピー
cd /Users/harukichi/アプリ開発/quiz2
cat supabase-battle-mode-setup.sql | pbcopy
```

または、ファイルをテキストエディタで開いて全選択→コピー

### 1.3 SQLを実行

1. SQL Editorのテキストエリアに貼り付け
2. 右下の **「Run」** ボタン（または `Cmd + Enter`）をクリック
3. 実行結果を確認

**期待される結果**:
```
✅ テーブル作成完了
✅ インデックス作成完了
✅ RPC関数作成完了
✅ RLSポリシー設定完了
✅ Realtime有効化完了
```

**エラーが出た場合**:
- 既存のテーブルやポリシーがある場合は無視して問題ありません
- `DROP POLICY ... does not exist` のようなエラーは無視してOK

## 🔐 ステップ2: Anonymous認証の有効化

### 2.1 認証設定画面を開く

1. 左メニューから **「Authentication」** をクリック
2. 上部タブの **「Providers」** をクリック

### 2.2 Anonymous認証を有効化

1. プロバイダーリストから **「Anonymous」** を探す
2. **「Anonymous sign-ins」** のトグルスイッチを **オン** にする
3. **「Save」** ボタンをクリック

## 📡 ステップ3: Realtime設定の確認

### 3.1 Realtime設定を確認

1. 左メニューから **「Database」** をクリック
2. サブメニューから **「Replication」** をクリック

### 3.2 テーブルの有効化確認

以下のテーブルが `supabase_realtime` publicationに含まれていることを確認:

- ✅ `battle_rooms`
- ✅ `battle_answers`
- ✅ `questions`（既存）

**含まれていない場合**:

1. SQL Editorで以下を実行:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE battle_rooms;
   ALTER PUBLICATION supabase_realtime ADD TABLE battle_answers;
   ```

2. または、Replication画面で該当テーブルの「Enable」ボタンをクリック

## 🔄 ステップ4: スケジューラの確認（オプション）

### 4.1 pg_cronの動作確認

SQL Editorで以下のクエリを実行:

```sql
-- ジョブの確認
SELECT * FROM cron.job;
```

**期待される結果**:
- `delete-expired-battle-rooms` というジョブが表示される
- `schedule` が `* * * * *`（毎分実行）

**ジョブが見つからない場合**:

```sql
-- pg_cron拡張を有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ジョブを登録
SELECT cron.schedule(
  'delete-expired-battle-rooms',
  '* * * * *',
  $$SELECT delete_expired_battle_rooms()$$
);
```

## ✅ ステップ5: 動作確認

### 5.1 テーブルの確認

SQL Editorで以下のクエリを実行:

```sql
-- テーブルが作成されていることを確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('battle_rooms', 'battle_answers');
```

**期待される結果**:
```
battle_rooms
battle_answers
```

### 5.2 RLSポリシーの確認

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('battle_rooms', 'battle_answers')
ORDER BY tablename;
```

**期待される結果**: 各テーブルに3-4個のポリシーが表示される

### 5.3 Realtimeの確認

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('battle_rooms', 'battle_answers');
```

**期待される結果**:
```
public | battle_rooms
public | battle_answers
```

## 🚀 ステップ6: アプリケーションの起動

### 6.1 開発サーバーの起動

```bash
cd /Users/harukichi/アプリ開発/quiz2
npm run dev
```

### 6.2 ブラウザでアクセス

http://localhost:5173 を開く

### 6.3 対戦モードのテスト

1. **プレイヤー1（ホスト）**:
   - 「対戦モード」を選択
   - 「ルームを作成」をクリック
   - 難易度を選択
   - ルームコードをメモ

2. **プレイヤー2（ゲスト）**:
   - 別のブラウザまたはシークレットウィンドウで http://localhost:5173 を開く
   - 「対戦モード」を選択
   - 「ルームに参加」をクリック
   - ルームコードを入力

3. **対戦開始**:
   - プレイヤー1の画面で「ゲーム開始」をクリック
   - 両方のプレイヤーで問題が表示されることを確認
   - 回答して動作を確認

## 🔍 トラブルシューティング

### エラー: "relation does not exist"

**原因**: テーブルが作成されていない

**解決方法**:
1. ステップ1のSQLを再実行
2. エラーメッセージを確認してテーブル名を修正

### エラー: "Row Level Security policy violation"

**原因**: RLSポリシーが正しく設定されていない、または認証されていない

**解決方法**:
1. Anonymous認証が有効になっているか確認（ステップ2）
2. ブラウザのDevToolsコンソールでエラーを確認:
   ```javascript
   const { data, error } = await supabase.auth.getUser();
   console.log(data, error);
   ```
3. RLSポリシーを再確認（ステップ5.2）

### エラー: "Realtime subscription failed"

**原因**: Realtimeが有効になっていない

**解決方法**:
1. Replication設定を確認（ステップ3）
2. SQL Editorで以下を実行:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE battle_rooms;
   ALTER PUBLICATION supabase_realtime ADD TABLE battle_answers;

   -- Realtimeをリロード
   SELECT pg_notify('realtime:reload', '');
   ```

### ゲスト参加時にホスト画面が更新されない

**原因**: Realtime subscriptionが動作していない

**確認方法**:
1. ブラウザのDevToolsのNetworkタブを確認
2. WebSocket接続（`wss://` で始まる）が確立されているか確認
3. コンソールにエラーが出ていないか確認

**解決方法**:
1. ステップ3のRealtime設定を再確認
2. ページをリロード
3. Supabase Dashboardの「Settings」→「API」でRealtime APIが有効になっているか確認

### スコアが更新されない

**原因**: RPC関数が正しく動作していない

**確認方法**:

SQL Editorで手動テスト:

```sql
-- テストルームを作成
INSERT INTO battle_rooms (
  room_code,
  difficulty,
  host_user_id,
  host_session_id,
  guest_user_id,
  guest_session_id,
  status,
  question_ids
) VALUES (
  'TEST01',
  'C',
  gen_random_uuid(),
  'host-session',
  gen_random_uuid(),
  'guest-session',
  'playing',
  ARRAY(SELECT id FROM questions WHERE difficulty = 'C' LIMIT 10)
)
RETURNING id;

-- 返ってきたIDを使って回答を記録
INSERT INTO battle_answers (
  room_id,
  player_user_id,
  player_session_id,
  question_index,
  question_id,
  is_correct,
  answer_time_ms
) VALUES (
  'YOUR_ROOM_ID_HERE',
  'host-user-id',
  'host-session',
  0,
  (SELECT question_ids[1] FROM battle_rooms WHERE id = 'YOUR_ROOM_ID_HERE'),
  true,
  2000
);

-- RPC関数を実行
SELECT * FROM advance_battle_room('YOUR_ROOM_ID_HERE');

-- スコアが更新されたか確認
SELECT host_score, guest_score, current_question_index
FROM battle_rooms
WHERE id = 'YOUR_ROOM_ID_HERE';
```

## 📊 データベースのモニタリング

### アクティブなルームの確認

```sql
SELECT
  room_code,
  difficulty,
  status,
  host_score,
  guest_score,
  current_question_index,
  expires_at
FROM battle_rooms
WHERE expires_at > NOW()
  AND status != 'abandoned'
ORDER BY created_at DESC;
```

### 回答統計の確認

```sql
SELECT
  COUNT(*) as total_answers,
  AVG(answer_time_ms) as avg_time_ms,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_count,
  SUM(CASE WHEN NOT is_correct THEN 1 ELSE 0 END) as wrong_count
FROM battle_answers;
```

### 直近の対戦履歴

```sql
SELECT
  br.room_code,
  br.difficulty,
  br.host_score,
  br.guest_score,
  br.status,
  br.created_at,
  CASE
    WHEN br.host_score > br.guest_score THEN 'Host'
    WHEN br.guest_score > br.host_score THEN 'Guest'
    ELSE 'Draw'
  END as winner
FROM battle_rooms br
WHERE br.status = 'finished'
ORDER BY br.created_at DESC
LIMIT 10;
```

## 🧹 メンテナンス

### 期限切れルームの手動削除

```sql
SELECT delete_expired_battle_rooms();
```

### 全対戦データのクリア（開発環境のみ）

```sql
-- ⚠️ 本番環境では実行しないでください！
TRUNCATE battle_answers CASCADE;
TRUNCATE battle_rooms CASCADE;
```

### インデックスの再構築

```sql
REINDEX TABLE battle_rooms;
REINDEX TABLE battle_answers;
```

## 📝 まとめ

セットアップが完了したら、以下を確認してください:

- ✅ SQLマイグレーションが成功
- ✅ Anonymous認証が有効
- ✅ Realtimeが設定済み
- ✅ pg_cronスケジューラが動作中
- ✅ 2人での対戦テストが成功

すべて完了したら、対戦クイズを楽しんでください！
