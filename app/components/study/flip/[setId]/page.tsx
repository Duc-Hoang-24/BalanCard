'use client';
import React, { useState, useEffect, use } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, RotateCcw, Check, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Feature from '../../../flashcard/function';
import { getFlashcards } from '@/app/utils/flashcardSync';

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

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function StudyFilppedPage({ params }: { params: Promise<{ setId: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const setId = resolvedParams.setId;
  const [selectedSet, setSelectedSet] = useState<FlashcardSet | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<number[]>([]);
  const [unknownCards, setUnknownCards] = useState<number[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [isAskingInQuestionLanguage, setIsAskingInQuestionLanguage] = useState(false);
  const [shuffledOrder, setShuffledOrder] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const logic = Feature();

  // ✅ Compute currentCard early (fixes hoisting issue)
  const currentCardIndex = selectedSet && shuffledOrder.length > 0
    ? shuffledOrder[currentStep]
    : 0;
  const currentCard = selectedSet ? selectedSet.cards[currentCardIndex] : null;

  // Load flashcards on mount
  useEffect(() => {
    const loadFlashcards = async () => {
      const loadedSets = await getFlashcards();
      const foundSet = loadedSets.find(set => set.id === setId);
      if (foundSet) {
        setSelectedSet(foundSet);
        const savedDirection = localStorage.getItem(`studyDirection_${foundSet.id}`);
        if (savedDirection !== null) {
          setIsAskingInQuestionLanguage(savedDirection === 'true');
        }
      }
    };
    loadFlashcards();
  }, [setId]);

  const startStudy = (set: FlashcardSet) => {
    const order = shuffleArray(Array.from({ length: set.cards.length }, (_, i) => i));
    setShuffledOrder(order);
    setCurrentStep(0);
  };

  useEffect(() => {
    if (selectedSet) {
      startStudy(selectedSet);
    }
  }, [selectedSet]);

  const handleBack = () => {
    router.push('/components/study');
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = () => {
    if (selectedSet && currentStep < selectedSet.cards.length - 1) {
      setCurrentStep(currentStep + 1);
      setIsFlipped(false);
      setUserAnswer('');
      setIsCorrect(null);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setIsFlipped(false);
      setUserAnswer('');
      setIsCorrect(null);
    }
  };

  const handleKnow = () => {
    const origIndex = currentCardIndex;
    if (!knownCards.includes(origIndex)) {
      setKnownCards([...knownCards, origIndex]);
      setUnknownCards(prev => prev.filter(i => i !== origIndex));
    }
    handleNext();
  };

  const handleDontKnow = () => {
    const origIndex = currentCardIndex;
    if (!unknownCards.includes(origIndex)) {
      setUnknownCards([...unknownCards, origIndex]);
      setKnownCards(prev => prev.filter(i => i !== origIndex));
    }
    handleNext();
  };

  const handleRestart = () => {
    if (selectedSet) startStudy(selectedSet);
    setIsFlipped(false);
    setKnownCards([]);
    setUnknownCards([]);
    setUserAnswer('');
    setIsCorrect(null);
  };

  const checkAnswer = () => {
    if (!userAnswer.trim() || !currentCard) return;

    const expectedAnswer = isAskingInQuestionLanguage ? currentCard.answer : currentCard.question;
    const normalize = (str: string): string => str.toLowerCase().trim();
    const userNorm = normalize(userAnswer);
    const correctNorm = normalize(expectedAnswer);
    const isMatch = userNorm === correctNorm;

    setIsCorrect(isMatch);

    const origIndex = currentCardIndex; // ✅

    if (isMatch) {
      setKnownCards(prev => [...prev, origIndex]);
      setUnknownCards(prev => prev.filter(i => i !== origIndex));
    } else {
      setUnknownCards(prev => [...prev, origIndex]);
      setKnownCards(prev => prev.filter(i => i !== origIndex));
    }
  };

  // Handle empty set
  if (selectedSet && selectedSet.cards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors mb-6"
          >
            <ArrowLeft size={20} />
            <span>Back to Sets</span>
          </button>
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📝</div>
            <h3 className="text-2xl font-bold text-gray-300 mb-4">
              This set has no cards yet
            </h3>
            <p className="text-gray-400 text-lg">
              Add some cards to this set in the library before studying!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading or not found
  if (!selectedSet || !currentCard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <p className="text-white text-xl">Loading study set...</p>
      </div>
    );
  }

  const progress = ((currentStep + 1) / selectedSet.cards.length) * 100;

  let relevantLang: string | undefined;
  if (isFlipped) {
    relevantLang = isAskingInQuestionLanguage
      ? currentCard.questionLanguage
      : currentCard.answerLanguage;
  } else {
    relevantLang = isAskingInQuestionLanguage
      ? currentCard.answerLanguage
      : currentCard.questionLanguage;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition-colors bg-cyan-700 p-2 rounded-lg hover:bg-cyan-800"
          >
            <ArrowLeft size={20} />
            <span>Back to Sets</span>
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-gray-300 hover:text-white rounded-lg shadow hover:shadow-lg transition-all border border-slate-600"
          >
            <RotateCcw size={18} />
            <span>Restart</span>
          </button>
          <button
            onClick={() => setIsAskingInQuestionLanguage(prev => !prev)}
            className="flex items-center gap-2 text-gray-300 hover:text-white rounded-lg shadow transition-all hover:shadow-2xl"
          >
            {isAskingInQuestionLanguage ? (
              <span className='bg-yellow-300 px-4 py-2 rounded-lg text-black'>🔁 Ask in Answer</span>
            ) : (
              <span className='bg-red-500 px-4 py-2 rounded-lg text-black'>🔁 Ask in Question</span>
            )}
          </button>
        </div>

        {/* Title and Progress */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-blue-300 mb-2">{selectedSet.title}</h2>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-slate-700 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-400">
              {currentStep + 1} / {selectedSet.cards.length}
            </span>
          </div>
        </div>

        {/* Flashcard */}
        <div className="mb-6">
          <div
            onClick={handleFlip}
            className="relative bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-2xl p-12 min-h-[350px] cursor-pointer hover:shadow-purple-500/20 transition-all flex items-center justify-center border-2 border-slate-600/50 hover:border-purple-500/50"
          >
            <div className='absolute top-2 left-2 flex-1 flex flex-row gap-2'>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const visibleText = isFlipped
                    ? (isAskingInQuestionLanguage ? currentCard.answer : currentCard.question)
                    : (isAskingInQuestionLanguage ? currentCard.question : currentCard.answer);

                  const visibleLanguage = isFlipped
                    ? (isAskingInQuestionLanguage ? currentCard.answerLanguage : currentCard.questionLanguage)
                    : (isAskingInQuestionLanguage ? currentCard.questionLanguage : currentCard.answerLanguage);

                  logic.speakText(visibleText, visibleLanguage);
                }}
                className="text-white rounded-lg transition-all transform hover:scale-105 text-2xl"
                title="Listen to pronunciation"
                type="button"
              >
                🔊
              </button>
            </div>

            <div className="text-center p-5 w-3/5 h-105">
              <div
                className={`flashcard-flipper ${isFlipped ? 'flipped' : ''}`}
                onClick={handleFlip}
              >
                {/* Front face */}
                <div className="flashcard-face front">
                  <p className="text-xs text-purple-400 mb-1 uppercase tracking-wide font-semibold">
                    {isAskingInQuestionLanguage ? 'Question / Term' : 'Answer / Description'}
                  </p>
                  <div className='flex items-center justify-center mb-2'>
                    {currentCard.imageUrl ? (
                      <img
                        src={currentCard.imageUrl}
                        alt='Flashcard visual'
                        className="w-40 h-40 rounded object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="text-3xl font-medium text-white px-4 break-words">
                    {isAskingInQuestionLanguage ? currentCard.question : currentCard.answer}
                  </p>

                  {/* Input only on front */}
                  {!isFlipped && (
                    <div className="mt-2 w-full max-w-md mx-auto">
                      <input
                        type="text"
                        value={userAnswer}
                        onChange={(e) => {
                          setUserAnswer(e.target.value);
                          setIsCorrect(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onFocus={(e) => e.stopPropagation()}
                        placeholder={isAskingInQuestionLanguage ? "Type the answer..." : "Type the original term..."}
                        className="w-full p-3 text-lg rounded-lg bg-slate-700 border border-slate-500 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            checkAnswer();
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          checkAnswer();
                        }}
                        className="mt-3 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:scale-105 transition-transform"
                      >
                        Check Answer
                      </button>

                      {isCorrect !== null && (
                        <div className={`mt-3 p-2 rounded text-center font-bold ${isCorrect ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                          {isCorrect ?
                            '✅ Correct!' :
                            `❌ Incorrect. Correct answer: ${isAskingInQuestionLanguage ? currentCard.answer : currentCard.question}`}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Special Characters (only on front) */}
                  {!isFlipped && relevantLang &&
                    relevantLang !== 'english' &&
                    relevantLang !== 'chinese' &&
                    logic.languageCharacters[relevantLang] && (
                    <div className="lg:mt-4 flex justify-center gap-1.5 max-w-full mx-auto">
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
                      ))}
                    </div>
                  )}
                </div>

                {/* Back face */}
                <div className="flashcard-face back">
                  <p className="text-xs text-purple-400 mb-1 uppercase tracking-wide font-semibold">
                    {isAskingInQuestionLanguage ? 'Answer / Definition' : 'Question / Term'}
                  </p>
                  <div className='flex items-center justify-center mb-2'>
                    {currentCard.imageUrl ? (
                      <img
                        src={currentCard.imageUrl}
                        alt='Flashcard visual'
                        className="w-40 h-40 rounded object-cover"
                      />
                    ) : null}
                  </div>
                  <p className="text-3xl font-medium text-white px-4 break-words">
                    {isAskingInQuestionLanguage ? currentCard.answer : currentCard.question}
                  </p>
                </div>
              </div>

              {/* Hint text (outside flipper, always visible at bottom) */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-sm text-gray-500 pointer-events-none">
                {!isFlipped ? 'Type your answer above, or click to flip' : 'Click to go back'}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col gap-4">
          {isFlipped && (
            <div className="flex gap-4">
              <button
                onClick={handleDontKnow}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl hover:from-red-700 hover:to-red-600 transition-all shadow-lg font-medium"
              >
                <X size={20} />
                <span>Don&apos;t Know</span>
              </button>  
              <button
                onClick={handleKnow}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl hover:from-green-700 hover:to-green-600 transition-all shadow-lg font-medium"
              >
                <Check size={20} />
                <span>Know It</span>
              </button>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-gray-300 rounded-xl hover:bg-slate-700 transition-colors shadow border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              <span>Previous</span>
            </button>

            {currentStep === selectedSet.cards.length - 1 ? (
              <button
                onClick={() => {
                  setShowSummary(true);
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
              >
                <span>View Summary</span>
                <ChevronRight size={20} />
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={currentStep === selectedSet.cards.length - 1}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Next</span>
                <ChevronRight size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Summary Modal */}
        {showSummary && selectedSet && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">🎉 Study Complete!</h2>
                <p className="text-gray-400">Here&apos;s how you did</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-600/50 rounded-xl p-4 text-center">
                  <p className="text-4xl font-bold text-green-400">{knownCards.length}</p>
                  <p className="text-green-300 mt-1">Mastered</p>
                </div>
                <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 border border-red-600/50 rounded-xl p-4 text-center">
                  <p className="text-4xl font-bold text-red-400">{unknownCards.length}</p>
                  <p className="text-red-300 mt-1">Need{unknownCards.length !== 1 ? "s" : ''} Review</p>
                </div>
                <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 rounded-xl p-4 text-center">
                  <p className="text-4xl font-bold text-gray-400">
                    {selectedSet.cards.length - knownCards.length - unknownCards.length}
                  </p>
                  <p className="text-gray-400 mt-1">Not Rated</p>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Card Review</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedSet.cards.map((card, index) => {
                    let status = 'Not Rated';
                    let color = 'text-gray-400';
                    if (knownCards.includes(index)) {
                      status = '✅ Mastered';
                      color = 'text-green-400';
                    } else if (unknownCards.includes(index)) {
                      status = '❌ Needs Review';
                      color = 'text-red-400';
                    }
                    return (
                      <div key={card.id} className="bg-slate-700/50 p-3 rounded-lg border border-slate-600">
                        <div className="font-medium text-white">{card.question}</div>
                        <div className="text-sm text-gray-300 mt-1">{card.answer}</div>
                        <div className={`text-xs mt-2 ${color} font-semibold`}>{status}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowSummary(false);
                    handleRestart();
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:scale-105 transition-transform"
                >
                  🔄 Restart Study
                </button>
                <button
                  onClick={handleBack}
                  className="px-6 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors"
                >
                  📚 Back to Sets
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}