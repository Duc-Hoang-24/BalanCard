'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { getFlashcards } from '@/app/utils/flashcardSync';
import { auth } from '../firebase-config';

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

export default function StudyModePage() {
  const router = useRouter();
  const [flashcardSets, setFlashcardSets] = useState<FlashcardSet[]>([]);
  const [showStudyTypeModal, setShowStudyTypeModal] = useState(false);
  const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async () => {
      const loadedSets = await getFlashcards();
      setFlashcardSets(loadedSets);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleStartStudying = (setId: string) => {
    setSelectedSetId(setId);
    setShowStudyTypeModal(true);
  };

  const handleSelectStudyType = (mode: 'flip' | 'block') => {
    if (!selectedSetId) return;
    const path = mode === 'flip'
      ? `/components/study/flip/${selectedSetId}`
      : `/components/study/block/${selectedSetId}`;
    router.push(path);
    setShowStudyTypeModal(false);
  };

  const closeModal = () => {
    setShowStudyTypeModal(false);
    setSelectedSetId(null);
  };

  if (loading) {
    return <div className='text-center py-16 text-white'></div>
  }

  return (
    <div>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            📖 Study Mode
          </h1>
        </div>
        <p className="text-gray-400 mb-2">Select a flashcard set to begin studying</p>
      </div>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Sets Grid */}
          {flashcardSets.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-8xl mb-6">📭</div>
              <h3 className="text-2xl font-bold text-gray-300 mb-4">
                No flashcards yet
              </h3>
              <p className="text-gray-400 text-lg mb-8">
                Create your first flashcard set in the library to start studying!
              </p>
            </div>
          ) : (
            <div className="relative grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {flashcardSets.map((set) => {
                return (
                  <div
                    key={set.id}
                    className="relative bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl shadow-lg hover:shadow-2xl transition-all p-6 text-left border-2 border-slate-600/50 hover:border-purple-500 group"
                  >
                    <h3 className="text-md lg:text-xl font-bold text-blue-300 mb-2 line-clamp-2">{set.title}</h3>
                    {set.description && (
                      <p className="text-gray-400 mb-4 text-sm line-clamp-2">{set.description}</p>
                    )}
                    <div className="flex items-center justify-between mt-4 mb-3">
                      <span className="text-sm text-purple-400 font-medium">
                        {set.cards.length} card{set.cards.length !== 1 ? 's' : ''}
                      </span>
                      <button
                        onClick={() => handleStartStudying(set.id)}
                        className="absolute bottom-3 right-5 text-purple-400 hover:translate-x-3 transition-transform bg-cyan-400 font-bold p-2 rounded-lg"
                      >
                        Start Studying →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Study Type Selection Modal */}
        {showStudyTypeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 w-full max-w-lg border border-purple-500/30 shadow-2xl text-center">
              <h2 className="text-2xl font-bold text-white mb-6">
                Choose one method to start your study!
              </h2>
              <div className="space-y-4">
                <button
                  onClick={() => handleSelectStudyType('flip')}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                >
                  📘 Flip-card activities
                </button>
                <button
                  onClick={() => handleSelectStudyType('block')}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl font-bold text-lg hover:from-green-700 hover:to-teal-700 transition-all shadow-lg"
                >
                  🧱 Block-based games
                </button>
              </div>
              <button
                onClick={closeModal}
                className="mt-6 text-gray-400 hover:text-white text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}