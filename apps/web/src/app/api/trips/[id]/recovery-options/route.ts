import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { generateRecoveryOptions } from '@/lib/recoveryRanker';

type RankingMode = 'cheapest' | 'fastest' | 'preserve_itinerary';

/**
 * GET /api/trips/:id/recovery-options
 * Query: ?disruptionId=&mode=cheapest|fastest|preserve_itinerary
 *
 * Finds all broken nodes for the trip (or the specific disruption),
 * runs the recovery ranker, and returns options in the contract-specified envelope.
 *
 * Response: { data: { options: RecoveryOption[] } }
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const disruptionId = searchParams.get('disruptionId');
    const rawMode = searchParams.get('mode') ?? 'cheapest';
    const mode: RankingMode = ['cheapest', 'fastest', 'preserve_itinerary'].includes(rawMode)
      ? (rawMode as RankingMode)
      : 'cheapest';

    const client = await clientPromise;
    const db = client.db();

    const [nodes, edges, trip] = await Promise.all([
      db.collection('nodes').find({ tripId: id }).sort({ time: 1 }).toArray(),
      db.collection('edges').find({ tripId: id }).toArray(),
      db.collection('trips').findOne({ _id: new ObjectId(id) }),
    ]);

    if (!trip) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Trip not found.' } },
        { status: 404 }
      );
    }

    // Determine which broken node to base recovery options on:
    // 1. If a disruptionId is provided, look up that specific disruption
    // 2. Otherwise fall back to the trip's activeDisruptionId
    // 3. Otherwise pick the first broken node
    let brokenNodeId: string | null = null;

    if (disruptionId && ObjectId.isValid(disruptionId)) {
      const disruption = await db
        .collection('disruptions')
        .findOne({ _id: new ObjectId(disruptionId) });
      brokenNodeId = disruption?.sourceNodeId ?? null;
    }

    if (!brokenNodeId && trip.activeDisruptionId) {
      const activeDis = await db
        .collection('disruptions')
        .findOne({ _id: new ObjectId(trip.activeDisruptionId) });
      brokenNodeId = activeDis?.sourceNodeId ?? null;
    }

    if (!brokenNodeId) {
      // Fallback: first broken node in the trip
      const firstBroken = (nodes as any[]).find((n) => n.status === 'broken');
      brokenNodeId = firstBroken?.id ?? firstBroken?._id?.toString() ?? null;
    }

    if (!brokenNodeId) {
      // No disruption found — return empty list rather than mock data
      return NextResponse.json({ data: { options: [] } });
    }

    // Normalise IDs
    const mappedNodes = (nodes as any[]).map((n) => ({
      ...n,
      id: n.id ?? n._id?.toString(),
    }));
    const mappedEdges = (edges as any[]).map((e) => ({
      ...e,
      id: e.id ?? e._id?.toString(),
    }));

    const options = generateRecoveryOptions(id, mappedNodes, mappedEdges, brokenNodeId, mode);

    return NextResponse.json({ data: { options } });
  } catch (error) {
    console.error('[recovery-options] Failed:', error);
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: 'Failed to get recovery options.' } },
      { status: 500 }
    );
  }
}
