'use client';

import { useState } from 'react';
import { Check, X, ChevronRight, Loader2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface RecoveryOptionData {
  optionId: string;
  name: string;
  netCost: number;
  possibleCompensation?: number;
  arrivalTime: string;
  nodesDropped: string[];
  recommended: boolean;
  scoreBreakdown: { costNorm: number; timeNorm: number; nodesNorm: number };
  changes: { nodeId: string; field: string; from: unknown; to: unknown }[];
  perMemberShare: { memberId: string; amount: number }[];
  quoteExpiresAt: string;
}

interface RecoveryOptionsProps {
  tripId: string;
  /** Pre-loaded options (passed from TripControlCenter when already fetched) */
  options?: RecoveryOptionData[];
  /** Map of nodeId → label for resolving dropped node ids to human-readable names */
  nodeLabels?: Record<string, string>;
  /** Called when "Propose to group" is clicked; receives the new actionId */
  onProposed?: (actionId: string) => void;
}

type RankingMode = 'cheapest' | 'fastest' | 'preserve_itinerary';

const MODE_LABELS: Record<RankingMode, string> = {
  cheapest: 'Cheapest',
  fastest: 'Fastest',
  preserve_itinerary: 'Preserve itinerary',
};

export function RecoveryOptionsPanel({
  tripId,
  options: initialOptions,
  nodeLabels = {},
  onProposed,
}: RecoveryOptionsProps) {
  const [options, setOptions] = useState<RecoveryOptionData[]>(initialOptions ?? []);
  const [loading, setLoading] = useState(false);
  const [proposing, setProposing] = useState<string | null>(null);
  const [proposed, setProposed] = useState<string | null>(null);
  const [view, setView] = useState<'cards' | 'compare'>('cards');
  const [mode, setMode] = useState<RankingMode>('cheapest');
  const [error, setError] = useState<string | null>(null);

  const loadOptions = async (rankingMode: RankingMode = mode) => {
    setLoading(true);
    setError(null);
    try {
      // Pass ?mode= query param per api_contract.md §6
      const res = await fetch(`/api/trips/${tripId}/recovery-options?mode=${rankingMode}`);
      const data = await res.json();
      // Support both { data: { options } } (contract) and legacy { recoveryOptions }
      const opts = data?.data?.options ?? data?.recoveryOptions ?? [];
      setOptions(opts);
    } catch {
      setError('Failed to load recovery options.');
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = (newMode: RankingMode) => {
    setMode(newMode);
    loadOptions(newMode);
  };

  const handlePropose = async (optionId: string) => {
    setProposing(optionId);
    setError(null);
    try {
      const res = await fetch(`/api/actions/${optionId}/propose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, optionId }),
      });
      const data = await res.json();
      const actionId = data?.data?.action?.id ?? data?.data?.id ?? data?.action?.id ?? optionId;
      setProposed(optionId);
      onProposed?.(actionId);
    } catch {
      setError('Failed to propose this option. Please try again.');
    } finally {
      setProposing(null);
    }
  };

  const scatterData = options.map((o, i) => ({
    x: Math.round(o.netCost / 100), // paise → rupees
    y: parseInt(o.arrivalTime.replace(':', '')),
    name: o.name,
    color: ['#172017', '#4E8752', '#858B80'][i % 3],
  }));

  return (
    <div className="card p-6 bg-white border" style={{ borderColor: '#D5D9CC' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-lg" style={{ color: '#172017' }}>Recovery Options</h3>
          <p className="text-sm mt-0.5" style={{ color: '#5F665B' }}>
            {options.length > 0
              ? `${options.length} option${options.length !== 1 ? 's' : ''} — ranked by preference`
              : 'Load options to see available recovery paths'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {options.length > 0 && (
            <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: '#D5D9CC' }}>
              <button
                onClick={() => setView('cards')}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{ background: view === 'cards' ? '#172017' : '#FFFFFF', color: view === 'cards' ? '#F5F2E8' : '#5F665B' }}
              >
                Cards
              </button>
              <button
                onClick={() => setView('compare')}
                className="px-3 py-1.5 text-xs font-semibold"
                style={{ background: view === 'compare' ? '#172017' : '#FFFFFF', color: view === 'compare' ? '#F5F2E8' : '#5F665B' }}
              >
                Compare
              </button>
            </div>
          )}
          <button
            onClick={() => loadOptions()}
            disabled={loading}
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl border"
            style={{ borderColor: '#D5D9CC', background: '#EDE9D8', color: '#172017' }}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
            {loading ? 'Loading…' : options.length > 0 ? 'Refresh' : 'Load options'}
          </button>
        </div>
      </div>

      {/* Ranking mode toggle — E3 preference toggle */}
      <div className="flex gap-1.5 mb-4">
        {(Object.keys(MODE_LABELS) as RankingMode[]).map((m) => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className="text-xs px-3 py-1.5 rounded-full font-semibold transition-colors"
            style={{
              background: mode === m ? '#172017' : '#F5F2E8',
              color: mode === m ? '#F5F2E8' : '#5F665B',
              border: `1px solid ${mode === m ? '#172017' : '#D5D9CC'}`,
            }}
          >
            {MODE_LABELS[m]}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: '#FDECEA', color: '#B03028' }}>
          {error}
        </div>
      )}

      {/* Empty state */}
      {options.length === 0 && !loading && (
        <div className="text-center py-8" style={{ color: '#5F665B' }}>
          <p className="text-sm mb-4">No options loaded yet.</p>
          <button onClick={() => loadOptions()} className="btn-primary px-5 py-2 text-sm">
            Load recovery options
          </button>
        </div>
      )}

      {/* Cards view */}
      {options.length > 0 && view === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {options.map((option, i) => (
            <OptionCard
              key={option.optionId}
              option={option}
              rank={i}
              nodeLabels={nodeLabels}
              isProposed={proposed === option.optionId}
              isProposing={proposing === option.optionId}
              onPropose={() => handlePropose(option.optionId)}
            />
          ))}
        </div>
      )}

      {/* Compare (Pareto scatter) view */}
      {options.length > 0 && view === 'compare' && (
        <div className="card p-6" style={{ background: '#F5F2E8', borderColor: '#D5D9CC' }}>
          <h4 className="font-semibold mb-1" style={{ color: '#172017' }}>Cost vs. Arrival time</h4>
          <p className="text-xs mb-3" style={{ color: '#5F665B' }}>
            Lower-left is better — cheapest and earliest arrival.
          </p>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid stroke="#D5D9CC" strokeDasharray="4 4" />
                <XAxis type="number" dataKey="x" name="Cost" tickFormatter={(v) => `₹${v.toLocaleString()}`} />
                <YAxis type="number" dataKey="y" name="Arrival" />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'Cost' ? [`₹${value.toLocaleString()}`, name] : [value, name]
                  }
                />
                {scatterData.map((d, i) => (
                  <Scatter key={i} data={[d]} fill={d.color} name={d.name} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

function OptionCard({
  option,
  rank,
  nodeLabels,
  isProposed,
  isProposing,
  onPropose,
}: {
  option: RecoveryOptionData;
  rank: number;
  nodeLabels: Record<string, string>;
  isProposed: boolean;
  isProposing: boolean;
  onPropose: () => void;
}) {
  const colors = ['#172017', '#4E8752', '#858B80'];
  const netCostRupees = Math.round(option.netCost / 100);
  const compensationRupees = option.possibleCompensation ? Math.round(option.possibleCompensation / 100) : 0;

  // Resolve nodeId → label; fall back to the id if not in the map
  const droppedLabels = option.nodesDropped?.map((id) => nodeLabels[id] ?? id) ?? [];

  // Quote expiry countdown
  const expiresAt = option.quoteExpiresAt ? new Date(option.quoteExpiresAt) : null;
  const expiresMinStr = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 60000)) + 'm'
    : null;

  return (
    <div
      className="card p-5 flex flex-col gap-3 border"
      style={{
        borderColor: option.recommended ? '#C5D82D' : '#D5D9CC',
        background: option.recommended ? '#F9FCF5' : '#FFFFFF',
        boxShadow: option.recommended ? '0 0 0 2px #C5D82D33' : undefined,
      }}
    >
      {option.recommended && (
        <div className="text-xs font-bold px-2 py-1 rounded-full inline-block self-start" style={{ background: '#C5D82D', color: '#172017' }}>
          ⭐ Recommended
        </div>
      )}

      <div className="font-bold text-sm" style={{ color: colors[rank] ?? '#172017' }}>{option.name}</div>

      {/* Cost */}
      <div>
        <div className="text-2xl font-extrabold" style={{ color: '#172017' }}>
          {netCostRupees === 0 ? 'Free' : `+₹${netCostRupees.toLocaleString()}`}
        </div>
        {compensationRupees > 0 && (
          <div className="text-xs mt-0.5" style={{ color: '#4E8752' }}>
            Possible DGCA compensation: up to ₹{compensationRupees.toLocaleString()} — not guaranteed
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex flex-col gap-1 text-xs" style={{ color: '#5F665B' }}>
        <div><Check size={11} className="inline mr-1 text-[#2E7D32]" />Arrival: {option.arrivalTime}</div>
        {droppedLabels.map((label) => (
          <div key={label}><X size={11} className="inline mr-1 text-[#D93829]" />Drops: {label}</div>
        ))}
      </div>

      {/* Score bars */}
      <div className="flex flex-col gap-1">
        {([
          ['Cost', option.scoreBreakdown.costNorm, '#4E8752'],
          ['Time', option.scoreBreakdown.timeNorm, '#172017'],
          ['Itinerary', option.scoreBreakdown.nodesNorm, '#C5D82D'],
        ] as [string, number, string][]).map(([label, score, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="text-xs w-14" style={{ color: '#858B80' }}>{label}</div>
            <div className="flex-1 h-1.5 rounded-full" style={{ background: '#EDE9D8' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round(score * 100)}%`, background: color, transition: 'width 0.4s' }}
              />
            </div>
            <div className="text-xs w-7 text-right" style={{ color: '#858B80' }}>
              {Math.round(score * 100)}
            </div>
          </div>
        ))}
      </div>

      {/* Quote expiry */}
      {expiresMinStr && (
        <div className="text-xs" style={{ color: '#858B80' }}>
          Price valid for ~{expiresMinStr}
        </div>
      )}

      {/* CTA */}
      {isProposed ? (
        <div className="py-2 rounded-xl text-xs font-semibold text-center" style={{ background: '#DCE8D2', color: '#172017' }}>
          ✓ Proposed to group
        </div>
      ) : (
        <button
          onClick={onPropose}
          disabled={isProposing}
          className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          style={{ background: '#172017', color: '#F5F2E8', opacity: isProposing ? 0.7 : 1 }}
        >
          {isProposing ? <Loader2 size={14} className="animate-spin" /> : null}
          {isProposing ? 'Proposing…' : 'Propose to group'}
        </button>
      )}
    </div>
  );
}
