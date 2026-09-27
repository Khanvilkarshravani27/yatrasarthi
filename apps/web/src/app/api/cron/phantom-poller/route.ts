import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max duration for cron jobs

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[cron:phantom] Running phantom node poll...');
  try {
    const client = await clientPromise;
    const db = client.db();
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

    // Find pending_review nodes whose scheduled time is within the next 3 hours
    const phantomNodes = await db.collection('nodes').find({
      status: 'pending_review',
      type: 'phantom',
      time: { $gte: now.toISOString(), $lte: windowEnd.toISOString() },
    }).toArray();

    if (phantomNodes.length === 0) {
      console.log('[cron:phantom] No phantom nodes in the T-3h window.');
      return NextResponse.json({ ok: true, count: 0 });
    }

    console.log(`[cron:phantom] Found ${phantomNodes.length} phantom node(s) in the T-3h window.`);

    for (const node of phantomNodes) {
      const nodeId = node._id.toString();
      const tripId = node.tripId;

      // Flip to at_risk — the user needs to confirm or replace this leg
      await db.collection('nodes').updateOne(
        { _id: node._id },
        { $set: { status: 'at_risk', phantomWarningAt: now.toISOString() } }
      );

      // Append event log
      await appendEventLog(db, {
        tripId,
        actor: 'system',
        type: 'node.phantom_warning',
        payload: { nodeId, label: node.label, scheduledTime: node.time },
      });

      // Publish realtime warning
      await publishTripEvent(tripId, {
        type: 'node.updated',
        entityId: nodeId,
      });

      console.log(`[cron:phantom] Flagged node ${nodeId} (${node.label}) as at_risk for trip ${tripId}`);
    }

    return NextResponse.json({ ok: true, count: phantomNodes.length });
  } catch (err) {
    console.error('[cron:phantom] Error during phantom poll:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
