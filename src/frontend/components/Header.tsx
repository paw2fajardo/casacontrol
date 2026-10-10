import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

import { UserProfile } from '../types';

interface HeaderProps {
  onManualRefresh: () => void;
  isRefreshing: boolean;
  activeCount: number;
  currentUser: UserProfile | null;
  onSwitchProfile: () => void;
  onOpenUserManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onManualRefresh,
  isRefreshing,
  activeCount,
  currentUser,
  onSwitchProfile,
  onOpenUserManager,
}) => {
  const [time, setTime] = useState<string>('');
  const [date, setDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
      setDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
      );
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-20 bg-white/60 backdrop-blur-2xl border-b border-white/80 px-8 flex items-center justify-between shrink-0 z-10 shadow-[0_4px_20px_rgba(148,163,184,0.05)]">
      <div className="flex items-center gap-5">
        <div>
          <div className="text-2xl font-black tracking-tight text-slate-800 font-mono leading-none">{time}</div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">{date}</div>
        </div>

        <div className="h-6 w-[1px] bg-slate-200/80 mx-1" />

        <div className="flex items-center gap-3">
          <div className="px-3 py-1 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center gap-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-bold text-indigo-900">
              {activeCount} {activeCount === 1 ? 'Device' : 'Devices'} Active
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Active Profile Pill / Switcher */}
        {currentUser && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={onSwitchProfile}
              className="h-11 px-3.5 rounded-xl bg-white/90 hover:bg-white active:scale-95 border border-slate-200/80 shadow-xs flex items-center gap-2.5 cursor-pointer transition"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                currentUser.role === 'admin'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-indigo-100 text-indigo-700'
              }`}>
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-xs font-extrabold text-slate-800 leading-tight flex items-center gap-1">
                  <span>{currentUser.name}</span>
                  {currentUser.role === 'admin' && (
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded">Admin</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-400 font-semibold">Switch User</div>
              </div>
            </button>

            {currentUser.role === 'admin' && onOpenUserManager && (
              <button
                onClick={onOpenUserManager}
                title="Manage Users & Permissions"
                className="h-11 px-3 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Users ⚙</span>
              </button>
            )}
          </div>
        )}

        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="h-11 px-3.5 rounded-xl bg-white/80 hover:bg-white active:scale-95 border border-slate-200/80 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
