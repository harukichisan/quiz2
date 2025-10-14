-- ================================================
-- Row Level Security (RLS) の修正
-- 匿名ユーザーでも動作するように変更
-- ================================================

-- battle_rooms のポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "ユーザーは参加しているルームを閲覧可能" ON battle_rooms;
DROP POLICY IF EXISTS "ユーザーはルームを作成可能" ON battle_rooms;
DROP POLICY IF EXISTS "ユーザーは参加しているルームを更新可能" ON battle_rooms;

-- 新しいポリシー: すべてのユーザーがルームを閲覧可能（セキュリティは緩和）
CREATE POLICY "すべてのユーザーがルームを閲覧可能"
  ON battle_rooms
  FOR SELECT
  USING (true);

-- 新しいポリシー: すべてのユーザーがルームを作成可能
CREATE POLICY "すべてのユーザーがルームを作成可能"
  ON battle_rooms
  FOR INSERT
  WITH CHECK (true);

-- 新しいポリシー: すべてのユーザーがルームを更新可能
CREATE POLICY "すべてのユーザーがルームを更新可能"
  ON battle_rooms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- battle_answers のポリシーを修正

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "ユーザーは参加しているルームの回答を閲覧可能" ON battle_answers;
DROP POLICY IF EXISTS "ユーザーは自分の回答を記録可能" ON battle_answers;

-- 新しいポリシー: すべてのユーザーが回答を閲覧可能
CREATE POLICY "すべてのユーザーが回答を閲覧可能"
  ON battle_answers
  FOR SELECT
  USING (true);

-- 新しいポリシー: すべてのユーザーが回答を記録可能
CREATE POLICY "すべてのユーザーが回答を記録可能"
  ON battle_answers
  FOR INSERT
  WITH CHECK (true);

-- 完了メッセージ
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLSポリシーの修正が完了しました！';
  RAISE NOTICE '匿名ユーザーでも対戦モードが利用可能になります';
  RAISE NOTICE '========================================';
END
$$;
