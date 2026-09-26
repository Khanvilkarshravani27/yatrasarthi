type Constraint = "hard" | "soft";
interface GraphEdge { from: string; to: string; bufferMin: number; paddingMin: number; constraint: Constraint; }

export class TripGraph {
  nodes = new Set<string>();
  edges: GraphEdge[] = [];
  addNode(id: string) { this.nodes.add(id); }
  addEdge(e: GraphEdge) { this.edges.push(e); }

  private preds(id: string) { return this.edges.filter(e => e.to === id); }

  topoOrder(): string[] {           // Kahn's algorithm — plain, no library needed
    const indeg = new Map([...this.nodes].map(n => [n, 0]));
    this.edges.forEach(e => indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1));
    const queue = [...this.nodes].filter(n => indeg.get(n) === 0);
    const order: string[] = [];
    while (queue.length) {
      const n = queue.shift()!;
      order.push(n);
      this.edges.filter(e => e.from === n).forEach(e => {
        indeg.set(e.to, indeg.get(e.to)! - 1);
        if (indeg.get(e.to) === 0) queue.push(e.to);
      });
    }
    return order;
  }

  propagateDelay(brokenNode: string, delayMin: number) {
    const delay = new Map<string, number>([[brokenNode, delayMin]]);
    const broken: string[] = [], atRisk: string[] = [];
    for (const n of this.topoOrder()) {
      const incoming = this.preds(n).map(e => {
        const upstream = delay.get(e.from) ?? 0;
        const slack = e.bufferMin + e.paddingMin;
        return { remaining: Math.max(0, upstream - slack), constraint: e.constraint };
      });
      const worst = incoming.reduce((a, b) => (b.remaining > a.remaining ? b : a), { remaining: 0, constraint: "soft" as Constraint });
      if (worst.remaining > 0) {
        delay.set(n, worst.remaining);
        (worst.constraint === "hard" ? broken : atRisk).push(n);
      }
    }
    return { broken, atRisk, delay };
  }
}
