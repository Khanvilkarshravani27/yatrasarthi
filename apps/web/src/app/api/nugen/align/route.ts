import { NextResponse } from 'next/server';

/**
 * POST /api/nugen/align
 *
 * Full alignment pipeline:
 * 1. Upload corpus documents to Nugen
 * 2. Create alignment project
 * 3. Return alignment_id for polling
 *
 * Body: { force?: boolean } — force re-alignment even if already done
 *
 * Response: { alignment_id, status, message }
 */

const NUGEN_BASE = 'https://api.nugen.in';
const CORPUS_TEXT = `YatraSarthi Travel Policy & Passenger Rights Corpus

SECTION 1: DGCA PASSENGER RIGHTS (India)

Under DGCA Civil Aviation Requirements (CAR) Section 3, Series M, Part IV:

Flight Delay Compensation:
- Delay 2-4 hours: Airlines must offer meal vouchers and refreshments.
- Delay over 4 hours: Passenger may opt for full refund with no cancellation penalty.
- Delay over 6 hours (flights between 8PM and 3AM): Hotel accommodation required.
- Weather delays: Meal vouchers owed but no monetary compensation (force majeure).

Flight Cancellation Rights:
- Cancellation < 2 weeks before departure: Full refund OR re-routing at no extra cost.
- Cancellation < 24 hours: Full refund + 200% of basic fare compensation (max INR 10,000) for flights < 1500 km.
- Force majeure cancellations (weather, disasters): Full refund only, no extra compensation.

SECTION 2: TRAIN (IRCTC) REFUND POLICY

- Cancellation > 48 hours before: 25% fare deducted (min INR 90 clerkage).
- Cancellation 48-12 hours before: 50% fare deducted.
- TDR for delay > 3 hours: Full refund claimable if passenger does not travel.
- Flood/disaster delays: IRCTC grants full refund without penalty.

SECTION 3: YATRASARTHI RECOVERY LOGIC

Recovery plan ranking (priority order):
1. Minimum additional cost to traveller
2. Minimum additional time added
3. Maximum confidence/feasibility score
4. Preservation of trip destination

Status meanings:
- GREEN (on-track): Buffer intact, connection safe.
- AMBER (at-risk): Buffer being consumed. Connection possible but tight.
- RED (broken): Buffer fully consumed. Connection impossible without intervention.

Cascade propagation: When a node breaks, delay propagates downstream through edges. Each edge has a bufferMin field (minutes of slack). Soft constraints absorb delay up to bufferMin. Hard constraints break immediately.

SECTION 4: WEATHER IMPACT ON TRAVEL

Rainfall impact:
- 0-10mm/hr: No flight impact. Roads add 10-15 min.
- 10-30mm/hr: Flight delays 30-60 min. Roads severely slow.
- >30mm/hr: Flight cancellations likely. Train delays 2-4 hours. Roads may be impassable.
- >50mm/hr: Airport ground stops. NDRF deployed.

Wind impact:
- >60 km/h: Diversions possible. Ground operations slowed.
- >80 km/h: Large-scale cancellations. Airport may close.

Visibility impact:
- <1 km: Cat II/III ILS required. Many India airports cancel flights.
- <200m: Airport closes to all traffic.

SECTION 5: COMPENSATION Q&A

Q: Can I get compensation for weather delay?
A: Weather is force majeure under DGCA. You get meal vouchers for >2hr delay and a full refund for >4hr delay, but no monetary compensation beyond the ticket price.

Q: My train was delayed due to flooding. Can I get a full refund?
A: Yes. File a TDR within 72 hours. IRCTC grants a full refund for weather/disaster delays.

Q: What does confidence score mean?
A: Confidence reflects how likely a recovery option is to be available and executable. 95% = confirmed available. 80% = likely but requires seat release or has high occupancy risk.

Q: Why is one recovery option cheaper than another?
A: YatraSarthi ranks by total additional cost first. A replacement train is usually cheaper than a replacement flight. YatraSarthi also checks for weather-related waivers that may make rebooking free.

Q: What is triggerSource?
A: Every disruption is tagged: vendor_cancellation (airline/hotel cancelled), weather (storm/flood), or user_action (voluntary change). The triggerSource determines which compensation rules apply.

Q: What does amber status mean in YatraSarthi?
A: Amber means the connection is still possible but tight — if the upstream delay increases by more than the remaining buffer, this node will break. Example: Flight 45 min late, hotel check-in 60 min away = 15 min buffer = AMBER.

Q: Is a non-refundable hotel covered in a natural disaster?
A: Not automatically, but most OTAs have a force majeure policy granting credit for bookings in declared disaster zones. YatraSarthi surfaces this option and drafts the waiver request.
`;

export async function POST() {
  try {
    const apiKey = process.env.NUGEN_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'NUGEN_API_KEY not set in environment' },
        { status: 503 }
      );
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Step 1: Upload corpus document
    console.log('[nugen/align] Uploading corpus document…');
    const uploadRes = await fetch(`${NUGEN_BASE}/api/v3/documents`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        content: CORPUS_TEXT,
        name: 'yatrasarthi_policy_corpus',
        type: 'text',
      }),
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('[nugen/align] Document upload failed:', err);
      return NextResponse.json({ error: 'Document upload failed', detail: err }, { status: 500 });
    }

    const uploadData = await uploadRes.json();
    const documentId = uploadData.document_id ?? uploadData.id ?? uploadData.data?.id;
    console.log('[nugen/align] Document uploaded:', documentId);

    // Step 2: Create alignment project
    console.log('[nugen/align] Creating alignment project…');
    const alignRes = await fetch(`${NUGEN_BASE}/api/v3/alignment-projects/create`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        alignment_name: 'YatraSarthi Policy & Recovery Alignment',
        base_model_id: 'qwen-v2p5-0p5b-instruct',
        document_ids: [documentId],
        description: 'Aligned on DGCA passenger rights, IRCTC refund policies, hotel cancellation rules, YatraSarthi recovery ranking logic, and weather-impact travel Q&A.',
      }),
    });

    if (!alignRes.ok) {
      const err = await alignRes.text();
      console.error('[nugen/align] Alignment creation failed:', err);
      return NextResponse.json({ error: 'Alignment creation failed', detail: err }, { status: 500 });
    }

    const alignData = await alignRes.json();
    const alignmentId = alignData.alignment_id ?? alignData.id;
    console.log('[nugen/align] Alignment started:', alignmentId);

    return NextResponse.json({
      alignment_id: alignmentId,
      document_id: documentId,
      status: 'PROCESSING',
      message: 'Alignment job started. Poll /api/nugen/status?id=<alignment_id> to check progress.',
    });
  } catch (error) {
    console.error('[nugen/align] Error:', error);
    return NextResponse.json({ error: 'Internal error', detail: String(error) }, { status: 500 });
  }
}
