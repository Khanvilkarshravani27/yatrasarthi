import { NextResponse } from 'next/server';

/**
 * GET /api/nugen/status?id=<alignment_id>
 * Polls Nugen alignment project status.
 * Returns { alignment_id, status, model_id? }
 * status: QUEUED | PROCESSING | COMPLETED | FAILED
 */

const NUGEN_BASE = 'https://api.nugen.in';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id') ?? process.env.NUGEN_ALIGNMENT_ID;

    if (!id) {
      return NextResponse.json({ error: 'Missing alignment id' }, { status: 400 });
    }

    const apiKey = process.env.NUGEN_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'NUGEN_API_KEY not set' }, { status: 503 });
    }

    const res = await fetch(`${NUGEN_BASE}/api/v3/alignment-projects/${id}/status`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: 'Status check failed', detail: err }, { status: 500 });
    }

    const data = await res.json();

    return NextResponse.json({
      alignment_id: id,
      status: data.status ?? 'UNKNOWN',
      // Nugen may return model_id, aligned_model_id, or it might be in a deploy step
      model_id: data.model_id ?? data.aligned_model_id ?? null,
      progress: data.progress ?? null,
      queue_position: data.queue_position ?? null,
      eta_seconds: data.eta_seconds ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
