import { useState } from 'react';
import { 
  Shield, CheckCircle2, 
  CreditCard, FileText, 
  Users, Check, Phone, Calendar,
  Activity, Sparkles, TrendingUp, Plus, Download, Folder, ChevronRight, AlertTriangle, Zap, PlaneTakeoff, Bell, Navigation, MapPin
} from 'lucide-react';
import type { TripData } from '../types';
import { User } from '@yatrasarthi/types';

interface UserDashboardProps {
  trips: TripData[];
  activeTrip: TripData;
  onSelectTrip: (id: string) => void;
  onNavigate: (page: string) => void;
  user?: User | null;
}

export function UserDashboard({ trips, activeTrip, onSelectTrip, onNavigate, user }: UserDashboardProps) {
  const displayName = user?.name || (user?.phone ? `Traveler (${user.phone})` : 'Traveler');
  const initial = displayName ? displayName[0].toUpperCase() : 'T';

  return (
    <div className="min-h-screen pb-24 md:pb-12 bg-[#F4F0E3]">
      
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10">
        
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-[#16211B] text-[#B7DE3E] flex items-center justify-center text-2xl font-black shadow-lg border-2 border-[#E8F8ED]">
              {initial}
            </div>
            <div>
              <p className="text-[#5B6660] font-bold text-sm uppercase tracking-widest mb-1">Welcome Back</p>
              <h1 className="text-3xl md:text-4xl font-black text-[#1E2A24] tracking-tight">
                {displayName}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-[#EDE8D8]">
              <Shield size={16} className="text-[#178A43]" />
              <span className="text-sm font-bold text-[#1E2A24]">
                {user?.subscription?.tier === 'pro' ? 'Pro Member' : 'YatraSarthi Member'}
              </span>
            </div>
            <button 
              onClick={() => onNavigate('new-trip')}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#B7DE3E] hover:bg-[#A6CD2A] text-[#16211B] rounded-full font-black text-sm transition-all shadow-[0_4px_15px_rgba(183,222,62,0.3)] hover:shadow-[0_6px_20px_rgba(183,222,62,0.4)] hover:-translate-y-0.5"
            >
              <Sparkles size={16} /> Plan New Trip
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* ── Left Column (Main Content) ── */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* Upcoming Trip Hero */}
            {activeTrip ? (
              <div className="relative rounded-[32px] overflow-hidden bg-[#16211B] shadow-2xl group">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1B4D3A] via-[#16211B] to-[#16211B] opacity-80" />
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#B7DE3E] rounded-full blur-[100px] opacity-20 group-hover:opacity-30 transition-opacity duration-700" />
                
                <div className="relative z-10 p-8 md:p-12 flex flex-col gap-8">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[#B7DE3E] text-xs font-black uppercase tracking-widest border border-white/10">
                      <PlaneTakeoff size={14} /> Next Upcoming Trip
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-500/30">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">AI Active</span>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 drop-shadow-lg leading-tight">
                      {activeTrip.name || activeTrip.destination}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-2.5 text-white/80 font-medium">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <Calendar size={18} className="text-[#B7DE3E]" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-0.5">Date</p>
                          <p className="text-sm font-bold text-white">{activeTrip.startDate}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 text-white/80 font-medium">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <Users size={18} className="text-[#B7DE3E]" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-0.5">Travelers</p>
                          <p className="text-sm font-bold text-white">{activeTrip.tripType === 'solo' ? 'Solo Explorer' : 'Kutumb Group'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 text-white/80 font-medium">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                          <CheckCircle2 size={18} className="text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-white/50 font-bold mb-0.5">Health Score</p>
                          <p className="text-sm font-bold text-white">{activeTrip.healthScore ?? 100}/100</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center">
                    <button 
                      onClick={() => { onSelectTrip(activeTrip.id); onNavigate('recovery'); }}
                      className="px-8 py-4 rounded-[20px] bg-white text-[#16211B] font-black text-sm shadow-[0_8px_20px_rgba(255,255,255,0.15)] hover:shadow-[0_12px_25px_rgba(255,255,255,0.25)] hover:-translate-y-1 transition-all flex items-center gap-3"
                    >
                      View Itinerary <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[32px] p-12 bg-white border border-[#EDE8D8] text-center flex flex-col items-center justify-center min-h-[300px]">
                <div className="w-16 h-16 bg-[#F4F0E3] rounded-full flex items-center justify-center mb-4">
                  <MapPin size={24} className="text-[#1E2A24]" />
                </div>
                <h3 className="text-2xl font-black text-[#1E2A24] mb-2">No upcoming trips</h3>
                <p className="text-[#5B6660] font-medium mb-6">Plan a new trip and let AI build your perfect itinerary.</p>
                <button onClick={() => onNavigate('new-trip')} className="btn-primary">Plan New Trip</button>
              </div>
            )}

            {/* Live Feed */}
            <div className="rounded-[32px] bg-white p-8 md:p-10 border border-[#EDE8D8] shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-[#1E2A24] flex items-center gap-2">
                  <Zap size={20} className="text-amber-500 fill-amber-500" /> Live Feed
                </h3>
                <button className="text-sm font-bold text-[#5B6660] hover:text-[#1E2A24]">View All</button>
              </div>

              <div className="relative pl-6 sm:pl-8 border-l-2 border-[#F4F0E3] flex flex-col gap-10">
                
                {/* Event 1 */}
                <div className="relative">
                  <div className="absolute -left-[35px] sm:-left-[43px] top-0 w-10 h-10 rounded-full bg-[#EFE9FB] border-4 border-white flex items-center justify-center shadow-sm">
                    <CreditCard size={16} className="text-[#7C5CE0]" />
                  </div>
                  <div className="bg-[#F4F0E3]/50 rounded-[20px] p-5 border border-[#EDE8D8] hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h4 className="font-bold text-[#1E2A24] text-[15px]">Payment Auto-Settled</h4>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9A8A]">2 hours ago</span>
                    </div>
                    <p className="text-sm text-[#5B6660] font-medium leading-relaxed">
                      You paid <span className="font-black text-[#1E2A24]">₹1,500</span> to Rahul for the Goa Hotel Booking via Kutumb Split. Your balance is updated.
                    </p>
                  </div>
                </div>

                {/* Event 2 */}
                <div className="relative">
                  <div className="absolute -left-[35px] sm:-left-[43px] top-0 w-10 h-10 rounded-full bg-rose-50 border-4 border-white flex items-center justify-center shadow-sm">
                    <AlertTriangle size={16} className="text-rose-500" />
                  </div>
                  <div className="bg-rose-50/50 rounded-[20px] p-5 border border-rose-100 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h4 className="font-bold text-[#1E2A24] text-[15px]">Flight Monitored (IndiGo 6E-254)</h4>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9A8A]">5 hours ago</span>
                    </div>
                    <p className="text-sm text-[#5B6660] font-medium leading-relaxed">
                      DGCA APIs indicate potential weather delays in Mumbai. Suraksha AI is on standby to automatically find alternative flights if cancellation occurs.
                    </p>
                  </div>
                </div>

                {/* Event 3 */}
                <div className="relative">
                  <div className="absolute -left-[35px] sm:-left-[43px] top-0 w-10 h-10 rounded-full bg-[#E8F8ED] border-4 border-white flex items-center justify-center shadow-sm">
                    <CheckCircle2 size={16} className="text-[#178A43]" />
                  </div>
                  <div className="bg-[#E8F8ED]/30 rounded-[20px] p-5 border border-[#C6E5D0]/50 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <h4 className="font-bold text-[#1E2A24] text-[15px]">AI Recovery Applied</h4>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#8A9A8A]">1 day ago</span>
                    </div>
                    <p className="text-sm text-[#5B6660] font-medium leading-relaxed">
                      Successfully secured alternative cab booking for the Goa airport drop at no extra cost, mitigating the previous driver cancellation.
                    </p>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ── Right Column (Sidebar) ── */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Gamified Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-[24px] p-6 border border-[#EDE8D8] shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
                <div className="w-10 h-10 rounded-full bg-[#E8F8ED] text-[#178A43] flex items-center justify-center">
                  <Activity size={18} />
                </div>
                <div>
                  <div className="text-[32px] font-black text-[#1E2A24] leading-none mb-1">{trips.length}</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#5B6660]">Total Trips</div>
                </div>
                <Activity size={120} className="absolute -right-8 -bottom-8 text-[#F4F0E3] opacity-50 z-0" strokeWidth={1} />
              </div>
              
              <div className="bg-white rounded-[24px] p-6 border border-[#EDE8D8] shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
                <div className="w-10 h-10 rounded-full bg-[#FEF3C7] text-[#B45309] flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div className="text-[32px] font-black text-[#1E2A24] leading-none mb-1">₹12k</div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#5B6660]">AI Savings</div>
                </div>
                <TrendingUp size={120} className="absolute -right-8 -bottom-8 text-[#F4F0E3] opacity-50 z-0" strokeWidth={1} />
              </div>
            </div>

            {/* Suraksha Shield */}
            <div className="rounded-[24px] bg-gradient-to-br from-[#16211B] to-[#0a0f0c] p-6 text-white shadow-xl relative overflow-hidden group border border-[#2A3B33]">
              <div className="absolute right-0 top-0 w-32 h-32 bg-[#178A43] blur-[60px] opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="flex items-center gap-4 mb-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#2A3B33] border border-[#3A4B43] flex items-center justify-center">
                  <Shield size={24} className="text-[#B7DE3E]" />
                </div>
                <div>
                  <h3 className="font-black text-lg">Suraksha Shield</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-[#B7DE3E] animate-pulse" />
                    <span className="text-xs font-bold text-[#A0AAB2] uppercase tracking-wider">Active</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 font-medium relative z-10 mb-4">
                Continuously monitoring {trips.length} active trips against disruptions.
              </p>
              <div className="w-full bg-[#2A3B33] rounded-full h-1.5 relative z-10 overflow-hidden">
                <div className="bg-[#B7DE3E] h-full w-[100%] rounded-full shadow-[0_0_10px_#B7DE3E]" />
              </div>
            </div>

            {/* Quick Tools */}
            <div className="bg-white rounded-[24px] p-6 border border-[#EDE8D8] shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#1E2A24] mb-5">Quick Tools</h3>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => onNavigate('new-trip')}
                  className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F4F0E3] hover:bg-[#E8F8ED] transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:text-[#178A43] text-[#1E2A24]">
                    <Plus size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-[#1E2A24] text-[15px]">Plan New Trip</div>
                    <div className="text-xs text-[#5B6660] font-medium">Let AI build your itinerary</div>
                  </div>
                </button>
                
                <button 
                  className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F4F0E3] hover:bg-[#EFE9FB] transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:text-[#7C5CE0] text-[#1E2A24]">
                    <Download size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-[#1E2A24] text-[15px]">Import Booking</div>
                    <div className="text-xs text-[#5B6660] font-medium">Sync via PDF or Email</div>
                  </div>
                </button>

                <button 
                  onClick={() => onNavigate('trips')}
                  className="flex items-center gap-4 p-4 rounded-[16px] bg-[#F4F0E3] hover:bg-[#1E2A24] hover:text-white transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-full bg-white group-hover:bg-[#2A3B33] flex items-center justify-center shadow-sm text-[#1E2A24] group-hover:text-white">
                    <Folder size={18} />
                  </div>
                  <div>
                    <div className="font-bold text-[15px] group-hover:text-white text-[#1E2A24]">All Trips Hub</div>
                    <div className="text-xs text-[#5B6660] group-hover:text-gray-400 font-medium">Manage {trips.length} saved trips</div>
                  </div>
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
