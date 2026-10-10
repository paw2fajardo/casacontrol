import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  CheckSquare, 
  ListFilter,
  Sparkles,
  AlertCircle,
  CalendarDays,
  LayoutGrid,
  List
} from 'lucide-react';
import { ScheduleItem } from '../types';

interface ScheduleViewProps {
  schedule: ScheduleItem[];
  error: string | null;
  onRefresh?: () => void;
}

type ViewMode = 'month' | 'agenda';

export const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, error }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filterType, setFilterType] = useState<'all' | 'calendar' | 'task'>('all');

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Month calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Grid computation: 1st day of month and total days
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Filter items by type if needed
  const filteredSchedule = useMemo(() => {
    return schedule.filter((item) => {
      if (filterType === 'all') return true;
      return item.type === filterType;
    });
  }, [schedule, filterType]);

  // Map schedule items to dates (key format: "YYYY-MM-DD")
  const itemsByDate = useMemo(() => {
    const map: Record<string, ScheduleItem[]> = {};

    filteredSchedule.forEach((item) => {
      const dateStr = item.start || item.startTime || item.dueDate;
      if (!dateStr) return;

      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          // Local date key format YYYY-MM-DD
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (!map[key]) map[key] = [];
          map[key].push(item);
        }
      } catch {}
    });

    return map;
  }, [filteredSchedule]);

  // Selected date key
  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDayItems = itemsByDate[selectedDateKey] || [];

  // Today key
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Days of week header
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calendar cells: prev month padding + current month + next month padding to reach full 35 or 42 slots
  const calendarCells = useMemo(() => {
    const cells: Array<{
      dayNum: number;
      date: Date;
      isCurrentMonth: boolean;
      dateKey: string;
    }> = [];

    // Leading prev month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(year, month - 1, dayNum);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dayNum, date, isCurrentMonth: false, dateKey });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const date = new Date(year, month, dayNum);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dayNum, date, isCurrentMonth: true, dateKey });
    }

    // Trailing next month days (fill out remaining slots to multiple of 7)
    const totalRemaining = (7 - (cells.length % 7)) % 7;
    for (let dayNum = 1; dayNum <= totalRemaining; dayNum++) {
      const date = new Date(year, month + 1, dayNum);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 2).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dayNum, date, isCurrentMonth: false, dateKey });
    }

    return cells;
  }, [year, month, firstDayOfWeek, daysInMonth, daysInPrevMonth]);

  const formatItemTime = (item: ScheduleItem) => {
    if (item.allDay || item.isAllDay) return 'All Day';
    const dateStr = item.start || item.startTime;
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 leading-none">
              Family Schedule & Calendar
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-1">
              Shared household Google Calendar & active Tasks
            </p>
          </div>
        </div>

        {/* View Mode & Type Filter Switchers */}
        <div className="flex items-center gap-2.5">
          {/* Calendar / Agenda Mode Toggle */}
          <div className="bg-white/80 border border-white/90 p-1 rounded-2xl shadow-xs flex items-center gap-1">
            <button
              onClick={() => setViewMode('month')}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`h-9 px-3.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Type Filter */}
          <div className="bg-white/80 border border-white/90 p-1 rounded-2xl shadow-xs flex items-center gap-1">
            <button
              onClick={() => setFilterType('all')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('calendar')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setFilterType('task')}
              className={`h-9 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'task'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tasks
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3 shadow-xs">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      )}

      {/* MONTH VIEW: Side-by-side on tablet landscape */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[580px]">
          {/* LEFT: CALENDAR GRID (8 Cols) */}
          <div className="lg:col-span-7 xl:col-span-8 glass-card rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col">
            {/* Month Header & Prev/Next Controls */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  {monthName}
                </h3>
                <button
                  onClick={jumpToToday}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer border border-indigo-200/80 shadow-xs"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={prevMonth}
                  className="w-9 h-9 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="w-9 h-9 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
              {DAYS.map((d) => (
                <div key={d} className="text-[11px] font-black uppercase tracking-wider text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Month Grid Cells */}
            <div className="grid grid-cols-7 gap-1.5 flex-1 auto-rows-fr">
              {calendarCells.map((cell) => {
                const isSelected = cell.dateKey === selectedDateKey;
                const isToday = cell.dateKey === todayKey;
                const cellItems = itemsByDate[cell.dateKey] || [];
                const hasEvents = cellItems.some((i) => i.type === 'calendar');
                const hasTasks = cellItems.some((i) => i.type === 'task');

                return (
                  <button
                    key={cell.dateKey}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[64px] sm:min-h-[76px] p-1.5 rounded-2xl flex flex-col justify-between transition-all duration-200 cursor-pointer relative text-left border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/25 scale-[1.02] z-10'
                        : isToday
                        ? 'bg-indigo-50/70 border-indigo-200 text-slate-800'
                        : cell.isCurrentMonth
                        ? 'bg-white/70 hover:bg-white border-white/80 text-slate-700'
                        : 'bg-slate-100/40 border-transparent text-slate-300 hover:bg-slate-100/70'
                    }`}
                  >
                    {/* Top Row: Date Number & Badges */}
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-black ${
                        isSelected 
                          ? 'text-white' 
                          : isToday 
                          ? 'text-indigo-600 font-black' 
                          : cell.isCurrentMonth 
                          ? 'text-slate-800' 
                          : 'text-slate-300'
                      }`}>
                        {cell.dayNum}
                      </span>

                      {cellItems.length > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-600'
                        }`}>
                          {cellItems.length}
                        </span>
                      )}
                    </div>

                    {/* Dot indicators / Mini badges */}
                    <div className="flex items-center gap-1 mt-1">
                      {hasEvents && (
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-indigo-500'}`} />
                      )}
                      {hasTasks && (
                        <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-amber-500'}`} />
                      )}
                      {cellItems.length > 0 && (
                        <span className={`text-[9px] truncate font-semibold ml-0.5 max-w-[50px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                          {cellItems[0].title}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SELECTED DAY DETAILS / AGENDA (4 or 5 Cols) */}
          <div className="lg:col-span-5 xl:col-span-4 glass-card rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div>
                <h3 className="text-base font-black text-slate-800 tracking-tight">
                  {selectedDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </h3>
                <p className="text-xs font-semibold text-slate-400">
                  {selectedDayItems.length} {selectedDayItems.length === 1 ? 'item' : 'items'} scheduled
                </p>
              </div>

              {selectedDateKey === todayKey && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Today
                </span>
              )}
            </div>

            {/* List of items on this day */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 no-scrollbar">
              {selectedDayItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white/90 border border-slate-100 shadow-2xs hover:shadow-xs transition"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      item.type === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {item.type === 'calendar' ? <CalendarIcon className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-snug">
                        {item.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1 text-indigo-600 font-bold">
                          <Clock className="w-3 h-3" />
                          {formatItemTime(item)}
                        </span>
                        {item.source && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]">
                            {item.source}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1 truncate max-w-[140px] text-slate-500">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {selectedDayItems.length === 0 && (
                <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400">
                  <CalendarDays className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
                  <p className="text-sm font-bold text-slate-700">No events or tasks</p>
                  <p className="text-xs text-slate-400 mt-0.5">Nothing scheduled for this date</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AGENDA VIEW: Full chronological list */}
      {viewMode === 'agenda' && (
        <div className="glass-card rounded-3xl p-6 border border-white/90 shadow-sm flex-1 overflow-y-auto no-scrollbar space-y-3">
          {filteredSchedule.map((item) => {
            const itemDate = new Date(item.start || item.startTime || item.dueDate || '');
            const isValidDate = !isNaN(itemDate.getTime());

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white/90 border border-slate-100 shadow-2xs hover:shadow-xs transition flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    item.type === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {item.type === 'calendar' ? <CalendarIcon className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
                      {item.title}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs font-semibold text-slate-400">
                      {isValidDate && (
                        <span className="text-slate-600 font-bold">
                          {itemDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      <span className="text-indigo-600 font-bold">
                        {formatItemTime(item)}
                      </span>
                      {item.source && (
                        <span>• {item.source}</span>
                      )}
                      {item.location && (
                        <span className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                  item.type === 'calendar' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {item.type}
                </span>
              </div>
            );
          })}

          {filteredSchedule.length === 0 && (
            <div className="h-72 flex flex-col items-center justify-center rounded-3xl text-center text-slate-400">
              <Sparkles className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
              <p className="text-base font-bold text-slate-700">No scheduled items found</p>
              <p className="text-xs text-slate-400 mt-1">Calendar and task lists are clear.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
