import React from 'react';
import { Home, Shield, Calendar, ShoppingCart, Sparkles } from 'lucide-react';

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
    <aside className="w-24 bg-white/70 backdrop-blur-2xl border-r border-white/80 flex flex-col items-center py-6 justify-between select-none shrink-0 z-20 shadow-[4px_0_24px_rgba(148,163,184,0.06)]">
      {/* Brand logo mark */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-md shadow-indigo-500/20 flex items-center justify-center text-white">
          <Sparkles className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase mt-1">CASA</span>
      </div>

      {/* Navigation tabs */}
      <nav className="flex flex-col gap-4 w-full px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`relative w-full h-20 rounded-2xl flex flex-col items-center justify-center transition-all duration-300 cursor-pointer active:scale-95 ${
                isActive
                  ? 'bg-gradient-to-b from-indigo-50/80 to-purple-50/80 text-indigo-600 shadow-sm border border-indigo-200/60'
                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100/60 border border-transparent'
              }`}
            >
              <Icon className={`w-7 h-7 transition-transform ${isActive ? 'scale-110 text-indigo-600' : ''}`} />
              <span className={`text-[11px] font-bold tracking-wide mt-1.5 ${isActive ? 'text-indigo-900 font-extrabold' : 'text-slate-500'}`}>
                {item.label}
              </span>

              {/* Badge counter */}
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-2 right-2 min-w-5 h-5 px-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black text-[10px] rounded-full flex items-center justify-center shadow-sm">
                  {item.badge}
                </span>
              )}

              {/* Left active pill accent */}
              {isActive && (
                <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-indigo-500 rounded-r-full shadow-sm" />
              )}
            </button>
          );
        })}
      </nav>

      {/* LAN indicator */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-extrabold tracking-wider uppercase">LAN</span>
        </div>
      </div>
    </aside>
  );
};
