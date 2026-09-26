import { GoogleGenAI } from '@google/genai';
import type { ExtractedBooking, ExtractorProvider } from './types';

const EXTRACTION_PROMPT = `Extract booking details from the provided document. Return a JSON object with:
- type: one of "flight", "train", "bus", "cab", "hotel", "phantom"
- fields: all extracted key-value pairs (pnr, vendor, from, to, time, date, booking_ref, passenger_name, etc.)
- confidence: per-field confidence score between 0 and 1

Return ONLY valid JSON. No markdown, no explanation.`;

export class GeminiAdapter implements ExtractorProvider {
  private client: GoogleGenAI;
  private model: string;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY! });
    this.model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  async extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking> {
    const parts: object[] = [{ text: EXTRACTION_PROMPT }];

    if (input.imageBase64 && input.mimeType) {
      parts.push({ inlineData: { mimeType: input.mimeType, data: input.imageBase64 } });
    } else if (input.text) {
      parts.push({ text: `Document:\n${input.text}` });
    }

    const result = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts }],
    });

    const raw = result.text?.trim() ?? '{}';
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const cleaned = match ? match[1].trim() : raw.trim();
    return JSON.parse(cleaned) as ExtractedBooking;
  }

  async draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }> {
    const prompt = `Draft a professional vendor email for a travel booking change.
Booking details: ${JSON.stringify(ctx.booking)}
Policy: ${ctx.policy}
Requested change: ${ctx.requestedChange}

Return JSON: { "subject": "...", "body": "..." }. No markdown.`;

    const result = await this.client.models.generateContent({
      model: this.model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const raw = result.text?.trim() ?? '{}';
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    const cleaned = match ? match[1].trim() : raw.trim();
    return JSON.parse(cleaned);
  }
}
