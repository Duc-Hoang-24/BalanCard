'use client';

import React, { useState, useEffect, use } from 'react';
import { ArrowLeft, RotateCcw, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Feature from '../../../flashcard/function';
import { getFlashcards } from '@/app/utils/flashcardSync';

// ===== TYPES =====
type FlashcardSet = {
  id: string;
  title: string;
  description?: string;
  cards: Flashcard[];
  createdAt: Date;
  updatedAt: Date;
};

type Flashcard = {
  id: string;
  question: string;
  answer: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  questionLanguage?: string;
  answerLanguage?: string;
};

type BlockShape = number[][];

const BLOCK_SHAPES: BlockShape[] = [
  [[1, 1, 1, 1]], // I
  [[1, 1, 1], [1, 1, 1], [1, 1, 1]],
  [[1, 1], [1, 1]], // O
  [[0, 1, 0], [1, 1, 1]], // T
  [[1, 0], [1, 0], [1, 1]], // L
  [[1, 1], [0, 1]],
  [[0, 1], [0, 1], [1, 1]], // J
  [[0, 1, 1], [1, 1, 0]], // S
  [[1, 1, 0], [0, 1, 1]], // Z
];

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ===== COMPONENT =====
export default function FlashGridStudyPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const router = useRouter();
  const resolvedParams = use(params);
  const setId = resolvedParams.setId;

  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [grid, setGrid] = useState<string[][]>(
    Array.from({ length: 8 }, () => Array(8).fill(''))
  );
  const [showSummary, setShowSummary] = useState(false);
  const [cardDeck, setCardDeck] = useState<Flashcard[]>([]);

  // Block selection state
  const [availableBlocks, setAvailableBlocks] = useState<BlockShape[]>([]);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [draggingBlock, setDraggingBlock] = useState<{
    shape: BlockShape;
    color: 'green';
    index: number;
  } | null>(null);
  const [blockPosition, setBlockPosition] = useState({ row: 0, col: 0 });
  const [showPreview, setShowPreview] = useState(false);

  const logic = Feature();

  // Load flashcard set
  useEffect(() => {
    const loadFlashcards = async () => {
      const loadedSets = await getFlashcards();
      const foundSet = loadedSets.find((set) => set.id === setId);
      if (foundSet) {
        setSelectedSet(foundSet);
        const newDeck = shuffleArray([...foundSet.cards]);
        const nextCard = newDeck[0];
        const remainingDeck = newDeck.slice(1);
        setCurrentCard(nextCard);
        setCardDeck(remainingDeck);
        setUserAnswer('');
        setIsCorrect(null);
        setAvailableBlocks([]);
        setSelectedBlockIndex(null);
        setDraggingBlock(null);
        setShowSummary(false);
      }
    };
    loadFlashcards();
  }, [setId]);

  const startNewCard = (set: FlashcardSet) => {
    let newDeck = cardDeck
    if (newDeck.length === 0) {
    newDeck = shuffleArray([...set.cards]);
    }
    const nextCard = newDeck[0];
    const remainingDeck = cardDeck.slice(1);
    setCurrentCard(nextCard);
    setCardDeck(remainingDeck);
    setUserAnswer('');
    setIsCorrect(null);
    setAvailableBlocks([]);
    setSelectedBlockIndex(null);
    setDraggingBlock(null);
    setShowSummary(false);
  };

  // ===== HANDLE ANSWER =====
  const handleCheckAnswer = () => {
    if (!currentCard || !userAnswer.trim()) return;

    const expectedAnswer = currentCard.question.toLowerCase().trim();
    const userNorm = userAnswer.toLowerCase().trim();
    const isMatch = userNorm === expectedAnswer;

    setIsCorrect(isMatch);

    if (isMatch) {
      setScore((prev) => prev + 10);
      // Generate 3 random blocks for correct answers
      const newBlocks = Array.from({ length: 3 }, () =>
        BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)]
      );
      setAvailableBlocks(newBlocks);
      setSelectedBlockIndex(null);
      setDraggingBlock(null);
    } else {
      // Wrong answer - just move to next card, no game over
      setTimeout(() => {
        if (selectedSet) {
          startNewCard(selectedSet);  // ✅ Just show next card
        }
      }, 1500);
    }
  };

  // Check if a single block can be placed anywhere on the grid
function canPlaceBlock(grid: string[][], block: BlockShape): boolean {
  const height = block.length;
  const width = block[0].length;

  for (let row = 0; row <= 8 - height; row++) {
    for (let col = 0; col <= 8 - width; col++) {
      let canPlace = true;
      for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
          if (block[r][c] === 1 && grid[row + r][col + c] !== '') {
            canPlace = false;
            break;
          }
        }
        if (!canPlace) break;
      }
      if (canPlace) return true;
    }
  }
  return false;
}

// Check if grid is completely full
function isGridFull(grid: string[][]): boolean {
  return grid.every(row => row.every(cell => cell !== ''));
}

  // ===== DRAG & DROP LOGIC =====
  const handleDragStart = (
    e: React.DragEvent,
    shape: BlockShape,
    index: number,
    color: 'green'
  ) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggingBlock({ shape, color, index });
    
    // Hide the default drag image
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    e.dataTransfer.setDragImage(canvas, 0, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggingBlock) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const col = Math.floor(x / (rect.width / 8));
      const row = Math.floor(y / (rect.height / 8));
      setBlockPosition({ row, col });
      setShowPreview(true);
    }
  };

  const handleDrop = (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    if (!draggingBlock) return;

    const { shape, color, index } = draggingBlock;
    const height = shape.length;
    const width = shape[0].length;

    // Check bounds
    if (targetRow + height > 8 || targetCol + width > 8) {
      console.log("Block doesn't fit!");
      setDraggingBlock(null);
      return;
    }

    // Check for collisions first
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (shape[r][c] === 1) {
          const row = targetRow + r;
          const col = targetCol + c;
          if (grid[row][col] !== '') {
            console.log("Collision! Can't place here.");
            setDraggingBlock(null);
            return;
          }
        }
      }
    }

    // Place block
    const newGrid = grid.map(row => [...row]);
    for (let r = 0; r < height; r++) {
      for (let c = 0; c < width; c++) {
        if (shape[r][c] === 1) {
          const row = targetRow + r;
          const col = targetCol + c;
          newGrid[row][col] = color;
        }
      }
    }

    // Clear full rows/columns
    let clearedRows = 0;
    let clearedCols = 0;

    // Check rows
    for (let r = 0; r < 8; r++) {
      if (newGrid[r].every((cell) => cell !== '')) {
        newGrid[r] = Array(8).fill('');
        clearedRows++;
      }
    }

    // Check columns
    for (let c = 0; c < 8; c++) {
      if (newGrid.every((row) => row[c] !== '')) {
        for (let r = 0; r < 8; r++) {
          newGrid[r][c] = '';
        }
        clearedCols++;
      }
    }

    // Add bonus points
    if (clearedRows > 0 || clearedCols > 0) {
      const bonus = (clearedRows + clearedCols) * 20;
      setScore((prev) => prev + bonus);
    }

    setGrid(newGrid);
    
    // Remove the used block from available blocks
    const newAvailableBlocks = availableBlocks.filter((_, i) => i !== index);
    setAvailableBlocks(newAvailableBlocks);
    setDraggingBlock(null);
    setSelectedBlockIndex(null);
    setShowPreview(false);

    // ===== GAME OVER CHECK =====
    let gameOver = false;

    // Case 1: Grid is completely full
    if (isGridFull(newGrid)) {
      gameOver = true;
    } 
    // Case 2: No blocks left AND we just used the last one → next card will give new blocks, so NOT game over
    // Case 3: Blocks remain, but NONE can be placed
    else if (newAvailableBlocks.length > 0) {
      const canAnyBlockFit = newAvailableBlocks.some(block => canPlaceBlock(newGrid, block));
      if (!canAnyBlockFit) {
        gameOver = true;
      }
    }
    // Case 4: No blocks left → next card will be shown, so continue

    if (gameOver) {
      setTimeout(() => setShowSummary(true), 300);
      return;
    }

    // Get next card only when all blocks are used
    if (newAvailableBlocks.length === 0 && selectedSet) {
      setTimeout(() => startNewCard(selectedSet), 500);
    }

    // Get next card only when all blocks are used
    if (newAvailableBlocks.length === 0 && selectedSet) {
      setTimeout(() => startNewCard(selectedSet), 500);
    }
  };

  const handleDragEnd = () => {
    setShowPreview(false);
  };

  const handleRefresh = () => {
    if (selectedSet) {
      startNewCard(selectedSet);
    }
  };

  const handleRestart = () => {
    setGrid(Array.from({ length: 8 }, () => Array(8).fill('')));
    setScore(0);
    setIsCorrect(null);
    setShowSummary(false);
    setAvailableBlocks([]);
    setDraggingBlock(null);
    setSelectedBlockIndex(null);
    if (selectedSet) {
      startNewCard(selectedSet);
    }
  };

  const handleBack = () => {
    router.push('/components/study');
  };

  const relevantLang = currentCard?.questionLanguage;

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-700 text-white rounded-lg hover:bg-cyan-800"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <h1 className="text-2xl font-bold text-blue-300 text-center flex-1 min-w-[200px]">
            {selectedSet?.title}
          </h1>

          <div className="flex gap-2">
            <div className="bg-yellow-500/20 px-3 py-1 rounded-lg text-yellow-300 font-bold">
              <span className="mr-1">🏆</span>
              {score}
            </div>
            <button
              onClick={handleRestart}
              className="flex items-center gap-1 px-3 py-2 bg-slate-800 text-gray-300 rounded-lg hover:bg-slate-700"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        {/* Game Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Middle Panel: Image + Input */}
          <div className="col-span-4 p-4 rounded-xl">
            {currentCard?.imageUrl ? (
              <img
                src={currentCard.imageUrl}
                alt="Flashcard visual"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            ) : (
              <div className="hidden">
              </div>
            )}
              <div className="mb-4 flex items-center justify-center">
                <p className="text-white font-medium text-lg">{currentCard?.answer}</p>
              </div>

            <div className='bg-slate-800 p-2 mb-4 rounded-lg'>
            {/* Feedback */}
            {isCorrect !== null ? (
              <div
                className={`mb-1 mt-3 p-2 rounded text-center font-bold ${
                  isCorrect
                    ? 'bg-green-900/50'
                    : 'bg-red-900/50'
                }`}
              >
                {isCorrect ? '✅ Correct!' : '❌ Try again!'}<br/>{currentCard?.question}
              </div>
            ) : (
            <div className="mb-1">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full p-2 bg-slate-700 border border-slate-500 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                onKeyDown={(e) => e.key === 'Enter' && handleCheckAnswer()}
                disabled={isCorrect !== null || availableBlocks.length > 0}
              />
            </div>
            )}

              <span>Click to add special characters: </span>
              {relevantLang && relevantLang !== 'english' && relevantLang !== 'chinese' && (
                <button
                  type="button"
                  onClick={() => logic.setShowCharacterQuestion(!logic.showCharacterQuestion)}
                  className='text-white transition-all transform hover:scale-105 rounded-md font-bold text-sm px-1 py-0.5'
                  title="Toggle special characters"
                >
                  <span>{logic.showCharacterQuestion ? '▼' : '▶'}</span>
                </button>
              )}
              {relevantLang &&
                relevantLang !== 'english' &&
                relevantLang !== 'chinese' &&
                logic.languageCharacters[relevantLang] &&
                logic.showCharacterQuestion && (
                <div className="flex justify-center flex-wrap">
                  {logic.languageCharacters[relevantLang].map((char, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserAnswer(prev => prev + char);
                      }}
                      className="bg-slate-700/50 hover:bg-slate-600 text-cyan-200 w-8 h-8 rounded flex items-center justify-center text-md border border-slate-600 hover:border-cyan-500 transition-colors"
                      title={`Add "${char}"`}
                    >
                      {char}
                    </button>
                    )
                    )}
                </div>
              )}
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={handleCheckAnswer}
                className="w-3/5 flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:scale-105 transition-transform"
                disabled={isCorrect !== null || availableBlocks.length > 0 || !userAnswer.trim()}
              >
                Check Answer
              </button>
              <button
                onClick={handleRefresh}
                className="w-2/5 justify-center bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 flex items-center gap-1"
                disabled={availableBlocks.length > 0}
              >
                <RefreshCw size={16} /> Refresh
              </button>
            </div>

            {/* below check answer: Available Blocks */}
          <div className="flex flex-row items-center gap-4">
            {availableBlocks.length > 0 && (
              <div className="flex flex-row gap-3">
                {availableBlocks.map((shape, idx) => (
                  <div
                    key={idx}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(
                        e,
                        shape,
                        idx,
                        'green' 
                      )
                    }
                    onDragEnd={handleDragEnd}
                    className={`p-3 cursor-grab hover:opacity-80 transition-opacity ${
                      selectedBlockIndex === idx
                        ? 'border-blue-500 ring-2 ring-blue-500'
                        : 'border-slate-600'
                    }`}
                    onClick={() => setSelectedBlockIndex(idx)}
                  >
                    <div
                      className="grid gap-1 mx-auto"
                      style={{
                        gridTemplateColumns: `repeat(${shape[0].length}, 24px)`,
                      }}
                    >
                      {shape.map((row, rIdx) =>
                        row.map((cell, cIdx) => (
                          <div
                            key={`${rIdx}-${cIdx}`}
                            className={`w-6 h-6 rounded ${
                              cell === 1
                                ? isCorrect
                                  ? 'bg-green-500'
                                  : 'bg-purple-500'
                                : 'bg-transparent'
                            }`}
                          />
                        ))
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

          {/* Right Panel: Grid */}
          <div className="lg:col-span-7 relative">
            <div
              className="grid grid-cols-8 gap-1 p-2 bg-slate-800/30 rounded-lg"
              onDragOver={handleDragOver}
              onDrop={(e) => {
                // Calculate drop position
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const col = Math.floor(x / (rect.width / 8));
                const row = Math.floor(y / (rect.height / 8));
                handleDrop(e, row, col);
              }}
            >
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isPreview = showPreview && draggingBlock && 
                    rowIndex >= blockPosition.row && 
                    rowIndex < blockPosition.row + draggingBlock.shape.length &&
                    colIndex >= blockPosition.col && 
                    colIndex < blockPosition.col + draggingBlock.shape[0].length &&
                    draggingBlock.shape[rowIndex - blockPosition.row]?.[colIndex - blockPosition.col] === 1;
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`aspect-square rounded-lg transition-all duration-200 ${
                        cell === 'green'
                          ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg'
                          : isPreview
                          ? draggingBlock.color === 'green'
                            ? 'bg-green-500/80 border-2 border-green-400'
                            : ''
                          : 'bg-slate-800/50 border border-slate-700'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                    >
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Summary Modal */}
        {showSummary && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 w-full max-w-md border border-purple-500/30 shadow-2xl">
              <h2 className="text-2xl font-bold text-white text-center mb-4">
                🎉 Game Over!
              </h2>
              <div className="text-center mb-6">
                <p className="text-xl font-bold text-yellow-300">Score: {score}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowSummary(false);
                    handleRestart();
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 rounded-lg"
                >
                  Play Again
                </button>
                <button
                  onClick={handleBack}
                  className="flex-1 bg-slate-700 text-white py-2 rounded-lg"
                >
                  Back to Sets
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}