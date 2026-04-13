/**
 * DmNarration — DM narration message card
 *
 * STO-31: Auto-speaks new DM narrations via useDmSpeech (Web Speech Synthesis).
 * A mute/unmute button is rendered in the card header so the user can silence TTS
 * mid-session without refreshing.
 */

import React, { useEffect, useRef } from 'react';
import MessageCard from './MessageCard';
import MarkdownText from '../MarkdownText';
import NarrationImage from '../NarrationImage';
import { useDmSpeech } from '../../hooks/useDmSpeech';
import { cn } from '../../lib/utils';

export default function DmNarration({ message, index, autoSpeak = true, isHostView = false, onRegenerateImage, ...props }) {
  const { speak, cancel, isSpeaking, isSupported, muted, setMuted } = useDmSpeech();
  const hasSpokenRef = useRef(false);

  // Auto-speak once when a new narration is mounted (STO-31)
  useEffect(() => {
    if (!autoSpeak || !isSupported || muted || hasSpokenRef.current) return;
    if (message?.content) {
      hasSpokenRef.current = true;
      speak(message.content);
    }
    return () => {
      // Cancel if this card unmounts while still speaking (e.g. fast navigation)
      cancel();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpeakToggle = () => {
    if (isSpeaking) {
      cancel();
    } else {
      speak(message.content);
    }
  };

  return (
    <MessageCard
      role="assistant"
      headerId={`message-${index}-header`}
      {...props}
    >
      {/* Generated scene image (STO-36) */}
      {(message.image_url || message.image_loading) && (
        <div className="mb-3">
          <NarrationImage
            url={message.image_url}
            revisedPrompt={message.image_revised_prompt}
            loading={message.image_loading}
            isHostView={isHostView}
            onRegenerate={onRegenerateImage}
          />
        </div>
      )}

      <MarkdownText className="mt-1">
        {message.content}
      </MarkdownText>

      {/* Intent badge */}
      {message.intent && (
        <div
          aria-label={`Intent: ${message.intent}`}
          className="text-xs text-muted mt-1"
        >
          Intent: {message.intent}
        </div>
      )}

      {/* TTS controls (only if Speech Synthesis is available) */}
      {isSupported && (
        <div className="flex items-center gap-2 mt-2">
          {/* Play / stop this narration */}
          <button
            type="button"
            onClick={handleSpeakToggle}
            aria-label={isSpeaking ? 'Stop narration' : 'Speak narration'}
            title={isSpeaking ? 'Stop' : 'Speak'}
            className={cn(
              'p-1 rounded text-xs transition-colors',
              'border border-border/40 hover:border-brand/50',
              isSpeaking
                ? 'bg-brand/10 text-brand border-brand/40'
                : 'bg-background/40 text-muted hover:text-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring'
            )}
          >
            {isSpeaking ? <StopIcon /> : <SpeakerIcon />}
          </button>

          {/* Global mute toggle */}
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? 'Unmute DM voice' : 'Mute DM voice'}
            title={muted ? 'Unmute DM voice' : 'Mute DM voice'}
            className={cn(
              'p-1 rounded text-xs transition-colors',
              'border border-border/40 hover:border-brand/50',
              muted
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-background/40 text-muted hover:text-foreground',
              'focus:outline-none focus:ring-1 focus:ring-ring'
            )}
          >
            {muted ? <MuteIcon /> : <VolumeIcon />}
          </button>
        </div>
      )}
    </MessageCard>
  );
}

// ── Icon subcomponents ─────────────────────────────────────────────────────────

function SpeakerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
      className="w-3.5 h-3.5" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

function VolumeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function MuteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className="w-3.5 h-3.5" aria-hidden="true">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
