import { useState, useCallback } from 'react';
import { BattleRoomService } from '../services/battle-room.service';
import type { BattleRoomInfo } from '../types/battle.types';
import { BattleError } from '../types/battle.types';
import type { DifficultyLevel } from '../types/database.types';

interface UseBattleRoomReturn {
  room: BattleRoomInfo | null;
  isLoading: boolean;
  error: string | null;
  createRoom: (userId: string, sessionId: string, difficulty: DifficultyLevel) => Promise<BattleRoomInfo | null>;
  joinRoom: (roomCode: string, userId: string, sessionId: string) => Promise<BattleRoomInfo | null>;
  startGame: (roomId: string, hostUserId: string) => Promise<BattleRoomInfo | null>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;
  refreshRoom: (roomId: string) => Promise<BattleRoomInfo | null>;
  clearError: () => void;
  setRoom: (room: BattleRoomInfo | null) => void;
}

/**
 * 対戦ルーム管理フック
 */
export function useBattleRoom(): UseBattleRoomReturn {
  const [room, setRoom] = useState<BattleRoomInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const createRoom = useCallback(
    async (
      userId: string,
      sessionId: string,
      difficulty: DifficultyLevel
    ): Promise<BattleRoomInfo | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const newRoom = await BattleRoomService.createRoom(userId, sessionId, difficulty);
        setRoom(newRoom);
        return newRoom;
      } catch (err) {
        const errorMessage =
          err instanceof BattleError ? err.message : 'ルームの作成に失敗しました';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const joinRoom = useCallback(
    async (
      roomCode: string,
      userId: string,
      sessionId: string
    ): Promise<BattleRoomInfo | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const joinedRoom = await BattleRoomService.joinRoom(roomCode, userId, sessionId);
        setRoom(joinedRoom);
        return joinedRoom;
      } catch (err) {
        const errorMessage =
          err instanceof BattleError ? err.message : 'ルームへの参加に失敗しました';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const startGame = useCallback(
    async (roomId: string, hostUserId: string): Promise<BattleRoomInfo | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const updatedRoom = await BattleRoomService.startGame(roomId, hostUserId);
        setRoom(updatedRoom);
        return updatedRoom;
      } catch (err) {
        const errorMessage =
          err instanceof BattleError ? err.message : 'ゲームの開始に失敗しました';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const leaveRoom = useCallback(async (roomId: string, userId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      await BattleRoomService.leaveRoom(roomId, userId);
      setRoom(null);
    } catch (err) {
      const errorMessage =
        err instanceof BattleError ? err.message : 'ルームからの退出に失敗しました';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshRoom = useCallback(async (roomId: string): Promise<BattleRoomInfo | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const updatedRoom = await BattleRoomService.getRoom(roomId);
      setRoom(updatedRoom);
      return updatedRoom;
    } catch (err) {
      const errorMessage =
        err instanceof BattleError ? err.message : 'ルーム情報の取得に失敗しました';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    room,
    isLoading,
    error,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    refreshRoom,
    clearError,
    setRoom,
  };
}
