/**
 * Image Generation Tool — STO-36
 *
 * Vercel AI SDK tool() for the DM agent to generate DALL-E 3 images.
 * Used sparingly: first encounter with a new Pokémon/location, boss intros, major reveals.
 *
 * Rate-limited to IMAGE_LIMIT_PER_SESSION (default 5) per session to control cost.
 * Session image count is tracked in-memory (resets on server restart).
 *
 * The `generateImageEndpoint` helper is the actual fetch called by the tool's execute fn.
 * The tool itself is registered on the DM agent in agents/dm.js.
 */

import { tool } from 'ai';
import { z } from 'zod';
import logger from '../lib/logger.js';

// ── Style prefixes ─────────────────────────────────────────────────────────────

const STYLE_PREFIXES = {
  scene:   'Pokémon anime style, vibrant colors, cinematic wide shot, no text, no UI:',
  pokemon: 'Pokémon anime style, official artwork quality, white background, clean illustration, no text:',
  portrait: 'Pokémon anime style, character portrait, detailed face, warm lighting, no text:',
};

// ── Per-session rate limiter (in-memory) ───────────────────────────────────────

const sessionImageCounts = new Map();

function getImageLimit() {
  return parseInt(process.env.IMAGE_LIMIT_PER_SESSION ?? '5', 10);
}

function checkAndIncrementImageCount(sessionId) {
  const count = sessionImageCounts.get(sessionId) ?? 0;
  const limit = getImageLimit();
  if (count >= limit) return false;
  sessionImageCounts.set(sessionId, count + 1);
  return true;
}

export function getSessionImageCount(sessionId) {
  return sessionImageCounts.get(sessionId) ?? 0;
}

// ── Core generation function ───────────────────────────────────────────────────

/**
 * Generate an image via OpenAI DALL-E 3.
 *
 * @param {object} params
 * @param {string} params.subject  What to depict
 * @param {string} params.style    'scene' | 'pokemon' | 'portrait'
 * @param {string} params.sessionId  Used for rate limiting
 * @returns {Promise<{ url: string, revisedPrompt: string, sessionImagesUsed: number }>}
 */
export async function generateImage({ subject, style = 'scene', sessionId }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured — image generation unavailable.');
  }

  if (sessionId && !checkAndIncrementImageCount(sessionId)) {
    throw new Error(
      `Image limit reached (${getImageLimit()} per session). The DM will describe the scene in text.`
    );
  }

  const prefix = STYLE_PREFIXES[style] ?? STYLE_PREFIXES.scene;
  const prompt = `${prefix} ${subject}`;

  logger.info('Generating image', { style, sessionId, promptPreview: prompt.slice(0, 80) });

  const { OpenAI } = await import('openai');
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    size: '1792x1024',
    quality: 'standard',
    n: 1,
  });

  const imageData = response.data?.[0];
  if (!imageData?.url) throw new Error('No image URL returned from OpenAI.');

  return {
    url: imageData.url,
    revisedPrompt: imageData.revised_prompt ?? prompt,
    sessionImagesUsed: sessionImageCounts.get(sessionId) ?? 1,
  };
}

// ── AI SDK tool definition ─────────────────────────────────────────────────────

/**
 * Vercel AI SDK tool for use by the DM agent.
 * Registered in agents/dm.js via getPokeAPITools() or directly.
 *
 * @param {string} sessionId  Passed in via closure when constructing tools per request
 */
export function makeGenerateImageTool(sessionId) {
  return tool({
    description:
      'Generate an image for a significant narrative moment. ' +
      'Use sparingly — only for: first encounter with a new Pokémon or location, ' +
      'boss battle intros, and major story reveals. Do not generate images for routine turns.',
    parameters: z.object({
      subject: z.string().min(5).max(300)
        .describe('What to depict. Be specific: species name, setting, action, mood.'),
      style: z.enum(['scene', 'pokemon', 'portrait'])
        .default('scene')
        .describe(
          'scene = wide cinematic shot; pokemon = official artwork style; portrait = character portrait'
        ),
    }),
    execute: async ({ subject, style }) => {
      try {
        return await generateImage({ subject, style, sessionId });
      } catch (err) {
        logger.warn('Image generation failed in DM tool', { error: err.message });
        // Return a graceful no-image result — DM continues without image
        return { url: null, error: err.message, sessionImagesUsed: getSessionImageCount(sessionId) };
      }
    },
  });
}
