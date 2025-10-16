import { RealtimeChannel } from '@supabase/supabase-js';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { getSupabaseClient } from '../lib/supabase';
import type { BattleRoomInfo, BattleAnswer } from '../types/battle.types';
import { mapToBattleRoomInfo, mapToBattleAnswer } from '../types/battle.types';
import type { Database } from '../types/database.types';

type BattleRoomRow = Database['public']['Tables']['battle_rooms']['Row'];
type BattleAnswerRow = Database['public']['Tables']['battle_answers']['Row'];

type RoomUpdateCallback = (room: BattleRoomInfo) => void;
type AnswerUpdateCallback = (answer: BattleAnswer) => void;
type PresenceCallback = (presences: any) => void;

function isBattleRoomRow(row: unknown): row is BattleRoomRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    'room_code' in row &&
    'host_user_id' in row &&
    'status' in row
  );
}

function isBattleAnswerRow(row: unknown): row is BattleAnswerRow {
  return (
    typeof row === 'object' &&
    row !== null &&
    'id' in row &&
    'room_id' in row &&
    'question_id' in row &&
    'player_user_id' in row
  );
}

/**
 * Realtime同期サービス
 * Supabase Realtimeを使用して対戦ルームの状態変更を監視する
 */
export class BattleRealtimeService {
  private channel: RealtimeChannel | null = null;
  private roomId: string | null = null;

  /**
   * ルームの購読を開始する
   */
  subscribe(
    roomId: string,
    userId: string,
    sessionId: string,
    callbacks: {
      onRoomUpdate?: RoomUpdateCallback;
      onAnswerUpdate?: AnswerUpdateCallback;
      onPresenceUpdate?: PresenceCallback;
    }
  ): void {
    if (this.channel) {
      this.unsubscribe();
    }

    const supabase = getSupabaseClient();
    this.roomId = roomId;

    // チャンネル名を作成
    const channelName = `battle_room:${roomId}`;

    this.channel = supabase.channel(channelName, {
      config: {
        presence: {
          // Use sessionId as presence key to distinguish multi-device sessions of the same user
          key: sessionId,
        },
      },
    });

    // battle_roomsテーブルの変更を購読
    if (callbacks.onRoomUpdate) {
      this.channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battle_rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<BattleRoomRow>) => {
          console.log('[Realtime] Received UPDATE:', payload);
          if (isBattleRoomRow(payload.new)) {
            callbacks.onRoomUpdate?.(mapToBattleRoomInfo(payload.new));
          } else {
            console.warn(
              '[Realtime] Received invalid room payload:',
              payload.new
            );
          }
        }
      );
    }

    // battle_answersテーブルの挿入を購読
    if (callbacks.onAnswerUpdate) {
      this.channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_answers',
          filter: `room_id=eq.${roomId}`,
        },
        (payload: RealtimePostgresChangesPayload<BattleAnswerRow>) => {
          console.log('[Realtime] Received INSERT:', payload);
          if (isBattleAnswerRow(payload.new)) {
            callbacks.onAnswerUpdate?.(mapToBattleAnswer(payload.new));
          } else {
            console.warn(
              '[Realtime] Received invalid answer payload:',
              payload.new
            );
          }
        }
      );
    }

    // Presenceの変更を購読
    if (callbacks.onPresenceUpdate) {
      this.channel.on('presence', { event: 'sync' }, () => {
        const presenceState = this.channel?.presenceState();
        callbacks.onPresenceUpdate?.(presenceState);
      });

      this.channel.on('presence', { event: 'join' }, ({ newPresences }) => {
        console.log('User joined:', newPresences);
      });

      this.channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
        console.log('User left:', leftPresences);
      });
    }

    // チャンネルを購読
    this.channel.subscribe(async (status) => {
      console.log(`[Realtime] Channel status: ${status}`);
      if (status === 'SUBSCRIBED') {
        console.log(`[Realtime] Successfully subscribed to ${channelName}`);
        // Presence情報を送信
        await this.channel?.track({
          online_at: new Date().toISOString(),
          user_id: userId,
          session_id: sessionId,
          has_answered: false,
        });
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Realtime] Channel error for ${channelName}`);
      } else if (status === 'TIMED_OUT') {
        console.error(`[Realtime] Channel timed out for ${channelName}`);
      } else if (status === 'CLOSED') {
        console.log(`[Realtime] Channel closed for ${channelName}`);
      }
    });
  }

  /**
   * 購読を解除する
   */
  unsubscribe(): void {
    if (this.channel) {
      this.channel.unsubscribe();
      this.channel = null;
      this.roomId = null;
    }
  }

  /**
   * 現在のチャンネルステータスを取得
   */
  getStatus(): string {
    return this.channel?.state || 'CLOSED';
  }

  /**
   * Presenceの状態を取得
   */
  getPresenceState(): any {
    return this.channel?.presenceState() || {};
  }

  /**
   * Presenceの状態を更新する（回答完了時など）
   */
  async updatePresence(update: Partial<{
    has_answered: boolean;
    online_at: string;
  }>): Promise<void> {
    if (!this.channel) {
      console.warn('Cannot update presence: channel not initialized');
      return;
    }

    const currentState = this.channel.presenceState();
    const myPresence = Object.values(currentState)[0]?.[0] || {};

    await this.channel.track({
      ...myPresence,
      ...update,
    });
  }

  /**
   * カスタムイベントをブロードキャストする
   */
  async broadcast(event: string, payload: any): Promise<void> {
    if (!this.channel) {
      console.warn('Cannot broadcast: channel not initialized');
      return;
    }

    await this.channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }
}

// シングルトンインスタンス
let realtimeServiceInstance: BattleRealtimeService | null = null;

/**
 * BattleRealtimeServiceのシングルトンインスタンスを取得
 */
export function getBattleRealtimeService(): BattleRealtimeService {
  if (!realtimeServiceInstance) {
    realtimeServiceInstance = new BattleRealtimeService();
  }
  return realtimeServiceInstance;
}
