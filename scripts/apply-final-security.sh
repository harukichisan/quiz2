#!/bin/bash
# 最終的なセキュリティ強化スクリプト
# RPC関数とRLSポリシーを適用
set -e

echo "🔐 バトルモードのセキュリティ強化を開始します..."
echo ""

# Step 1: RPC関数の作成
echo "📝 Step 1: RPC関数を作成..."
npx supabase db execute --file supabase/rpc-battle-functions.sql
echo "✅ RPC関数の作成が完了しました"
echo ""

# Step 2: RLSポリシーの強化
echo "🛡️  Step 2: RLSポリシーを強化..."
npx supabase db execute --file supabase/rls-final-hardening.sql
echo "✅ RLSポリシーの強化が完了しました"
echo ""

# Step 3: ポリシーの確認
echo "📊 Step 3: 適用されたポリシーを確認..."
npx supabase db execute "
SELECT
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('battle_rooms', 'battle_answers')
ORDER BY tablename, policyname;
"
echo ""

# Step 4: RPC関数の確認
echo "🔍 Step 4: 作成されたRPC関数を確認..."
npx supabase db execute "
SELECT
  proname as function_name,
  prosecdef as security_definer,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('join_battle_room', 'leave_battle_room', 'start_battle_room', 'complete_battle_room')
ORDER BY proname;
"
echo ""

echo "✨ セキュリティ強化が完了しました！"
echo ""
echo "🎯 次の手順:"
echo "  1. TypeScriptのビルドを実行: npm run build"
echo "  2. ローカルでテスト: npm run dev"
echo "  3. ゲストが正常に参加・退出できることを確認"
echo ""
