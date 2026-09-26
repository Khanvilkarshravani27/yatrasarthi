import type { ExtractedBooking, ExtractorProvider } from './types';

/**
 * FallbackAdapter tries the `primary` provider first.
 * If it throws for any reason (rate-limit, quota, API error, etc.)
 * it automatically retries the same call with the `secondary` provider.
 */
export class FallbackAdapter implements ExtractorProvider {
  constructor(
    private primary: ExtractorProvider,
    private secondary: ExtractorProvider,
    private primaryName = 'Gemini',
    private secondaryName = 'OpenAI',
  ) {}

  async extractBooking(
    input: { text?: string; imageBase64?: string; mimeType?: string },
  ): Promise<ExtractedBooking> {
    try {
      return await this.primary.extractBooking(input);
    } catch (err) {
      console.warn(
        `[llm] ${this.primaryName} extractBooking failed — falling back to ${this.secondaryName}:`,
        (err as Error).message,
      );
      return this.secondary.extractBooking(input);
    }
  }

  async draftVendorEmail(ctx: {
    booking: unknown;
    policy: string;
    requestedChange: string;
  }): Promise<{ subject: string; body: string }> {
    try {
      return await this.primary.draftVendorEmail(ctx);
    } catch (err) {
      console.warn(
        `[llm] ${this.primaryName} draftVendorEmail failed — falling back to ${this.secondaryName}:`,
        (err as Error).message,
      );
      return this.secondary.draftVendorEmail(ctx);
    }
  }
}
