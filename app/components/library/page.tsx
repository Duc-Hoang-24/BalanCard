'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase-config';
import {
  getFlashcards,
  deleteFlashcardSet,
  migrateLocalDataToFirestore,
} from '../../utils/flashcardSync';
import { User } from 'firebase/auth';

type FlashcardSet = {
  id: string;
  title: string;
  description?: string;
  cards: Flashcard[];
  createdAt: Date;
  updatedAt: Date;
}

type Flashcard = {
  id: string;
  question: string;
  answer: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

export default function LibraryPage() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<FlashcardSet[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<FlashcardSet | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load flashcards on mount
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser)
        {
          await migrateLocalDataToFirestore();
        }
        await refreshLibrary();
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Showtoast notification when a flashcard set is edited
  useEffect(() => {
    const editMessage = localStorage.getItem('showEditMessage');
  
  if (editMessage === 'create-first') {
    alert('Please create your first flashcard set before editing!');
    localStorage.removeItem('showEditMessage');
  } else if (editMessage === 'choose-one') {
    alert('Select one flashcard set to edit!');
    localStorage.removeItem('showEditMessage');
  }
  
  if (localStorage.getItem('showEditAlert') === 'true') {
    alert('Select one flash card to edit!');
    localStorage.removeItem('showEditAlert');
  }
}, [flashcards]);

  // Filter and sort flashcards
  const filteredAndSortedFlashcards = useMemo(() => {
    let filtered = flashcards;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(set => 
        set.title.toLowerCase().includes(query) ||
        (set.description?.toLowerCase() || '').includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'alphabetical':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [flashcards, searchQuery, sortBy]);

  const handleView = (cardId: string) => {
    const setToView = flashcards.find(set => set.id === cardId);
    if (setToView) {
      localStorage.setItem('viewingSet', JSON.stringify(setToView));
      localStorage.setItem('isEditingMode', 'true');
      localStorage.setItem('editingSetId', cardId);
      router.push(`/components/flashcard?edit=${cardId}`)
    }
  };

  const refreshLibrary = async () => {
    const loadedSets = await getFlashcards();
    setFlashcards(loadedSets);
  };

  useEffect(() => {
  // Listen for storage changes from other tabs/components
    const handleStorageChange = () => {
      refreshLibrary();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also refresh when component becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshLibrary();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleDeleteClick = (set: FlashcardSet) => {
    setCardToDelete(set);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteFlashcardSet(cardToDelete.id);
      await refreshLibrary();

      setIsDeleteModalOpen(false);
      setCardToDelete(null);
    } catch (error) {
      console.error('Error deleting flashcard:', error);
      alert('Failed to delete flashcard. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className='flex items-center justify-center space-x-2'>
    <span className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></span>
    <div className='text-center py-16 text-white text-2xl'>Loading...</div>
    </div>
  }

  return (
    <>
    {/* Sync Status Banner */}
      {user ? (
        <div className="mb-4 p-3 bg-green-900/30 border border-green-500 rounded-lg max-w-fit mx-auto">
          <span className="text-green-400">✓ Synced to cloud as {user.displayName}</span>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-500 rounded-lg max-w-7xl mx-auto">
          <span className="text-yellow-400">⚠️ Data stored locally - Sign in to sync across devices</span>
        </div>
      )}
      <div className="max-w-2xl lg:max-w-7xl mx-auto px-6">
        {/* Header */}
          <div className="flex flex-row items-center lg:justify-between gap-12 mb-6">
            <div>
              <h1 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                📚 Your Library
              </h1>
            </div>
            
            <div className="flex gap-4">
              <Link
                href="/components/flashcard"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg text-xs lg:text-lg"
              >
                <b className='border-1 bg-gradient-to-br from-red-400 to-red-200 rounded-lg p-0.5 items-center'>➕</b> Create New Flashcard
              </Link>
            </div>
          </div>
        </div>
      <div className="p-6">
        {/* Filters and Search */}
        <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-600/30 mb-8 max-w-7xl mx-auto">
          <div className="flex flex-wrap gap-x-4 ">
            {/* Search */}
            <div className="flex-2">
              <label className="block text-sm lg:text-lg font-medium text-gray-300 mb-1 items-end">
                🔍 Search Flashcards
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search titles, descriptions, ..."
                className="w-full p-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="block text-sm lg:text-lg font-medium text-gray-300 mb-1">
                🔄 Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'alphabetical')}
                className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">A-Z</option>
              </select>
            </div>

            <div className='self-end'>
              <label className="block text-sm lg:text-lg font-medium text-gray-300">
                📊 Total Sets
              </label>
              <div className="text-xl font-bold text-white bg-blue-500 p-2 rounded-lg mt-1 flex items-center justify-center">{filteredAndSortedFlashcards.length}</div>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="max-w-6xl mx-auto flex items-center justify-between mb-2">
          <div className="text-gray-400">
            Showing {filteredAndSortedFlashcards.length} of {filteredAndSortedFlashcards.length} flashcard Set
            {(searchQuery !== 'all') && (
              <span className="text-blue-400 ml-2">(filtered)</span>
            )}
          </div>
        </div>

        {/* Flashcards Display */}
        {filteredAndSortedFlashcards.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📭</div>
            <h3 className="text-2xl font-bold text-gray-300 mb-4">
              {flashcards.length === 0 ? 'No flashcards yet' : 'No matching flashcards'}
            </h3>
            <p className="text-gray-400 text-lg mb-8">
              {flashcards.length === 0 
                ? 'Create your first flashcard to get started!' 
                : 'Try adjusting your search or filters'}
            </p>
            {flashcards.length === 0 && (
              <Link
                href="/components/flashcard"
                className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                ✨ Create Your First Flashcard
              </Link>
            )}
          </div>
        ) : (
          <div className='max-w-7xl mx-auto gap-3 grid grid-cols-1 lg:grid-cols-2'>
            {filteredAndSortedFlashcards.map((set) => (
              <div
                key={set.id}
                className='relative flex flex-row bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600/50 rounded-2xl overflow-hidden shadow-blue-100 hover:shadow-md transition-all duration-300 transform hover:scale-[1.02] group'
              >
                <div className='justify-between items-center w-full p-2'>
                <div>
                  <div className='max-w-full min-w-40'>
                    <div className='flex flex-row'>
                      {/* Title */}
                      <span className="font-bold text-xl text-blue-300 transition-colors line-clamp-3 break-words mr-3">
                      {set.title}
                      </span>
                      {/* Card Count - shows on hover */}
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 group-hover:rounded-md text-md bg-gradient-to-r from-pink-500 to-red-300 text-cyan-900 mb-4 px-1 font-bold whitespace-nowrap">
                          {set.cards.length} card{set.cards.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                  </div>
                </div>
                {/* Delete button */}
                  <div>
                    <button
                      title='Delete'
                      onClick={() => handleDeleteClick(set)}
                      className="absolute right-1 top-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-lg font-medium transition-all transform hover:scale-105"
                    >
                      🗑️
                    </button>
                  </div>

                    {/* Description Preview */}
                  <div>
                    {set.description ? (
                      <p className=" text-gray-300 text-sm mb-4 line-clamp-3 break-words whitespace-normal overflow-wrap-break-word">
                        - {set.description}
                      </p>
                      ) : (
                      <p className=" text-gray-400 text-sm mb-10 italic">- No description provided</p>
                      )}
                  </div>

                  <div className="text-xs flex flex-row justify-between items-center w-full">
                    <span className="text-gray-500">
                      Created {new Date(set.createdAt).toLocaleDateString()}
                      {set.updatedAt !== set.createdAt && (
                        <> • Updated {new Date(set.updatedAt).toLocaleDateString()}</>
                      )}
                    </span>
                    <div className='grid grid-cols-1 gap-1'>
                      <Link 
                      href='/components/study'
                      className='bg-emerald-500 hover:bg-emerald-600 text-gray-700 p-2 rounded-lg font-medium transition-all transform hover:scale-105 text-center'>
                        🧠 Study
                      </Link>
                      <button 
                        onClick={() => handleView(set.id)}
                        className="bg-blue-400 hover:bg-blue-500 text-gray-700 p-2 rounded-lg font-medium transition-all transform hover:scale-105">
                        👀 View & Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {isDeleteModalOpen && cardToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-600 shadow-2xl">
              <div className="text-center">
                <div className="text-6xl mb-4">🗑️</div>
                <h2 className="text-2xl font-bold text-white mb-4">Delete Flashcard Set</h2>
                <p className="text-gray-300 mb-2">
                  Are you sure you want to delete this flashcard set?
                </p>
                <p className="text-gray-400 text-sm mb-6">
                  <strong>&quot;{cardToDelete.title}&quot;</strong>
                </p>
                <p className="text-red-400 text-sm mb-8">
                  This action cannot be undone.
                </p>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setIsDeleteModalOpen(false);
                      setCardToDelete(null);
                    }}
                    className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded-xl font-medium transition-all"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteConfirm}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl font-medium transition-all"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <div className="inline-block animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete Forever'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );

}
