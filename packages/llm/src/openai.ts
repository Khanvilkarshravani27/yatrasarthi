import OpenAI from 'openai';
import type { ExtractedBooking, ExtractorProvider } from './types';

const EXTRACTION_PROMPT = `Extract booking details from the provided document. Return a JSON object with:
- type: one of "flight", "train", "bus", "cab", "hotel", "phantom"
- fields: all extracted key-value pairs (pnr, vendor, from, to, time, date, booking_ref, passenger_name, etc.)
- confidence: per-field confidence score between 0 and 1`;

export class OpenAIAdapter implements ExtractorProvider {
  private client: OpenAI;
  private model: string;

  constructor() {
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    this.model = process.env.OPENAI_MODEL || 'gpt-4o';
  }

  async extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking> {
    const userContent: OpenAI.ChatCompletionContentPart[] = [{ type: 'text', text: EXTRACTION_PROMPT }];

    if (input.imageBase64 && input.mimeType) {
      userContent.push({
        type: 'image_url',
        image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}` },
      });
    } else if (input.text) {
      userContent.push({ type: 'text', text: `Document:\n${input.text}` });
    }

    const result = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = result.choices[0]?.message.content ?? '{}';
    return JSON.parse(raw) as ExtractedBooking;
  }

  async draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }> {
    const result = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `Draft a professional vendor email for a travel booking change.
Booking: ${JSON.stringify(ctx.booking)}
Policy: ${ctx.policy}
Requested change: ${ctx.requestedChange}
Return JSON: { "subject": "...", "body": "..." }`,
      }],
    });

    const raw = result.choices[0]?.message.content ?? '{}';
    return JSON.parse(raw);
  }
}
