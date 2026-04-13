/**
 * useDmSpeech — STO-31
 *
 * React hook for DM narration TTS using the Web Speech Synthesis API.
 * Phase 1 (MVP): browser-native synthesis (free, zero latency).
 * Phase 2 (future): swap `speak()` internals to call POST /api/tts → OpenAI TTS stream.
 *
 * Usage:
 *   const { speak, cancel, isSpeaking, isSupported, muted, setMuted } = useDmSpeech();
 *   speak(narrationText);   // auto-selects best available DM voice
 *   cancel();               // immediately stop any active speech
 *
 * Voice selection heuristic (Phase 1):
 *   Prefer voices matching: "UK English", "Google UK", "Daniel", "Arthur", "Rishi"
 *   Fallback: first English voice, then any voice.
 *
 * Features:
 *   - Respects `muted` state (persisted to sessionStorage)
 *   - Rate, pitch, volume configurable via options
 *   - Automatically cancels previous utterance before starting a new one
 *   - SSMl-lite: strips markdown before speaking
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Constants ──────────────────────────────────────────────────────────────────

const PREFERRED_VOICE_HINTS = [
  'uk english', 'google uk', 'daniel', 'arthur', 'rishi', 'en-gb',
];

const DEFAULT_SPEECH_OPTIONS = {
  rate: 0.95,   // slightly slower than normal for dramatic effect
  pitch: 0.9,   // slightly lower pitch for authoritative DM tone
  volume: 1.0,
};

const MUTED_STORAGE_KEY = 'pokedm_dm_speech_muted';

// ── Hook ───────────────────────────────────────────────────────────────────────

/**
 * @param {object} [options]
 * @param {number} [options.rate]
 * @param {number} [options.pitch]
 * @param {number} [options.volume]
 */
export function useDmSpeech(options = {}) {
  const speechOptions = { ...DEFAULT_SPEECH_OPTIONS, ...options };

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [muted, setMutedState] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(MUTED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const voiceRef = useRef(null);        // cached preferred voice
  const utteranceRef = useRef(null);   // active utterance for cancel

  // Load voices — they may not be available synchronously
  useEffect(() => {
    if (!isSupported) return;
    const loadVoice = () => {
      voiceRef.current = selectPreferredVoice();
    };
    loadVoice();
    window.speechSynthesis.onvoiceschanged = loadVoice;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [isSupported]);

  // Persist muted state
  const setMuted = useCallback((value) => {
    setMutedState(value);
    try {
      sessionStorage.setItem(MUTED_STORAGE_KEY, String(value));
    } catch { /* ignore */ }
    if (value) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
    }
  }, []);

  /**
   * Speak a piece of DM narration text.
   * Cancels any in-progress speech first.
   *
   * @param {string} text  Raw narration (markdown stripped before speaking)
   */
  const speak = useCallback((text) => {
    if (!isSupported || muted || !text?.trim()) return;

    // Cancel current utterance if any
    window.speechSynthesis.cancel();
    utteranceRef.current = null;

    const cleanedText = stripMarkdown(text);
    if (!cleanedText) return;

    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.voice = voiceRef.current ?? selectPreferredVoice();
    utterance.rate = speechOptions.rate;
    utterance.pitch = speechOptions.pitch;
    utterance.volume = speechOptions.volume;
    utterance.lang = 'en-US';

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [isSupported, muted, speechOptions.rate, speechOptions.pitch, speechOptions.volume]);

  /**
   * Immediately stop any active speech.
   */
  const cancel = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setIsSpeaking(false);
  }, [isSupported]);

  // Cancel on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, []);

  return { speak, cancel, isSpeaking, isSupported, muted, setMuted };
}

// ── Pure helpers ───────────────────────────────────────────────────────────────

/**
 * Select the best available voice for DM narration.
 * Prefers deep/authoritative English voices over default system voice.
 */
function selectPreferredVoice() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Try preferred hints
  for (const hint of PREFERRED_VOICE_HINTS) {
    const match = voices.find(
      (v) => v.name.toLowerCase().includes(hint) || v.lang.toLowerCase().includes(hint)
    );
    if (match) return match;
  }

  // Fallback: any English voice
  const englishVoice = voices.find((v) => v.lang.startsWith('en'));
  return englishVoice ?? voices[0];
}

/**
 * Strip markdown syntax before passing text to speech synthesis.
 * Removes: **bold**, *italic*, _under_, `code`, #headers, [link](url), > blockquote
 */
function stripMarkdown(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')    // bold
    .replace(/\*([^*]+)\*/g, '$1')        // italic
    .replace(/_([^_]+)_/g, '$1')          // underline
    .replace(/`([^`]+)`/g, '$1')          // code
    .replace(/^#+\s+/gm, '')              // headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^>\s+/gm, '')               // blockquotes
    .replace(/\n{2,}/g, '. ')             // double newlines → pause
    .replace(/\n/g, ' ')
    .trim();
}
