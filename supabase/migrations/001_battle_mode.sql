-- ============================================
-- 対戦モード用テーブル定義
-- ============================================

-- battle_rooms: 対戦ルーム管理テーブル
CREATE TABLE IF NOT EXISTS battle_rooms (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code          TEXT NOT NULL UNIQUE,
  difficulty         TEXT NOT NULL CHECK (difficulty IN ('C','B','A','S')),
  host_user_id       UUID NOT NULL,
  guest_user_id      UUID,
  host_session_id    TEXT NOT NULL,
  guest_session_id   TEXT,
  status             TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting','ready','playing','finished','abandoned')),
  current_question_index INT NOT NULL DEFAULT 0,
  question_ids       UUID[] NOT NULL,
  host_score         INT NOT NULL DEFAULT 0,
  guest_score        INT NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at         TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 minutes',
  started_at         TIMESTAMPTZ,
  finished_at        TIMESTAMPTZ
);

-- battle_roomsのインデックス作成
CREATE INDEX IF NOT EXISTS idx_battle_rooms_room_code ON battle_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_status_expires ON battle_rooms(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_host_user ON battle_rooms(host_user_id);
CREATE INDEX IF NOT EXISTS idx_battle_rooms_guest_user ON battle_rooms(guest_user_id);

-- battle_answers: 対戦中の回答記録テーブル
CREATE TABLE IF NOT EXISTS battle_answers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id           UUID NOT NULL REFERENCES battle_rooms(id) ON DELETE CASCADE,
  player_user_id    UUID NOT NULL,
  player_session_id TEXT NOT NULL,
  question_index    INT NOT NULL,
  question_id       UUID NOT NULL REFERENCES questions(id),
  is_correct        BOOLEAN NOT NULL,
  answer_time_ms    INT NOT NULL,
  answered_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, player_user_id, question_index)
);

-- battle_answersのインデックス作成
CREATE INDEX IF NOT EXISTS idx_battle_answers_room_question ON battle_answers(room_id, question_index);
CREATE INDEX IF NOT EXISTS idx_battle_answers_room_player ON battle_answers(room_id, player_user_id);

-- ============================================
-- 対戦進行RPC関数
-- ============================================

-- スコア進行RPC: 両者の回答が揃ったときに呼び出される
CREATE OR REPLACE FUNCTION advance_battle_room(p_room_id UUID)
RETURNS battle_rooms AS $$
DECLARE
  v_room battle_rooms;
  v_host_answer battle_answers;
  v_guest_answer battle_answers;
  v_next_index INT;
  v_host_score INT;
  v_guest_score INT;
BEGIN
  -- ルーム情報を排他ロックで取得
  SELECT * INTO v_room FROM battle_rooms WHERE id = p_room_id FOR UPDATE;

  -- ルームがplaying状態でなければそのまま返す
  IF v_room.status <> 'playing' THEN
    RETURN v_room;
  END IF;

  -- ホスト側の回答を取得
  SELECT * INTO v_host_answer
    FROM battle_answers
   WHERE room_id = p_room_id
     AND question_index = v_room.current_question_index
     AND player_user_id = v_room.host_user_id;

  -- ゲスト側の回答を取得
  SELECT * INTO v_guest_answer
    FROM battle_answers
   WHERE room_id = p_room_id
     AND question_index = v_room.current_question_index
     AND player_user_id = v_room.guest_user_id;

  -- 両者の回答が揃っていなければそのまま返す
  IF v_host_answer IS NULL OR v_guest_answer IS NULL THEN
    RETURN v_room;
  END IF;

  -- 現在のスコアを取得
  v_host_score := v_room.host_score;
  v_guest_score := v_room.guest_score;

  -- スコア計算ロジック
  IF v_host_answer.is_correct AND v_guest_answer.is_correct THEN
    -- 両方正解の場合は早い方にポイント
    IF v_host_answer.answer_time_ms < v_guest_answer.answer_time_ms THEN
      v_host_score := v_host_score + 1;
    ELSIF v_guest_answer.answer_time_ms < v_host_answer.answer_time_ms THEN
      v_guest_score := v_guest_score + 1;
    ELSE
      -- 同タイムの場合は両者加点
      v_host_score := v_host_score + 1;
      v_guest_score := v_guest_score + 1;
    END IF;
  ELSIF v_host_answer.is_correct THEN
    -- ホストのみ正解
    v_host_score := v_host_score + 1;
  ELSIF v_guest_answer.is_correct THEN
    -- ゲストのみ正解
    v_guest_score := v_guest_score + 1;
  END IF;
  -- 両方不正解の場合は加点なし

  -- 次の問題インデックス
  v_next_index := v_room.current_question_index + 1;

  -- ルーム情報を更新
  UPDATE battle_rooms
     SET host_score = v_host_score,
         guest_score = v_guest_score,
         current_question_index = v_next_index,
         status = CASE WHEN v_next_index >= array_length(question_ids, 1)
                       THEN 'finished' ELSE 'playing' END,
         finished_at = CASE WHEN v_next_index >= array_length(question_ids, 1)
                            THEN NOW() ELSE finished_at END
   WHERE id = p_room_id
   RETURNING * INTO v_room;

  RETURN v_room;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 期限切れルーム自動削除関数
-- ============================================

CREATE OR REPLACE FUNCTION delete_expired_battle_rooms()
RETURNS void AS $$
BEGIN
  DELETE FROM battle_rooms
   WHERE expires_at < NOW()
      OR (status = 'abandoned' AND finished_at < NOW() - INTERVAL '10 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Row Level Security (RLS) の設定
-- ============================================

-- battle_roomsのRLS有効化
ALTER TABLE battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_answers ENABLE ROW LEVEL SECURITY;

-- battle_roomsのポリシー設定
DO $$
BEGIN
  -- SELECT: ホストまたはゲストとして参加しているルームを読み取れる
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'battle_rooms'
      AND policyname = 'battle_rooms_select'
  ) THEN
    CREATE POLICY battle_rooms_select ON battle_rooms
      FOR SELECT
      USING (
        auth.role() = 'service_role'
        OR auth.uid() = host_user_id
        OR auth.uid() = guest_user_id
      );
  END IF;

  -- INSERT: ホストとしてルームを作成できる
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'battle_rooms'
      AND policyname = 'battle_rooms_insert'
  ) THEN
    CREATE POLICY battle_rooms_insert ON battle_rooms
      FOR INSERT
      WITH CHECK (auth.uid() = host_user_id);
  END IF;

  -- UPDATE: ホストまたはゲストとして参加しているルームを更新できる
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'battle_rooms'
      AND policyname = 'battle_rooms_update'
  ) THEN
    CREATE POLICY battle_rooms_update ON battle_rooms
      FOR UPDATE
      USING (
        auth.uid() = host_user_id
        OR auth.uid() = guest_user_id
      )
      WITH CHECK (
        auth.uid() IN (host_user_id, guest_user_id)
      );
  END IF;

  -- DELETE: ホストのみがルームを削除できる
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'battle_rooms'
      AND policyname = 'battle_rooms_delete_host'
  ) THEN
    CREATE POLICY battle_rooms_delete_host ON battle_rooms
      FOR DELETE
      USING (auth.uid() = host_user_id);
  END IF;
END
$$;

-- battle_answersのポリシー設定
DO $$
BEGIN
  -- SELECT: 参加しているルームの回答を読み取れる
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'battle_answers'
      AND policyname = 'battle_answers_select'
  ) THEN
    CREATE POLICY battle_answers_select ON battle_answers
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM battle_rooms r
           WHERE r.id = battle_answers.room_id
             AND auth.uid() IN (r.host_user_id, r.guest_user_id)
        )
      );
  END IF;

  -- INSERT: 参加しているルームに自分の回答を記録できる
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = current_schema()
      AND tablename = 'battle_answers'
      AND policyname = 'battle_answers_insert'
  ) THEN
    CREATE POLICY battle_answers_insert ON battle_answers
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM battle_rooms r
           WHERE r.id = room_id
             AND auth.uid() IN (r.host_user_id, r.guest_user_id)
             AND auth.uid() = player_user_id
        )
      );
  END IF;
END
$$;
