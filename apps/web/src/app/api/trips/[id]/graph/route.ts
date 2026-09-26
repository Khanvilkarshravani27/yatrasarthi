import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { TripGraph } from '@yatrasarthi/graph';

/**
 * GET /api/trips/:id/graph
 * Returns nodes, edges, trip health score and cascade-computed statuses.
 * Runs TripGraph to recompute which nodes are broken/at_risk based on current edge buffers,
 * then persists any status changes back to the DB before responding.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db();

    const [trip, nodes, edges] = await Promise.all([
      db.collection('trips').findOne({ _id: new ObjectId(id) }),
      db.collection('nodes').find({ tripId: id }).sort({ time: 1 }).toArray(),
      db.collection('edges').find({ tripId: id }).toArray(),
    ]);

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    // Map raw mongo docs to typed shape with string ids
    const mappedNodes = nodes.map((n: any) => ({ ...n, id: n.id ?? n._id.toString(), _id: undefined }));
    const mappedEdges = edges.map((e: any) => ({ ...e, id: e.id ?? e._id.toString(), _id: undefined }));

    // Run TripGraph to re-evaluate cascade from any currently-broken node
    const graph = new TripGraph();
    mappedNodes.forEach((n: any) => graph.addNode(n.id));
    mappedEdges.forEach((e: any) =>
      graph.addEdge({
        from: e.fromNodeId,
        to: e.toNodeId,
        bufferMin: e.bufferMin ?? 0,
        paddingMin: e.paddingMin ?? 0,
        constraint: e.constraint ?? 'soft',
      })
    );

    // Find any nodes already marked broken — rerun cascade from each
    const brokenNodes = mappedNodes.filter((n: any) => n.status === 'broken');
    let allBroken = new Set<string>(brokenNodes.map((n: any) => n.id));
    let allAtRisk = new Set<string>();

    for (const bn of brokenNodes) {
      const { broken, atRisk } = graph.propagateDelay(bn.id, bn.delay ?? 60);
      broken.forEach((nid) => allBroken.add(nid));
      atRisk.forEach((nid) => allAtRisk.add(nid));
    }

    // Remove at_risk from broken if both appear (broken wins)
    allAtRisk.forEach((nid) => { if (allBroken.has(nid)) allAtRisk.delete(nid); });

    // Merge cascade results back onto the nodes we return
    const finalNodes = mappedNodes.map((n: any) => {
      if (allBroken.has(n.id)) return { ...n, status: 'broken' };
      if (allAtRisk.has(n.id)) return { ...n, status: 'at_risk' };
      return n;
    });

    // Recompute health score: 100 - 20*broken - 10*at_risk, floored at 0
    const newHealthScore = Math.max(0, 100 - (allBroken.size * 20) - (allAtRisk.size * 10));
    const newTripStatus = allBroken.size > 0 ? 'needs_attention' : allAtRisk.size > 0 ? 'needs_attention' : 'healthy';

    // Persist health score + node statuses back to DB (fire-and-forget, don't block response)
    const dbUpdates: Promise<any>[] = [];

    if (allBroken.size > 0) {
      dbUpdates.push(
        db.collection('nodes').updateMany(
          { tripId: id, id: { $in: [...allBroken] } },
          { $set: { status: 'broken' } }
        )
      );
    }
    if (allAtRisk.size > 0) {
      dbUpdates.push(
        db.collection('nodes').updateMany(
          { tripId: id, id: { $in: [...allAtRisk] } },
          { $set: { status: 'at_risk' } }
        )
      );
    }
    dbUpdates.push(
      db.collection('trips').updateOne(
        { _id: new ObjectId(id) },
        { $set: { healthScore: newHealthScore, status: newTripStatus } }
      )
    );

    await Promise.all(dbUpdates);

    return NextResponse.json({
      healthScore: newHealthScore,
      status: newTripStatus,
      nodes: finalNodes,
      edges: mappedEdges,
    });
  } catch (error) {
    console.error('[graph] Failed to fetch graph:', error);
    return NextResponse.json({ error: 'Failed to fetch graph' }, { status: 500 });
  }
}
