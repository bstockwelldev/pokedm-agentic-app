/**
 * useStreamingDM
 *
 * Connects to POST /api/v1/agent/stream (SSE) and delivers tokens incrementally.
 * Parses <narration>, <choices>, <battle_state> tags from the accumulated stream.
 *
 * Usage:
 *   const { send, text, narration, choices, battleState, isStreaming, error } = useStreamingDM(sessionId);
 *   await send("I want to explore the cave");
 *
 * TTS integration: trigger speak(narration) in the onComplete callback,
 * not on each token, to avoid choppy speech.
 */

import { useState, useRef, useCallback } from 'react';

// ─── Tag parsers ─────────────────────────────────────────────────────────────

function extractTag(text, tag) {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1].trim() : null;
}

function parseChoices(raw) {
  if (!raw) return [];
  return raw
    .split('|')
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c, i) => {
      const label = c.replace(/^[A-Za-z]\)\s*/, '').trim();
      const id = String.fromCharCode(65 + i).toLowerCase();
      return { id, label, description: label };
    });
}

function parseBattleState(raw) {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param {string} sessionId
 * @param {{ apiBase?: string, onComplete?: (result: StreamResult) => void }} opts
 */
export function useStreamingDM(sessionId, { apiBase = '/api/v1', onComplete } = {}) {
  const [rawText, setRawText] = useState('');
  const [narration, setNarration] = useState(null);
  const [choices, setChoices] = useState([]);
  const [battleState, setBattleState] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState(null);

  const abortRef = useRef(null);

  const send = useCallback(async (userInput, model = null) => {
    if (!sessionId || !userInput?.trim()) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRawText('');
    setNarration(null);
    setChoices([]);
    setBattleState(null);
    setError(null);
    setIsStreaming(true);

    let accumulated = '';

    try {
      const res = await fetch(`${apiBase}/agent/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, userInput, model }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE lines: "data: {...}\n\n"
        const lines = chunk.split('\n').filter((l) => l.startsWith('data:'));

        for (const line of lines) {
          try {
            const payload = JSON.parse(line.slice(5).trim());
            if (payload.done) break;
            if (payload.error) throw new Error(payload.error);
            if (payload.text) {
              accumulated += payload.text;
              setRawText(accumulated);

              // Live-update narration as tags close
              const liveNarration = extractTag(accumulated, 'narration');
              if (liveNarration) setNarration(liveNarration);
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }

      // Final parse after stream completes
      const finalNarration = extractTag(accumulated, 'narration') ?? accumulated.trim();
      const finalChoices   = parseChoices(extractTag(accumulated, 'choices'));
      const finalBattle    = parseBattleState(extractTag(accumulated, 'battle_state'));

      setNarration(finalNarration);
      setChoices(finalChoices);
      setBattleState(finalBattle);

      onComplete?.({ narration: finalNarration, choices: finalChoices, battleState: finalBattle, rawText: accumulated });
    } catch (err) {
      if (err.name === 'AbortError') return; // Intentional cancel
      setError(err.message || 'Streaming failed');
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, apiBase, onComplete]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  return {
    send,
    cancel,
    rawText,
    narration,
    choices,
    battleState,
    isStreaming,
    error,
  };
}
