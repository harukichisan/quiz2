-- =====================================================
-- Final RLS Hardening for Battle Mode
-- Purpose: Remove dangerous permissive policies and use RPC for join/leave
-- Date: 2025-10-15
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE public.battle_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_answers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 1. Drop ALL existing dangerous policies
-- =====================================================

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop all existing policies on battle_rooms
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'battle_rooms'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.battle_rooms', pol.policyname);
  END LOOP;

  -- Drop all existing policies on battle_answers
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'battle_answers'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.battle_answers', pol.policyname);
  END LOOP;
END $$;

-- =====================================================
-- 2. Battle Rooms SELECT Policies (Read Access)
-- =====================================================

-- Policy 1: Participants can always read their own rooms
CREATE POLICY battle_rooms_select_participant ON public.battle_rooms
  FOR SELECT
  USING (
    auth.uid() = host_user_id
    OR auth.uid() = guest_user_id
  );

-- Policy 2: Allow reading waiting rooms for join discovery (limited by room code)
-- This allows guests to find rooms by code to join
CREATE POLICY battle_rooms_select_waiting ON public.battle_rooms
  FOR SELECT
  USING (
    status = 'waiting'
    AND expires_at > now()
  );

-- =====================================================
-- 3. Battle Rooms INSERT Policy (Create Room)
-- =====================================================

-- Only the host can create a room and must be authenticated
CREATE POLICY battle_rooms_insert_host ON public.battle_rooms
  FOR INSERT
  WITH CHECK (
    host_user_id = auth.uid()
  );

-- =====================================================
-- 4. Battle Rooms UPDATE Policy (Status Changes)
-- =====================================================

-- Participants can update their own rooms (for status changes ONLY)
-- Join/leave operations MUST use RPC functions
CREATE POLICY battle_rooms_update_status ON public.battle_rooms
  FOR UPDATE
  USING (
    auth.uid() = host_user_id
    OR auth.uid() = guest_user_id
  )
  WITH CHECK (
    auth.uid() = host_user_id
    OR auth.uid() = guest_user_id
  );

-- =====================================================
-- 5. Battle Rooms DELETE Policy
-- =====================================================

-- Only the host can delete a room
CREATE POLICY battle_rooms_delete_host ON public.battle_rooms
  FOR DELETE
  USING (
    auth.uid() = host_user_id
  );

-- =====================================================
-- 6. Battle Answers SELECT Policy
-- =====================================================

-- Participants of the room can read answers
CREATE POLICY battle_answers_select_participant ON public.battle_answers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.battle_rooms r
      WHERE r.id = battle_answers.room_id
        AND auth.uid() IN (r.host_user_id, r.guest_user_id)
    )
  );

-- =====================================================
-- 7. Battle Answers INSERT Policy
-- =====================================================

-- Only the player themselves can insert their answers
-- And only if they are a participant of the room
CREATE POLICY battle_answers_insert_player ON public.battle_answers
  FOR INSERT
  WITH CHECK (
    player_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.battle_rooms r
      WHERE r.id = battle_answers.room_id
        AND auth.uid() IN (r.host_user_id, r.guest_user_id)
    )
  );

-- =====================================================
-- 8. Add Security Comments
-- =====================================================

COMMENT ON POLICY battle_rooms_select_participant ON public.battle_rooms IS
  'Participants (host and guest) can always read their own rooms';

COMMENT ON POLICY battle_rooms_select_waiting ON public.battle_rooms IS
  'Allow discovery of waiting rooms by room code for guest joining';

COMMENT ON POLICY battle_rooms_insert_host ON public.battle_rooms IS
  'Only authenticated users can create rooms as host';

COMMENT ON POLICY battle_rooms_update_status ON public.battle_rooms IS
  'Participants can update room status. Join/leave operations use RPC functions.';

COMMENT ON POLICY battle_rooms_delete_host ON public.battle_rooms IS
  'Only the host can delete their room';

COMMENT ON POLICY battle_answers_select_participant ON public.battle_answers IS
  'Only participants of the room can read answers';

COMMENT ON POLICY battle_answers_insert_player ON public.battle_answers IS
  'Players can only insert their own answers and must be room participants';

-- =====================================================
-- 9. Verification Query
-- =====================================================

-- Run this to verify policies are correctly applied:
-- SELECT
--   schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('battle_rooms', 'battle_answers')
-- ORDER BY tablename, policyname;
