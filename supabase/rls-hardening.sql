-- =====================================================
-- RLS hardening for battle_rooms / battle_answers
-- Goal: allow discoverability of waiting rooms by code,
--       allow joining as guest, and keep participants-only access otherwise.
-- Date: 2025-10-15
-- =====================================================

-- Ensure RLS is enabled (no-op if already enabled)
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_answers ENABLE ROW LEVEL SECURITY;

-- Drop overly permissive helper policies if they exist
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_rooms' AND policyname='すべてのユーザーがルームを閲覧可能') THEN
    EXECUTE 'DROP POLICY "すべてのユーザーがルームを閲覧可能" ON public.battle_rooms';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_rooms' AND policyname='すべてのユーザーがルームを作成可能') THEN
    EXECUTE 'DROP POLICY "すべてのユーザーがルームを作成可能" ON public.battle_rooms';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_rooms' AND policyname='すべてのユーザーがルームを更新可能') THEN
    EXECUTE 'DROP POLICY "すべてのユーザーがルームを更新可能" ON public.battle_rooms';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_answers' AND policyname='すべてのユーザーが回答を閲覧可能') THEN
    EXECUTE 'DROP POLICY "すべてのユーザーが回答を閲覧可能" ON public.battle_answers';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_answers' AND policyname='すべてのユーザーが回答を記録可能') THEN
    EXECUTE 'DROP POLICY "すべてのユーザーが回答を記録可能" ON public.battle_answers';
  END IF;
END $$;

-- 1) battle_rooms SELECT policies
-- 1-a) Participants can always read their rooms
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename='battle_rooms' AND policyname='battle_rooms_select_participant'
  ) THEN
    CREATE POLICY battle_rooms_select_participant ON public.battle_rooms
      FOR SELECT
      USING (
        auth.uid() = host_user_id OR auth.uid() = guest_user_id
      );
  END IF;
END $$;

-- 1-b) Allow reading waiting rooms (limited discoverability for joining by code)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename='battle_rooms' AND policyname='battle_rooms_select_waiting'
  ) THEN
    CREATE POLICY battle_rooms_select_waiting ON public.battle_rooms
      FOR SELECT
      USING (
        status = 'waiting' AND expires_at > now()
      );
  END IF;
END $$;

-- 2) battle_rooms INSERT: host can create a room
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_rooms' AND policyname='battle_rooms_insert') THEN
    EXECUTE 'DROP POLICY battle_rooms_insert ON public.battle_rooms';
  END IF;
  CREATE POLICY battle_rooms_insert ON public.battle_rooms
    FOR INSERT
    WITH CHECK (host_user_id = auth.uid());
END $$;

-- 3) battle_rooms UPDATE
-- 3-a) Join as guest when room is waiting and vacant
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE tablename='battle_rooms' AND policyname='battle_rooms_join_as_guest'
  ) THEN
    CREATE POLICY battle_rooms_join_as_guest ON public.battle_rooms
      FOR UPDATE
      USING (
        status = 'waiting' AND guest_user_id IS NULL
      )
      WITH CHECK (
        guest_user_id = auth.uid()
      );
  END IF;
END $$;

-- 3-b) Participants can update during the game lifecycle
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_rooms' AND policyname='battle_rooms_update') THEN
    EXECUTE 'DROP POLICY battle_rooms_update ON public.battle_rooms';
  END IF;
  CREATE POLICY battle_rooms_update ON public.battle_rooms
    FOR UPDATE
    USING (
      auth.uid() = host_user_id OR auth.uid() = guest_user_id
    )
    WITH CHECK (
      auth.uid() = host_user_id OR auth.uid() = guest_user_id
    );
END $$;

-- 3-c) Only host can delete a room
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_rooms' AND policyname='battle_rooms_delete_host') THEN
    EXECUTE 'DROP POLICY battle_rooms_delete_host ON public.battle_rooms';
  END IF;
  CREATE POLICY battle_rooms_delete_host ON public.battle_rooms
    FOR DELETE
    USING (auth.uid() = host_user_id);
END $$;

-- 4) battle_answers policies
-- 4-a) Participants of the room can read answers
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_answers' AND policyname='battle_answers_select') THEN
    EXECUTE 'DROP POLICY battle_answers_select ON public.battle_answers';
  END IF;
  CREATE POLICY battle_answers_select ON public.battle_answers
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.battle_rooms r
        WHERE r.id = battle_answers.room_id
          AND auth.uid() IN (r.host_user_id, r.guest_user_id)
      )
    );
END $$;

-- 4-b) Only the user himself can insert his answers into rooms he participates in
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='battle_answers' AND policyname='battle_answers_insert') THEN
    EXECUTE 'DROP POLICY battle_answers_insert ON public.battle_answers';
  END IF;
  CREATE POLICY battle_answers_insert ON public.battle_answers
    FOR INSERT
    WITH CHECK (
      player_user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.battle_rooms r
        WHERE r.id = battle_answers.room_id
          AND auth.uid() IN (r.host_user_id, r.guest_user_id)
      )
    );
END $$;

-- Done

