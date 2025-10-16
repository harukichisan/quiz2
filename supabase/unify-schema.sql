-- ================================================
-- Supabase schema unification patch (idempotent)
-- Target: align DB with app code and migrations
-- Date: 2025-10-15
-- Run in Supabase SQL Editor with a privileged role
-- ================================================

-- 1) Columns alignment -------------------------------------------
-- battle_rooms: ensure updated_at/started_at/finished_at exist
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS started_at timestamptz;
ALTER TABLE public.battle_rooms
  ADD COLUMN IF NOT EXISTS finished_at timestamptz;

-- battle_answers: answered_at should exist; rename created_at -> answered_at if needed
ALTER TABLE public.battle_answers
  ADD COLUMN IF NOT EXISTS answered_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'battle_answers' AND column_name = 'created_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'battle_answers' AND column_name = 'answered_at'
  ) THEN
    EXECUTE 'ALTER TABLE public.battle_answers RENAME COLUMN created_at TO answered_at';
  END IF;
END
$$;

-- 2) Unique constraint on answers (room_id, player_user_id, question_index)
DO $$
DECLARE
  v_wrong_name text;
  v_right_name text;
BEGIN
  -- Drop a wrong unique constraint defined on (room_id, player_session_id, question_index)
  SELECT pc.conname INTO v_wrong_name
  FROM pg_constraint pc
  JOIN pg_class c ON c.oid = pc.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'battle_answers' AND pc.contype = 'u'
    AND (
      SELECT array_agg(a.attname ORDER BY a.attnum)
      FROM unnest(pc.conkey) k(attnum)
      JOIN pg_attribute a ON a.attrelid = pc.conrelid AND a.attnum = k.attnum
    ) = ARRAY['room_id','player_session_id','question_index'];

  IF v_wrong_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.battle_answers DROP CONSTRAINT %I', v_wrong_name);
  END IF;

  -- Ensure correct unique constraint exists on (room_id, player_user_id, question_index)
  SELECT pc.conname INTO v_right_name
  FROM pg_constraint pc
  JOIN pg_class c ON c.oid = pc.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'battle_answers' AND pc.contype = 'u'
    AND (
      SELECT array_agg(a.attname ORDER BY a.attnum)
      FROM unnest(pc.conkey) k(attnum)
      JOIN pg_attribute a ON a.attrelid = pc.conrelid AND a.attnum = k.attnum
    ) = ARRAY['room_id','player_user_id','question_index'];

  IF v_right_name IS NULL THEN
    ALTER TABLE public.battle_answers
      ADD CONSTRAINT battle_answers_unique_player_question
      UNIQUE (room_id, player_user_id, question_index);
  END IF;
END
$$;

-- 3) updated_at trigger for battle_rooms --------------------------
CREATE OR REPLACE FUNCTION public.update_battle_rooms_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS trigger_update_battle_rooms_updated_at ON public.battle_rooms;
CREATE TRIGGER trigger_update_battle_rooms_updated_at
  BEFORE UPDATE ON public.battle_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_battle_rooms_updated_at();

-- 4) Realtime publication membership -----------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'battle_rooms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_rooms';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'battle_answers'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_answers';
  END IF;
END
$$;

-- 5) RPC normalization (user-id based scoring) -------------------
CREATE OR REPLACE FUNCTION public.advance_battle_room(p_room_id uuid)
RETURNS public.battle_rooms
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_room public.battle_rooms;
  v_host_answer public.battle_answers;
  v_guest_answer public.battle_answers;
  v_next_index int;
  v_host_score int;
  v_guest_score int;
BEGIN
  SELECT * INTO v_room FROM public.battle_rooms WHERE id = p_room_id FOR UPDATE;

  IF v_room IS NULL THEN
    RAISE EXCEPTION 'Room not found: %', p_room_id;
  END IF;

  IF v_room.status <> 'playing' THEN
    RETURN v_room;
  END IF;

  SELECT * INTO v_host_answer
    FROM public.battle_answers
    WHERE room_id = p_room_id
      AND question_index = v_room.current_question_index
      AND player_user_id = v_room.host_user_id;

  SELECT * INTO v_guest_answer
    FROM public.battle_answers
    WHERE room_id = p_room_id
      AND question_index = v_room.current_question_index
      AND player_user_id = v_room.guest_user_id;

  IF v_host_answer IS NULL OR v_guest_answer IS NULL THEN
    RETURN v_room;
  END IF;

  v_host_score := v_room.host_score;
  v_guest_score := v_room.guest_score;

  IF v_host_answer.is_correct AND v_guest_answer.is_correct THEN
    IF v_host_answer.answer_time_ms < v_guest_answer.answer_time_ms THEN
      v_host_score := v_host_score + 1;
    ELSIF v_guest_answer.answer_time_ms < v_host_answer.answer_time_ms THEN
      v_guest_score := v_guest_score + 1;
    ELSE
      v_host_score := v_host_score + 1;
      v_guest_score := v_guest_score + 1;
    END IF;
  ELSIF v_host_answer.is_correct THEN
    v_host_score := v_host_score + 1;
  ELSIF v_guest_answer.is_correct THEN
    v_guest_score := v_guest_score + 1;
  END IF;

  v_next_index := v_room.current_question_index + 1;

  UPDATE public.battle_rooms
     SET host_score = v_host_score,
         guest_score = v_guest_score,
         current_question_index = v_next_index,
         status = CASE WHEN v_next_index >= array_length(question_ids, 1)
                       THEN 'finished' ELSE 'playing' END,
         finished_at = CASE WHEN v_next_index >= array_length(question_ids, 1)
                            THEN now() ELSE finished_at END,
         updated_at = now()
   WHERE id = p_room_id
   RETURNING * INTO v_room;

  RETURN v_room;
END;
$$;

-- 6) Cleanup helper: delete_expired_battle_rooms (void) ----------
CREATE OR REPLACE FUNCTION public.delete_expired_battle_rooms()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.battle_rooms
   WHERE expires_at < now()
      OR (status = 'abandoned' AND finished_at < now() - INTERVAL '10 minutes');
END;
$$;

-- Done -----------------------------------------------------------
-- You may run the checks below as needed:
-- SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename IN ('battle_rooms','battle_answers');
-- SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE event_object_table='battle_rooms';

