import React, { useState, useEffect } from 'react';
import { Wifi, RefreshCw } from 'lucide-react';

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
    <header className="h-20 bg-[#0e121a]/90 backdrop-blur-md border-b border-slate-800/80 px-8 flex items-center justify-between shrink-0 z-10">
      <div className="flex items-center gap-6">
        <div>
          <div className="text-3xl font-extrabold tracking-tight text-white font-mono">{time}</div>
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{date}</div>
        </div>

        <div className="h-8 w-[1px] bg-slate-800 mx-2" />

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-xs font-bold text-slate-200">
              {activeCount} {activeCount === 1 ? 'Device' : 'Devices'} Active
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={onManualRefresh}
          disabled={isRefreshing}
          className="h-11 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/60 flex items-center gap-2 text-xs font-bold text-slate-300 transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>
    </header>
  );
};
