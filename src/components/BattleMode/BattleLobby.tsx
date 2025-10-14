import { useState } from 'react';
import type { DifficultyLevel } from '../../types/database.types';
import ErrorNotice from '../ErrorNotice';

interface BattleLobbyProps {
  isLoading: boolean;
  error: string | null;
  onCreateRoom: (difficulty: DifficultyLevel) => Promise<void>;
  onJoinRoom: (roomCode: string) => Promise<void>;
  onBack: () => void;
}

const DIFFICULTY_OPTIONS: Array<{
  value: DifficultyLevel;
  label: string;
  description: string;
}> = [
  { value: 'C', label: 'かんたん', description: '基本的な問題' },
  { value: 'B', label: 'ふつう', description: '標準レベル' },
  { value: 'A', label: 'むずかしい', description: '知識が必要' },
  { value: 'S', label: '超むずかしい', description: '最難関問題' },
];

export default function BattleLobby({
  isLoading,
  error,
  onCreateRoom,
  onJoinRoom,
  onBack,
}: BattleLobbyProps) {
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('B');
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = async () => {
    await onCreateRoom(selectedDifficulty);
  };

  const handleJoinRoom = async () => {
    if (roomCode.trim().length !== 6) {
      return;
    }
    await onJoinRoom(roomCode.toUpperCase());
  };

  if (mode === 'select') {
    return (
      <div className="surface surface--start">
        <div className="surface__intro">
          <h1 className="heading-hero">対戦モード</h1>
          <p className="lede">
            ルームを作成するか、友達のルームに参加しよう
          </p>
        </div>

        <div className="battle-lobby__buttons">
          <button
            type="button"
            className="button button--large button--primary"
            onClick={() => setMode('create')}
            disabled={isLoading}
          >
            ルームを作成
          </button>

          <button
            type="button"
            className="button button--large"
            onClick={() => setMode('join')}
            disabled={isLoading}
          >
            ルームに参加
          </button>
        </div>

        <button
          type="button"
          className="button button--text"
          onClick={onBack}
          disabled={isLoading}
        >
          ← 戻る
        </button>
      </div>
    );
  }

  if (mode === 'create') {
    return (
      <div className="surface surface--start">
        <div className="surface__intro">
          <h1 className="heading-hero">ルーム作成</h1>
          <p className="lede">
            難易度を選んで対戦ルームを作成しよう
          </p>
        </div>

        <section className="difficulty-selector" aria-label="難易度を選択">
          <h2 className="difficulty-selector__title">難易度を選ぶ</h2>
          <div className="difficulty-selector__options">
            {DIFFICULTY_OPTIONS.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`difficulty-option ${selectedDifficulty === option.value ? 'is-active' : ''}`}
                onClick={() => setSelectedDifficulty(option.value)}
                disabled={isLoading}
                aria-pressed={selectedDifficulty === option.value}
              >
                <span className="difficulty-option__value">{option.value}</span>
                <span className="difficulty-option__label">{option.label}</span>
                <span className="difficulty-option__description">{option.description}</span>
              </button>
            ))}
          </div>
        </section>

        {error && <ErrorNotice message={error} />}

        <div className="battle-lobby__buttons">
          <button
            type="button"
            className="button button--large button--primary"
            onClick={handleCreateRoom}
            disabled={isLoading}
          >
            {isLoading ? '作成中...' : 'ルームを作成'}
          </button>

          <button
            type="button"
            className="button button--text"
            onClick={() => setMode('select')}
            disabled={isLoading}
          >
            ← 戻る
          </button>
        </div>
      </div>
    );
  }

  // mode === 'join'
  return (
    <div className="surface surface--start">
      <div className="surface__intro">
        <h1 className="heading-hero">ルームに参加</h1>
        <p className="lede">
          友達から教えてもらったルームコードを入力してください
        </p>
      </div>

      <div className="room-code-input">
        <label htmlFor="roomCode" className="room-code-input__label">
          ルームコード（6桁）
        </label>
        <input
          id="roomCode"
          type="text"
          className="room-code-input__field"
          placeholder="ABC123"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          maxLength={6}
          disabled={isLoading}
        />
      </div>

      {error && <ErrorNotice message={error} />}

      <div className="battle-lobby__buttons">
        <button
          type="button"
          className="button button--large button--primary"
          onClick={handleJoinRoom}
          disabled={isLoading || roomCode.trim().length !== 6}
        >
          {isLoading ? '参加中...' : 'ルームに参加'}
        </button>

        <button
          type="button"
          className="button button--text"
          onClick={() => setMode('select')}
          disabled={isLoading}
        >
          ← 戻る
        </button>
      </div>
    </div>
  );
}
