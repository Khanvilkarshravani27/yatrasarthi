'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2, RotateCcw, TrendingDown, ShieldAlert, Info } from 'lucide-react';
import { RecoveryOptionsPanel } from './recovery/RecoveryOptions';

interface HopChainEntry {
  nodeId: string;
  label: string;
  type: string;
  delayMin: number;
  constraint: 'hard' | 'soft';
  reason: string;
  estimatedCost: number;
}

interface SimulationResult {
  brokenNode: { nodeId: string; label: string; delayMinutes: number | null; cancelled: boolean };
  broken: string[];
  atRisk: string[];
  hopChain: HopChainEntry[];
  simulatedHealthScore: number;
  totalEstimatedCost: number;
}

interface CascadeImpactPanelProps {
  tripId: string;
  /** Pre-loaded result if the simulation was already triggered (from DisruptionSimulator) */
  initialResult?: SimulationResult | null;
  /** If provided, shows the "What if?" mode for a specific node */
  targetNode?: { id: string; label: string; type: string };
  onClose?: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  flight: '✈️', train: '🚆', hotel: '🏨', cab: '🚕', bus: '🚌', phantom: '📍',
};

function HealthBar({ score }: { score: number }) {
  const color = score >= 70 ? '#63A66B' : score >= 40 ? '#E7A943' : '#E45B4D';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

export function CascadeImpactPanel({ tripId, initialResult, targetNode, onClose }: CascadeImpactPanelProps) {
  const [result, setResult] = useState<SimulationResult | null>(initialResult ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

  // "What if?" mode fields
  const [delayMinutes, setDelayMinutes] = useState(120);
  const [cancelled, setCancelled] = useState(false);

  const runSimulation = async () => {
    if (!targetNode) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/impact-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: targetNode.id,
          delayMinutes: cancelled ? 0 : delayMinutes,
          cancelled,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? 'Simulation failed');
      setResult(json.data);
      setShowRecovery(false); // Reset recovery view on new simulation
    } catch (err: any) {
      setError(err.message ?? 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#FDECEA' }}>
            <ShieldAlert size={18} style={{ color: '#D93829' }} />
          </div>
          <div>
            <h3 className="font-bold text-base" style={{ color: '#172017' }}>
              {targetNode ? `What if? — ${targetNode.label}` : 'Cascade Impact Analysis'}
            </h3>
            <p className="text-xs" style={{ color: '#5F665B' }}>
              {targetNode ? 'Dry-run simulation — nothing is changed' : 'Full multi-hop cascade chain'}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xs px-2 py-1 rounded-lg" style={{ color: '#5F665B', background: '#F5F2E8' }}>
            ✕
          </button>
        )}
      </div>

      {/* What if? controls — only in targetNode mode */}
      {targetNode && (
        <div className="p-4 rounded-xl border" style={{ background: '#F5F2E8', borderColor: '#D5D9CC' }}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold w-28" style={{ color: '#5F665B' }}>
                Cancelled?
              </label>
              <button
                onClick={() => setCancelled(!cancelled)}
                className="relative w-10 h-5 rounded-full transition-colors"
                style={{ background: cancelled ? '#D93829' : '#D5D9CC' }}
                aria-label="Toggle cancelled"
              >
                <span
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                  style={{ left: cancelled ? '1.4rem' : '0.15rem' }}
                />
              </button>
            </div>
            {!cancelled && (
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold w-28" style={{ color: '#5F665B' }}>
                  Delay (min)
                </label>
                <input
                  type="range"
                  min={15}
                  max={480}
                  step={15}
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="flex-1 accent-[#172017]"
                />
                <span className="text-xs font-bold w-12 text-right" style={{ color: '#172017' }}>
                  {delayMinutes >= 60
                    ? `${Math.floor(delayMinutes / 60)}h${delayMinutes % 60 > 0 ? ` ${delayMinutes % 60}m` : ''}`
                    : `${delayMinutes}m`}
                </span>
              </div>
            )}
            <button
              onClick={runSimulation}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: '#172017', color: '#F5F2E8' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingDown size={14} />}
              {loading ? 'Simulating…' : 'Run simulation'}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl text-sm" style={{ background: '#FDECEA', color: '#B03028' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-4">
          {/* Simulated health score */}
          <div className="p-4 rounded-xl border" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold" style={{ color: '#5F665B' }}>
                {targetNode ? 'Simulated health (not saved)' : 'Current health impact'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#FDF2E0', color: '#9A5A00' }}>
                <Info size={10} className="inline mr-1" />preview
              </span>
            </div>
            <HealthBar score={result.simulatedHealthScore} />
            <div className="mt-2 flex gap-4 text-xs" style={{ color: '#5F665B' }}>
              <span>🔴 <strong>{result.broken.length}</strong> hard-broken</span>
              <span>🟡 <strong>{result.atRisk.length}</strong> at risk</span>
              <span>💸 <strong>₹{(result.totalEstimatedCost / 100).toLocaleString('en-IN')}</strong> est. cost</span>
            </div>
          </div>

          {/* Multi-hop chain */}
          {result.hopChain.length > 0 ? (
            <div className="flex flex-col gap-1">
              <div className="text-xs font-semibold mb-1" style={{ color: '#5F665B' }}>
                Cascade chain ({result.hopChain.length} hop{result.hopChain.length > 1 ? 's' : ''})
              </div>

              {/* Origin node */}
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: '#FDEDEC', border: '1px solid #F5B7B1' }}>
                <span className="text-base">{TYPE_EMOJI[result.brokenNode.label?.toLowerCase()] ?? '⚡'}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold" style={{ color: '#D93829' }}>{result.brokenNode.label}</div>
                  <div className="text-xs" style={{ color: '#5F665B' }}>
                    {result.brokenNode.cancelled ? 'Cancelled' : `Delayed ${result.brokenNode.delayMinutes}m`}
                    {' — origin disruption'}
                  </div>
                </div>
                <AlertTriangle size={14} style={{ color: '#D93829' }} />
              </div>

              {result.hopChain.map((hop, i) => {
                const isHard = hop.constraint === 'hard';
                return (
                  <div key={hop.nodeId} className="flex items-start gap-2">
                    {/* Connector */}
                    <div className="flex flex-col items-center mt-1 ml-3">
                      <div className="w-px flex-1 min-h-[16px]" style={{ background: isHard ? '#E45B4D' : '#E7A943' }} />
                      <ChevronRight size={12} style={{ color: isHard ? '#E45B4D' : '#E7A943' }} />
                    </div>
                    <div
                      className="flex-1 flex items-start gap-2 px-3 py-2.5 rounded-xl"
                      style={{
                        background: isHard ? '#FDECEA' : '#FDF2E0',
                        border: `1px solid ${isHard ? '#EFAAA5' : '#EFD090'}`,
                      }}
                    >
                      <span className="text-base">{TYPE_EMOJI[hop.type] ?? '📌'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold truncate" style={{ color: '#172017' }}>{hop.label}</span>
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{
                              background: isHard ? '#FDECEA' : '#FDF2E0',
                              color: isHard ? '#D93829' : '#B06000',
                              border: `1px solid ${isHard ? '#EFAAA5' : '#EFD090'}`,
                            }}
                          >
                            {isHard ? 'HARD' : 'SOFT'}
                          </span>
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: '#5F665B' }}>
                          +{hop.delayMin}m delay · {hop.reason}
                        </div>
                        <div className="text-xs mt-0.5 font-medium" style={{ color: isHard ? '#D93829' : '#B06000' }}>
                          Est. cost: ₹{(hop.estimatedCost / 100).toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 rounded-xl text-sm text-center" style={{ background: '#F0F8F0', color: '#2E7D32' }}>
              ✓ No downstream cascade — disruption is isolated
            </div>
          )}

          {/* Action buttons */}
          {targetNode && (
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowRecovery(!showRecovery)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
                style={{ background: '#C5D82D', color: '#172017' }}
              >
                {showRecovery ? 'Hide recovery options' : 'View recovery options'}
              </button>
              <button
                onClick={() => { setResult(null); setShowRecovery(false); }}
                className="flex items-center justify-center gap-1.5 text-xs py-2.5 px-4 rounded-xl transition-all hover:bg-[#E2E8F0]"
                style={{ background: '#F5F2E8', color: '#5F665B' }}
              >
                <RotateCcw size={12} />
                Clear
              </button>
            </div>
          )}
          
          {/* Recovery Options View */}
          {showRecovery && (
            <div className="mt-2 animate-slide-up">
              <RecoveryOptionsPanel tripId={tripId} brokenNodeId={targetNode.id} />
            </div>
          )}
        </div>
      )}

      {!result && !loading && !targetNode && (
        <div className="py-8 text-center text-sm" style={{ color: '#5F665B' }}>
          Trigger a disruption from the Simulator tab to see the cascade chain here.
        </div>
      )}
    </div>
  );
}
