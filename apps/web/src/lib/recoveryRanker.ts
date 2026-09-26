import { Node, Edge } from '@yatrasarthi/types';
import { TripGraph } from '@yatrasarthi/graph';

/**
 * Real recovery option ranker.
 *
 * Output shape matches both:
 * - The `RecoveryOption` interface in packages/types (api_contract.md §1)
 * - The `RecoveryOptionData` interface in components/recovery/RecoveryOptions.tsx
 *
 * Strategy:
 * 1. Find the broken node and run TripGraph to get cascade impact
 * 2. Generate 3 candidate strategies (skip-soft, rebook, phantom leg)
 * 3. Score on 3 axes: cost, time penalty, bookings preserved
 * 4. Normalise scores 0-1 (Pareto), compute weighted total
 * 5. Sort descending, mark top as recommended
 *
 * Scoring weights: 35% cost · 35% time · 30% bookings (matches api_contract §6)
 */

interface RawNode extends Node {
  _id?: any;
  delay?: number;
}

type RankingMode = 'cheapest' | 'fastest' | 'preserve_itinerary';

const MODE_WEIGHTS: Record<RankingMode, { cost: number; time: number; bookings: number }> = {
  cheapest:           { cost: 0.60, time: 0.20, bookings: 0.20 },
  fastest:            { cost: 0.20, time: 0.60, bookings: 0.20 },
  preserve_itinerary: { cost: 0.20, time: 0.20, bookings: 0.60 },
};

function arrivalTimeFromDelay(baseIso: string | undefined, extraMin: number): string {
  if (!baseIso) return 'Unknown';
  try {
    const d = new Date(baseIso);
    d.setMinutes(d.getMinutes() + extraMin);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return 'Unknown';
  }
}

function isoExpiry(fromNow: number): string {
  return new Date(Date.now() + fromNow).toISOString();
}

export function generateRecoveryOptions(
  tripId: string,
  rawNodes: RawNode[],
  rawEdges: Edge[],
  brokenNodeId: string,
  mode: RankingMode = 'cheapest'
) {
  const nodes = rawNodes.map((n) => ({ ...n, id: n.id ?? (n as any)._id?.toString() }));
  const edges = rawEdges.map((e) => ({ ...e, id: e.id ?? (e as any)._id?.toString() }));

  const brokenNode = nodes.find((n) => n.id === brokenNodeId) as any;
  const totalBookings = nodes.filter((n) => n.type !== 'phantom').length;

  if (!brokenNode) {
    return [{
      optionId: 'opt_wait',
      name: 'Wait & Monitor',
      netCost: 0,
      possibleCompensation: 0,
      arrivalTime: arrivalTimeFromDelay(nodes[nodes.length - 1]?.time, 0),
      nodesDropped: [],
      recommended: true,
      scoreBreakdown: { costNorm: 1, timeNorm: 1, nodesNorm: 1 },
      changes: [],
      perMemberShare: [],
      quoteExpiresAt: isoExpiry(30 * 60 * 1000),
    }];
  }

  // Build graph and propagate delay
  const graph = new TripGraph();
  nodes.forEach((n) => graph.addNode(n.id));
  edges.forEach((e) =>
    graph.addEdge({
      from: e.fromNodeId,
      to: e.toNodeId,
      bufferMin: e.bufferMin ?? 0,
      paddingMin: e.paddingMin ?? 0,
      constraint: e.constraint ?? 'soft',
    })
  );

  const delayMin = brokenNode.delay ?? 120;
  const { broken: cascadeBroken, atRisk } = graph.propagateDelay(brokenNodeId, delayMin);

  const affectedIds = new Set([brokenNodeId, ...cascadeBroken, ...atRisk]);
  const affectedNodes = nodes.filter((n) => affectedIds.has(n.id) && n.id !== brokenNodeId) as any[];
  const unaffectedNodes = nodes.filter((n) => !affectedIds.has(n.id)) as any[];
  const lastNode = nodes[nodes.length - 1];

  // Collect member IDs for per-member share split (evenly split among affected members)
  const memberIds = [...new Set(nodes.map((n: any) => n.ownerId).filter(Boolean))];

  interface Candidate {
    optionId: string;
    name: string;
    netCost: number;            // paise
    possibleCompensation: number;
    arrivalTime: string;
    nodesDropped: string[];
    timePenaltyMin: number;
    bookingsPreserved: number;
    recommended: boolean;
    scoreBreakdown: { costNorm: number; timeNorm: number; nodesNorm: number };
    changes: { nodeId: string; field: string; from: unknown; to: unknown }[];
    perMemberShare: { memberId: string; amount: number }[];
    quoteExpiresAt: string;
  }

  const candidates: Candidate[] = [];

  // ── Option 1: Skip soft-constraint downstream nodes, keep hard ones ──────
  {
    const softDropped = affectedNodes.filter((n) => n.constraintType !== 'hard');
    const hardBlocked = affectedNodes.filter((n) => n.constraintType === 'hard');
    const feasible = hardBlocked.length === 0;

    // Cancellation cost: ₹500 per non-refundable soft booking
    const cancelCost = softDropped.reduce(
      (sum, n) => sum + (n.refundPolicy?.source === 'unmatched' ? 50000 : 0),
      0
    );
    const preserved = unaffectedNodes.length;  // bookings kept

    candidates.push({
      optionId: 'opt_skip',
      name: 'Skip & Reschedule',
      netCost: cancelCost,
      possibleCompensation: 0,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, delayMin),
      nodesDropped: softDropped.map((n) => n.id),
      timePenaltyMin: delayMin,
      bookingsPreserved: preserved,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: softDropped.map((n) => ({
        nodeId: n.id,
        field: 'status',
        from: n.status,
        to: 'cancelled',
      })),
      perMemberShare: memberIds.map((mid) => ({ memberId: mid, amount: Math.round(cancelCost / memberIds.length) })),
      quoteExpiresAt: isoExpiry(30 * 60 * 1000),
    });
  }

  // ── Option 2: Rebook the broken node ────────────────────────────────────
  {
    const rebookCostPaise =
      brokenNode.type === 'flight' ? 650000 :
      brokenNode.type === 'train'  ? 120000 :
      brokenNode.type === 'hotel'  ? 300000 : 80000;

    // DGCA compensation applies when flight delay > 2h and airline-controlled
    const possibleCompensation = brokenNode.type === 'flight' && delayMin >= 120 ? 1000000 : 0;
    const timeSaved = Math.max(0, delayMin - 60);
    const preserved = totalBookings; // rebook keeps everything

    candidates.push({
      optionId: 'opt_rebook',
      name: `Rebook ${brokenNode.label || brokenNode.type}`,
      netCost: rebookCostPaise,
      possibleCompensation,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, delayMin - timeSaved),
      nodesDropped: [],
      timePenaltyMin: delayMin - timeSaved,
      bookingsPreserved: preserved,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: [{ nodeId: brokenNodeId, field: 'status', from: 'broken', to: 'on_track' }],
      perMemberShare: memberIds.map((mid) => ({
        memberId: mid,
        amount: Math.round(rebookCostPaise / memberIds.length),
      })),
      quoteExpiresAt: isoExpiry(20 * 60 * 1000), // prices expire in 20min
    });
  }

  // ── Option 3: Add a phantom transit leg to bridge the gap ───────────────
  {
    const phantomCostPaise = 150000; // ₹1500
    const softDropped = affectedNodes.filter(
      (n) => n.constraintType !== 'hard' && !['hotel', 'flight', 'train'].includes(n.type)
    );
    const preserved = unaffectedNodes.length + (affectedNodes.length - softDropped.length);

    candidates.push({
      optionId: 'opt_phantom',
      name: 'Add Alternate Transit',
      netCost: phantomCostPaise,
      possibleCompensation: 0,
      arrivalTime: arrivalTimeFromDelay(lastNode?.time, delayMin + 30),
      nodesDropped: softDropped.map((n) => n.id),
      timePenaltyMin: delayMin + 30,
      bookingsPreserved: preserved,
      recommended: false,
      scoreBreakdown: { costNorm: 0, timeNorm: 0, nodesNorm: 0 },
      changes: [
        ...softDropped.map((n) => ({ nodeId: n.id, field: 'status', from: n.status, to: 'cancelled' })),
        {
          nodeId: 'phantom_new',
          field: 'type',
          from: null,
          to: 'phantom',
        },
      ],
      perMemberShare: memberIds.map((mid) => ({
        memberId: mid,
        amount: Math.round(phantomCostPaise / memberIds.length),
      })),
      quoteExpiresAt: isoExpiry(30 * 60 * 1000),
    });
  }

  // ── Normalise scores (0→1) and apply mode weights ───────────────────────
  const maxCost = Math.max(...candidates.map((c) => c.netCost), 1);
  const maxTime = Math.max(...candidates.map((c) => c.timePenaltyMin), 1);
  const maxBooks = Math.max(totalBookings, 1);

  const weights = MODE_WEIGHTS[mode] ?? MODE_WEIGHTS.cheapest;

  const scored = candidates.map((c) => {
    const costNorm = 1 - c.netCost / maxCost;
    const timeNorm = 1 - c.timePenaltyMin / maxTime;
    const nodesNorm = c.bookingsPreserved / maxBooks;
    const total = costNorm * weights.cost + timeNorm * weights.time + nodesNorm * weights.bookings;
    return { ...c, scoreBreakdown: { costNorm, timeNorm, nodesNorm }, _total: total };
  });

  scored.sort((a, b) => b._total - a._total);
  scored[0].recommended = true;

  // Strip internal _total before returning
  return scored.slice(0, 3).map(({ _total, ...rest }) => rest);
}
