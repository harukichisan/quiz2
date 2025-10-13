# Codex実装指示: シンプルクイズアプリUI改善

## 目的
仕様書に基づいたUI/UXの改善を実施し、視認性・操作性を向上させる

## 対象ファイル
`src/App.tsx`

## 実施する変更

### 1. ゲーム画面ヘッダー情報のレイアウト改善

**現在のコード (203-215行目):**
```tsx
<div className="bg-gray-50 rounded-lg p-4 mb-6">
  <div className="flex justify-between items-center text-lg">
    <span className="font-bold text-gray-700">
      問題 {currentQuestionIndex + 1}/20
    </span>
    <span className={`font-bold ${timeLeft <= 3 ? 'text-red-500' : 'text-blue-500'}`}>
      残り時間: {timeLeft}秒
    </span>
  </div>
  <div className="text-right mt-2">
    <span className="text-xl font-bold text-green-600">スコア: {score}点</span>
  </div>
</div>
```

**変更後:**
```tsx
<div className="bg-gray-50 rounded-lg p-5 mb-6">
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-6">
      <span className="font-bold text-gray-800 text-base">
        問題 {currentQuestionIndex + 1}/20
      </span>
      <span className="text-lg font-bold text-green-600">スコア: {score}点</span>
    </div>
    <span className={`font-bold text-base ${timeLeft <= 3 ? 'text-red-500' : 'text-blue-500'}`}>
      残り時間: {timeLeft}秒
    </span>
  </div>
</div>
```

**変更理由:**
- 問題番号とスコアを左側にグループ化し、視線移動を削減
- 残り時間を右側に配置し、情報の視認性向上
- フォントサイズを仕様準拠(text-lg → text-base: 16px)に調整

---

### 2. 問題文のタイポグラフィ改善

**現在のコード (218-222行目):**
```tsx
<div className="bg-blue-50 rounded-lg p-8 mb-8">
  <p className="text-2xl text-gray-800 text-center font-bold leading-relaxed">
    {currentQuestion?.question}
  </p>
</div>
```

**変更後:**
```tsx
<div className="bg-blue-50 border-2 border-blue-100 rounded-lg p-8 mb-8">
  <p className="text-3xl text-gray-800 text-center font-bold leading-relaxed">
    {currentQuestion?.question}
  </p>
</div>
```

**変更理由:**
- 問題文を text-2xl(24px) → text-3xl(30px) に拡大し、仕様の24px~を満たす
- border-2で枠線を追加し、視覚的階層を強化

---

### 3. 現在の入力エリアの視覚強化

**現在のコード (225-234行目):**
```tsx
<div className="mb-8">
  <div className="text-center mb-3">
    <span className="text-gray-600 text-lg">現在の入力:</span>
  </div>
  <div className="bg-gray-100 rounded-lg p-6 min-h-[80px] flex items-center justify-center">
    <span className="text-4xl font-bold text-gray-800 tracking-wider">
      {inputText || '(まだ入力なし)'}
    </span>
  </div>
</div>
```

**変更後:**
```tsx
<div className="mb-8">
  <div className="text-center mb-3">
    <span className="text-gray-600 text-base">現在の入力:</span>
  </div>
  <div className="bg-gray-100 border-2 border-gray-300 rounded-lg p-6 min-h-[80px] flex items-center justify-center">
    <span className="text-4xl font-bold text-gray-800 tracking-wider">
      {inputText || '(まだ入力なし)'}
    </span>
  </div>
</div>
```

**変更理由:**
- ラベルテキストを text-lg → text-base に調整し、仕様準拠
- border-2で枠線を追加し、入力エリアの存在感を強化

---

### 4. 選択肢ボタンのサイズと間隔の最適化

**現在のコード (244-256行目):**
```tsx
{!showResult && (
  <div className="grid grid-cols-2 gap-4">
    {choices.map((char, index) => (
      <button
        key={index}
        onClick={() => handleChoiceClick(char)}
        className="bg-blue-500 hover:bg-blue-600 text-white text-4xl font-bold py-8 rounded-lg transition-colors active:scale-95"
      >
        {char}
      </button>
    ))}
  </div>
)}
```

**変更後:**
```tsx
{!showResult && (
  <div className="grid grid-cols-2 gap-6">
    {choices.map((char, index) => (
      <button
        key={index}
        onClick={() => handleChoiceClick(char)}
        className="bg-blue-500 hover:bg-blue-600 text-white text-4xl font-bold py-10 px-4 rounded-lg transition-colors active:scale-95 min-h-[100px] shadow-md hover:shadow-lg"
      >
        {char}
      </button>
    ))}
  </div>
)}
```

**変更理由:**
- gap-4 → gap-6: ボタン間隔を広げ、誤タップ防止
- py-8 → py-10: 縦方向paddingを増やし、タップエリア拡大
- min-h-[100px]: 最小高さ100pxで44x44px以上のタップターゲットを保証
- shadow-md追加: ボタンの立体感を強化

---

### 5. 結果表示の視覚改善(オプション)

**現在のコード (237-241行目):**
```tsx
{showResult && (
  <div className={`text-center mb-6 text-3xl font-bold ${showResult === 'correct' ? 'text-green-500' : 'text-red-500'}`}>
    {showResult === 'correct' ? '○ 正解!' : '× 不正解...'}
  </div>
)}
```

**変更後:**
```tsx
{showResult && (
  <div className={`text-center mb-6 p-4 rounded-lg ${showResult === 'correct' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
    <div className="text-4xl font-bold">
      {showResult === 'correct' ? '○ 正解!' : '× 不正解...'}
    </div>
  </div>
)}
```

**変更理由:**
- 背景色を追加し、結果の視認性を向上
- text-3xl → text-4xl: フィードバックメッセージをより目立たせる
- padding追加でバナー風のデザインに

---

## 実装手順

1. `src/App.tsx`を開く
2. 上記の変更を順番に適用する
3. 変更後、ローカル環境で動作確認を実施
4. 特にスマホサイズでの表示とタップ操作を重点的にテスト

## 期待される成果

- ✅ 情報の視認性向上(問題番号、スコア、タイマーの配置改善)
- ✅ タップ操作性の向上(ボタンサイズと間隔の最適化)
- ✅ 視覚的階層の明確化(枠線、背景色による強調)
- ✅ 仕様書準拠のタイポグラフィ(14px~、24px~、32px~)
- ✅ レスポンシブデザインの保証(44x44px以上のタッチターゲット)

## 検証項目

- [ ] PC画面で情報が見やすく配置されているか
- [ ] スマホ画面でボタンがタップしやすいサイズか
- [ ] 色のコントラストが十分で読みやすいか
- [ ] ゲームプレイの流れが直感的か
- [ ] 正解/不正解のフィードバックが明確か
