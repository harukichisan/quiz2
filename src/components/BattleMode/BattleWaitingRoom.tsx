import { useState, useEffect } from 'react';
import type { BattleRoomInfo } from '../../types/battle.types';

interface BattleWaitingRoomProps {
  room: BattleRoomInfo;
  isHost: boolean;
  onStartGame: () => Promise<void>;
  onLeave: () => Promise<void>;
}

export default function BattleWaitingRoom({
  room,
  isHost,
  onStartGame,
  onLeave,
}: BattleWaitingRoomProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // 残り時間を計算
  useEffect(() => {
    const calculateTimeLeft = () => {
      const expiresAt = new Date(room.expiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeLeft(remaining);
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [room.expiresAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy room code:', error);
    }
  };

  const hasGuest = room.status === 'ready' && room.guestUserId;

  return (
    <div className="surface surface--start">
      <div className="surface__intro">
        <span className="badge">対戦モード</span>
        <h1 className="heading-hero">待機室</h1>
        {isHost && !hasGuest && (
          <p className="lede">
            対戦相手の参加を待っています...
          </p>
        )}
        {isHost && hasGuest && (
          <p className="lede">
            対戦相手が参加しました!ゲームを開始できます
          </p>
        )}
        {!isHost && (
          <p className="lede">
            ホストがゲームを開始するまでお待ちください
          </p>
        )}
      </div>

      <div className="waiting-room">
        <div className="room-info">
          <div className="room-info__item">
            <span className="room-info__label">ルームコード</span>
            <div className="room-code-display">
              <span className="room-code-display__code">{room.roomCode}</span>
              {isHost && (
                <button
                  type="button"
                  className="button button--small"
                  onClick={handleCopyRoomCode}
                >
                  {copied ? 'コピー済み!' : 'コピー'}
                </button>
              )}
            </div>
          </div>

          <div className="room-info__item">
            <span className="room-info__label">難易度</span>
            <span className={`room-info__value difficulty-badge difficulty-badge--${room.difficulty.toLowerCase()}`}>
              {room.difficulty}
            </span>
          </div>

          {isHost && (
            <div className="room-info__item">
              <span className="room-info__label">有効期限</span>
              <span className="room-info__value">
                残り {formatTime(timeLeft)}
              </span>
            </div>
          )}
        </div>

        <div className="player-status">
          <div className="player-card player-card--host">
            <div className="player-card__icon">👤</div>
            <div className="player-card__info">
              <span className="player-card__label">ホスト</span>
              <span className="player-card__status">準備完了</span>
            </div>
          </div>

          <div className={`player-card player-card--guest ${hasGuest ? 'player-card--ready' : ''}`}>
            <div className="player-card__icon">
              {hasGuest ? '👤' : '⏳'}
            </div>
            <div className="player-card__info">
              <span className="player-card__label">ゲスト</span>
              <span className="player-card__status">
                {hasGuest ? '準備完了' : '待機中...'}
              </span>
            </div>
          </div>
        </div>

        {isHost && !hasGuest && (
          <div className="waiting-room__instructions">
            <p>👆 ルームコードを友達に共有してください</p>
            <p>参加したら自動的にゲームを開始できます</p>
          </div>
        )}
      </div>

      <div className="waiting-room__actions">
        {isHost && hasGuest && (
          <button
            type="button"
            className="button button--large button--primary"
            onClick={onStartGame}
          >
            ゲームを開始
          </button>
        )}

        <button
          type="button"
          className="button button--text"
          onClick={onLeave}
        >
          ← ルームを退出
        </button>
      </div>
    </div>
  );
}
