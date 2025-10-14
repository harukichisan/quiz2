import { useState, useEffect, useCallback } from 'react';
import { useSessionId } from '../../hooks/useSessionId';
import { useBattleRoom } from '../../hooks/useBattleRoom';
import { useRealtimeSync } from '../../hooks/useRealtimeSync';
import { useBattleGame } from '../../hooks/useBattleGame';
import type { DifficultyLevel } from '../../types/database.types';
import type { BattleResult } from '../../types/battle.types';
import { BattleAnswerService } from '../../services/battle-answer.service';
import { QuestionService, type Question } from '../../services/question.service';

import ModeSelectScreen from './ModeSelectScreen';
import BattleLobby from './BattleLobby';
import BattleWaitingRoom from './BattleWaitingRoom';
import BattleGameScreen from './BattleGameScreen';
import BattleResultScreen from './BattleResultScreen';

type BattleScreen =
  | 'mode-select'
  | 'lobby'
  | 'waiting'
  | 'playing'
  | 'result';

interface BattleModeControllerProps {
  userId: string; // Supabase Auth のユーザーID
  onBackToHome: () => void;
}

export default function BattleModeController({
  userId,
  onBackToHome,
}: BattleModeControllerProps) {
  const sessionId = useSessionId();
  const [screen, setScreen] = useState<BattleScreen>('mode-select');
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [battleResult, setBattleResult] = useState<BattleResult | null>(null);

  const {
    room,
    isLoading,
    error,
    createRoom,
    joinRoom,
    startGame,
    leaveRoom,
    setRoom,
    clearError,
  } = useBattleRoom();

  // Realtime同期
  const { opponentStatus } = useRealtimeSync({
    roomId: room?.id || null,
    userId,
    onRoomUpdate: (updatedRoom) => {
      setRoom(updatedRoom);

      // ステータスに応じて画面遷移
      if (updatedRoom.status === 'playing' && screen === 'waiting') {
        setScreen('playing');
      } else if (updatedRoom.status === 'finished' && screen === 'playing') {
        handleGameFinished(updatedRoom.id);
      }
    },
  });

  // ゲームロジック
  const {
    timeLeft,
    isAnswered,
    recordAnswer,
    resetTimer,
  } = useBattleGame({
    room,
    userId,
    sessionId,
    onRoomUpdate: setRoom,
  });

  // 現在の問題を取得
  useEffect(() => {
    const fetchCurrentQuestion = async () => {
      if (room && room.status === 'playing') {
        const questionId = room.questionIds[room.currentQuestionIndex];
        const question = await QuestionService.getQuestionById(questionId);
        if (question) {
          setCurrentQuestion(question);
        }
      }
    };

    fetchCurrentQuestion();
  }, [room?.currentQuestionIndex, room?.status]);

  const isHost = room ? room.hostUserId === userId : false;

  // ルーム作成
  const handleCreateRoom = useCallback(
    async (difficulty: DifficultyLevel) => {
      const newRoom = await createRoom(userId, sessionId, difficulty);
      if (newRoom) {
        setScreen('waiting');
      }
    },
    [createRoom, userId, sessionId]
  );

  // ルーム参加
  const handleJoinRoom = useCallback(
    async (roomCode: string) => {
      const joinedRoom = await joinRoom(roomCode, userId, sessionId);
      if (joinedRoom) {
        setScreen('waiting');
      }
    },
    [joinRoom, userId, sessionId]
  );

  // ゲーム開始
  const handleStartGame = useCallback(async () => {
    if (!room) return;
    const updatedRoom = await startGame(room.id);
    if (updatedRoom?.status === 'playing') {
      setScreen('playing');
      resetTimer();
    }
  }, [room, startGame, resetTimer]);

  // ルーム退出
  const handleLeaveRoom = useCallback(async () => {
    if (room) {
      await leaveRoom(room.id, userId);
    }
    setScreen('lobby');
  }, [room, leaveRoom, userId]);

  // 回答処理
  const handleAnswer = useCallback(
    async (_choice: string, isCorrect: boolean, answerTime: number) => {
      if (!room || !currentQuestion) return;

      await recordAnswer(
        currentQuestion.id,
        isCorrect,
        answerTime
      );
    },
    [room, currentQuestion, recordAnswer]
  );

  // ゲーム終了時の処理
  const handleGameFinished = useCallback(
    async (roomId: string) => {
      try {
        // 統計を取得
        const playerStats = await BattleAnswerService.getPlayerStats(roomId, userId);
        const opponentUserId = isHost ? room?.guestUserId : room?.hostUserId;
        const opponentStats = opponentUserId
          ? await BattleAnswerService.getPlayerStats(roomId, opponentUserId)
          : { correctAnswers: 0, averageAnswerTime: 0, fastestAnswer: 0 };

        if (room) {
          const result: BattleResult = {
            roomId: room.id,
            hostScore: room.hostScore,
            guestScore: room.guestScore,
            winner:
              room.hostScore > room.guestScore
                ? 'host'
                : room.guestScore > room.hostScore
                ? 'guest'
                : 'draw',
            totalQuestions: room.questionIds.length,
            playerStats,
            opponentStats,
          };

          setBattleResult(result);
          setScreen('result');
        }
      } catch (error) {
        console.error('Failed to fetch battle result:', error);
      }
    },
    [userId, isHost, room]
  );

  // 再戦
  const handleRematch = useCallback(async () => {
    if (!room) return;
    await handleCreateRoom(room.difficulty);
  }, [room, handleCreateRoom]);

  // ロビーに戻る
  const handleBackToLobby = useCallback(() => {
    setScreen('lobby');
    setBattleResult(null);
    setRoom(null);
  }, [setRoom]);

  // エラークリア
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  // 画面レンダリング
  if (screen === 'mode-select') {
    return (
      <ModeSelectScreen
        onSelectSinglePlayer={onBackToHome}
        onSelectBattleMode={() => setScreen('lobby')}
      />
    );
  }

  if (screen === 'lobby') {
    return (
      <BattleLobby
        isLoading={isLoading}
        error={error}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onBack={() => setScreen('mode-select')}
      />
    );
  }

  if (screen === 'waiting' && room) {
    return (
      <BattleWaitingRoom
        room={room}
        isHost={isHost}
        onStartGame={handleStartGame}
        onLeave={handleLeaveRoom}
      />
    );
  }

  if (screen === 'playing' && room && currentQuestion) {
    return (
      <BattleGameScreen
        room={room}
        currentQuestion={currentQuestion}
        timeLeft={timeLeft}
        isAnswered={isAnswered}
        opponentStatus={opponentStatus}
        onAnswer={handleAnswer}
        playerScore={isHost ? room.hostScore : room.guestScore}
        opponentScore={isHost ? room.guestScore : room.hostScore}
      />
    );
  }

  if (screen === 'result' && battleResult) {
    return (
      <BattleResultScreen
        result={battleResult}
        isHost={isHost}
        onRematch={handleRematch}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  // フォールバック
  return (
    <div className="surface surface--start">
      <p>Loading...</p>
    </div>
  );
}
