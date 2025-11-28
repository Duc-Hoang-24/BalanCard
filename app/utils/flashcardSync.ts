import { auth, db } from '../components/firebase-config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';

export type FlashcardSet = {
  id: string;
  title: string;
  description?: string;
  cards: Flashcard[];
  createdAt: Date;
  updatedAt: Date;
}

export type Flashcard = {
  id: string;
  question: string;
  answer: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
};

// Convert Firestore timestamp to Date
const convertTimestamp = (timestamp: Timestamp | Date | string): Date => {
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) return timestamp;
  return new Date(timestamp);
};

// Get flashcards
export const getFlashcards = async (): Promise<FlashcardSet[]> => {
  const user = auth.currentUser;

  if (user) {
    // Logged in - get from Firestore
    try {
      const setsRef = collection(db, 'users', user.uid, 'sets');
      const snapshot = await getDocs(setsRef);
      
      return snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          ...data,
          id: docSnap.id,
          createdAt: convertTimestamp(data.createdAt),
          updatedAt: convertTimestamp(data.updatedAt),
          cards: data.cards.map((card: Flashcard & {
            createdAt: Timestamp | Date | string;
            updatedAt: Timestamp | Date | string;
          }) => ({
            ...card,
            createdAt: convertTimestamp(card.createdAt),
            updatedAt: convertTimestamp(card.updatedAt)
          }))
        } as FlashcardSet;
      });
    } catch (error) {
      console.error('Error fetching from Firestore:', error);
      return [];
    }
  } else {
    // Not logged in - get from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('flashcardSets');
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((set: FlashcardSet & {
          createdAt: string;
          updatedAt: string;
          cards: (Flashcard & { createdAt: string; updatedAt: string })[];
        }) => ({
          ...set,
          createdAt: new Date(set.createdAt),
          updatedAt: new Date(set.updatedAt),
          cards: set.cards.map((card) => ({
            ...card,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt)
          }))
        }));
      }
    }
    return [];
  }
};

const toTimestamp = (date: Date | Timestamp | string | unknown): Timestamp => {
  // If it's already a Firestore Timestamp, return it
  if (date && typeof date === 'object' && 'toDate' in date && 'seconds' in date) {
    return date as Timestamp;
  }
  
  // Convert to Date, handling various input types
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else if (date && typeof date === 'object') {
    // Handle any object that might be date-like
    dateObj = new Date(date.toString());
  } else {
    // Fallback to current date
    dateObj = new Date();
  }
  
  // Verify we have a valid date before calling Timestamp.fromDate
  if (isNaN(dateObj.getTime())) {
    console.warn('Invalid date value, using current date:', date);
    dateObj = new Date();
  }
  
  return Timestamp.fromDate(dateObj);
};

// Save a flashcard set
export const saveFlashcardSet = async (set: FlashcardSet): Promise<void> => {
  const user = auth.currentUser;

  if (user) {
    // Save to Firestore
    try {
      const setRef = doc(db, 'users', user.uid, 'sets', set.id);
      const cleanSet = {
        title: set.title,
        ...(set.description !== undefined && { description: set.description }),
        createdAt: toTimestamp(set.createdAt),
        updatedAt: Timestamp.fromDate(new Date()),
        cards: set.cards.map(card => {
          const cleanCard: {
            id: string;
            question: string;
            answer: string;
            imageUrl?: string;
            createdAt: Timestamp;
            updatedAt: Timestamp;
          } = {
            id: card.id,
            question: card.question,
            answer: card.answer,
            createdAt: toTimestamp(card.createdAt),
            updatedAt: toTimestamp(card.updatedAt),
          };
          if (card.imageUrl !== undefined) {
            cleanCard.imageUrl = card.imageUrl;
          }
          return cleanCard;
        })
      };
      await setDoc(setRef, cleanSet);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      throw error;
    }
  } else {
    // Save to localStorage
    const allSets = await getFlashcards();
    const index = allSets.findIndex(s => s.id === set.id);
    
    if (index >= 0) {
      allSets[index] = { ...set, updatedAt: new Date() };
    } else {
      allSets.push(set);
    }
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('flashcardSets', JSON.stringify(allSets));
    }
  }
};

// Delete a flashcard set
export const deleteFlashcardSet = async (setId: string): Promise<void> => {
  const user = auth.currentUser;

  if (user) {
    try {
      const setRef = doc(db, 'users', user.uid, 'sets', setId);
      await deleteDoc(setRef);
    } catch (error) {
      console.error('Error deleting from Firestore:', error);
      throw error;
    }
  } else {
    const allSets = await getFlashcards();
    const filtered = allSets.filter(s => s.id !== setId);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('flashcardSets', JSON.stringify(filtered));
    }
  }
};

// Migrate localStorage data to Firestore when user logs in
export const migrateLocalDataToFirestore = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return;

  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('flashcardSets');
    if (stored) {
      try {
        const localSets: FlashcardSet[] = JSON.parse(stored).map((set: FlashcardSet & {
          createdAt: string;
          updatedAt: string;
          cards: (Flashcard & { createdAt: string; updatedAt: string })[];
        }) => ({
          ...set,
          createdAt: new Date(set.createdAt),
          updatedAt: new Date(set.updatedAt),
          cards: set.cards.map((card) => ({
            ...card,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt)
          }))
        }));

        // Save each set to Firestore
        for (const set of localSets) {
          await saveFlashcardSet(set);
        }

        // Clear localStorage
        localStorage.removeItem('flashcardSets');
        console.log('✅ Data migrated to cloud!');
      } catch (error) {
        console.error('Error migrating data:', error);
      }
    }
  }
};
