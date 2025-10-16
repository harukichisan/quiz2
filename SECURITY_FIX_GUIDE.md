# バトルモード セキュリティ修正ガイド

## 🚨 問題の概要

### 以前の問題
元のRLSポリシー (`supabase/migrations/001_battle_mode.sql:193-203`) がゲスト参加を阻害していました。

**問題の詳細:**
```sql
-- 問題のあったポリシー
CREATE POLICY battle_rooms_update ON battle_rooms
  FOR UPDATE
  USING (
    auth.uid() = host_user_id
    OR auth.uid() = guest_user_id  -- ゲストが参加する"前"はguest_user_idがNULL
  )
  WITH CHECK (
    auth.uid() IN (host_user_id, guest_user_id)  -- 参加前のゲストは権限なし
  );
```

**発生していた問題:**
1. ゲストが参加する**前**は `guest_user_id` が `NULL` なので、ポリシーチェックに失敗
2. ゲストが退出する際も、自分のスロットを `NULL` に戻すことができない
3. 結果として、危険な全開放ポリシーで対処していた

## ✅ 解決策

### 1. RPC関数によるセキュアな操作

ゲストの参加・退出をRPC関数 (SECURITY DEFINER) でサービスロールにて実行することで、RLSポリシーを迂回しつつセキュアに操作を実現。

**作成したRPC関数:**
- `join_battle_room(p_room_code, p_guest_user_id, p_guest_session_id)`
  - ゲストがルームに参加
  - ルーム状態の検証（waiting, 未満員, 期限内）
  - レースコンディション防止（FOR UPDATE ロック）

- `leave_battle_room(p_room_id, p_user_id)`
  - ゲストがルームから退出
  - ゲスト本人のみ実行可能
  - waiting状態のみ退出可能

- `start_battle_room(p_room_id, p_host_user_id)`
  - ホストがゲーム開始
  - ゲスト参加済みチェック
  - ホスト本人のみ実行可能

- `complete_battle_room(p_room_id, p_user_id)`
  - ゲーム完了処理
  - 参加者のみ実行可能

### 2. RLSポリシーの適切な強化

危険な全開放ポリシーを削除し、最小権限の原則に基づいた適切なポリシーを適用。

**新しいポリシー構成:**

#### battle_rooms
- **SELECT**
  - `battle_rooms_select_participant`: 参加者は自分のルームを読める
  - `battle_rooms_select_waiting`: 誰でもwaiting状態のルームを発見できる（コード参加用）

- **INSERT**
  - `battle_rooms_insert_host`: ホストのみがルームを作成可能

- **UPDATE**
  - `battle_rooms_update_status`: 参加者のみがステータス更新可能
  - 参加・退出はRPC関数を使用（直接UPDATEは使用しない）

- **DELETE**
  - `battle_rooms_delete_host`: ホストのみが削除可能

#### battle_answers
- **SELECT**
  - `battle_answers_select_participant`: ルーム参加者のみが回答を読める

- **INSERT**
  - `battle_answers_insert_player`: 本人かつ参加者のみが回答を記録可能

## 📝 適用手順

### ステップ1: Supabaseにスクリプトを適用

```bash
# セキュリティ強化を適用
./scripts/apply-final-security.sh
```

このスクリプトは以下を実行します:
1. RPC関数の作成 (`supabase/rpc-battle-functions.sql`)
2. RLSポリシーの強化 (`supabase/rls-final-hardening.sql`)
3. 適用結果の確認

### ステップ2: TypeScriptビルドの確認

```bash
npm run build
```

エラーがないことを確認。

### ステップ3: ローカルテスト

```bash
npm run dev
```

ブラウザで以下をテスト:
1. ✅ ホストがルームを作成できる
2. ✅ ゲストがルームコードでルームに参加できる
3. ✅ ゲストがwaiting状態で退出できる
4. ✅ ホストがゲーム開始できる（ゲスト参加後）
5. ✅ ゲーム中は両者が回答を記録できる
6. ✅ 他のユーザーがルーム情報や回答を見られない

### ステップ4: 本番デプロイ

```bash
# Vercelにデプロイ
git add .
git commit -m "fix: secure guest join/leave with RPC functions and proper RLS"
git push origin main
```

## 🔐 セキュリティ改善のポイント

### Before (危険な状態)
```sql
-- 全員がルームを更新できる（危険！）
CREATE POLICY "すべてのユーザーがルームを更新可能" ON battle_rooms
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
```

### After (セキュア)
```sql
-- 参加者のみがステータス更新可能
CREATE POLICY battle_rooms_update_status ON battle_rooms
  FOR UPDATE
  USING (
    auth.uid() = host_user_id OR auth.uid() = guest_user_id
  )
  WITH CHECK (
    auth.uid() = host_user_id OR auth.uid() = guest_user_id
  );

-- 参加・退出はRPC関数経由（SECURITY DEFINER）
-- 関数内で詳細な権限チェックとバリデーション実施
```

## 📊 変更ファイル一覧

### 新規作成
- `supabase/rpc-battle-functions.sql` - RPC関数定義
- `supabase/rls-final-hardening.sql` - 最終的なRLSポリシー
- `scripts/apply-final-security.sh` - 適用スクリプト
- `SECURITY_FIX_GUIDE.md` - このドキュメント

### 修正
- `src/services/battle-room.service.ts`
  - `joinRoom()` - RPC関数を使用
  - `leaveRoom()` - RPC関数を使用
  - `startGame()` - RPC関数を使用（hostUserIdパラメータ追加）

- `src/hooks/useBattleRoom.ts`
  - `startGame()` - hostUserIdパラメータ追加

- `src/components/BattleMode/BattleModeController.tsx`
  - `handleStartGame()` - userIdを渡すように修正

## 🎯 動作確認項目

### 基本フロー
- [ ] ホストがルーム作成 → ルームコード表示
- [ ] ゲストがルームコード入力 → 参加成功
- [ ] ゲストが「退出」ボタン → 正常に退出
- [ ] ホストが「ゲーム開始」 → in_progressに遷移
- [ ] 両者が問題に回答 → 回答が記録される
- [ ] ゲーム終了 → completed状態

### セキュリティ検証
- [ ] 参加していないユーザーが他のルームを見られない
- [ ] 参加していないユーザーが回答を見られない
- [ ] ゲスト以外のユーザーがleave_battle_roomを実行できない
- [ ] ホスト以外のユーザーがstart_battle_roomを実行できない
- [ ] 満員のルームに参加しようとするとエラー
- [ ] 期限切れのルームに参加しようとするとエラー

## 🐛 トラブルシューティング

### RPC関数が見つからない
```bash
# RPC関数を再適用
npx supabase db execute --file supabase/rpc-battle-functions.sql
```

### RLSポリシーが適用されていない
```bash
# ポリシーを再適用
npx supabase db execute --file supabase/rls-final-hardening.sql
```

### ゲストが参加できない
1. Supabase Dashboardでログを確認
2. RPC関数のエラーメッセージを確認
3. ルーム状態（status, guest_user_id, expires_at）を確認

```sql
-- ルーム状態の確認
SELECT id, room_code, status, guest_user_id, expires_at
FROM battle_rooms
WHERE room_code = 'XXXX';
```

### TypeScriptビルドエラー
```bash
# 型エラーがある場合は再ビルド
npm run build
```

## 📚 参考情報

### Supabase RLS ドキュメント
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Functions](https://supabase.com/docs/guides/database/functions)
- [SECURITY DEFINER](https://www.postgresql.org/docs/current/sql-createfunction.html)

### 最小権限の原則
- 必要最低限の権限のみを付与
- SECURITY DEFINER関数内で詳細な検証を実施
- RLSポリシーは読み取りを緩く、書き込みを厳格に

## ✨ 今後の改善案

1. **ホストの退出処理**
   - 現在はゲストのみleave_battle_room対応
   - ホストが退出する場合のRPC関数を追加検討

2. **再接続処理**
   - セッション切断時の自動再参加機能

3. **監査ログ**
   - RPC関数実行のログ記録
   - 不正アクセス試行の検知

4. **レート制限**
   - 短時間での大量ルーム作成を防止
   - RPC関数の呼び出し頻度制限
