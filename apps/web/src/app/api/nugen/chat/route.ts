import { NextResponse } from 'next/server';

/**
 * POST /api/nugen/chat
 * Sends a message to the Nugen-aligned YatraSarthi domain model.
 *
 * Body: { message: string, model_id?: string }
 * Response: { answer: string, confidence_score: number, model_id: string }
 *
 * Falls back to mock responses if NUGEN_API_KEY or model_id not set.
 */

const NUGEN_BASE = 'https://api.nugen.in';

// Mock responses for demo when alignment is still processing or key not set
const MOCK_QA: Record<string, { answer: string; confidence: number }> = {
  default: {
    answer: "Based on the YatraSarthi policy corpus: I can help you understand passenger rights, compensation rules, and recovery options. Please ask a specific question about your disrupted travel.",
    confidence: 72.1,
  },
  compensation: {
    answer: "Under DGCA rules, weather delays are classified as force majeure. For delays over 2 hours, the airline must provide meal vouchers. For delays over 4 hours, you are entitled to a full refund with no cancellation penalty. However, no monetary compensation beyond the ticket price is owed for weather-related delays.",
    confidence: 91.4,
  },
  refund: {
    answer: "For train delays caused by flooding, you can file a TDR (Ticket Deposit Receipt) within 72 hours of the original departure time. Since the delay was weather-related, IRCTC typically grants a full refund without the standard fare deductions. Processing takes up to 90 days.",
    confidence: 88.7,
  },
  amber: {
    answer: "In YatraSarthi, AMBER (at-risk) status means a connection is still possible but the buffer is being consumed. Example: if your flight lands 45 minutes late and hotel check-in is 60 minutes away, you have only 15 minutes of buffer — that node turns AMBER. If the upstream delay increases by more than 15 more minutes, it will turn RED (broken) and require recovery.",
    confidence: 95.2,
  },
  hotel: {
    answer: "Non-refundable hotel bookings are not automatically covered for natural disasters. However, most major OTAs (MakeMyTrip, Booking.com, Agoda) have a force majeure policy that grants a credit note or full refund for bookings in government-declared disaster zones. YatraSarthi will surface this option and draft the waiver request for your confirm tap.",
    confidence: 83.6,
  },
  recovery: {
    answer: "YatraSarthi ranks recovery options in this priority order: (1) minimum additional cost to the traveller, (2) minimum additional time added, (3) maximum confidence score (feasibility), (4) preservation of trip destination and purpose. A replacement train on the same route is usually ranked above a replacement flight due to lower cost, unless you have a hard arrival deadline.",
    confidence: 94.1,
  },
};

function getMockResponse(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('compensat') || lower.includes('flight') || lower.includes('delay') || lower.includes('dgca')) {
    return MOCK_QA.compensation;
  }
  if (lower.includes('train') || lower.includes('irctc') || lower.includes('tdr') || lower.includes('flood')) {
    return MOCK_QA.refund;
  }
  if (lower.includes('amber') || lower.includes('at-risk') || lower.includes('buffer') || lower.includes('status')) {
    return MOCK_QA.amber;
  }
  if (lower.includes('hotel') || lower.includes('non-refund') || lower.includes('disaster')) {
    return MOCK_QA.hotel;
  }
  if (lower.includes('rank') || lower.includes('recovery') || lower.includes('option') || lower.includes('cheaper') || lower.includes('why')) {
    return MOCK_QA.recovery;
  }
  return MOCK_QA.default;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, model_id } = body;

    if (!message) {
      return NextResponse.json({ error: 'Missing message' }, { status: 400 });
    }

    const apiKey = process.env.NUGEN_API_KEY;
    // Use env model_id as fallback if not passed in body
    const effectiveModelId = model_id || process.env.NUGEN_MODEL_ID;

    // If no API key or no aligned model ID yet, return rich mock
    if (!apiKey || !effectiveModelId) {
      const mock = getMockResponse(message);
      return NextResponse.json({
        answer: mock.answer,
        confidence_score: mock.confidence,
        model_id: effectiveModelId ?? 'mock_yatrasarthi_policy_v1',
        source: !apiKey ? 'mock_no_key' : 'mock_aligning',
      });
    }

    // Live Nugen inference
    const res = await fetch(`${NUGEN_BASE}/api/v3/inference/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: effectiveModelId,
        messages: [
          {
            role: 'system',
            content: 'You are the YatraSarthi Policy & Recovery Assistant. Answer questions about passenger rights, compensation, cancellation policies, and trip recovery. Be concise and cite specific rules (DGCA, IRCTC) when relevant.',
          },
          { role: 'user', content: message },
        ],
        max_tokens: 400,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[nugen/chat] Inference failed:', err);
      // Graceful fallback to mock
      const mock = getMockResponse(message);
      return NextResponse.json({
        answer: mock.answer,
        confidence_score: mock.confidence,
        model_id: effectiveModelId,
        source: 'mock_inference_error',
      });
    }

    const data = await res.json();
    const answer = data.choices?.[0]?.message?.content ?? 'No response from model.';
    const confidence = data.confidence_score ?? data.choices?.[0]?.confidence_score ?? null;

    return NextResponse.json({
      answer,
      confidence_score: confidence,
      model_id: effectiveModelId,
      source: 'nugen_live',
    });
  } catch (error) {
    console.error('[nugen/chat] Error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
