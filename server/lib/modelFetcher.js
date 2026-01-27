/**
 * Model Fetcher Utility
 * Fetches available models from providers
 */

/**
 * Get available Gemini models
 * Note: Gemini API doesn't have a models endpoint, so we return known models
 */
export async function getGeminiModels() {
  // Known Gemini models (as of 2026)
  return [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'google' },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'google' },
    { id: 'gemini-1.5-pro-latest', name: 'Gemini 1.5 Pro (Latest)', provider: 'google' },
    { id: 'gemini-1.5-flash-latest', name: 'Gemini 1.5 Flash (Latest)', provider: 'google' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
    { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
  ];
}

/**
 * Get available Groq models
 * Fetches from Groq API if available, otherwise returns known models
 */
export async function getGroqModels() {
  // Fallback: Known Groq models (always available)
  const fallbackModels = [
    { id: 'groq/llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile (Groq)', provider: 'groq' },
    { id: 'groq/llama-3.1-70b-versatile', name: 'Llama 3.1 70B Versatile (Groq)', provider: 'groq' },
    { id: 'groq/llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant (Groq)', provider: 'groq' },
    { id: 'groq/mixtral-8x7b-32768', name: 'Mixtral 8x7B 32K (Groq)', provider: 'groq' },
    { id: 'groq/llama-3.2-90b-text-preview', name: 'Llama 3.2 90B Text Preview (Groq)', provider: 'groq' },
    { id: 'groq/llama-3.2-11b-text-preview', name: 'Llama 3.2 11B Text Preview (Groq)', provider: 'groq' },
  ];

  try {
    // Try to fetch from Groq API
    const apiKey = process.env.GROQ_API_KEY;
    console.log(`[MODELS] Checking GROQ_API_KEY: ${apiKey ? (apiKey.substring(0, 10) + '...') : 'not set'}`);
    
    if (apiKey && apiKey !== 'your-groq-api-key-here' && apiKey.trim() !== '') {
      console.log('[MODELS] Attempting to fetch Groq models from API...');
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[MODELS] Groq API response received, data.data length: ${data.data?.length || 0}`);
        const apiModels = data.data
          ?.filter((model) => 
            model.id && (
              model.id.startsWith('llama') || 
              model.id.startsWith('mixtral') ||
              model.id.startsWith('gemma')
            )
          )
          .map((model) => ({
            id: `groq/${model.id}`,
            name: `${model.id} (Groq)`,
            provider: 'groq',
          })) || [];

        // If API returned models, use them; otherwise use fallback
        if (apiModels.length > 0) {
          console.log(`[MODELS] Fetched ${apiModels.length} Groq models from API:`, apiModels.map(m => m.id).join(', '));
          return apiModels;
        } else {
          console.log('[MODELS] Groq API returned no matching models, using fallback');
        }
      } else {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.warn(`[MODELS] Groq API returned ${response.status}: ${errorText.substring(0, 100)}`);
      }
    } else {
      console.log('[MODELS] GROQ_API_KEY not configured or is placeholder, using fallback Groq models');
    }
  } catch (error) {
    console.warn('[MODELS] Failed to fetch Groq models from API, using fallback:', error.message);
  }

  // Always return fallback models - this is the critical guarantee
  console.log(`[MODELS] Returning ${fallbackModels.length} fallback Groq models:`, fallbackModels.map(m => m.id).join(', '));
  return fallbackModels;
}

/**
 * Get all available models from all providers
 */
export async function getAllModels() {
  try {
    const [geminiModels, groqModels] = await Promise.all([
      getGeminiModels(),
      getGroqModels(),
    ]);

    const allModels = [...geminiModels, ...groqModels];
    console.log(`[MODELS] Total models available: ${allModels.length} (${geminiModels.length} Gemini, ${groqModels.length} Groq)`);
    return allModels;
  } catch (error) {
    console.error('[MODELS] Error fetching all models:', error);
    // Return at least Gemini models as fallback
    const geminiModels = await getGeminiModels();
    const groqModels = await getGroqModels().catch(() => []);
    return [...geminiModels, ...groqModels];
  }
}
