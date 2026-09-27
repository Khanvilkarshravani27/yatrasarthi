"use client";

import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthFlowModal } from '../components/auth/AuthFlowModal';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { Hero } from '../components/Hero';
import { TripControlCenter } from '../components/TripControlCenter';
import { MyTrips } from '../components/MyTrips';
import { CreateTrip } from '../components/CreateTrip';
import { GroupJourney } from '../components/GroupJourney';
import { SurakshaPanel } from '../components/SurakshaPanel';
import { UserDashboard } from '../components/UserDashboard';
import { Footer } from '../components/Footer';
import { DigitalTwinScreen } from '../components/DigitalTwinScreen';
import { NugenPanel } from '../components/NugenPanel';
import { AIChatPanel } from '../components/chat/AIChatPanel';
import { Sparkles, X } from 'lucide-react';
import type { TripData } from '../types';

type Page = 'home' | 'dashboard' | 'trips' | 'recovery' | 'group' | 'suraksha' | 'new-trip' | 'digital-twin' | 'assistant';

// ── Global AI Drawer ─────────────────────────────────────────────────────────

function AIDrawer({
  open,
  onClose,
  tripId,
  tripName,
  mode,
}: {
  open: boolean;
  onClose: () => void;
  tripId?: string;
  tripName?: string;
  mode: 'planning' | 'recovery' | 'general';
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(23, 32, 23, 0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 h-full z-50 flex flex-col"
        style={{
          width: 'min(420px, 100vw)',
          background: '#F8F7F2',
          borderLeft: '1px solid #D5D9CC',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
          animation: 'slideInRight 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <style>{`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to   { transform: translateX(0);    opacity: 1; }
          }
        `}</style>

        {/* Chat panel fills the full drawer */}
        <div className="flex-1 overflow-hidden">
          <AIChatPanel
            tripId={tripId}
            tripName={tripName}
            mode={mode}
            onClose={onClose}
          />
        </div>
      </div>
    </>
  );
}

// ── Floating AI button (bottom-right, always visible) ────────────────────────

function FloatingAIButton({ onClick, hasUnread }: { onClick: () => void; hasUnread?: boolean }) {
  return (
    <button
      id="floating-ai-assist-btn"
      onClick={onClick}
      className="fixed bottom-24 right-5 z-30 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 md:bottom-8"
      style={{
        background: 'linear-gradient(135deg, #172017 0%, #1E2E1E 100%)',
        color: '#C5D82D',
        border: '1.5px solid #C5D82D50',
        boxShadow: '0 8px 32px rgba(23,32,23,0.4), 0 0 16px #C5D82D25',
      }}
      title="AI Assist"
    >
      <Sparkles size={18} className="animate-pulse" style={{ animationDuration: '2s' }} />
      <span className="text-xs font-bold hidden sm:inline">AI Assist</span>
      {hasUnread && (
        <span className="w-2 h-2 rounded-full absolute -top-0.5 -right-0.5" style={{ background: '#C5D82D' }} />
      )}
    </button>
  );
}

// ── Main app ─────────────────────────────────────────────────────────────────

function MainApp() {
  const [page, setPage] = useState<Page>('home');
  const [activeTrip, setActiveTrip] = useState<TripData | null>(null);
  const [trips, setTrips] = useState<TripData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAIOpen] = useState(false);
  const { user } = useAuth();

  const fetchTrips = useCallback(() => {
    setLoading(true);
    fetch('/api/trips')
      .then(r => r.json())
      .then(data => {
        if (data.data?.trips) {
          setTrips(data.data.trips);
          if (!activeTrip && data.data.trips.length > 0) setActiveTrip(data.data.trips[0]);
        } else if (Array.isArray(data.trips)) {
          setTrips(data.trips);
          if (!activeTrip && data.trips.length > 0) setActiveTrip(data.trips[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTrip]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const navigate = useCallback((p: string) => {
    setPage(p as Page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectTrip = (id: string) => {
    const trip = trips.find(t => t.id === id);
    if (trip) { setActiveTrip(trip); navigate('recovery'); }
  };

  const handleTripCreated = useCallback(() => { fetchTrips(); }, [fetchTrips]);
  const handleTripCreatedWithData = useCallback((newTrip: TripData) => { setActiveTrip(newTrip); }, []);

  const handleDisrupt = useCallback((scenarioId: string) => {
    if (!activeTrip) return;
    const affectedNodeId = activeTrip.nodes?.[0]?.id || 'unknown';
    fetch('/api/disruptions/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId: activeTrip.id, nodeId: affectedNodeId, delayMin: 120, source: 'user_reported' }),
    }).then(() => {
      fetch(`/api/trips/${activeTrip.id}/graph`)
        .then(r => r.json())
        .then(data => { if (data.status) setActiveTrip(prev => prev ? { ...prev, ...data } : prev); });
    });
  }, [activeTrip]);

  // Determine AI mode from current page
  const aiMode: 'planning' | 'recovery' | 'general' =
    page === 'recovery' ? 'recovery' :
    page === 'new-trip' || page === 'trips' ? 'planning' :
    'general';

  const showFooter = page === 'home' || page === 'dashboard';

  return (
    <div style={{ background: '#F5F2E8', fontFamily: "'Plus Jakarta Sans', sans-serif", minHeight: '100vh', color: '#172017' }}>
      <AuthFlowModal />
      <Navbar activePage={page} onNavigate={navigate} onAIAssist={() => setAIOpen(true)} />

      <main>
        {page === 'home' && <Hero onNavigate={navigate} />}

        {page === 'dashboard' && (
          <UserDashboard
            trips={trips}
            activeTrip={activeTrip || trips[0]}
            onSelectTrip={handleSelectTrip}
            onNavigate={navigate}
            user={user}
          />
        )}

        {page === 'trips' && (
          <MyTrips
            trips={trips}
            loading={loading}
            onSelectTrip={handleSelectTrip}
            onNavigate={navigate}
            onRefreshTrips={fetchTrips}
          />
        )}

        {page === 'recovery' && activeTrip && (
          <TripControlCenter trip={activeTrip} onDisrupt={handleDisrupt} onNavigate={navigate} />
        )}

        {page === 'group' && activeTrip && <GroupJourney tripId={activeTrip.id} />}
        {page === 'suraksha' && <SurakshaPanel trip={activeTrip} />}

        {page === 'digital-twin' && (
          <DigitalTwinScreen
            trip={activeTrip}
            allTrips={trips}
            onSelectTrip={handleSelectTrip}
          />
        )}

        {page === 'assistant' && (
          <div className="max-w-4xl mx-auto px-4 pt-8 pb-16">
            <NugenPanel />
          </div>
        )}

        {page === 'new-trip' && (
          <CreateTrip
            onNavigate={navigate}
            onTripCreated={handleTripCreated}
            onTripCreatedWithData={handleTripCreatedWithData}
          />
        )}
      </main>

      {showFooter && <Footer onNavigate={navigate} />}
      <BottomNav activePage={page} onNavigate={navigate} />

      {/* Floating AI button — always visible */}
      <FloatingAIButton onClick={() => setAIOpen(true)} />

      {/* Global AI drawer */}
      <AIDrawer
        open={aiOpen}
        onClose={() => setAIOpen(false)}
        tripId={activeTrip?.id}
        tripName={activeTrip?.name}
        mode={aiMode}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
