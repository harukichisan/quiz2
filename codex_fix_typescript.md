# Codex実装指示: TypeScript型エラー修正

## 目的
App.tsxのTypeScriptコンパイルエラーを修正し、ビルドを成功させる

## 現状の問題
`npm run build` 実行時に10個のTypeScriptエラーが発生し、ビルドが失敗している。
これにより、実装済みのUI改善がデプロイに反映されていない。

## 対象ファイル
`src/App.tsx`

## 実施する変更

### 1. 型定義インターフェースの追加（1行目の直後）

**追加位置: 1行目の `import` 文の直後**

```typescript
import React, { useState, useEffect } from 'react';

// ここに追加 ↓
interface Question {
  id: number;
  question: string;
  answer: string;
  category: string;
}
// ここまで ↑

// 問題データ
const questionsData = [
```

**追加理由:** 問題データの型を明示的に定義し、TypeScriptが型を推論できるようにする

---

### 2. useState の型パラメータ追加（46-48行目）

**現在のコード:**
```typescript
const [shuffledQuestions, setShuffledQuestions] = useState([]);
const [choices, setChoices] = useState([]);
const [showResult, setShowResult] = useState(null);
```

**変更後:**
```typescript
const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
const [choices, setChoices] = useState<string[]>([]);
const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);
```

**変更理由:**
- `shuffledQuestions`: Question型の配列であることを明示
- `choices`: 文字列の配列であることを明示
- `showResult`: 'correct', 'incorrect', null のいずれかであることを明示（Union型）

---

### 3. generateChoices 関数の型注釈追加（63行目）

**現在のコード:**
```typescript
const generateChoices = (correctChar) => {
```

**変更後:**
```typescript
const generateChoices = (correctChar: string): string[] => {
```

**変更理由:**
- パラメータ `correctChar` が文字列型であることを明示
- 戻り値が文字列配列であることを明示

---

### 4. handleChoiceClick 関数の型注釈追加（105行目）

**現在のコード:**
```typescript
const handleChoiceClick = (selectedChar) => {
```

**変更後:**
```typescript
const handleChoiceClick = (selectedChar: string) => {
```

**変更理由:** パラメータ `selectedChar` が文字列型であることを明示

---

### 5. 未使用の React インポートを削除（1行目）

**現在のコード:**
```typescript
import React, { useState, useEffect } from 'react';
```

**変更後:**
```typescript
import { useState, useEffect } from 'react';
```

**変更理由:** React 18以降のJSX変換では `React` のインポートが不要。未使用の警告を解消。

---

## 実装手順

1. `src/App.tsx` を開く
2. 上記の変更を**順番通りに**適用する
   - まず型定義インターフェースを追加
   - 次にuseStateの型パラメータを追加
   - 関数の型注釈を追加
   - 最後にReactインポートを修正
3. 変更後、以下のコマンドでビルドを確認
   ```bash
   npm run build
   ```
4. ビルドが成功することを確認
5. ローカル環境で動作確認
   ```bash
   npm run dev
   ```

---

## 期待される成果

- ✅ TypeScriptコンパイルエラーが0個になる
- ✅ `npm run build` が成功する
- ✅ 既に実装済みのUI改善がビルド成果物に含まれる
- ✅ デプロイ時に最新のUIが反映される
- ✅ 型安全性が向上し、将来のバグを防止

---

## 検証項目

- [ ] `npm run build` がエラーなく完了するか
- [ ] ビルド成果物（dist/）が生成されるか
- [ ] `npm run dev` で開発サーバーが起動するか
- [ ] ブラウザでアプリが正常に動作するか
- [ ] コンソールにTypeScriptエラーが表示されないか

---

## 修正後のコード全体イメージ（参考）

```typescript
import { useState, useEffect } from 'react';

interface Question {
  id: number;
  question: string;
  answer: string;
  category: string;
}

// 問題データ
const questionsData = [
  // ... 既存のデータ
];

const HIRAGANA = 'あいうえお...';

const App = () => {
  const [gameStatus, setGameStatus] = useState('start');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [inputText, setInputText] = useState('');
  const [timeLeft, setTimeLeft] = useState(10);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);

  // 以下既存のコード...

  const generateChoices = (correctChar: string): string[] => {
    // ...
  };

  const handleChoiceClick = (selectedChar: string) => {
    // ...
  };

  // ...残りのコード
};

export default App;
```

---

## トラブルシューティング

### ビルドが失敗する場合
```bash
# node_modulesを再インストール
rm -rf node_modules package-lock.json
npm install

# TypeScriptキャッシュをクリア
rm -rf node_modules/.vite
npm run build
```

### それでも解決しない場合
- `tsconfig.json` の `strict` モードを一時的に `false` にして確認
- エラーメッセージの行番号と内容を確認し、該当箇所を再チェック

---

## 補足: なぜこのエラーが発生したか

TypeScriptは型推論を行いますが、空配列 `[]` や `null` を初期値とする場合、
明示的な型注釈がないと以下のように推論されます:

- `useState([])` → `never[]` 型（要素を追加できない空配列型）
- `useState(null)` → `null` 型（他の値を代入できない）

このため、後続のコードで値を設定しようとするとTypeScriptエラーが発生します。
型パラメータ `useState<Type>(initialValue)` を使用することで、正しい型を指定できます。