const ENGLISH_PROFANITY = ['ass', 'bastard', 'bitch', 'damn', 'idiot', 'lazy', 'leba', 'moron', 'shit', 'stupid', 'tebeda', 'worst'];
const AMHARIC_LATIN_PROFANITY = ['ahya', 'chigram', 'chigaram', 'tebeda', 'eshsh', 'ደደብ', 'ሞኝ', 'ሰነፍ', 'አህያ', 'ቆሻሻ'];
const KEYBOARD_SEQUENCES = ['asdf', 'fdsa', 'qwer', 'rewq', 'zxcv', 'vcxz', 'poiuy', 'lkjh', 'mnbv'];
export const VALIDATION_MESSAGE = 'እባክዎን አካዳሚያዊ እና ገንቢ አስተያየት ብቻ ያስገቡ። (Please enter constructive academic feedback without improper terms).';

const normalizeText = (text) => String(text || '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const isLetterWord = (word) => /[A-Za-z\u1200-\u137F]/u.test(word) && !/^\d+$/u.test(word);
const isGibberishWord = (word) => {
  const compact = word.toLowerCase().replace(/[^a-z\u1200-\u137F]/gu, '');
  if (!compact || !isLetterWord(compact)) return true;
  return /(.)\1{3,}/u.test(compact)
    || KEYBOARD_SEQUENCES.some((sequence) => compact.includes(sequence))
    || (compact.length > 7 && !/[aeiouy\u1200-\u135A]/iu.test(compact));
};
const profanityPattern = new RegExp(`(^|[^A-Za-z\\u1200-\\u137F])(${[...ENGLISH_PROFANITY, ...AMHARIC_LATIN_PROFANITY].join('|')})(?=$|[^A-Za-z\\u1200-\\u137F])`, 'giu');

export const validateEvaluationFeedback = (text) => {
  const value = normalizeText(text);
  const words = value.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((word) => isLetterWord(word) && !isGibberishWord(word));
  profanityPattern.lastIndex = 0;
  const invalid = profanityPattern.test(value) || words.some(isGibberishWord) || meaningfulWords.length < 3;
  return { valid: !invalid, errors: invalid ? [VALIDATION_MESSAGE] : [], meaningfulWordCount: meaningfulWords.length, quality: invalid || meaningfulWords.length < 6 ? 'Needs More Detail' : 'Good' };
};

export const validateEvaluationFeedbackPair = (strengths, improvements) => {
  const strengthsResult = String(strengths || '').trim() ? validateEvaluationFeedback(strengths) : { valid: true, errors: [], quality: 'Optional' };
  const improvementsResult = String(improvements || '').trim() ? validateEvaluationFeedback(improvements) : { valid: true, errors: [], quality: 'Optional' };
  return { valid: strengthsResult.valid && improvementsResult.valid, strengths: strengthsResult, improvements: improvementsResult, errors: [...new Set([...strengthsResult.errors, ...improvementsResult.errors])] };
};
