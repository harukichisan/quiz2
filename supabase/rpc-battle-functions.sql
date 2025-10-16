-- =====================================================
-- RPC functions for battle room join/leave operations
-- Purpose: Allow guests to join/leave rooms securely without direct UPDATE permissions
-- Date: 2025-10-15
-- =====================================================

-- Function: join_battle_room
-- Purpose: Allow a guest to join a waiting room by room code
-- Security: Validates room state and prevents race conditions
CREATE OR REPLACE FUNCTION public.join_battle_room(
  p_room_code TEXT,
  p_guest_user_id UUID,
  p_guest_session_id TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_room_id UUID;
  v_room_status TEXT;
  v_current_guest UUID;
  v_expires_at TIMESTAMPTZ;
  v_result jsonb;
BEGIN
  -- Lock the room row for update to prevent race conditions
  SELECT id, status, guest_user_id, expires_at
  INTO v_room_id, v_room_status, v_current_guest, v_expires_at
  FROM battle_rooms
  WHERE room_code = UPPER(p_room_code)
  FOR UPDATE;

  -- Validate room exists
  IF v_room_id IS NULL THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND: Room with code % not found', p_room_code
      USING HINT = 'Please check the room code';
  END IF;

  -- Validate room is waiting
  IF v_room_status != 'waiting' THEN
    RAISE EXCEPTION 'ROOM_ALREADY_STARTED: Room is in % state', v_room_status
      USING HINT = 'Cannot join a room that has already started';
  END IF;

  -- Validate room is not full
  IF v_current_guest IS NOT NULL THEN
    RAISE EXCEPTION 'ROOM_FULL: Room already has a guest'
      USING HINT = 'This room can only have 2 players';
  END IF;

  -- Validate room has not expired
  IF v_expires_at <= NOW() THEN
    RAISE EXCEPTION 'ROOM_EXPIRED: Room expired at %', v_expires_at
      USING HINT = 'Please ask the host to create a new room';
  END IF;

  -- Update room with guest information
  UPDATE battle_rooms
  SET
    guest_user_id = p_guest_user_id,
    guest_session_id = p_guest_session_id,
    updated_at = NOW()
  WHERE id = v_room_id;

  -- Return the updated room as JSON
  SELECT to_jsonb(r.*) INTO v_result
  FROM battle_rooms r
  WHERE r.id = v_room_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.join_battle_room(TEXT, UUID, TEXT) TO authenticated, anon;

-- Function: leave_battle_room
-- Purpose: Allow a guest to leave a room before it starts
-- Security: Only the guest themselves can leave
CREATE OR REPLACE FUNCTION public.leave_battle_room(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest_user_id UUID;
  v_room_status TEXT;
  v_result jsonb;
BEGIN
  -- Lock the room row for update
  SELECT guest_user_id, status
  INTO v_guest_user_id, v_room_status
  FROM battle_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Validate room exists
  IF v_guest_user_id IS NULL AND v_room_status IS NULL THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND: Room with id % not found', p_room_id;
  END IF;

  -- Validate user is the guest
  IF v_guest_user_id != p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only the guest can leave the room'
      USING HINT = 'You are not the guest of this room';
  END IF;

  -- Validate room is still waiting
  IF v_room_status != 'waiting' THEN
    RAISE EXCEPTION 'ROOM_ALREADY_STARTED: Cannot leave a room that has started'
      USING HINT = 'Room is in % state', v_room_status;
  END IF;

  -- Clear guest information
  UPDATE battle_rooms
  SET
    guest_user_id = NULL,
    guest_session_id = NULL,
    updated_at = NOW()
  WHERE id = p_room_id;

  -- Return the updated room as JSON
  SELECT to_jsonb(r.*) INTO v_result
  FROM battle_rooms r
  WHERE r.id = p_room_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.leave_battle_room(UUID, UUID) TO authenticated, anon;

-- Function: start_battle_room
-- Purpose: Allow the host to start a room once both players are present
-- Security: Only the host can start the room
CREATE OR REPLACE FUNCTION public.start_battle_room(
  p_room_id UUID,
  p_host_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_user_id UUID;
  v_guest_user_id UUID;
  v_room_status TEXT;
  v_result jsonb;
BEGIN
  -- Lock the room row for update
  SELECT host_user_id, guest_user_id, status
  INTO v_host_user_id, v_guest_user_id, v_room_status
  FROM battle_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Validate room exists
  IF v_host_user_id IS NULL THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND: Room with id % not found', p_room_id;
  END IF;

  -- Validate user is the host
  IF v_host_user_id != p_host_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only the host can start the room'
      USING HINT = 'You are not the host of this room';
  END IF;

  -- Validate room has a guest
  IF v_guest_user_id IS NULL THEN
    RAISE EXCEPTION 'ROOM_NOT_READY: Cannot start room without a guest'
      USING HINT = 'Wait for a guest to join';
  END IF;

  -- Validate room is in waiting state
  IF v_room_status != 'waiting' THEN
    RAISE EXCEPTION 'INVALID_STATE: Room is already in % state', v_room_status
      USING HINT = 'Room must be in waiting state to start';
  END IF;

  -- Update room status to in_progress and set started_at
  UPDATE battle_rooms
  SET
    status = 'in_progress',
    started_at = NOW(),
    updated_at = NOW()
  WHERE id = p_room_id;

  -- Return the updated room as JSON
  SELECT to_jsonb(r.*) INTO v_result
  FROM battle_rooms r
  WHERE r.id = p_room_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.start_battle_room(UUID, UUID) TO authenticated, anon;

-- Function: complete_battle_room
-- Purpose: Mark a room as completed when all questions are answered
-- Security: Either participant can mark the room as complete
CREATE OR REPLACE FUNCTION public.complete_battle_room(
  p_room_id UUID,
  p_user_id UUID
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_user_id UUID;
  v_guest_user_id UUID;
  v_room_status TEXT;
  v_result jsonb;
BEGIN
  -- Lock the room row for update
  SELECT host_user_id, guest_user_id, status
  INTO v_host_user_id, v_guest_user_id, v_room_status
  FROM battle_rooms
  WHERE id = p_room_id
  FOR UPDATE;

  -- Validate room exists
  IF v_host_user_id IS NULL THEN
    RAISE EXCEPTION 'ROOM_NOT_FOUND: Room with id % not found', p_room_id;
  END IF;

  -- Validate user is a participant
  IF v_host_user_id != p_user_id AND v_guest_user_id != p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Only participants can complete the room'
      USING HINT = 'You are not a participant of this room';
  END IF;

  -- Validate room is in progress
  IF v_room_status != 'in_progress' THEN
    RAISE EXCEPTION 'INVALID_STATE: Room must be in progress to complete'
      USING HINT = 'Room is in % state', v_room_status;
  END IF;

  -- Update room status to completed and set completed_at
  UPDATE battle_rooms
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_room_id;

  -- Return the updated room as JSON
  SELECT to_jsonb(r.*) INTO v_result
  FROM battle_rooms r
  WHERE r.id = p_room_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.complete_battle_room(UUID, UUID) TO authenticated, anon;

-- Add helpful comments
COMMENT ON FUNCTION public.join_battle_room IS 'Allows a guest to securely join a waiting battle room by room code';
COMMENT ON FUNCTION public.leave_battle_room IS 'Allows a guest to leave a battle room before it starts';
COMMENT ON FUNCTION public.start_battle_room IS 'Allows the host to start a battle room once both players are present';
COMMENT ON FUNCTION public.complete_battle_room IS 'Marks a battle room as completed when all questions are answered';
