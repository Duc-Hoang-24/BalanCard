import { useState, useRef, RefObject } from "react";

export default function Feature(
    questionRefParam?: RefObject<HTMLInputElement | null>,
    answerRefParam?: RefObject<HTMLTextAreaElement | null>
) {
  const defaultQuestionRef = useRef<HTMLInputElement>(null);
  const defaultAnswerRef = useRef<HTMLInputElement>(null)
  const [selectedLanguageQuestion, setSelectedLanguageQuestion] = useState('none');
  const [selectedLanguageAnswer, setSelectedLanguageAnswer] = useState('none');
  const [showCharacterQuestion, setShowCharacterQuestion] = useState(false);
  const [showCharacterAnswer, setShowCharacterAnswer] = useState(false);
  const [translationSuggestions, setTranslationSuggestions] = useState<string[]>([]);
  const [showTranslations, setShowTranslations] = useState(false);
  const [isQuestionDropdownOpen, setIsQuestionDropdownOpen] = useState(false);
  const [isAnswerDropdownOpen, setIsAnswerDropdownOpen] = useState(false);

    const questionRef = questionRefParam || defaultQuestionRef;
    const answerRef = answerRefParam || defaultAnswerRef;

                        // Text-to-Speech Function
  const detectLanguage = (text: string): string => {
    if (!text) return 'en-Us';
    // French
    if (/[àâäæçéèêëïîôùûü]/i.test(text) || 
    /(l'|d'|j'|m'|t'|s'|c'|n'|qu')/i.test(text) ||
    /\b(le|la|les|un|une|des|de|du|au|aux|ce|cette|mon|ma|mes|ton|ta|tes|son|sa|ses|je|tu|il|elle|nous|vous|ils|elles|être|avoir|faire|aller|venir|pouvoir|vouloir|devoir|savoir|voir|prendre|mettre|dire|donner|porter|parler|manger|boire|avec|dans|pour|sur|sous|entre|chez|sans|comme|mais|ou|et|donc|car|ni|or|quel)\b/i.test(text)) return 'fr-FR';
    // Spanish
    if (/[áéíóúñü¿¡]/i.test(text)) return 'es-ES';
    // German
    if (/[äöüß]/i.test(text)) return 'de-DE';
    // Japanese
    if (/[\u3040-\u309F\u30A0-\u30FF\u31F0-\u31FF\uFF65-\uFF9F]/.test(text)) return 'ja-JP';
    // Chinese
    if (/[\u4E00-\u9FFF\u3400-\u4DBF\uF900-\uFAFF\u2E80-\u2EFF]/.test(text)) return 'zh-CN';
    // Korean
    if (/[\uAC00-\uD7AF]/.test(text)) return 'ko-KR';
    // Vietnamese
    if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(text)) return 'vi-VN';
  
    return 'en-US';
  };
  // Language to speech code mapping
  const languageToSpeechCode: Record<string, string> = {
    none: 'en-US',
    english: 'en-US',
    french: 'fr-FR',
    spanish: 'es-ES',
    german: 'de-DE',
    vietnamese: 'vi-VN',
    chinese: 'zh-CN',
    japanese: 'ja-JP',
    korean: 'ko-KR',
  };

  const speakText = (text: string, savedLanguage?: string): void => {
    if (!('speechSynthesis' in window)) {
      alert('Sorry, your browser does not support text-to-speech.');
      return;
    }

    window.speechSynthesis.cancel();

    let language = 'en-US';

    if (savedLanguage && savedLanguage !== 'none') {
      // Use the saved language from the flashcard
      language = languageToSpeechCode[savedLanguage] || 'en-US';
    } else if (selectedLanguageQuestion !== 'none') {
      // Fallback to current UI selection
      language = languageToSpeechCode[selectedLanguageQuestion] || 'en-US';
    } else {
      // Last resort: auto-detect
      language = detectLanguage(text);
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.7;
    window.speechSynthesis.speak(utterance)
  };

                         // Language special characters Function
  const languageCharacters: Record<string, string[]> = {
    none: [],
    english: [],
    chinese: [],
    japanese: [],
    korean: [],
    french: ['à', 'â', 'ä', 'æ', 'ç', 'é', 'è', 'ê', 'ë', 'ï', 'î', 'ô', 'ù', 'û', 'ü', 'œ'], 
    vietnamese: ['à', 'á', 'ả', 'ã', 'ạ', 'ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ', 'â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ', 'đ', 'è', 'é', 'ẻ', 'ẽ', 'ẹ', 'ê', 'ề', 'ế', 'ể', 'ễ', 'ệ'],
    spanish: ['á', 'é', 'í', 'ó', 'ú', 'ñ', 'ü', '¿', '¡', 'Á', 'É', 'Í', 'Ó', 'Ú', 'Ñ', 'Ü'],
    german: ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'],
  };

  // Characters for question
  const insertCharacter = (char: string) => {
    if (questionRef.current) {
      const input = questionRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const currentValue = input.value;

      input.value = currentValue.substring(0, start) + char + currentValue.substring(end);
      input.focus();
      input.setSelectionRange(start + 1, start + 1);
    }
  };

  // Characters for answer
  const insertCharacterAnswer = (char: string) => {
    if (answerRef.current) {
        const input = answerRef.current;
        const start = input.selectionStart || 0;
        const end = input.selectionEnd || 0;
        const currentValue = input.value;

        input.value = currentValue.substring(0, start) + char + currentValue.substring(end);
        input.focus();
        input.setSelectionRange(start + 1, start + 1);
    }
  };

                                // Translation Function
  const fetchTranslations = async (word: string, questionLanguage: string, answerLanguage: string) => {
    if (!word.trim() || answerLanguage !== 'english') {
      setTranslationSuggestions([]);
      return;
    }

    // setIsLoadingTranslation(true);
    setTranslationSuggestions([]);

    try {
      // === STEP 1: Translate to English using Google Translate (auto-detect source) ===
      const googleUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(word)}`;
      const googleRes = await fetch(googleUrl);
      const googleData = await googleRes.json();

      let mainTranslation = '';
      if (Array.isArray(googleData[0])) {
        mainTranslation = googleData[0]
          .map((part: [string, string, unknown, unknown, unknown]) => part[0])
          .join('')
          .trim();
      }

      if (!mainTranslation) {
        setTranslationSuggestions([]);
        return;
      }

      const suggestions = [mainTranslation]; // Start with translation

      // === STEP 2: Get English definition from DictionaryAPI.dev ===
      let englishDefinition = '';
      try {
        const dictUrl = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(mainTranslation)}`;
        const dictRes = await fetch(dictUrl);

        if (dictRes.ok) {
          const dictData = await dictRes.json();
          if (Array.isArray(dictData) && dictData[0]?.meanings?.[0]?.definitions?.[0]?.definition) {
            englishDefinition = dictData[0].meanings[0].definitions[0].definition;
            if (englishDefinition && englishDefinition !== mainTranslation) {
              suggestions.push(englishDefinition);
            }
          }
        }
      } catch {
        console.warn('DictionaryAPI failed, skipping definition');
      }

      // === STEP 3: Translate English definition back to source language ===
      if (englishDefinition && questionLanguage !== 'none' && questionLanguage !== 'english') {
        try {
          // Map language names to Google Translate codes
          const langMap: Record<string, string> = {
            french: 'fr',
            spanish: 'es',
            german: 'de',
            vietnamese: 'vi',
            chinese: 'zh',
            japanese: 'ja',
            korean: 'ko',
          };
          
          const targetLang = langMap[questionLanguage] || 'fr';
          const translateDefUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(englishDefinition)}`;
          const translateDefRes = await fetch(translateDefUrl);
          const translateDefData = await translateDefRes.json();

          let translatedDefinition = '';
          if (Array.isArray(translateDefData[0])) {
            translatedDefinition = translateDefData[0]
              .map((part: [string, string, unknown, unknown, unknown]) => part[0])
              .join('')
              .trim();
          }

          if (translatedDefinition) {
            suggestions.push(translatedDefinition);
          }
        } catch (e) {
          console.warn('Definition translation failed');
        }
      }

      setTranslationSuggestions(suggestions.slice(0, 3)); // Max 3 items

    } catch (error) {
      console.error('Translation error:', error);
      setTranslationSuggestions([]);
    }
  };

   const handleAnswerClick = () => {
    const questionValue = questionRef.current?.value.trim();
    if (questionValue && selectedLanguageAnswer !== 'none') {
      setShowTranslations(true);
      fetchTranslations(questionValue, selectedLanguageQuestion, selectedLanguageAnswer);
    }
  };

  return {
    // State
    selectedLanguageQuestion,
    setSelectedLanguageQuestion,
    selectedLanguageAnswer,
    setSelectedLanguageAnswer,
    showCharacterQuestion,
    setShowCharacterQuestion,
    showCharacterAnswer,
    setShowCharacterAnswer,
    translationSuggestions,
    showTranslations,
    setShowTranslations,
    isQuestionDropdownOpen,
    setIsQuestionDropdownOpen,
    isAnswerDropdownOpen,
    setIsAnswerDropdownOpen,
    // Refs
    questionRef,
    answerRef,
    // Functions
    speakText,
    languageCharacters,
    insertCharacter,
    insertCharacterAnswer,
    handleAnswerClick,
  };
}