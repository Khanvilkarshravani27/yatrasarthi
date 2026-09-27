'use client';

import { useState } from 'react';
import { ShieldAlert, Zap, Check, TrendingDown, Sparkles, ChevronDown, ChevronUp, Clock } from 'lucide-react';

// ─── Static data per node ───────────────────────────────────────────────────

const STATIC_DATA: Record<string, {
  health: number;
  brokenCount: number;
  atRiskCount: number;
  lossInr: string;
  disruptions: { label: string; badge: 'hard' | 'soft'; delay: string; reason: string }[];
  recoveryPlans: { title: string; desc: string; saving: string; eta: string; confidence: number; recommended?: boolean }[];
}> = {
  'flight-0': {
    health: 38,
    brokenCount: 2,
    atRiskCount: 2,
    lossInr: '₹3,200',
    disruptions: [
      { label: 'MMT Pre-booked Cab', badge: 'hard', delay: '+180m', reason: 'Cab driver wait time limit exceeded; auto-cancel triggered' },
      { label: 'Goa Airport Meetup', badge: 'soft', delay: '+180m', reason: 'Group meetup window missed — 3 members left waiting' },
      { label: 'Goa Marriott Resort', badge: 'soft', delay: '+180m', reason: 'Check-in window closes at 3 PM — likely late arrival penalty' },
    ],
    recoveryPlans: [
      { title: 'Reschedule Group Meetup to 2:30 PM', desc: 'Notify all 3 members via Kutumb. Book a 90-min lounge pass at Mopa airport for waiting travelers.', saving: '₹2,100 saved', eta: '5 min', confidence: 94, recommended: true },
      { title: 'Book Ola/Uber Cab on Arrival', desc: 'Cancel MMT cab (within free-cancel window) and book an Ola cab once Rahul lands. Group splits cost.', saving: '₹800 saved', eta: '2 min', confidence: 88 },
      { title: 'Request Marriott Late Check-in', desc: 'Contact Goa Marriott and request a 4 PM check-in. Luggage storage guaranteed. No extra charge.', saving: '₹500 saved', eta: '8 min', confidence: 81 },
    ],
  },
  'flight-1': {
    health: 62,
    brokenCount: 1,
    atRiskCount: 1,
    lossInr: '₹900',
    disruptions: [
      { label: 'Goa Airport Meetup', badge: 'soft', delay: '+45m', reason: 'IndiGo late gate release — Priya arrives 45m after group' },
      { label: 'MMT Pre-booked Cab', badge: 'soft', delay: '+20m', reason: 'Minor delay cascades to group departure time' },
    ],
    recoveryPlans: [
      { title: 'Advance Group to Airport Coffee Point', desc: 'Ask remaining 3 members to wait at Gate 7 café. Priya joins in ~45 min. No booking changes needed.', saving: '₹0 loss avoided', eta: '1 min', confidence: 97, recommended: true },
      { title: 'Push Cab Departure by 30 Min', desc: 'Contact MMT driver to wait 30 min extra. MMT policy allows 1 free extension per booking.', saving: '₹400 saved', eta: '3 min', confidence: 85 },
    ],
  },
  'flight-2': {
    health: 75,
    brokenCount: 0,
    atRiskCount: 1,
    lossInr: '₹0',
    disruptions: [
      { label: 'Goa Airport Meetup', badge: 'soft', delay: '+15m', reason: 'BLR ATC minor hold — Amit & Neha arrive 15m late' },
    ],
    recoveryPlans: [
      { title: 'No Action Required', desc: '15-minute delay is within meetup buffer. Group can wait at the designated point. Cab wait time unaffected.', saving: 'No financial impact', eta: 'Immediate', confidence: 99, recommended: true },
    ],
  },
  'flight-3': {
    health: 78,
    brokenCount: 0,
    atRiskCount: 1,
    lossInr: '₹0',
    disruptions: [
      { label: 'Goa Airport Meetup', badge: 'soft', delay: '+10m', reason: 'Akasa minor taxi delay on runway — Neha 10m late to gate' },
    ],
    recoveryPlans: [
      { title: 'No Action Required', desc: '10-minute delay is well within buffer. YatraSarthi monitoring live. Alert only if delay exceeds 30 min.', saving: 'No financial impact', eta: 'Immediate', confidence: 99, recommended: true },
    ],
  },
  meetup: {
    health: 32,
    brokenCount: 2,
    atRiskCount: 3,
    lossInr: '₹4,800',
    disruptions: [
      { label: 'MMT Pre-booked Cab', badge: 'hard', delay: '+180m', reason: 'Cab missed — all 4 must rebook individually' },
      { label: 'Goa Marriott Resort', badge: 'hard', delay: '+180m', reason: 'Check-in missed — penalty fee applies' },
      { label: 'Group Dinner Reservation', badge: 'soft', delay: '+180m', reason: 'Restaurant booking at 8PM now at risk' },
    ],
    recoveryPlans: [
      { title: 'Split into Two Sub-groups', desc: 'Create two pairs (Rahul+Priya, Amit+Neha). Each pair books a separate cab. Regroup at hotel.', saving: '₹3,200 saved', eta: '4 min', confidence: 91, recommended: true },
      { title: 'Hotel Lounge as Alternate Meetup', desc: 'Those who arrive first go to Marriott lounge. Late arrivals take shared Ola rides. Hotel confirmed lounge access.', saving: '₹2,100 saved', eta: '6 min', confidence: 84 },
      { title: 'Kutumb Group Vote', desc: 'Send vote to all 4 members: Option A (wait 2h), Option B (split cabs). Majority decides. Vendor notified automatically.', saving: 'Flexible', eta: '2 min', confidence: 78 },
    ],
  },
  cab: {
    health: 48,
    brokenCount: 1,
    atRiskCount: 2,
    lossInr: '₹2,600',
    disruptions: [
      { label: 'Goa Marriott Check-In', badge: 'hard', delay: '+120m', reason: 'No transport — group stranded at airport for 2h' },
      { label: "Group Dinner at Fisherman's Wharf", badge: 'soft', delay: '+90m', reason: 'Restaurant reservation at risk due to late arrival' },
    ],
    recoveryPlans: [
      { title: 'Book Ola Outstation — Instant Confirm', desc: 'Book Ola Innova (6-seater) for all 4. ₹850 one-way. Pickup in 12 minutes guaranteed.', saving: '₹1,800 saved', eta: '2 min', confidence: 96, recommended: true },
      { title: 'Airport Prepaid Taxi + Luggage Van', desc: 'Use airport prepaid taxi counter. 2 taxis cover the group. Fixed rate ₹650 each. No surge pricing.', saving: '₹1,200 saved', eta: '5 min', confidence: 89 },
      { title: 'Notify Marriott for Pickup', desc: 'Goa Marriott offers complimentary airport pickup for stays > 2 nights. Request concierge shuttle.', saving: '₹2,600 saved', eta: '8 min', confidence: 72 },
    ],
  },
  hotel: {
    health: 58,
    brokenCount: 1,
    atRiskCount: 1,
    lossInr: '₹8,500',
    disruptions: [
      { label: 'Room Availability', badge: 'hard', delay: 'Full night', reason: 'Hotel overbooked — 2 of 4 rooms reallocated to walk-ins' },
      { label: 'Pre-booked Pool Access', badge: 'soft', delay: '—', reason: 'Complimentary access revoked on cancellation' },
    ],
    recoveryPlans: [
      { title: 'Escalate to Marriott Manager', desc: "YatraSarthi contacts hotel duty manager. Marriott's overbooking policy mandates equivalent or better room at no extra cost.", saving: '₹8,500 saved', eta: '10 min', confidence: 88, recommended: true },
      { title: 'Shift to Taj Vivanta Goa (1.2 km)', desc: 'Equivalent 5-star property. 4 rooms available tonight. ₹200 price difference per room. Complimentary transfer arranged.', saving: '₹7,700 saved', eta: '15 min', confidence: 94 },
      { title: 'Partial Refund + Marriott Baga', desc: 'Marriott loyalty compensation covers 1-night refund. Sister property has availability for tonight.', saving: '₹4,200 refund', eta: '20 min', confidence: 76 },
    ],
  },
};

// ─── HealthBar ────────────────────────────────────────────────────────────────

function HealthBar({ score }: { score: number }) {
  const isGood = score >= 70;
  const isOk = score >= 40;
  const color = isGood ? 'from-emerald-400 to-emerald-500' : isOk ? 'from-amber-400 to-orange-400' : 'from-rose-500 to-red-600';
  const text = isGood ? 'text-emerald-500' : isOk ? 'text-amber-500' : 'text-rose-500';
  return (
    <div className="flex items-center gap-4 w-full">
      <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <div className={`text-2xl font-black ${text}`}>{score}</div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface GroupWhatIfPanelProps {
  nodeId: string;
  nodeLabel: string;
  onClose: () => void;
}

export function GroupWhatIfPanel({ nodeId, nodeLabel, onClose }: GroupWhatIfPanelProps) {
  const data = STATIC_DATA[nodeId];
  const [showPlans, setShowPlans] = useState(false);
  const [appliedPlan, setAppliedPlan] = useState<number | null>(null);

  if (!data) return null;

  return (
    <div className="flex flex-col gap-5">

      {/* Header */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
        <div className="w-11 h-11 rounded-[14px] flex items-center justify-center bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_18px_rgba(225,29,72,0.35)] text-white flex-shrink-0 animate-pulse">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-xl text-gray-900 tracking-tight">What if? — {nodeLabel}</h3>
          <p className="text-xs text-gray-400 font-medium mt-0.5">Dry-run AI simulation · No real bookings modified</p>
        </div>
      </div>

      {/* Health card */}
      <div className="bg-gray-50/60 rounded-[16px] p-4 border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-gray-700">Simulated Trip Health</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold uppercase tracking-wider flex items-center gap-1">
            <Zap size={10} /> AI Preview
          </span>
        </div>
        <HealthBar score={data.health} />
        <div className="flex gap-4 mt-4 text-xs font-semibold flex-wrap">
          {data.brokenCount > 0 && (
            <div className="flex items-center gap-1.5 text-[#E45B4D]">
              <div className="w-2 h-2 rounded-full bg-[#E45B4D]" /> {data.brokenCount} Broken
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[#E5A43F]">
            <div className="w-2 h-2 rounded-full bg-[#E5A43F]" /> {data.atRiskCount} At Risk
          </div>
          <div className="flex items-center gap-1.5 text-gray-500 ml-auto">
            <TrendingDown size={12} /> {data.lossInr} est. loss
          </div>
        </div>
      </div>

      {/* Disruption list */}
      <div className="flex flex-col gap-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Downstream Impact</p>
        {data.disruptions.map((d, i) => (
          <div key={i} className="flex items-start gap-3 p-3.5 bg-white rounded-[14px] border"
            style={{ borderColor: d.badge === 'hard' ? '#FECDD3' : '#FDE68A' }}>
            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${d.badge === 'hard' ? 'bg-[#E45B4D]' : 'bg-[#E5A43F]'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                <span className="font-bold text-sm text-gray-900">{d.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${d.badge === 'hard' ? 'bg-[#E45B4D] text-white' : 'bg-[#E5A43F] text-amber-900'}`}>
                    {d.badge === 'hard' ? 'HARD BREAK' : 'SOFT RISK'}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${d.badge === 'hard' ? 'text-[#E45B4D] border-red-100 bg-red-50' : 'text-[#E5A43F] border-amber-100 bg-amber-50'}`}>
                    {d.delay}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{d.reason}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recovery plans toggle */}
      <button
        onClick={() => setShowPlans(p => !p)}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-[14px] font-extrabold text-sm transition-all hover:opacity-90 active:scale-[0.99]"
        style={{ background: 'linear-gradient(135deg, #B7DE3E 0%, #9ECA22 100%)', color: '#172017', boxShadow: '0 8px 24px rgba(183,222,62,0.35)' }}
      >
        <Sparkles size={15} />
        {showPlans ? 'Hide AI Recovery Plans' : 'Generate AI Recovery Plans'}
        {showPlans ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {showPlans && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-2">
          {data.recoveryPlans.map((plan, i) => (
            <div key={i}
              className="p-5 flex flex-col gap-3 rounded-[16px] border-2 transition-all"
              style={{
                borderColor: appliedPlan === i ? '#62A86B' : plan.recommended ? '#C5D82D' : '#D5D9CC',
                background: appliedPlan === i ? '#F0FDF4' : plan.recommended ? '#F9FCF5' : '#FFFFFF',
                boxShadow: plan.recommended && appliedPlan !== i ? '0 0 0 2px #C5D82D33' : undefined,
              }}
            >
              <div className="flex justify-between items-start mb-2">
                {appliedPlan === i ? (
                  <div className="text-xs font-bold px-2 py-1 rounded-full inline-block" style={{ background: '#62A86B', color: 'white' }}>
                    ✓ Applied
                  </div>
                ) : plan.recommended ? (
                  <div className="text-xs font-bold px-2 py-1 rounded-full inline-block" style={{ background: '#C5D82D', color: '#172017' }}>
                    ⭐ Recommended
                  </div>
                ) : <div />}
                
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-bold text-gray-500 mb-0.5">Match Score</span>
                  <span className="text-2xl font-black leading-none" style={{ color: plan.confidence >= 90 ? '#4E8752' : plan.confidence >= 75 ? '#E5A43F' : '#E45B4D' }}>
                    {plan.confidence}<span className="text-sm">%</span>
                  </span>
                </div>
              </div>

              <div>
                <div className="font-bold text-sm" style={{ color: '#172017' }}>{plan.title}</div>
                <div className="text-xs mt-1 leading-relaxed" style={{ color: '#5F665B' }}>{plan.desc}</div>
              </div>

              {/* Highlight Cards Grid */}
              <div className="grid grid-cols-2 gap-2 my-1">
                <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Cost impact</div>
                  <div className="text-sm font-extrabold" style={{ color: plan.saving.includes('0') ? '#4E8752' : '#4E8752' }}>
                    {plan.saving}
                  </div>
                </div>
                
                <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Time impact</div>
                  <div className="text-sm font-extrabold" style={{ color: '#172017' }}>
                    {plan.eta} to execute
                  </div>
                </div>

                <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Bookings changed</div>
                  <div className="text-sm font-extrabold" style={{ color: '#172017' }}>
                    {plan.title.includes('No Action') ? 'None' : '1 booking'}
                  </div>
                </div>

                <div className="rounded-xl p-3 flex flex-col gap-1 border" style={{ background: '#F5F2E8', borderColor: '#EDE9D8' }}>
                  <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#858B80' }}>Vendor Alerts</div>
                  <div className="text-sm font-extrabold" style={{ color: '#172017' }}>
                    Automated
                  </div>
                </div>
              </div>

              {appliedPlan === i ? (
                <div className="flex items-center gap-2 mt-2 text-emerald-600 font-bold text-xs justify-center py-2 bg-emerald-50 rounded-xl">
                  <Check size={14} /> Recovery plan applied — vendors notified
                </div>
              ) : (
                <button
                  onClick={() => setAppliedPlan(i)}
                  className="w-full mt-1 py-2.5 rounded-[10px] text-[13px] font-bold transition-all hover:opacity-90"
                  style={{ background: '#172017', color: 'white' }}
                >
                  Apply this plan
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
