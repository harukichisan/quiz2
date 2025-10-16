#!/bin/bash
# RLSポリシー適用スクリプト
set -e

echo "🔐 RLSポリシーの適用を開始します..."

# Supabase CLIでSQL実行
npx supabase db execute --file supabase/rls-hardening.sql

echo "✅ RLSポリシーの適用が完了しました"
echo ""
echo "📊 ポリシーを確認するには以下を実行:"
echo "npx supabase db execute \"SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('battle_rooms', 'battle_answers')\""
