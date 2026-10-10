import React from 'react';
import { Home, Shield, Calendar, ShoppingCart, Activity } from 'lucide-react';

export type NavTab = 'home' | 'security' | 'schedule' | 'groceries';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  groceryCount: number;
  upcomingCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  groceryCount,
  upcomingCount,
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'schedule', label: 'Schedule', icon: Calendar, badge: upcomingCount },
    { id: 'groceries', label: 'Groceries', icon: ShoppingCart, badge: groceryCount },
  ];

  return (
    <aside className="w-24 bg-[#0d1017] border-r border-slate-800/80 flex flex-col items-center py-6 justify-between select-none shrink-0 z-20">
      {/* Brand logo mark */}
      <div className="flex flex-col items-center gap-1">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md shadow-amber-500/10">
          <Activity className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-1">CASA</span>
      </div>

      {/* Navigation tabs */}
      <nav className="flex flex-col gap-5 w-full px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`relative w-full h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-200 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50 border border-transparent'
              }`}
            >
              <Icon className={`w-7 h-7 transition ${isActive ? 'scale-110 text-amber-400' : ''}`} />
              <span className={`text-[11px] font-semibold tracking-wide mt-1.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`}>
                {item.label}
              </span>

              {/* Badge counter */}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 right-2 min-w-5 h-5 px-1 bg-amber-500 text-slate-950 font-black text-[10px] rounded-full flex items-center justify-center shadow-md">
                  {item.badge}
                </span>
              )}

              {/* Left active accent bar */}
              {isActive && (
                <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-amber-400 rounded-r-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* LAN indicator */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold tracking-wider uppercase">LAN</span>
        </div>
      </div>
    </aside>
  );
};
