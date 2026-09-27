'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronRight, Loader2, RotateCcw, TrendingDown, ShieldAlert, Info, Sparkles, Zap, Activity } from 'lucide-react';
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
  initialResult?: SimulationResult | null;
  targetNode?: { id: string; label: string; type: string };
  onClose?: () => void;
}

const TYPE_EMOJI: Record<string, string> = {
  flight: '✈️', train: '🚆', hotel: '🏨', cab: '🚕', bus: '🚌', phantom: '📍',
};

function HealthBar({ score }: { score: number }) {
  const isGood = score >= 70;
  const isOk = score >= 40;
  const color = isGood ? 'from-emerald-400 via-green-400 to-emerald-500' : isOk ? 'from-amber-400 via-orange-400 to-amber-500' : 'from-rose-500 via-red-500 to-rose-600';
  const glow = isGood ? 'shadow-[0_0_15px_rgba(52,211,153,0.5)]' : isOk ? 'shadow-[0_0_15px_rgba(251,191,36,0.5)]' : 'shadow-[0_0_15px_rgba(225,29,72,0.5)]';
  const textColor = isGood ? 'text-emerald-500' : isOk ? 'text-amber-500' : 'text-rose-500';
  
  return (
    <div className="flex items-center gap-5 w-full">
      <div className="flex-1 h-3.5 rounded-full bg-gray-100/50 backdrop-blur-sm overflow-hidden shadow-inner border border-white/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} ${glow} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className={`text-3xl font-black tracking-tighter ${textColor} drop-shadow-md`}>{score}</div>
    </div>
  );
}

export function CascadeImpactPanel({ tripId, initialResult, targetNode, onClose }: CascadeImpactPanelProps) {
  const [result, setResult] = useState<SimulationResult | null>(initialResult ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);

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
      setShowRecovery(false);
    } catch (err: any) {
      setError(err.message ?? 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
        <div className="w-12 h-12 rounded-[16px] flex items-center justify-center bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_20px_rgba(225,29,72,0.4)] text-white flex-shrink-0 animate-pulse">
          <ShieldAlert size={24} />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-2xl text-gray-900 tracking-tight leading-tight">
            {targetNode ? `What if? — ${targetNode.label}` : 'Cascade Impact Analysis'}
          </h3>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            {targetNode ? 'Dry-run AI simulation — no real bookings are modified' : 'Full multi-hop cascade chain visualization'}
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors flex-shrink-0">
            ✕
          </button>
        )}
      </div>

      {/* What if? controls */}
      {targetNode && (
        <div className="p-6 rounded-[24px] bg-white/70 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-blue-500 to-indigo-600" />
          <div className="absolute -right-20 -top-20 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl group-hover:bg-blue-400/20 transition-all duration-500" />
          
          <div className="flex flex-col gap-6 relative z-10">
            <div className="flex items-center justify-between">
              <label className="text-sm font-extrabold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={16} className={cancelled ? 'text-rose-500' : 'text-gray-400'} />
                Complete Cancellation?
              </label>
              <button
                onClick={() => setCancelled(!cancelled)}
                className="relative w-14 h-7 rounded-full transition-all duration-300 focus:outline-none shadow-inner"
                style={{ background: cancelled ? 'linear-gradient(to right, #f43f5e, #e11d48)' : '#E5E7EB' }}
              >
                <span
                  className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300"
                  style={{ transform: cancelled ? 'translateX(1.8rem)' : 'translateX(0.25rem)' }}
                />
              </button>
            </div>
            
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${cancelled ? 'h-0 opacity-0' : 'h-16 opacity-100'}`}>
              <div className="flex items-center gap-5 bg-white/80 p-3.5 rounded-[16px] border border-gray-100 shadow-sm">
                <label className="text-sm font-bold text-gray-700 w-24">Delay time</label>
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range"
                    min={15} max={480} step={15}
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    className="w-full h-2.5 rounded-full appearance-none outline-none bg-gray-200 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(79,70,229,0.4)] [&::-webkit-slider-thumb]:border-[2px] [&::-webkit-slider-thumb]:border-indigo-500 [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                    style={{ background: `linear-gradient(to right, #4F46E5 ${(delayMinutes-15)/465*100}%, #E5E7EB ${(delayMinutes-15)/465*100}%)` }}
                  />
                </div>
                <div className="w-24 text-right">
                  <span className="text-lg font-black text-indigo-600 tabular-nums bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shadow-sm">
                    {delayMinutes >= 60
                      ? `${Math.floor(delayMinutes / 60)}h${delayMinutes % 60 > 0 ? ` ${delayMinutes % 60}m` : ''}`
                      : `${delayMinutes}m`}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full py-4 rounded-[16px] text-sm font-extrabold flex items-center justify-center gap-2 bg-gradient-to-r from-gray-900 to-black text-white hover:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] hover:-translate-y-1 transition-all duration-300 active:scale-[0.98] disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:shadow-none overflow-hidden relative group/btn"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex items-center gap-2">
                {loading ? <Loader2 size={18} className="animate-spin text-blue-300" /> : <Activity size={18} className="text-blue-400 group-hover/btn:text-white transition-colors group-hover/btn:animate-pulse" />}
                {loading ? 'Simulating impact cascade...' : 'Run Cascade Simulation'}
              </div>
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-[16px] text-sm bg-rose-50 border border-rose-100 text-rose-700 font-medium flex items-start gap-2 shadow-sm">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="flex flex-col gap-8 animate-in slide-in-from-bottom-4 fade-in duration-700 fill-mode-both">
          {/* Simulated health score */}
          <div className="p-6 rounded-[24px] bg-white/80 backdrop-blur-xl border border-white shadow-[0_8px_30px_rgb(0,0,0,0.06)] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-green-100/50 to-transparent rounded-bl-full -z-0 blur-xl" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <span className="text-base font-extrabold text-gray-800">
                  {targetNode ? 'Projected Trip Health' : 'Current Trip Health'}
                </span>
                <span className="text-[10px] uppercase font-black tracking-widest px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 shadow-sm border border-amber-200/50">
                  <Sparkles size={12} className="inline mr-1.5 -mt-0.5 text-orange-500" />AI Preview
                </span>
              </div>
              <HealthBar score={result.simulatedHealthScore} />
              
              <div className="mt-6 pt-5 border-t border-gray-100 flex flex-wrap gap-3 text-xs font-bold">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-rose-50 text-rose-700 border border-rose-100 shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse"/>
                  {result.broken.length} Broken
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-amber-50 text-amber-700 border border-amber-100 shadow-sm">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"/>
                  {result.atRisk.length} At Risk
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-slate-50 text-slate-700 border border-slate-200 shadow-sm ml-auto">
                  <span className="text-slate-400">₹</span>
                  <span className="text-slate-800 font-black text-sm">{(result.totalEstimatedCost / 100).toLocaleString('en-IN')}</span> est. loss
                </div>
              </div>
            </div>
          </div>


          {/* Action buttons */}
          {targetNode && (
            <div className="flex gap-4 mt-2">
              <button
                onClick={() => setShowRecovery(!showRecovery)}
                className="flex-1 py-4 rounded-[16px] text-sm font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_10px_30px_rgba(183,222,62,0.4)] hover:shadow-[0_15px_40px_rgba(183,222,62,0.6)] hover:-translate-y-1 active:translate-y-0 active:shadow-sm"
                style={{ background: 'linear-gradient(135deg, #B7DE3E 0%, #9ECA22 100%)', color: '#172017' }}
              >
                <Sparkles size={18} />
                {showRecovery ? 'Hide AI Recovery Plans' : 'Generate AI Recovery Plans'}
              </button>
              <button
                onClick={() => { setResult(null); setShowRecovery(false); }}
                className="px-6 py-4 rounded-[16px] text-sm font-bold flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm hover:shadow-md"
              >
                <RotateCcw size={18} />
                Clear
              </button>
            </div>
          )}
          
          {/* Recovery Options View */}
          {showRecovery && (
            <div className="animate-in slide-in-from-top-4 fade-in duration-500">
              <RecoveryOptionsPanel tripId={tripId} brokenNodeId={targetNode?.id ?? ''} />
            </div>
          )}
        </div>
      )}

      {!result && !loading && !targetNode && (
        <div className="py-16 text-center flex flex-col items-center gap-4 bg-gray-50/50 rounded-[24px] border border-gray-100 border-dashed">
          <div className="w-20 h-20 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
            <Sparkles size={32} className="text-gray-300" />
          </div>
          <p className="text-base font-semibold text-gray-500 max-w-[280px] leading-relaxed">
            Trigger a disruption from the Simulator tab to witness the cascade chain analysis.
          </p>
        </div>
      )}
    </div>
  );
}
