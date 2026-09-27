'use client';

import { useState } from 'react';
import { Users, MapPin, ShieldCheck, Clock, Zap, X } from 'lucide-react';
import { CascadeImpactPanel } from './CascadeImpactPanel';
import { GroupWhatIfPanel } from './GroupWhatIfPanel';
import type { Node, Edge } from '../types';

interface GroupJourneyProps {
  tripId: string;
}

export function GroupJourney({ tripId }: GroupJourneyProps) {
  // --- STATIC DATA FOR PRESENTATION ---
  const members = [
    { memberId: 'u1', name: 'Rahul Sharma', currentLeg: 'Vistara UK-991 (DEL-GOX)', status: 'broken' },
    { memberId: 'u2', name: 'Priya Patel', currentLeg: 'IndiGo 6E-212 (BOM-GOX)', status: 'on_track' },
    { memberId: 'u3', name: 'Amit Singh', currentLeg: 'AirIndia AI-501 (BLR-GOX)', status: 'on_track' },
    { memberId: 'u4', name: 'Neha Singh', currentLeg: 'AirIndia AI-501 (BLR-GOX)', status: 'on_track' },
  ];

  const sharedNodesList = [
    { nodeId: 'meetup', label: 'Goa Mopa Airport Meetup', sharedByCount: 4 },
    { nodeId: 'hotel', label: 'Goa Marriott Resort & Spa', sharedByCount: 4 },
  ];

  const nodes: Node[] = [
    { id: 'h_flight', tripId, ownerId: 'u1', type: 'flight', label: 'Vistara UK-991 (DEL-GOX)', time: '2026-10-10T10:00:00Z', constraintType: 'hard', status: 'broken', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 't_flight', tripId, ownerId: 'u2', type: 'flight', label: 'IndiGo 6E-212 (BOM-GOX)', time: '2026-10-10T11:00:00Z', constraintType: 'hard', status: 'on_track', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'a_flight', tripId, ownerId: 'u3', type: 'flight', label: 'AirIndia AI-501 (BLR-GOX)', time: '2026-10-10T10:30:00Z', constraintType: 'hard', status: 'on_track', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'meetup', tripId, ownerId: 'u1', type: 'phantom', phantomMode: 'other', label: 'Goa Airport Meetup', time: '2026-10-10T12:00:00Z', constraintType: 'soft', status: 'at_risk', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'cab', tripId, ownerId: 'u1', type: 'cab', label: 'MMT Pre-booked Cab', time: '2026-10-10T12:30:00Z', constraintType: 'hard', status: 'at_risk', rawExtract: {}, createdAt: '', updatedAt: '' },
    { id: 'hotel', tripId, ownerId: 'u1', type: 'hotel', label: 'Goa Marriott Resort', time: '2026-10-10T14:00:00Z', constraintType: 'soft', status: 'on_track', rawExtract: {}, createdAt: '', updatedAt: '' },
  ];

  const edges: Edge[] = [
    { id: 'e1', tripId, fromNodeId: 'h_flight', toNodeId: 'meetup', bufferMin: 0, paddingMin: 0, constraint: 'soft', shared: true },
    { id: 'e2', tripId, fromNodeId: 't_flight', toNodeId: 'meetup', bufferMin: 0, paddingMin: 0, constraint: 'soft', shared: true },
    { id: 'e3', tripId, fromNodeId: 'a_flight', toNodeId: 'meetup', bufferMin: 0, paddingMin: 0, constraint: 'soft', shared: true },
    { id: 'e4', tripId, fromNodeId: 'meetup', toNodeId: 'cab', bufferMin: 30, paddingMin: 0, constraint: 'hard', shared: true },
    { id: 'e5', tripId, fromNodeId: 'cab', toNodeId: 'hotel', bufferMin: 90, paddingMin: 0, constraint: 'soft', shared: true },
  ];

  const demoSimulation = {
    brokenNode: { nodeId: 'h_flight', label: 'Vistara UK-991 (DEL-GOX)', delayMinutes: 180, cancelled: false },
    broken: ['cab'],
    atRisk: ['meetup', 'hotel'],
    hopChain: [
      { nodeId: 'meetup', label: 'Goa Airport Meetup', type: 'phantom', delayMin: 180, constraint: 'soft', reason: 'Waiting for Rahul (180m delay)', estimatedCost: 0 },
      { nodeId: 'cab', label: 'MMT Pre-booked Cab', type: 'cab', delayMin: 180, constraint: 'hard', reason: 'Driver wait time exceeded', estimatedCost: 150000 },
      { nodeId: 'hotel', label: 'Goa Marriott Resort', type: 'hotel', delayMin: 180, constraint: 'soft', reason: 'Late check-in', estimatedCost: 0 },
    ],
    simulatedHealthScore: 45,
    totalEstimatedCost: 150000,
  };

  const [whatIfNode, setWhatIfNode] = useState<{ id: string; label: string; type: string } | null>(null);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-10 fade-in">
      {/* Trip Header */}
      <div className="relative rounded-3xl overflow-hidden mb-8 shadow-xl bg-gradient-to-r from-emerald-900 to-teal-900 text-white">
        <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?q=80&w=2000')] bg-cover bg-center mix-blend-overlay" />
        <div className="relative z-10 p-8 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider">Group Trip</span>
              <span className="flex items-center gap-1 text-sm font-medium"><ShieldCheck size={16} className="text-emerald-400" /> Kutumb Active</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">Goa College Reunion</h1>
            <p className="text-emerald-100 text-lg">4 Travelers • Converging from 3 Cities</p>
          </div>
          <div className="flex -space-x-3">
            {['Rahul', 'Priya', 'Amit', 'Neha'].map((n, i) => (
              <div key={n} className="w-12 h-12 rounded-full border-2 border-teal-900 bg-white flex items-center justify-center text-teal-900 font-bold shadow-sm z-10 hover:z-20 transition-transform hover:scale-110" style={{ zIndex: 10 - i }}>
                {n[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Row: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Col 1: Members Status */}
        <div className="rounded-3xl p-5 bg-white border border-gray-100 shadow-sm">
          <h3 className="font-extrabold text-base text-gray-900 mb-4 flex items-center gap-2">
            <Users className="text-blue-500" size={18} /> Live Status
          </h3>
          <div className="flex flex-col gap-2.5">
            {members.map((m) => {
              const isBroken = m.status === 'broken';
              return (
                <div key={m.memberId} className={`flex justify-between items-center p-3 rounded-2xl border ${isBroken ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm ${isBroken ? 'bg-red-500' : 'bg-blue-600'}`}>
                      {m.name[0]}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                        {m.name}
                        {isBroken && <span className="text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-full bg-red-100 text-red-700">Weakest Link</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 max-w-[130px] truncate">{m.currentLeg}</div>
                    </div>
                  </div>
                  <div className={`w-2.5 h-2.5 rounded-full ${isBroken ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 2: Meetup Points */}
        <div className="rounded-3xl p-5 bg-white border border-gray-100 shadow-sm">
          <h3 className="font-extrabold text-base text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="text-emerald-500" size={18} /> Meetup Points
          </h3>
          <div className="flex flex-col gap-3">
            {sharedNodesList.map((sn, i) => (
              <div key={sn.nodeId} className="flex items-start gap-3 p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 w-1 h-full bg-emerald-400" />
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-emerald-600 font-bold text-sm">
                  {i + 1}
                </div>
                <div>
                  <div className="font-bold text-sm text-gray-900">{sn.label}</div>
                  <div className="text-xs text-emerald-600/80 font-semibold mt-1">{sn.sharedByCount} travelers converging here</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Col 3: Cascade Impact (compact) */}
        <div className="rounded-3xl bg-red-50/30 border border-red-100 overflow-hidden shadow-sm">
          <div className="p-3">
            <CascadeImpactPanel tripId={tripId} initialResult={demoSimulation as any} />
          </div>
        </div>
      </div>

      {/* Full-width: Group Sync Graph — styled identically to DependencyGraph */}
      <div className="w-full flex flex-col gap-4">

        {/* Legend — exact copy from DependencyGraph */}
        <div className="flex justify-between items-center px-1">
          <div className="text-gray-500 font-medium text-[13px] flex items-center gap-1.5">
            <span className="font-bold text-teal-800 flex items-center gap-1">
              <span className="text-lg leading-none">→</span> Group Execution DAG
            </span>
            <span className="opacity-60">·</span>
            <span>4 travelers converge at meetup · continue to destination</span>
          </div>
          <div className="flex gap-4 text-gray-500 font-medium text-[13px]">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#62A86B]" /> Confirmed</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#E5A43F]" /> At Risk / Pending</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#E45B4D]" /> Disrupted</div>
          </div>
        </div>

        {/* Dotted container — exact styles from DependencyGraph */}
        <div
          className="pt-10 pb-10 px-8 rounded-[20px] border border-[#EDE8D8] flex overflow-x-auto items-center custom-scrollbar"
          style={{
            backgroundColor: '#FDFDFD',
            backgroundImage: 'radial-gradient(#E2E8F0 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
            backgroundPosition: '0 0',
            scrollBehavior: 'smooth',
          }}
        >
          {/* === PHASE 1: 4 Individual Flight Cards (stacked vertically) === */}
          <div className="flex flex-col gap-4 shrink-0 z-10">
            {[
              { label: 'Vistara UK-991', sub: 'DEL → GOX', time: '10:00 AM', status: 'broken',   member: 'Rahul' },
              { label: 'IndiGo 6E-212',  sub: 'BOM → GOX', time: '11:00 AM', status: 'on_track', member: 'Priya' },
              { label: 'AirIndia AI-501',sub: 'BLR → GOX', time: '10:30 AM', status: 'on_track', member: 'Amit'  },
              { label: 'Akasa QP-112',   sub: 'HYD → GOX', time: '09:45 AM', status: 'on_track', member: 'Neha'  },
            ].map((n, i) => {
              const isBroken = n.status === 'broken';
              const cardBorder = isBroken ? 'border-[#E45B4D]' : 'border-[#62A86B]';
              const dotColor   = isBroken ? 'bg-[#E45B4D]'    : 'bg-[#62A86B]';
              const pulse      = isBroken ? 'animate-pulse'    : '';
              const nodeId = `flight-${i}`;
              return (
                <div key={i} className={`group relative flex flex-col p-4 bg-white border-2 rounded-2xl shadow-sm min-w-[210px] max-w-[230px] transition-all hover:-translate-y-1 z-10 ${cardBorder} ${pulse} hover:shadow-md cursor-default`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none">✈️</span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FDECEA] text-[#D93829] tracking-wide">HARD</span>
                    </div>
                    <div className={`w-3 h-3 rounded-full shadow-sm ${dotColor}`} />
                  </div>
                  <span className="font-bold text-[15px] text-[#172017] truncate mb-1">{n.label}</span>
                  <span className="text-[11px] text-gray-400 font-medium mb-3">{n.sub} · {n.member}</span>
                  <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
                    <div className="flex items-center gap-1.5"><span className="opacity-70">⏱</span><span>{n.time}</span></div>
                    <span className="opacity-70">{isBroken ? '+180m delay' : '0m slack'}</span>
                  </div>
                  {/* Hover tooltip */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+14px)] w-[230px] bg-white border border-gray-100 rounded-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-3 transition-all duration-300 z-50 p-4">
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Traveler</span>
                        <span className="font-bold text-gray-800">{n.member}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Route</span>
                        <span className="font-bold text-gray-800">{n.sub}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-400 font-medium">Status</span>
                        <span className={`font-bold ${isBroken ? 'text-[#E45B4D]' : 'text-[#62A86B]'}`}>{isBroken ? 'Disrupted' : 'On Track'}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); setWhatIfNode({ id: nodeId, label: n.label, type: 'flight' }); }}
                          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 cursor-pointer w-full justify-center"
                          style={{ background: '#172017', color: '#C5D82D' }}
                        >
                          <Zap size={11} /> What if this is disrupted?
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* === SVG: 4 bezier curves converging to center === */}
          {/* card height ≈ 110px, gap = 16px → 4 cards total height = 4*110 + 3*16 = 488px */}
          {/* centers: 55, 55+126=181, 181+126=307, 307+126=433 → midpoint = (55+433)/2 = 244 */}
          <div className="relative shrink-0 pointer-events-none" style={{ width: '120px', height: '488px' }}>
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 120 488">
              {/* Rahul — broken, dashed red */}
              <path d="M0,55 C60,55 60,244 120,244"  stroke="#E45B4D" strokeWidth="2.5" fill="none" strokeDasharray="6 3" />
              {/* Priya */}
              <path d="M0,181 C60,181 60,244 120,244" stroke="#62A86B" strokeWidth="2.5" fill="none" />
              {/* Amit */}
              <path d="M0,307 C60,307 60,244 120,244" stroke="#62A86B" strokeWidth="2.5" fill="none" />
              {/* Neha */}
              <path d="M0,433 C60,433 60,244 120,244" stroke="#62A86B" strokeWidth="2.5" fill="none" />
            </svg>
            {/* Buffer label for the disrupted leg */}
            <span className="absolute text-[10px] font-bold text-[#E45B4D] bg-white/90 px-1.5 py-0.5 rounded border border-[#E45B4D]/20" style={{ top: '80px', left: '8px' }}>
              180m delay
            </span>
          </div>

          {/* === PHASE 2: Meetup Point node (convergence) === */}
          <div className="group relative flex flex-col p-4 bg-white border-2 rounded-2xl shadow-sm min-w-[210px] max-w-[230px] transition-all hover:-translate-y-1 z-10 border-[#E5A43F] hover:shadow-md cursor-default shrink-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">📍</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E8F0E2] text-[#4E8752] tracking-wide">SOFT</span>
              </div>
              <div className="w-3 h-3 rounded-full shadow-sm bg-[#E5A43F]" />
            </div>
            <span className="font-bold text-[15px] text-[#172017] truncate mb-1">Goa Airport Meetup</span>
            <span className="text-[11px] text-gray-400 font-medium mb-3">All 4 travelers · Mopa Airport</span>
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1.5"><span className="opacity-70">⏱</span><span>12:00 PM</span></div>
              <span className="opacity-70">30m slack</span>
            </div>
            {/* Hover tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+14px)] w-[230px] bg-white border border-gray-100 rounded-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-3 transition-all duration-300 z-50 p-4">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Type</span>
                  <span className="font-bold text-gray-800">Shared Meetup Point</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Trust Level</span>
                  <span className="font-bold text-[#62A86B]">High</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setWhatIfNode({ id: 'meetup', label: 'Goa Airport Meetup', type: 'phantom' }); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 cursor-pointer w-full justify-center"
                    style={{ background: '#172017', color: '#C5D82D' }}
                  >
                    <Zap size={11} /> What if meetup is missed?
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Edge: Meetup → Cab */}
          <div className="flex items-center justify-center relative -mx-0.5 z-0 w-20 flex-shrink-0">
            <div className="w-full h-[2px] animate-pulse bg-[#E45B4D]" />
            <span className="absolute -top-5 text-[11px] font-bold whitespace-nowrap text-[#E45B4D]">30m buffer</span>
          </div>

          {/* === PHASE 3: Cab === */}
          <div className="group relative flex flex-col p-4 bg-white border-2 rounded-2xl shadow-sm min-w-[210px] max-w-[230px] transition-all hover:-translate-y-1 z-10 border-[#E5A43F] hover:shadow-md cursor-default shrink-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">🚕</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#FDECEA] text-[#D93829] tracking-wide">HARD</span>
              </div>
              <div className="w-3 h-3 rounded-full shadow-sm bg-[#E5A43F]" />
            </div>
            <span className="font-bold text-[15px] text-[#172017] truncate mb-1">MMT Pre-booked Cab</span>
            <span className="text-[11px] text-gray-400 font-medium mb-3">Group transfer · 4 seats</span>
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1.5"><span className="opacity-70">⏱</span><span>12:30 PM</span></div>
              <span className="opacity-70">90m slack</span>
            </div>
            {/* Hover tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+14px)] w-[230px] bg-white border border-gray-100 rounded-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-3 transition-all duration-300 z-50 p-4">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Vendor</span>
                  <span className="font-bold text-gray-800">MakeMyTrip Cabs</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Trust Level</span>
                  <span className="font-bold text-[#62A86B]">High</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setWhatIfNode({ id: 'cab', label: 'MMT Pre-booked Cab', type: 'cab' }); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 cursor-pointer w-full justify-center"
                    style={{ background: '#172017', color: '#C5D82D' }}
                  >
                    <Zap size={11} /> What if cab is missed?
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Edge: Cab → Hotel */}
          <div className="flex items-center justify-center relative -mx-0.5 z-0 w-20 flex-shrink-0">
            <div className="w-full h-[2px] bg-[#62A86B]" />
            <span className="absolute -top-5 text-[11px] font-bold whitespace-nowrap text-[#62A86B]">90m buffer</span>
          </div>

          {/* === PHASE 4: Hotel (Destination) === */}
          <div className="group relative flex flex-col p-4 bg-white border-2 rounded-2xl shadow-sm min-w-[210px] max-w-[230px] transition-all hover:-translate-y-1 z-10 border-[#62A86B] hover:shadow-md cursor-default shrink-0">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl leading-none">🏨</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#E8F0E2] text-[#4E8752] tracking-wide">SOFT</span>
              </div>
              <div className="w-3 h-3 rounded-full shadow-sm bg-[#62A86B]" />
            </div>
            <span className="font-bold text-[15px] text-[#172017] truncate mb-1">Goa Marriott Resort</span>
            <span className="text-[11px] text-gray-400 font-medium mb-3">Group destination · 4 rooms</span>
            <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
              <div className="flex items-center gap-1.5"><span className="opacity-70">⏱</span><span>02:00 PM</span></div>
              <span className="opacity-70">0m slack</span>
            </div>
            {/* Hover tooltip */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+14px)] w-[230px] bg-white border border-gray-100 rounded-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.2)] opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 translate-y-3 transition-all duration-300 z-50 p-4">
              <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-gray-100 rotate-45" />
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Vendor</span>
                  <span className="font-bold text-gray-800">Goa Marriott Resort & Spa</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-400 font-medium">Trust Level</span>
                  <span className="font-bold text-[#62A86B]">High</span>
                </div>
                <div className="pt-2 border-t border-gray-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); setWhatIfNode({ id: 'hotel', label: 'Goa Marriott Resort', type: 'hotel' }); }}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:scale-105 cursor-pointer w-full justify-center"
                    style={{ background: '#172017', color: '#C5D82D' }}
                  >
                    <Zap size={11} /> What if hotel is cancelled?
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right padding spacer */}
          <div className="w-8 h-1 shrink-0" />
        </div>

        {/* Footer note */}
        <div className="flex items-center gap-2 px-2 text-xs text-gray-400 font-medium">
          <div className="w-1.5 h-1.5 rounded-full bg-[#E45B4D] animate-pulse" />
          Rahul's Vistara flight delayed 180m — downstream impact on Meetup Point and Cab booking is cascading.
        </div>

        {/* What-if panel — shown when a node is clicked */}
        {whatIfNode && (
          <div className="mt-4 bg-white border border-gray-200 rounded-[20px] shadow-sm p-6 overflow-hidden animate-slide-up relative">
            <button
              onClick={() => setWhatIfNode(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <GroupWhatIfPanel
              nodeId={whatIfNode.id}
              nodeLabel={whatIfNode.label}
              onClose={() => setWhatIfNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
