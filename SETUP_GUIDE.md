# 早押し2人対戦クイズ - セットアップガイド

このドキュメントでは、早押し2人対戦クイズ機能を動作させるために必要なセットアップ手順を説明します。

## 📋 前提条件

- Node.js 18以上
- Supabaseプロジェクト（無料プランで利用可能）
- 2つのブラウザまたはデバイス（テスト用）

## 🚀 セットアップ手順

### 1. データベースマイグレーションの実行

#### 1.1 Supabase CLIを使用する場合

```bash
# Supabase CLIのインストール（未インストールの場合）
npm install -g supabase

# プロジェクトにリンク
supabase link --project-ref YOUR_PROJECT_REF

# マイグレーションの実行
supabase db push
```

#### 1.2 Supabase Dashboardを使用する場合

1. [Supabase Dashboard](https://app.supabase.com/) にログイン
2. プロジェクトを選択
3. 左メニューから「SQL Editor」を開く
4. `supabase/migrations/001_battle_mode.sql` の内容をコピー＆ペースト
5. 「Run」ボタンをクリックして実行

### 2. Realtime機能の有効化

#### 2.1 Realtime Publicationsの設定

1. Supabase Dashboardの左メニューから「Database」→「Publications」を開く
2. デフォルトの `supabase_realtime` publicationを確認
3. 以下のテーブルが含まれていることを確認（含まれていない場合は追加）:
   - `battle_rooms`
   - `battle_answers`

#### 2.2 SQLエディタでの有効化（推奨）

Supabase Dashboard の SQL Editor で以下を実行:

```sql
-- Realtime Publicationに対戦モードテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE battle_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_answers;

-- 確認
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

#### 2.3 Realtime APIの有効化確認

1. 左メニューから「Settings」→「API」を開く
2. 「Realtime」セクションで「Enable Realtime」がオンになっていることを確認
3. オフの場合はオンに切り替える

### 3. Schedulerの設定（期限切れルーム自動削除）

#### 3.1 pg_cronの有効化

Supabase Dashboard の SQL Editor で以下を実行:

```sql
-- pg_cron拡張を有効化
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 期限切れルームを1分ごとに削除
SELECT cron.schedule(
  'delete-expired-battle-rooms',
  '* * * * *',  -- 毎分実行
  $$SELECT delete_expired_battle_rooms()$$
);

-- ジョブの確認
SELECT * FROM cron.job;
```

#### 3.2 代替方法: Supabase Functions（将来の実装）

pg_cronが利用できない場合は、Supabase Edge Functionsで定期実行を設定することも可能です。

### 4. 認証設定

#### 4.1 Anonymous Authの有効化

1. Supabase Dashboardの左メニューから「Authentication」→「Providers」を開く
2. 「Anonymous sign-ins」を探す
3. 「Enable anonymous sign-ins」をオンにする
4. 「Save」をクリック

#### 4.2 認証設定の確認

SQL Editorで以下を実行して設定を確認:

```sql
-- Auth設定の確認
SELECT * FROM auth.config;
```

### 5. 環境変数の設定

プロジェクトルートの `.env` ファイルに以下を追加:

```env
# Supabase設定
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# オプション: Service Role Key（管理操作用、クライアントには公開しないこと）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

#### 環境変数の取得方法

1. Supabase Dashboardの「Settings」→「API」を開く
2. 「Project URL」をコピーして `VITE_SUPABASE_URL` に設定
3. 「Project API keys」→「anon public」をコピーして `VITE_SUPABASE_ANON_KEY` に設定

### 6. 依存パッケージのインストール

```bash
npm install
```

### 7. 開発サーバーの起動

```bash
npm run dev
```

## 🧪 動作確認

### 1. 基本動作テスト

1. ブラウザで `http://localhost:5173` を開く
2. 「対戦モード」を選択
3. 「ルームを作成」を選択
4. 難易度を選択してルームを作成
5. ルームコードが表示されることを確認

### 2. 2人対戦テスト

#### プレイヤー1（ホスト）
1. 上記の手順でルームを作成
2. 表示されたルームコードをメモ

#### プレイヤー2（ゲスト）
1. 別のブラウザまたはシークレットウィンドウで `http://localhost:5173` を開く
2. 「対戦モード」→「ルームに参加」を選択
3. メモしたルームコードを入力
4. 待機室が表示されることを確認

#### 対戦開始
1. プレイヤー1の画面で「ゲーム開始」ボタンをクリック
2. 両方のプレイヤーで問題が表示されることを確認
3. 選択肢をクリックして回答
4. スコアが正しく更新されることを確認
5. 10問終了後に結果画面が表示されることを確認

### 3. Realtimeの動作確認

以下の項目をテストして、リアルタイム同期が正しく動作することを確認:

- ✅ ゲスト参加時にホスト画面が自動更新される
- ✅ ゲーム開始時に両プレイヤーの画面が同時に切り替わる
- ✅ 回答時に相手の回答状況が表示される
- ✅ スコアが両プレイヤーで同期される
- ✅ 次の問題への自動遷移が同期される

## 🔍 トラブルシューティング

### Realtimeが動作しない

**症状**: ゲスト参加時にホスト画面が更新されない、スコアが同期されない

**確認項目**:
1. Supabase DashboardでRealtimeが有効になっているか確認
2. ブラウザのコンソールでWebSocket接続エラーを確認
3. SQL Editorで以下を実行してPublicationを確認:
   ```sql
   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
   ```
4. ネットワークタブでWebSocket接続を確認（`wss://` で始まるURL）

**解決方法**:
```sql
-- Publicationに追加
ALTER PUBLICATION supabase_realtime ADD TABLE battle_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_answers;

-- Realtime設定のリロード
SELECT pg_notify('realtime:reload', '');
```

### ルームが見つからない

**症状**: 「ルームが見つかりません」エラー

**確認項目**:
1. ルームコードの大文字小文字が正しいか
2. ルームの有効期限（30分）が切れていないか
3. データベースに実際にルームが存在するか

**確認SQL**:
```sql
-- アクティブなルームを確認
SELECT room_code, status, expires_at
FROM battle_rooms
WHERE expires_at > NOW()
  AND status != 'abandoned';
```

### スコアが正しく計算されない

**症状**: 両方正解しているのにスコアが更新されない

**確認項目**:
1. RPC関数 `advance_battle_room` が正しく動作しているか
2. 両プレイヤーの回答が `battle_answers` テーブルに記録されているか

**確認SQL**:
```sql
-- 特定ルームの回答を確認
SELECT ba.*, br.current_question_index
FROM battle_answers ba
JOIN battle_rooms br ON ba.room_id = br.id
WHERE br.room_code = 'YOUR_ROOM_CODE'
ORDER BY ba.question_index, ba.created_at;

-- RPC関数を手動実行してテスト
SELECT advance_battle_room('room_id_here');
```

### 認証エラー

**症状**: 「Row Level Security policy violation」エラー

**確認項目**:
1. Anonymous Authが有効になっているか
2. RLSポリシーが正しく設定されているか
3. ユーザーが正しく認証されているか

**確認SQL**:
```sql
-- RLSポリシーの確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('battle_rooms', 'battle_answers');

-- 現在のユーザーを確認（クライアント側のDevToolsコンソールで実行）
-- const { data } = await supabase.auth.getUser();
-- console.log(data.user);
```

### タイマーがずれる

**症状**: 2人のタイマーの進行速度が異なる

**原因**: クライアント側の時刻が同期されていない、または処理遅延

**対策**:
- `requestAnimationFrame` を使用した高精度タイマーを実装済み
- サーバー時刻を基準とした同期は今後の改善項目

### 問題が表示されない

**症状**: ゲーム開始後、問題が表示されない

**確認項目**:
1. `questions` テーブルにデータが存在するか
2. 選択された難易度の問題が10問以上あるか
3. `question_ids` 配列が正しく設定されているか

**確認SQL**:
```sql
-- 難易度ごとの問題数を確認
SELECT difficulty, COUNT(*)
FROM questions
GROUP BY difficulty;

-- 特定ルームの問題IDを確認
SELECT room_code, difficulty, question_ids, array_length(question_ids, 1) as question_count
FROM battle_rooms
WHERE room_code = 'YOUR_ROOM_CODE';
```

## 📊 データベースメンテナンス

### 期限切れルームの手動削除

```sql
-- 期限切れルームを削除
SELECT delete_expired_battle_rooms();

-- 削除されたルーム数を確認
SELECT COUNT(*) FROM battle_rooms;
```

### テストデータのクリーンアップ

```sql
-- 全対戦データを削除（開発環境のみ！）
TRUNCATE battle_answers CASCADE;
TRUNCATE battle_rooms CASCADE;
```

### データベース統計

```sql
-- ルーム状態別の集計
SELECT status, COUNT(*)
FROM battle_rooms
GROUP BY status;

-- 平均回答時間の統計
SELECT
  AVG(answer_time_ms) as avg_time_ms,
  MIN(answer_time_ms) as min_time_ms,
  MAX(answer_time_ms) as max_time_ms
FROM battle_answers
WHERE is_correct = true;
```

## 🎯 次のステップ

### 本番環境へのデプロイ

1. **環境変数の設定**
   - 本番用のSupabase URLとキーを設定
   - `.env.production` ファイルを作成

2. **ビルド**
   ```bash
   npm run build
   ```

3. **デプロイ**
   - Vercel、Netlify、またはその他のホスティングサービスにデプロイ
   - 環境変数を設定

4. **本番環境でのテスト**
   - 複数デバイスでの動作確認
   - ネットワーク遅延のテスト
   - 同時接続数のテスト

### パフォーマンス最適化

1. **接続プールの設定**
   - Supabaseの接続プール設定を最適化

2. **インデックスの追加**
   ```sql
   -- 必要に応じて追加のインデックスを作成
   CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON battle_rooms(status);
   CREATE INDEX IF NOT EXISTS idx_battle_answers_room_question ON battle_answers(room_id, question_index);
   ```

3. **Realtime接続の最適化**
   - 必要なイベントのみサブスクライブ
   - 接続プールの設定を調整

### セキュリティ強化

1. **RLSポリシーの見直し**
   - より厳密なアクセス制御が必要な場合は追加ポリシーを設定

2. **レート制限の実装**
   - ルーム作成のレート制限
   - APIリクエストの制限

3. **不正行為対策**
   - 回答時間の妥当性チェック
   - 連続作成の制限

## 📚 参考資料

- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Array Types](https://www.postgresql.org/docs/current/arrays.html)
- [PostgreSQL RPC Functions](https://supabase.com/docs/guides/database/functions)

## 🐛 バグ報告・機能要望

問題が発生した場合や機能要望がある場合は、以下の情報を含めて報告してください:

- 発生した問題の詳細
- 再現手順
- エラーメッセージ（あれば）
- ブラウザとバージョン
- Supabaseのログ（該当する場合）
