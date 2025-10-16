-- ================================================
-- 早押し2人対戦クイズ - 完全セットアップSQL
-- Supabase Dashboard の SQL Editor で実行してください
-- ================================================

-- ================================================
-- 1. バトルモード用テーブルの作成
-- ================================================

-- battle_rooms テーブル（対戦ルーム管理）
CREATE TABLE IF NOT EXISTS battle_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('C','B','A','S')),
  host_user_id UUID NOT NULL,
  host_session_id TEXT NOT NULL,
  guest_user_id UUID,
  guest_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','ready','playing','finished','abandoned')),
  question_ids UUID[] NOT NULL,
  current_question_index INT NOT NULL DEFAULT 0,
  host_score INT NOT NULL DEFAULT 0,
  guest_score INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes'
);

-- battle_answers テーブル（回答記録）
CREATE TABLE IF NOT EXISTS battle_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES battle_rooms(id) ON DELETE CASCADE,
  player_user_id UUID NOT NULL,
  player_session_id TEXT NOT NULL,
  question_index INT NOT NULL,
  question_id UUID NOT NULL REFERENCES questions(id),
  is_correct BOOLEAN NOT NULL,
  answer_time_ms INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, player_session_id, question_index)
);

-- ================================================
-- 2. インデックスの作成
-- ================================================

CREATE INDEX IF NOT EXISTS idx_battle_rooms_room_code ON battle_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_status ON battle_rooms(status);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_expires_at ON battle_rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_host_user ON battle_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_guest_user ON battle_rooms(guest_user_id);

CREATE INDEX IF NOT EXISTS idx_battle_answers_room_id ON battle_answers(room_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_player_user ON battle_answers(player_user_id);
CREATE INDEX IF NOT EXISTS idx_battle_answers_room_question ON battle_answers(room_id, question_index);

-- ================================================
-- 3. RPC関数の作成
-- ================================================

-- 3.1 次の問題に進む関数（スコア計算付き）
CREATE OR REPLACE FUNCTION advance_battle_room(p_room_id UUID)
RETURNS battle_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room battle_rooms;
  v_host_answer battle_answers;
  v_guest_answer battle_answers;
  v_host_point INT := 0;
  v_guest_point INT := 0;
  v_total_questions INT;
BEGIN
  -- ルーム情報を取得（ロック）
  SELECT * INTO v_room
  FROM battle_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  IF v_room IS NULL THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  -- 総問題数を取得
  v_total_questions := array_length(v_room.question_ids, 1);

  -- 現在の問題の回答を取得
  SELECT * INTO v_host_answer
  FROM battle_answers
  WHERE room_id = p_room_id
    AND player_session_id = v_room.host_session_id
    AND question_index = v_room.current_question_index;

  SELECT * INTO v_guest_answer
  FROM battle_answers
  WHERE room_id = p_room_id
    AND player_session_id = v_room.guest_session_id
    AND question_index = v_room.current_question_index;

  -- 両プレイヤーの回答がない場合は何もしない
  IF v_host_answer IS NULL OR v_guest_answer IS NULL THEN
    RETURN v_room;
  END IF;

  -- スコア計算ロジック
  IF v_host_answer.is_correct AND v_guest_answer.is_correct THEN
    -- 両方正解の場合、早い方にポイント
    IF v_host_answer.answer_time_ms < v_guest_answer.answer_time_ms THEN
      v_host_point := 1;
    ELSIF v_guest_answer.answer_time_ms < v_host_answer.answer_time_ms THEN
      v_guest_point := 1;
    ELSE
      -- 同タイムの場合は両方にポイント
      v_host_point := 1;
      v_guest_point := 1;
    END IF;
  ELSIF v_host_answer.is_correct THEN
    -- ホストのみ正解
    v_host_point := 1;
  ELSIF v_guest_answer.is_correct THEN
    -- ゲストのみ正解
    v_guest_point := 1;
  END IF;

  -- 次の問題インデックス
  v_room.current_question_index := v_room.current_question_index + 1;
  v_room.host_score := v_room.host_score + v_host_point;
  v_room.guest_score := v_room.guest_score + v_guest_point;
  v_room.updated_at := NOW();

  -- 全問題終了チェック
  IF v_room.current_question_index >= v_total_questions THEN
    v_room.status := 'finished';
  END IF;

  -- ルーム情報を更新
  UPDATE battle_rooms
  SET
    current_question_index = v_room.current_question_index,
    host_score = v_room.host_score,
    guest_score = v_room.guest_score,
    status = v_room.status,
    updated_at = v_room.updated_at
  WHERE id = p_room_id;

  RETURN v_room;
END;
$$;

-- 3.2 期限切れルーム削除関数
CREATE OR REPLACE FUNCTION delete_expired_battle_rooms()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INT;
BEGIN
  -- 期限切れまたは放棄されたルームを削除
  WITH deleted AS (
    DELETE FROM battle_rooms
    WHERE expires_at < NOW()
       OR (status = 'abandoned' AND updated_at < NOW() - INTERVAL '5 minutes')
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_count FROM deleted;

  RETURN v_deleted_count;
END;
$$;

-- ================================================
-- 4. Row Level Security (RLS) の設定
-- ================================================

-- 4.1 RLSの有効化
ALTER TABLE battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_answers ENABLE ROW LEVEL SECURITY;

-- 4.2 battle_rooms のポリシー

-- ホストまたはゲストとして参加しているルームを閲覧可能
DROP POLICY IF EXISTS "ユーザーは参加しているルームを閲覧可能" ON battle_rooms;
CREATE POLICY "ユーザーは参加しているルームを閲覧可能"
  ON battle_rooms
  FOR SELECT
  USING (
    host_user_id = auth.uid()
    OR guest_user_id = auth.uid()
  );

-- ホストとしてルームを作成可能
DROP POLICY IF EXISTS "ユーザーはルームを作成可能" ON battle_rooms;
CREATE POLICY "ユーザーはルームを作成可能"
  ON battle_rooms
  FOR INSERT
  WITH CHECK (host_user_id = auth.uid());

-- ホストまたはゲストとしてルームを更新可能
DROP POLICY IF EXISTS "ユーザーは参加しているルームを更新可能" ON battle_rooms;
CREATE POLICY "ユーザーは参加しているルームを更新可能"
  ON battle_rooms
  FOR UPDATE
  USING (
    host_user_id = auth.uid()
    OR guest_user_id = auth.uid()
  );

-- 4.3 battle_answers のポリシー

-- 参加しているルームの回答を閲覧可能
DROP POLICY IF EXISTS "ユーザーは参加しているルームの回答を閲覧可能" ON battle_answers;
CREATE POLICY "ユーザーは参加しているルームの回答を閲覧可能"
  ON battle_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM battle_rooms
      WHERE battle_rooms.id = battle_answers.room_id
        AND (
          battle_rooms.host_user_id = auth.uid()
          OR battle_rooms.guest_user_id = auth.uid()
        )
    )
  );

-- 自分の回答を記録可能
DROP POLICY IF EXISTS "ユーザーは自分の回答を記録可能" ON battle_answers;
CREATE POLICY "ユーザーは自分の回答を記録可能"
  ON battle_answers
  FOR INSERT
  WITH CHECK (player_user_id = auth.uid());

-- ================================================
-- 5. Realtime の有効化
-- ================================================

-- Realtime Publicationに対戦モードテーブルを追加
ALTER PUBLICATION supabase_realtime ADD TABLE battle_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_answers;

-- 確認用クエリ（実行後に結果を確認）
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('battle_rooms', 'battle_answers');

-- ================================================
-- 6. pg_cron による自動クリーンアップ（オプション）
-- ================================================

-- pg_cron拡張を有効化（Supabaseの設定によっては既に有効）
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 既存のジョブを削除（エラーを無視）
DO $$
BEGIN
  PERFORM cron.unschedule('delete-expired-battle-rooms');
EXCEPTION
  WHEN undefined_object THEN NULL;
  WHEN others THEN NULL;
END
$$;

-- 期限切れルームを1分ごとに削除するジョブを登録
SELECT cron.schedule(
  'delete-expired-battle-rooms',
  '* * * * *',  -- 毎分実行
  $$SELECT delete_expired_battle_rooms()$$
);

-- ジョブの確認
SELECT * FROM cron.job WHERE jobname = 'delete-expired-battle-rooms';

-- ================================================
-- セットアップ完了
-- ================================================

-- セットアップ状況の確認
SELECT
  'battle_rooms' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as latest_record
FROM battle_rooms
UNION ALL
SELECT
  'battle_answers' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as latest_record
FROM battle_answers;

-- RLSポリシーの確認
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('battle_rooms', 'battle_answers')
ORDER BY tablename, policyname;

-- Realtime設定の確認
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('battle_rooms', 'battle_answers');

-- 完了メッセージ
DO $$
BEGIN
  PERFORM pg_notify('pgrst', 'reload schema');
  RAISE NOTICE '========================================';
  RAISE NOTICE '早押し2人対戦クイズのセットアップが完了しました！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '次のステップ:';
  RAISE NOTICE '1. Supabase Dashboard > Authentication > Providers';
  RAISE NOTICE '   → Anonymous sign-ins を有効化';
  RAISE NOTICE '2. アプリケーションを起動: npm run dev';
  RAISE NOTICE '3. 対戦モードを選択してテスト';
  RAISE NOTICE '========================================';
END
$$;
