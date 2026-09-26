import { useState, useEffect } from 'react';
import { Users, MapPin, AlertTriangle } from 'lucide-react';

interface GroupJourneyProps {
  tripId: string;
}

export function GroupJourney({ tripId }: GroupJourneyProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/trips/${tripId}/group`)
      .then(res => res.json())
      .then(d => {
        setData(d.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [tripId]);

  if (loading) return <div className="p-8 text-center">Loading group journey...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load group data</div>;

  return (
    <div className="max-w-4xl mx-auto px-5 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ background: '#DCE8D2', borderColor: '#D5D9CC' }}>
          <Users size={20} style={{ color: '#172017' }} />
        </div>
        <h2 className="text-2xl font-bold" style={{ color: '#172017' }}>Group Journey Overview</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Members Status */}
        <div className="card p-5" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#172017' }}>Traveler Status</h3>
          <div className="flex flex-col gap-4">
            {data.members?.map((m: any) => (
              <div key={m.memberId} className="flex justify-between items-center p-3 rounded-xl border" style={{ background: '#F5F2E8', borderColor: '#D5D9CC' }}>
                <div>
                  <div className="font-semibold flex items-center gap-2" style={{ color: '#172017' }}>
                    {m.name}
                    {m.memberId === data.weakestLinkMemberId && (
                      <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full border" style={{ background: '#EDE9D8', color: '#172017', borderColor: '#D5D9CC' }}>
                        Weakest Link
                      </span>
                    )}
                  </div>
                  <div className="text-xs mt-1" style={{ color: '#5F665B' }}>Current: {m.currentLeg}</div>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${
                  m.status === 'on_track' ? 'bg-[#E8F0E2] text-[#2E7D32] border border-[#D5D9CC]' :
                  m.status === 'at_risk' ? 'bg-[#EDE9D8] text-[#172017] border border-[#D5D9CC]' : 'bg-[#FDEDEC] text-[#D93829] border border-[#F5B7B1]'
                }`}>
                  {m.status.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Shared Nodes */}
        <div className="card p-5" style={{ background: '#FFFFFF', borderColor: '#D5D9CC' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#172017' }}>Shared Meetup Points</h3>
          <div className="flex flex-col gap-3">
            {data.sharedNodes?.map((sn: any) => (
              <div key={sn.nodeId} className="flex items-start gap-3 p-3 rounded-xl border" style={{ background: '#E8F0E2', borderColor: '#D5D9CC' }}>
                <MapPin size={18} style={{ color: '#172017' }} className="mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold" style={{ color: '#172017' }}>{sn.label}</div>
                  <div className="text-xs mt-1" style={{ color: '#5F665B' }}>{sn.sharedByCount} travelers converging here</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
