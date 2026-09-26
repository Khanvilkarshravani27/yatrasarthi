import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { publishTripEvent } from '@/lib/realtime';

// POST /api/nodes/:id/confirm — user confirms extraction, moves node out of pending_review
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db();

    const node = await db.collection('nodes').findOne({ _id: new ObjectId(id) });
    if (!node) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Node not found' } }, { status: 404 });

    const update: Record<string, unknown> = {
      status: 'on_track',
      updatedAt: new Date().toISOString(),
    };

    // Merge any corrected fields from the review screen
    if (body.fields) {
      update['rawExtract'] = { ...node.rawExtract, ...body.fields };
    }

    // Store user-supplied refund tier if policy was unmatched
    if (body.refundTier) {
      update['refundPolicy'] = {
        source: 'user_provided',
        summary: body.refundTier,
      };
    }

    await db.collection('nodes').updateOne(
      { _id: new ObjectId(id) },
      { $set: update },
    );
    const updated = await db.collection('nodes').findOne({ _id: new ObjectId(id) });

    if (!updated) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Node not found' } }, { status: 404 });
    }

    // Create edges linking this node into the trip graph on first confirm
    const existingEdge = await db.collection('edges').findOne({ toNodeId: id });
    if (!existingEdge) {
      // Find the chronologically previous confirmed node in this trip
      const prevNode = await db.collection('nodes')
        .find({ tripId: node.tripId, status: { $ne: 'pending_review' }, _id: { $ne: new ObjectId(id) } })
        .sort({ time: -1 })
        .limit(1)
        .next();

      if (prevNode) {
        await db.collection('edges').insertOne({
          tripId: node.tripId,
          fromNodeId: prevNode._id.toString(),
          toNodeId: id,
          bufferMin: 60, // default 1h buffer; user can adjust via PATCH /nodes/:id
          paddingMin: 0,
          constraint: node.constraintType ?? 'soft',
          shared: false,
        });
      }
    }

    // Publish realtime so the trip timeline updates live
    await publishTripEvent(node.tripId as string, { type: 'node.updated', entityId: id });

    return NextResponse.json({ data: { id: updated._id.toString(), ...updated, _id: undefined } });
  } catch (err) {
    console.error('nodes/[id]/confirm error', err);
    return NextResponse.json({ error: { code: 'INTERNAL', message: 'Failed to confirm node' } }, { status: 500 });
  }
}
