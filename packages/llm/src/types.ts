export interface ExtractedBooking { type: string; fields: Record<string, unknown>; confidence: Record<string, number>; }
export interface ExtractorProvider {
  extractBooking(input: { text?: string; imageBase64?: string; mimeType?: string }): Promise<ExtractedBooking>;
  draftVendorEmail(ctx: { booking: unknown; policy: string; requestedChange: string }): Promise<{ subject: string; body: string }>;
}
