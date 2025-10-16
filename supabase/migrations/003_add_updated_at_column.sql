-- Add updated_at column to battle_rooms if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'battle_rooms'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE battle_rooms ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at column to battle_answers if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'battle_answers'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE battle_answers ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Update battle_rooms status values to match new schema
UPDATE battle_rooms
SET status = CASE
  WHEN status = 'ready' THEN 'waiting'
  WHEN status = 'playing' THEN 'in_progress'
  WHEN status = 'finished' THEN 'completed'
  WHEN status = 'abandoned' THEN 'completed'
  ELSE status
END
WHERE status IN ('ready', 'playing', 'finished', 'abandoned');

-- Update status check constraint
ALTER TABLE battle_rooms DROP CONSTRAINT IF EXISTS battle_rooms_status_check;
ALTER TABLE battle_rooms ADD CONSTRAINT battle_rooms_status_check
  CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled'));

-- Add completed_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'battle_rooms'
      AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE battle_rooms ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'battle_rooms'
      AND column_name = 'finished_at'
  ) THEN
    EXECUTE $sql$
      UPDATE battle_rooms
      SET completed_at = finished_at
      WHERE status = 'completed'
        AND completed_at IS NULL
        AND finished_at IS NOT NULL
    $sql$;
  END IF;
END $$;
