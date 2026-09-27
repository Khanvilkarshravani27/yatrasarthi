import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { publishTripEvent, appendEventLog } from '@/lib/realtime';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const maxDuration = 60; // 1 minute max duration for cron jobs

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  console.log('[cron:payments] Running payment timeout sweep...');
  try {
    const client = await clientPromise;
    const db = client.db();
    const now = new Date();

    // Find all pending payments whose deadline has passed
    const expiredPayments = await db.collection('payments').find({
      status: 'pending',
      deadlineAt: { $lte: now.toISOString() },
    }).toArray();

    if (expiredPayments.length === 0) {
      console.log('[cron:payments] No expired payments found.');
      return NextResponse.json({ ok: true, count: 0 });
    }

    console.log(`[cron:payments] Found ${expiredPayments.length} expired payment(s).`);

    // Group expired payments by actionId
    const byAction = new Map<string, typeof expiredPayments>();
    for (const p of expiredPayments) {
      const key = p.actionId;
      if (!byAction.has(key)) byAction.set(key, []);
      byAction.get(key)!.push(p);
    }

    for (const [actionId, payments] of byAction) {
      // Mark expired payments as failed
      const expiredIds = payments.map((p: any) => p._id);
      await db.collection('payments').updateMany(
        { _id: { $in: expiredIds } },
        { $set: { status: 'failed', failedAt: now.toISOString() } }
      );

      // Check if ALL payments for this action are now non-pending
      const stillPending = await db.collection('payments').countDocuments({
        actionId,
        status: 'pending',
      });

      if (stillPending === 0) {
        // Roll the action back to 'proposed' so the group can try again
        let action: any = null;
        try { action = await db.collection('actions').findOne({ _id: new ObjectId(actionId) }); } catch {}
        if (!action) action = await db.collection('actions').findOne({ id: actionId });

        if (action) {
          const filter = action._id
            ? { _id: action._id }
            : { id: actionId };

          await db.collection('actions').updateOne(
            filter,
            { $set: { state: 'proposed', updatedAt: now.toISOString() } }
          );

          const tripId: string = action.tripId;
          // Append event log
          await appendEventLog(db, {
            tripId,
            actor: 'system',
            type: 'action.payment_timeout',
            payload: { actionId, expiredCount: payments.length },
          });

          await publishTripEvent(tripId, {
            type: 'action.updated',
            entityId: actionId,
          });
          console.log(`[cron:payments] Action ${actionId} rolled back to 'proposed' (all payments expired).`);
        }
      }
    }

    return NextResponse.json({ ok: true, count: expiredPayments.length });
  } catch (err) {
    console.error('[cron:payments] Error during payment sweep:', err);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
