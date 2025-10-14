import { useEffect, useState, useCallback } from 'react';
import { getBattleRealtimeService } from '../services/battle-realtime.service';
import type { BattleRoomInfo, BattleAnswer, OpponentStatus, ConnectionStatus } from '../types/battle.types';

interface UseRealtimeSyncOptions {
  roomId: string | null;
  userId: string;
  onRoomUpdate?: (room: BattleRoomInfo) => void;
  onAnswerUpdate?: (answer: BattleAnswer) => void;
}

interface UseRealtimeSyncReturn {
  connectionStatus: ConnectionStatus;
  opponentStatus: OpponentStatus;
  presenceData: any;
}

/**
 * Realtime同期フック
 * Supabase Realtimeを使用して対戦ルームの状態変更を監視する
 */
export function useRealtimeSync({
  roomId,
  userId,
  onRoomUpdate,
  onAnswerUpdate,
}: UseRealtimeSyncOptions): UseRealtimeSyncReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [opponentStatus, setOpponentStatus] = useState<OpponentStatus>({
    userId: null,
    sessionId: null,
    connectionStatus: 'disconnected',
    hasAnswered: false,
  });
  const [presenceData, setPresenceData] = useState<any>({});

  const handlePresenceUpdate = useCallback((presences: any) => {
    setPresenceData(presences);

    // 相手のプレゼンス情報を抽出
    const otherUsers = Object.keys(presences).filter((key) => key !== userId);

    if (otherUsers.length > 0) {
      const opponentKey = otherUsers[0];
      const opponentPresence = presences[opponentKey][0];

      setOpponentStatus({
        userId: opponentPresence?.user_id || null,
        sessionId: opponentPresence?.session_id || null,
        connectionStatus: 'connected',
        hasAnswered: opponentPresence?.has_answered || false,
      });
    } else {
      setOpponentStatus({
        userId: null,
        sessionId: null,
        connectionStatus: 'disconnected',
        hasAnswered: false,
      });
    }
  }, [userId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const realtimeService = getBattleRealtimeService();

    // 購読を開始
    realtimeService.subscribe(roomId, userId, {
      onRoomUpdate,
      onAnswerUpdate,
      onPresenceUpdate: handlePresenceUpdate,
    });

    // 接続状態を監視
    const checkConnection = setInterval(() => {
      const status = realtimeService.getStatus();

      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        setConnectionStatus('reconnecting');
      } else {
        setConnectionStatus('disconnected');
      }
    }, 1000);

    return () => {
      clearInterval(checkConnection);
      realtimeService.unsubscribe();
      setConnectionStatus('disconnected');
    };
  }, [roomId, userId, onRoomUpdate, onAnswerUpdate, handlePresenceUpdate]);

  return {
    connectionStatus,
    opponentStatus,
    presenceData,
  };
}
