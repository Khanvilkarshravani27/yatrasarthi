export type { ExtractedBooking, ExtractorProvider } from './types';
export { FallbackAdapter } from './fallback';
import { GeminiAdapter } from './gemini';
import { OpenAIAdapter } from './openai';
import { FallbackAdapter } from './fallback';
import type { ExtractorProvider } from './types';

/**
 * Returns an LLM extractor based on LLM_PROVIDER env var:
 *   - "openai"  → OpenAI only (no fallback)
 *   - "gemini"  → Gemini only (no fallback)
 *   - unset / "fallback" → Gemini first, auto-falls back to OpenAI on error ✅ (default)
 */
export function getExtractor(): ExtractorProvider {
  const provider = process.env.LLM_PROVIDER ?? 'fallback';
  if (provider === 'openai') return new OpenAIAdapter();
  if (provider === 'gemini') return new GeminiAdapter();
  // Default: try Gemini, fall back to OpenAI automatically
  return new FallbackAdapter(new GeminiAdapter(), new OpenAIAdapter());
}

