import { Home, LayoutDashboard, RotateCcw, Users, Shield } from 'lucide-react';

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const items = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'group', label: 'Group', icon: Users },
  { id: 'recovery', label: 'Recover', icon: RotateCcw },
  { id: 'suraksha', label: 'Suraksha', icon: Shield },
];

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ background: 'rgba(245,242,232,0.98)', backdropFilter: 'blur(16px)', borderColor: '#D5D9CC' }}
    >
      <div className="flex items-center justify-around px-2 py-2 pb-safe">
        {items.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all"
              style={{ color: active ? '#172017' : '#5F665B' }}
            >
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all"
                style={{ background: active ? '#DCE8D2' : 'transparent' }}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.8} style={{ color: active ? '#172017' : '#5F665B' }} />
              </div>
              <span className="text-xs font-semibold" style={{ fontSize: 10 }}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
