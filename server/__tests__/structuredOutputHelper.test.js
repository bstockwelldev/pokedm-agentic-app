import {
  ensureJsonPromptHint,
  getProviderOptionsForStructuredOutput,
  isRecoverableStructuredOutputError,
  requiresJsonPromptHint,
  supportsGroqStructuredOutput,
} from '../lib/structuredOutputHelper.js';

describe('structuredOutputHelper', () => {
  test('supportsGroqStructuredOutput returns true for supported Groq model', () => {
    expect(supportsGroqStructuredOutput('groq/openai/gpt-oss-20b')).toBe(true);
  });

  test('returns JSON object mode provider options for unsupported Groq model', () => {
    expect(getProviderOptionsForStructuredOutput('groq/llama-3.1-8b-instant')).toEqual({
      groq: { structuredOutputs: false },
    });
  });

  test('treats unprefixed Groq model names as Groq for provider options', () => {
    expect(getProviderOptionsForStructuredOutput('llama-3.1-8b-instant')).toEqual({
      groq: { structuredOutputs: false },
    });
  });

  test('requires JSON prompt hint for all Groq models', () => {
    expect(requiresJsonPromptHint('groq/llama-3.1-8b-instant')).toBe(true);
    expect(requiresJsonPromptHint('groq/openai/gpt-oss-20b')).toBe(true);
    expect(requiresJsonPromptHint('gemini-2.5-flash')).toBe(false);
  });

  test('appends json hint when required and missing', () => {
    const prompt = 'Classify this intent into one of the known categories.';
    const enriched = ensureJsonPromptHint(prompt, 'groq/llama-3.1-8b-instant');

    expect(enriched).toContain(prompt);
    expect(enriched).toMatch(/\bjson\b/i);
  });

  test('does not append duplicate hint when prompt already mentions JSON', () => {
    const prompt = 'Return JSON output only.';
    expect(ensureJsonPromptHint(prompt, 'groq/llama-3.1-8b-instant')).toBe(prompt);
  });

  test('does not append json hint for non-Groq models', () => {
    const prompt = 'Return the response now.';
    expect(ensureJsonPromptHint(prompt, 'gemini-2.5-flash')).toBe(prompt);
  });

  test('appends json hint for Groq models when missing', () => {
    const prompt = 'Return the response now.';
    const enriched = ensureJsonPromptHint(prompt, 'groq/openai/gpt-oss-20b');
    expect(enriched).toContain(prompt);
    expect(enriched).toMatch(/\bjson\b/i);
  });

  test('detects recoverable structured output parser failures', () => {
    expect(
      isRecoverableStructuredOutputError(
        new Error("Cannot read properties of undefined (reading 'value')")
      )
    ).toBe(true);
    expect(
      isRecoverableStructuredOutputError(
        new Error("'messages' must contain the word 'json' in some form")
      )
    ).toBe(false);
    expect(
      isRecoverableStructuredOutputError(
        new Error("request failed due to response_format configuration")
      )
    ).toBe(true);
  });
});
