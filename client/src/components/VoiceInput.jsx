/**
 * VoiceInput — STO-30
 *
 * Web Speech API STT mic button for player actions.
 * Chrome/Edge only for MVP (Firefox does not support SpeechRecognition).
 *
 * Props:
 *   onTranscript(text)      — called with final transcript; caller populates input field
 *   onAutoSubmit(text)      — called on silence timeout; caller submits the action
 *   disabled                — prevents activation
 *   mode                    — "toggle" (click on/off) | "hold" (press-and-hold)
 *   silenceTimeoutMs        — ms of silence before auto-submit (default 1500)
 *
 * States: idle → listening → processing → idle
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '../lib/utils';

const SILENCE_TIMEOUT_DEFAULT = 1500;

// ── Browser capability check ───────────────────────────────────────────────────
const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export default function VoiceInput({
  onTranscript,
  onAutoSubmit,
  disabled = false,
  mode = 'toggle',
  silenceTimeoutMs = SILENCE_TIMEOUT_DEFAULT,
  className,
}) {
  const [state, setState] = useState('idle'); // idle | listening | processing
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const interimRef = useRef('');

  // ── Supported guard ──────────────────────────────────────────────────────────
  if (!SpeechRecognitionAPI) {
    return (
      <button
        type="button"
        disabled
        title="Voice input requires Chrome or Edge"
        className={cn(
          'p-2 rounded-lg opacity-30 cursor-not-allowed',
          'text-muted border border-border/40',
          className
        )}
        aria-label="Voice input not available in this browser"
      >
        <MicIcon state="idle" />
      </button>
    );
  }

  // ── Silence timer ────────────────────────────────────────────────────────────
  const resetSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (interimRef.current.trim()) {
        const final = interimRef.current.trim();
        stopListening();
        setState('processing');
        onTranscript?.(final);
        onAutoSubmit?.(final);
        setTimeout(() => setState('idle'), 300);
      } else {
        stopListening();
      }
    }, silenceTimeoutMs);
  }, [silenceTimeoutMs, onTranscript, onAutoSubmit]);

  // ── Recognition lifecycle ────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (state !== 'idle' || disabled) return;
    setError(null);
    interimRef.current = '';

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => setState('listening');

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      interimRef.current = final || interim;
      onTranscript?.(interimRef.current);
      resetSilenceTimer();
    };

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        stopListening();
        return;
      }
      setError(`Mic error: ${event.error}`);
      stopListening();
    };

    recognition.onend = () => {
      if (state === 'listening') setState('idle');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [state, disabled, onTranscript, resetSilenceTimer]);

  const stopListening = useCallback(() => {
    clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState('idle');
  }, []);

  // ── Toggle / Hold handlers ───────────────────────────────────────────────────
  const handleClick = () => {
    if (mode !== 'toggle') return;
    if (state === 'idle') startListening();
    else stopListening();
  };

  const handleMouseDown = (e) => {
    if (mode !== 'hold') return;
    e.preventDefault();
    startListening();
  };

  const handleMouseUp = () => {
    if (mode !== 'hold') return;
    stopListening();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';

  return (
    <div className={cn('relative inline-flex flex-col items-center', className)}>
      <button
        type="button"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={mode === 'hold' ? handleMouseUp : undefined}
        onTouchStart={mode === 'hold' ? (e) => { e.preventDefault(); startListening(); } : undefined}
        onTouchEnd={mode === 'hold' ? handleMouseUp : undefined}
        disabled={disabled || isProcessing}
        aria-label={
          isListening
            ? 'Stop listening'
            : isProcessing
            ? 'Processing voice input'
            : mode === 'hold'
            ? 'Hold to speak'
            : 'Click to speak'
        }
        aria-pressed={isListening}
        title={mode === 'hold' ? 'Hold to speak' : 'Click to toggle microphone'}
        className={cn(
          'p-2.5 rounded-xl transition-all duration-150',
          'border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          // Idle
          state === 'idle' && !disabled && [
            'bg-background/60 border-border/60',
            'text-muted hover:text-foreground hover:border-brand/50',
          ],
          // Listening — red pulse
          isListening && [
            'bg-red-500/20 border-red-500/60 text-red-400',
            'animate-pulse',
          ],
          // Processing — spinner colors
          isProcessing && [
            'bg-brand/10 border-brand/40 text-brand',
            'opacity-80',
          ],
          disabled && 'opacity-40 cursor-not-allowed',
        )}
      >
        {isProcessing ? (
          <SpinnerIcon />
        ) : (
          <MicIcon active={isListening} />
        )}
      </button>

      {/* Error message */}
      {error && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-red-400 whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}

// ── Icon subcomponents ─────────────────────────────────────────────────────────

function MicIcon({ active }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
      {active && (
        <>
          <line x1="8" y1="22" x2="16" y2="22" strokeWidth={2} />
        </>
      )}
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      className="w-5 h-5 animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
