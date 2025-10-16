-- ================================================
-- battle_rooms の updated_at 自動更新トリガー追加
-- ================================================

-- トリガー関数の作成
CREATE OR REPLACE FUNCTION update_battle_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 既存のトリガーを削除（あれば）
DROP TRIGGER IF EXISTS trigger_update_battle_rooms_updated_at ON battle_rooms;

-- トリガーの作成
CREATE TRIGGER trigger_update_battle_rooms_updated_at
  BEFORE UPDATE ON battle_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_battle_rooms_updated_at();

-- Realtimeが有効か確認
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('battle_rooms', 'battle_answers');

-- 確認メッセージ
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'updated_atトリガーを追加しました！';
  RAISE NOTICE 'これでルーム更新時にRealtime通知が送られます';
  RAISE NOTICE '========================================';
END
$$;
