import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Feature from './function';
import {
  getFlashcards,
  saveFlashcardSet
} from '../../utils/flashcardSync'

// Types
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
  questionLanguage?: string;
  answerLanguage?: string;
};

type UnsplashImage = {
  urls: { small: string; regular: string };
  alt: string;
  id: string;
};

type FormErrors = {
  question?: string;
  answer?: string;
};

export default function CoreLearning() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  
  // State management
  const [flashcardsState, setFlashcardsState] = useState<Flashcard[]>([]);  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [currentCard, setCurrentCard] = useState<Flashcard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UnsplashImage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSet, setIsEditingSet] = useState(false);

  // Capitalize first letter of each sentence
    const capitalizeFirst = (str: string): string => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    };

  // Load flashcards and handle edit mode
  useEffect(() => {
    const loadData = async () => {
      if (editId) {
        const allSets = await getFlashcards();
        const cardToEdit = allSets.find(set => set.id === editId);

        if (cardToEdit) {
          setTitle(cardToEdit.title);
          setDescription(cardToEdit.description || '');
          setCards(cardToEdit.cards);
          setIsEditing(true);
          setIsEditingSet(true);
        } else {
          router.replace('/components/flashcard');
        }
      }
    }
    loadData();
  }, [editId, router]);

  const resetForm = useCallback(() => {
    setSelectedImageUrl(null);
    setCurrentCard(null);
    setIsEditing(false);
    setFormErrors({});
  }, []);

  const validateForm = useCallback((question: string, answer: string, questionLang: string, answerLang: string): FormErrors => {
    const errors: FormErrors = {};
    
    if (!question.trim()) {
      errors.question = 'Question is required';
    } else if (question.trim().length < 1) {
      errors.question = 'Question must be at least 1 character';
    }
    
    if (!answer.trim()) {
      errors.answer = 'Answer is required';
    } else if (answer.trim().length < 3) {
      errors.answer = 'Answer must be at least 3 characters';
    }
    
    if (questionLang === 'none') {
      errors.question = 'Please select a question language';
    }
    if (answerLang === 'none') {
      errors.answer = 'Please select an answer language';
    }
    return errors;
  }, []);

  const normalizeLanguage = (lang: string | undefined): string | undefined => {
    return lang === 'none' ? undefined : lang;
  };

  //add new function to handle adding a card
  const handleAddCard = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const question = (formData.get('question') as string).trim();
    const answer = (formData.get('answer') as string).trim();

    if (!question || !answer) return;

    // Normalize languages
    const questionLang = normalizeLanguage(logic.selectedLanguageQuestion);
    const answerLang = normalizeLanguage(logic.selectedLanguageAnswer);

    // Validate using normalized values
    const errors = validateForm(question, answer, 
      logic.selectedLanguageQuestion || 'none', 
      logic.selectedLanguageAnswer || 'none'
    );
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    if (editingCardId) {
      setCards(prev =>
        prev.map(card =>
          card.id === editingCardId
            ? { ...card, question, answer, imageUrl: selectedImageUrl || undefined, questionLanguage: questionLang, answerLanguage: answerLang, updatedAt: new Date() }
            : card
        )
      );
      setEditingCardId(null);
    } else {
      const newCard: Flashcard = {
        id: Date.now().toString(),
        question,
        answer,
        imageUrl: selectedImageUrl || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
        questionLanguage: questionLang,
        answerLanguage: answerLang,
      };
      setCards([...cards, newCard]);
    }

    e.currentTarget.reset();
    setSelectedImageUrl(null);
    setFormErrors({});
  };

    const handleSubmitSet = async () => {
      if (!title.trim() || cards.length === 0) {
        alert('Please add a title and at least one card.');
        return;
      }

      setIsSubmitting(true);
      try {
        const isEditingMode = localStorage.getItem('isEditingMode') === 'true';
        const editingSetId = localStorage.getItem('editingSetId'); // Get the specific ID
        
        const now = new Date();
        const flashcardSetData = {
          id: isEditingMode && editingSetId ? editingSetId : Date.now().toString(),
          title: title.trim(),
          description: description.trim() || '',
          cards: cards,
          createdAt: now,
          updatedAt: now,
        };

        await saveFlashcardSet(flashcardSetData);
        console.log('Successfully saved flashcard set');

        localStorage.removeItem('isEditingMode');
        localStorage.removeItem('editingSetId');
        localStorage.removeItem('viewingSet');

        router.push('/components/library');
      } catch (error) {
        console.error('Error saving flashcard sset:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        alert(`Failed to save flashcard set: ${errorMessage}\n\nPlease check your internet connection and try again.`)
      } finally {
        setIsSubmitting(false);
      }
    };

    // Update the useEffect for handling view/edit mode:
    useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('edit');

      if (editId) {
        const viewingSetData = localStorage.getItem('viewingSet');
        if (viewingSetData) {
          const set = JSON.parse(viewingSetData);
          setTitle(set.title);
          setDescription(set.description || '');
          setCards(set.cards);
          setIsEditing(true); // Set editing mode
          setIsEditingSet(true);
        }
      } else {
        setIsEditingSet(false);
      }
    }, []);

  const searchImages = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/unsplash?q=${encodeURIComponent(query)}&per_page=15`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Image search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      searchImages(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchImages]);

  const handleImageSelect = (imageUrl: string) => {
  setSelectedImageUrl(imageUrl);
  setIsModalOpen(false);
  setSearchQuery('');
  setSearchResults([]);
 };

  const simulateEdit = () => {
    const sets = JSON.parse(localStorage.getItem('flashcardSets') || '[]');
    if (sets.length === 0) {
      localStorage.setItem('showEditMessage', 'Create-first');
    } else {
      localStorage.setItem('showEditMessage', 'choose-one');
    }
    router.push('/components/library');
  };

  const questionRef = useRef<HTMLInputElement>(null);
  const answerRef = useRef<HTMLTextAreaElement>(null);
  const logic = Feature(questionRef, answerRef)
  const formRef = useRef<HTMLDivElement>(null);

  const handleCardEdit = (cardToEdit: Flashcard) => {
  if (questionRef.current && answerRef.current) {
    questionRef.current.value = cardToEdit.question;
    answerRef.current.value = cardToEdit.answer;
    setSelectedImageUrl(cardToEdit.imageUrl || null);
    setEditingCardId(cardToEdit.id); // Set the card being edited
    logic.setSelectedLanguageQuestion(cardToEdit.questionLanguage || 'none');
    logic.setSelectedLanguageAnswer(cardToEdit.answerLanguage || 'none');

      if (formRef.current) {
        formRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });

        // Optional: focus the question input
        setTimeout(() => {
          if (questionRef.current) {
            questionRef.current.focus();
          }
        }, 200);
      }
    };
  }

  const handleCardDelete = (cardId: string) => {
    if (window.confirm('Are you sure you want to delete this card?')) {
      setCards(cards.filter(card => card.id !== cardId));
    }
  }
  return (
    <div>
      <div className='sm:max-w-xl md:max-w-3xl lg:max-w-7xl mx-auto'>
        <div className='flex flex-wrap p-2'>
          <h1 className="flex-1 text-2xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              {isEditing ? '✏️ Edit Flashcards' : '➕ Create New Flashcards'}
            </h1>
            <button
                onClick={simulateEdit}
                className="self-end bg-cyan-700 hover:bg-cyan-800 text-purple-300 px-6 py-2 rounded-lg font-bold transition-all transform hover:scale-105 shadow-lg"
              >
                Edit Mode
              </button>
        </div>
      </div>
      <div className="p-6">
        <div className='sm:max-w-xl md:max-w-3xl lg:max-w-7xl mx-auto'>
            {/* Progress indicator for editing */}
            {isEditing && (
              <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-3 mb-4 rounded flex flex-row gap-10">
                <p className="font-medium">✏️ Editing Mode Active</p>
                <p>----</p>
                <p className="text-sm">Make your changes and click &quot;Update Flashcard&quot; to save.</p>
              </div>
            )}

          {/* Set Details */}
          <div className=" flex flex-wrap bg-gradient-to-r from-cyan-800 to-sky-500 p-4 rounded-lg">
            <div className='flex-1 flex items-center justify-center flex-col'>
              <label className='font-bold text-sm lg:text-lg text-purple-300'>📌 Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={(e) => setTitle(capitalizeFirst(e.target.value))}
                placeholder="Enter title..."
                className="p-2 rounded-lg border-2 border-purple-400 bg-transparent text-white hover:opacity-80"/>
            </div>
            <div className='flex-3 flex items-center justify-center flex-col'>
              <label className='font-bold ttext-sm lg:text-lg text-purple-300'> 📝 Description (Optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={(e) => setDescription(capitalizeFirst(e.target.value))}
                placeholder="Enter description..."
                className="p-2 rounded-lg border-2 border-purple-400 bg-transparent text-white hover:opacity-80"
                rows={1}
                cols={50}
              />
            </div>
            <div className='self-end flex items-center justify-center'>
              <button
                onClick={handleSubmitSet}
                disabled={isSubmitting || !title.trim() || cards.length === 0}
                className="bg-gradient-to-r from-blue-800 to-purple-700 text-white px-6 py-5 rounded-xl font-bold hover:scale-105 transition"
                title={isEditingSet ? "Update this flashcard set" : "Create new flashcard set"}
                >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                    {isEditingSet ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  isEditingSet ? 'Update Flashcard Set' : 'Create Flashcard Set'
                )}
              </button>
            </div>
          </div>
        <div ref={formRef}>
          <form
            id='cardForm'
            onSubmit={handleAddCard}
            className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-blue-700/50 mt-2">
              <div className='relative'>
                <div
                className='absolute -left-0 top-0 flex-shrink-0 w-8 h-8 bg-blue-900 flex items-center justify-center text-white font-bold text-sm shadow-2xl border-2 rounded-tl-2xl border-blue-600'>
                  {cards.length + 1}
                </div>
            </div>
        
            <div className='flex flex-wrap gap-2 sm:h-21 md:h-26 lg:h-31 z-50'>
                <div className='relative flex-1 flex items-center justify-center flex-col'>
                    <label className="text-sm lg:text-lg font-bold text-purple-300">
                        ❓ Question / Term
                    </label>
                    <input
                      ref={questionRef}
                      name='question'
                      required
                      defaultValue={currentCard?.question || ''}
                      placeholder="Enter your question / term..."
                      className={`sm:w-50 md:w-70 lg:w-90 border-2 border-blue-400 sm:text-sm md:text-md lg:text-lg lg:ml-10 rounded-lg p-1 hover:opacity-80 ${formErrors.question? '':''}`}
                      /> {formErrors.question && (
                          <p className="absolute text-red-400 text-sm lg:top-30">{formErrors.question}</p>
                        )}

                      {/* Language Selector */}
                      <div className='absolute w-full top-25 left-30'>
                        <div className='relative flex items-center grid-cols-[1fr_auto] gap-2'>
                          <p className='block text-sm font-bold text-white'>Select a language: </p>
                          <div className='relative'>
                            <select
                              size={logic.isQuestionDropdownOpen ? 6 : 1}
                              value={logic.selectedLanguageQuestion}
                              onFocus={() => logic.setIsQuestionDropdownOpen(true)}
                              onBlur={() => logic.setIsQuestionDropdownOpen(false)}
                              onChange={(e) => {
                                logic.setSelectedLanguageQuestion(e.target.value);
                                logic.setShowCharacterQuestion(false);
                                logic.setIsQuestionDropdownOpen(false);
                              }}
                              className={`text-gray-500 text-sm font-extrabold overflow-scroll -top-3.5 absolute hover: custom-scrollbar ${logic.isQuestionDropdownOpen ? 'text-white border-2 border-white' : ' text-gray-400'}`}
                              >
                                <option value='none' className='hover:bg-blue-200 hover:text-black'>None</option>
                                <option value='english' className='hover:bg-blue-200 hover:text-black'>🇪🇳 English</option>
                                <option value="spanish" className='hover:bg-blue-200 hover:text-black'>🇪🇸 Spanish</option>
                                <option value="chinese" className='hover:bg-blue-200 hover:text-black'>🇨🇳 Chinese</option>
                                <option value='french' className='hover:bg-blue-200 hover:text-black'>🇫🇷 French</option>
                                <option value="german" className='hover:bg-blue-200 hover:text-black'>🇩🇪 German</option>
                                <option value="japanese" className='hover:bg-blue-200 hover:text-black'>🇯🇵 Japanese</option>
                                <option value="korean" className='hover:bg-blue-200 hover:text-black'>🇰🇷 Korean</option>
                                <option value="vietnamese" className='hover:bg-blue-200 hover:text-black'>🇻🇳 Vietnamese</option>
                              </select>
                            </div>
                          {!['none', 'english', 'chinese' ].includes(logic.selectedLanguageQuestion) && (
                          <button
                            type="button"
                            onClick={() => logic.setShowCharacterQuestion(!logic.showCharacterQuestion)}
                            className='absolute lg:ml-62 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-all transform hover:scale-105 font-bold text-sm px-1 py-0.5'
                            title="Toggle special characters"
                          >
                            {logic.showCharacterQuestion ? '▼' : '▶'}
                          </button>
                        )}
                        </div>
                        {/* Special Characters Display */}
                        {!['none', 'english', 'chinese'].includes(logic.selectedLanguageQuestion) &&  logic.showCharacterQuestion && logic.languageCharacters[logic.selectedLanguageQuestion] && (
                          <div className="w-90 mt-3 p-2 bg-blue-800/50 rounded-lg border border-purple-400/30 animate-in fade-in duration-300">
                            <div className="flex flex-wrap gap-2">
                              {logic.languageCharacters[logic.selectedLanguageQuestion].map((char, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => logic.insertCharacter(char)}
                                  className="bg-purple-600 hover:bg-purple-400 text-white px-3 py-2 rounded text-base font-medium transition-all transform hover:scale-110 shadow-lg hover:shadow-xl active:scale-95"
                                >
                                  {char}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                </div>

                <div className='relative flex-2 flex items-center justify-center flex-col'>
                    <label className="text-sm lg:text-lg font-bold text-purple-300">
                        💡 Answer / Description
                    </label>
                    <textarea
                      ref={answerRef}
                      name='answer'
                      required
                      rows={1}
                      cols={50}
                      defaultValue={currentCard?.answer || ''}
                      placeholder="Enter your answer / description or use suggestion"
                      onClick={logic.handleAnswerClick}
                      onFocus={logic.handleAnswerClick}
                      onBlur={() => setTimeout(() => logic.setShowTranslations(false), 200)}
                      className={`border-2 border-blue-400 rounded-lg text-lg p-1 hover:opacity-80 ${formErrors.answer? '':''}`}
                      />{formErrors.answer && (
                          <p className="absolute text-red-400 text-sm lg:top-30 right-30">{formErrors.answer}</p>
                        )}

                      {/* Show suggestions */}
                      {logic.showTranslations && logic.translationSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 border-2 border-slate-600 rounded-lg shadow-2xl z-50">
                          <div className="p-3">
                            <p className="text-xs text-gray-300 mb-2">Click to use:</p>
                            {logic.translationSuggestions.map((synonym, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  if (answerRef.current) {
                                    answerRef.current.value = synonym;
                                  }
                                  logic.setShowTranslations(false);
                                }}
                                className="w-full text-left bg-slate-600 hover:bg-slate-500 text-white px-4 py-3 rounded-lg mb-2 last:mb-0 transition-all"
                              >
                                {synonym}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Language Selector */}
                      <div className='absolute w-full top-25 left-80'>
                        <div className='relative flex items-center grid-cols-[1fr_auto] gap-2'>
                          <p className='text-sm font-bold text-white'>Select a language: </p>
                          <div className='relative'>
                            <select
                              size={logic.isAnswerDropdownOpen ? 6 : 1}
                              value={logic.selectedLanguageAnswer}
                              onFocus={() => logic.setIsAnswerDropdownOpen(true)}
                              onBlur={() => logic.setIsAnswerDropdownOpen(false)}
                              onChange={(e) => {
                                logic.setSelectedLanguageAnswer(e.target.value);
                                logic.setShowCharacterAnswer(false);
                                logic.setIsAnswerDropdownOpen(false);
                              }}
                              className={`text-gray-500 text-sm font-extrabold overflow-scroll -top-3.5 absolute custom-scrollbar ${logic.isAnswerDropdownOpen ? 'text-white border-2 border-white' : ' text-gray-400'}`}
                              >
                                <option value='none' className='hover:bg-blue-200 hover:text-black'>None</option>
                                <option value='english' className='hover:bg-blue-200 hover:text-black'>🇪🇳 English</option>
                                <option value="spanish" className='hover:bg-blue-200 hover:text-black'>🇪🇸 Spanish</option>
                                <option value="chinese" className='hover:bg-blue-200 hover:text-black'>🇨🇳 Chinese</option>
                                <option value='french' className='hover:bg-blue-200 hover:text-black'>🇫🇷 French</option>
                                <option value="german" className='hover:bg-blue-200 hover:text-black'>🇩🇪 German</option>
                                <option value="japanese" className='hover:bg-blue-200 hover:text-black'>🇯🇵 Japanese</option>
                                <option value="korean" className='hover:bg-blue-200 hover:text-black'>🇰🇷 Korean</option>
                                <option value="vietnamese" className='hover:bg-blue-200 hover:text-black'>🇻🇳 Vietnamese</option>
                            </select> 
                          </div>

                          {!['none', 'english', 'chinese'].includes(logic.selectedLanguageAnswer) && (
                          <button
                            type="button"
                            onClick={() => logic.setShowCharacterAnswer(!logic.showCharacterAnswer)}
                            className='absolute lg:ml-62 bottom-1 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-all transform hover:scale-105 font-bold text-sm px-1 py-0.5'
                            title="Toggle special characters"
                          >
                            {logic.showCharacterAnswer ? '▼' : '▶'}
                          </button>
                        )}
                        </div>
                        {/* Special Characters Display */}
                        {!['none', 'english', 'chinese'].includes(logic.selectedLanguageAnswer) && logic.showCharacterAnswer && logic.languageCharacters[logic.selectedLanguageAnswer] && (
                          <div className="w-90 mt-3 p-2 bg-blue-800/50 rounded-lg border border-purple-400/30 animate-in fade-in duration-300">
                            <div className="flex flex-wrap gap-2">
                              {logic.languageCharacters[logic.selectedLanguageAnswer].map((char, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => logic.insertCharacterAnswer(char)}
                                  className="bg-purple-600 hover:bg-purple-400 text-white px-3 py-2 rounded text-base font-medium transition-all transform hover:scale-110 shadow-lg hover:shadow-xl active:scale-95"
                                >
                                  {char}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                </div>
              
                <div className='self-end flex items-center justify-center mb-5'>
                  <div className="gap-4">
                    {selectedImageUrl ? (
                      <div className="relative group">
                        <img
                          src={selectedImageUrl}
                          alt="Selected preview"
                          className="h-25 w-45 mr-3 object-cover rounded-xl border-4 border-purple-400 shadow-lg"
                        />
                    <button
                      type="button"
                      onClick={() => setSelectedImageUrl(null)}
                      className="absolute -top-1.5 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 shadow-lg"
                    >
                    ×
                    </button>
                    </div>
                    ) : (
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-6 py-3 rounded-lg transition-all transform hover:scale-105 mx-5"
                    >
                    🔍 Search Image
                    <p>(Recommended)</p>
                    </button>
                    )}
                  </div>
                </div>
            </div>  
          </form> 
        </div> 

          {isModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-blue-400/30">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="absolute right-6 top-3 text-purple-200 hover:text-white text-4xl font-light transition-colors transform hover:scale-110"
                >
                  ×
                </button>
                
                <h2 className="text-3xl font-bold mb-4 text-center text-white">
                  🔍 Search High-Quality Images
                </h2>
                
                <div className="mb-3">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search for images... e.g. 'brain', 'programming', 'nature'"
                    className="w-full p-5 text-lg border-2 border-purple-300 rounded-2xl focus:ring-4 focus:ring-blue-300 outline-none transition-all"
                    autoFocus
                  />
                  <p className="text-center text-purple-200 mt-2 text-sm">
                    Please Search in English • Powered by Unsplash • All images are free to use • Search happens automatically as you type
                  </p>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 h-px bg-purple-300/50"></div>
                  <span className="text-purple-200 font-medium">OR</span>
                  <div className="flex-1 h-px bg-purple-300/50"></div>
                </div>

                {/* Upload from device section */}
                <div className="mb-6 bg-blue-800/30 rounded-2xl p-4 border-2 border-purple-300/50">
                  <h3 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                    📁 Upload from Device
                  </h3>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          handleImageSelect(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full p-3 text-white bg-purple-600 hover:bg-purple-500 rounded-lg cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white file:text-purple-700 hover:file:bg-purple-100 transition-all"
                  />
                  <p className="text-purple-200 text-sm mt-2">
                    Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
                
                {isSearching && (
                  <div className="text-center py-5">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-white"></div>
                    <p className="mt-4 text-white text-lg">Searching for amazing images...</p>
                  </div>
                )}
                
                {!isSearching && searchResults.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {searchResults.map((img, idx) => (
                      <div
                        key={img.id || idx}
                        onClick={() => handleImageSelect(img.urls.regular)}
                        className="cursor-pointer group transform hover:scale-105 transition-all duration-300 hover:z-10 relative"
                      >
                        <img
                          src={img.urls.small}
                          alt={img.alt}
                          className="w-full h-40 object-cover rounded-2xl border-4 border-transparent group-hover:border-blue-300 shadow-lg group-hover:shadow-2xl transition-all duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-2xl transition-colors duration-300 flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 text-white text-2xl transition-opacity">
                            ✓
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {!isSearching && searchResults.length === 0 && searchQuery && (
                  <div className="text-center py-16">
                    <div className="text-8xl mb-6">😔</div>
                    <p className="text-white text-xl font-medium mb-2">No images found for &quot;{searchQuery}&quot;</p>
                    <p className="text-purple-200">Try different keywords or check your spelling</p>
                  </div>
                )}
                
                {!isSearching && !searchQuery && (
                  <></>
                )}
              </div>
            </div>
          )}

            <div className='flex items-center justify-center'>
              <button
                form="cardForm"
                type="submit"
                className="mt-4 bg-blue-900/90 text-white px-6 py-2 rounded-lg hover:bg-sky-900/90 transition hover:scale-110">
                {editingCardId ? ' Update Card' : '+ Add Card'}
              </button>

              {editingCardId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCardId(null);
                    if (questionRef.current) questionRef.current.value = '';
                    if (answerRef.current) answerRef.current.value = '';
                    setSelectedImageUrl(null);
                  }}
                  className="mt-4 bg-gray-500 text-white px-6 py-2 ml-3 rounded-lg hover:bg-gray-600 transition hover:scale-110">
                  Cancel Edit
                </button>
              )}
          </div>
            {cards.length > 0 && (
            <div className="m-3 max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-purple-300 mb-2">
                Cards in Set ({cards.length})
              </h2>
              <div className="gap-3 flex flex-col">
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="bg-slate-800 p-2 rounded-lg flex flex-row gap-4 border-1 border-white">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                      </div>
                    {card.imageUrl && (
                      <img
                        src={card.imageUrl}
                        alt='Flashcard visual'
                        className="flex-1 w-20 h-20 rounded object-cover"
                      />
                    )}

                    <div className='flex-3'>
                      <div className='flex-1 flex flex-row gap-2'>
                          <h3 className="font-bold text-white">{card.question}</h3>
                          <button
                            onClick={() => logic.speakText(card.question, card.questionLanguage)}
                            className="text-white rounded-lg transition-all transform hover:scale-105"
                            title="Listen to pronunciation / notice: if the pronunciation is wrong, please select your language."
                            type="button"
                          >
                            🔊
                          </button>
                      </div>
                      <p className="self-end text-gray-300">{card.answer}</p>
                    </div>

                    <div className='flex-1 gap-2 flex flex-col items-end justify-center'>
                      <button
                        onClick={() => handleCardEdit(card)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-all transform hover:scale-105"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleCardDelete(card.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3.5 py-2 rounded-lg font-medium transition-all transform hover:scale-105"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

