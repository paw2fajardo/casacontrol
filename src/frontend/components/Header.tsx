import React, { useState, useEffect } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

interface HeaderProps {
  onManualRefresh: () => void;
  isRefreshing: boolean;
  activeCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onManualRefresh,
  isRefreshing,
  activeCount,
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
      <div className="flex items-center gap-6">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-slate-800 font-mono">{time}</div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{date}</div>
        </div>

        <div className="h-8 w-[1px] bg-slate-200/80 mx-2" />

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-indigo-50/80 border border-indigo-100 flex items-center gap-2 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <span className="text-xs font-bold text-indigo-900">
              {activeCount} {activeCount === 1 ? 'Device' : 'Devices'} Active
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="h-11 px-4 rounded-xl bg-white/80 hover:bg-white active:scale-95 border border-slate-200/80 shadow-sm flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
