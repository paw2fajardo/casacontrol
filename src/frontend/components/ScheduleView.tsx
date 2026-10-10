import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  CheckSquare, 
  Sparkles,
  AlertCircle,
  CalendarDays,
  LayoutGrid,
  List,
  Flame,
  Check,
  RotateCw
} from 'lucide-react';
import { ScheduleItem } from '../types';

interface ScheduleViewProps {
  schedule: ScheduleItem[];
  error: string | null;
  onRefresh?: () => void;
}

type ViewMode = 'timeline' | 'month' | 'agenda';

export const ScheduleView: React.FC<ScheduleViewProps> = ({ schedule, error, onRefresh }) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // Default to glanceable 3-Day Timeline for wall tablets
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [filterType, setFilterType] = useState<'all' | 'calendar' | 'task'>('all');

  // Local optimistic task completion state
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => new Set());

  const toggleTaskCompletion = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

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

  // Calendar cells: 35 or 42 slots
  const calendarCells = useMemo(() => {
    const cells: Array<{
      dayNum: number;
      date: Date;
      isCurrentMonth: boolean;
      dateKey: string;
    }> = [];

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const date = new Date(year, month - 1, dayNum);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dayNum, date, isCurrentMonth: false, dateKey });
    }

    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const date = new Date(year, month, dayNum);
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      cells.push({ dayNum, date, isCurrentMonth: true, dateKey });
    }

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

  // Determine currently active "Now Happening" event
  const nowEvent = useMemo(() => {
    const nowTime = Date.now();
    return filteredSchedule.find((item) => {
      if (item.type !== 'calendar' || item.allDay || item.isAllDay) return false;
      const startMs = new Date(item.start || item.startTime || '').getTime();
      const endMs = new Date(item.end || item.endTime || '').getTime();
      if (isNaN(startMs)) return false;
      // If endMs is available, check interval; else assume 1 hour duration
      const durationEnd = !isNaN(endMs) ? endMs : startMs + 60 * 60 * 1000;
      return nowTime >= startMs && nowTime <= durationEnd;
    });
  }, [filteredSchedule]);

  // Rolling 3-Day columns for glanceable tablet view
  const rollingDays = useMemo(() => {
    const days = [];
    for (let offset = 0; offset < 3; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'long' });
      days.push({
        date: d,
        dateKey: key,
        label,
        subLabel: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        items: itemsByDate[key] || [],
      });
    }
    return days;
  }, [itemsByDate, today]);

  return (
    <div className="space-y-4 max-w-7xl mx-auto h-full flex flex-col">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <div className="flex items-center gap-3.5">
          {/* Solid appliance badge instead of synthetic AI purple gradient */}
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xs">
            <CalendarIcon className="w-6 h-6" />
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

        {/* View Mode & Type Filter Switchers (All targets >= 48px height) */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-white/80 border border-white/90 p-1.5 rounded-2xl shadow-xs flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('timeline')}
              className={`h-12 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-400" />
              <span>3-Day</span>
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`h-12 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`h-12 px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                viewMode === 'agenda'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Agenda</span>
            </button>
          </div>

          {/* Type Filter */}
          <div className="bg-white/80 border border-white/90 p-1.5 rounded-2xl shadow-xs flex items-center gap-1.5">
            <button
              onClick={() => setFilterType('all')}
              className={`h-12 px-4 rounded-xl text-xs font-bold transition cursor-pointer ${
                filterType === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('calendar')}
              className={`h-12 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'calendar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Events
            </button>
            <button
              onClick={() => setFilterType('task')}
              className={`h-12 px-4 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                filterType === 'task'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Tasks
            </button>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Sync Google Calendar"
              className="w-12 h-12 rounded-2xl bg-white/90 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer transition active:scale-95"
            >
              <RotateCw className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Now Happening Hero Banner (If an event is active right now) */}
      {nowEvent && (
        <div className="p-4 rounded-2xl bg-indigo-600 text-white shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white/25 text-[10px] font-black uppercase tracking-wider">
                  Now Happening
                </span>
                {nowEvent.source && (
                  <span className="text-xs text-indigo-100 font-semibold">• {nowEvent.source}</span>
                )}
              </div>
              <h3 className="text-base font-black tracking-tight mt-0.5">{nowEvent.title}</h3>
            </div>
          </div>
          {nowEvent.location && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-indigo-100 font-medium">
              <MapPin className="w-4 h-4" />
              <span>{nowEvent.location}</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
            <span className="text-sm font-semibold">{error}</span>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-200/80 hover:bg-amber-300 text-amber-900 transition cursor-pointer"
            >
              Retry Sync
            </button>
          )}
        </div>
      )}

      {/* VIEW 1: GLANCEABLE 3-DAY TIMELINE (Default Appliance Mode for 2-4ft viewing) */}
      {viewMode === 'timeline' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 min-h-[580px]">
          {rollingDays.map((col, idx) => {
            const isToday = idx === 0;
            return (
              <div
                key={col.dateKey}
                className={`glass-card rounded-3xl p-5 border shadow-sm flex flex-col ${
                  isToday ? 'border-indigo-300 bg-white/95 ring-2 ring-indigo-500/20' : 'border-white/90 bg-white/85'
                }`}
              >
                {/* Day Column Header */}
                <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black tracking-tight text-slate-900">
                        {col.label}
                      </h3>
                      {isToday && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white shadow-2xs">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-slate-400 mt-0.5">{col.subLabel}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                    {col.items.length} {col.items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Day Items List (Glanceable 16px typography) */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
                  {col.items.map((item) => {
                    const isTask = item.type === 'task';
                    const isCompleted = completedTaskIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition shadow-2xs ${
                          isCompleted
                            ? 'bg-slate-50/70 border-slate-200/60 opacity-60'
                            : 'bg-white/90 border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          {isTask ? (
                            <button
                              onClick={(e) => toggleTaskCompletion(item.id, e)}
                              title={isCompleted ? 'Mark uncompleted' : 'Mark completed'}
                              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 ${
                                isCompleted
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : <CheckSquare className="w-5 h-5" />}
                            </button>
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                              <CalendarIcon className="w-5 h-5" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <h4 className={`text-base font-extrabold tracking-tight leading-snug ${
                              isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                            }`}>
                              {item.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-xs font-semibold text-slate-400">
                              <span className="flex items-center gap-1 text-indigo-600 font-bold">
                                <Clock className="w-3.5 h-3.5" />
                                {formatItemTime(item)}
                              </span>
                              {item.source && (
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px]">
                                  {item.source}
                                </span>
                              )}
                              {item.location && (
                                <span className="flex items-center gap-1 truncate max-w-[150px] text-slate-500">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {item.location}
                                </span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-500 mt-2 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {col.items.length === 0 && (
                    <div className="h-56 flex flex-col items-center justify-center text-center text-slate-400">
                      <CalendarDays className="w-10 h-10 mb-2 opacity-30 text-indigo-400" />
                      <p className="text-sm font-bold text-slate-700">No scheduled items</p>
                      <p className="text-xs text-slate-400 mt-0.5">Nothing on the calendar for this day</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: MONTH VIEW (Side-by-side with high-contrast dots & large targets) */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[580px]">
          {/* LEFT: CALENDAR GRID (8 Cols) */}
          <div className="lg:col-span-7 xl:col-span-8 glass-card rounded-3xl p-5 border border-white/90 shadow-sm flex flex-col">
            {/* Month Header & Controls (48px targets) */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  {monthName}
                </h3>
                <button
                  onClick={jumpToToday}
                  className="h-11 px-4 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer border border-indigo-200/80 shadow-xs"
                >
                  Today
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={prevMonth}
                  className="w-12 h-12 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextMonth}
                  className="w-12 h-12 rounded-xl bg-white/90 hover:bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer transition active:scale-95"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
              {DAYS.map((d) => (
                <div key={d} className="text-xs font-black uppercase tracking-wider text-slate-400 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Month Grid Cells (Consistent semantic dot indicators without micro-text truncation) */}
            <div className="grid grid-cols-7 gap-1.5 flex-1 auto-rows-fr">
              {calendarCells.map((cell) => {
                const isSelected = cell.dateKey === selectedDateKey;
                const isToday = cell.dateKey === todayKey;
                const cellItems = itemsByDate[cell.dateKey] || [];
                const eventCount = cellItems.filter((i) => i.type === 'calendar').length;
                const taskCount = cellItems.filter((i) => i.type === 'task').length;

                return (
                  <button
                    key={cell.dateKey}
                    onClick={() => setSelectedDate(cell.date)}
                    className={`min-h-[68px] sm:min-h-[80px] p-2 rounded-2xl flex flex-col justify-between transition-all duration-200 cursor-pointer relative text-left border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-[1.02] z-10'
                        : isToday
                        ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-400 text-slate-800'
                        : cell.isCurrentMonth
                        ? 'bg-white/70 hover:bg-white border-white/80 text-slate-700'
                        : 'bg-slate-100/40 border-transparent text-slate-300 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-sm font-black ${
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
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {cellItems.length}
                        </span>
                      )}
                    </div>

                    {/* Semantic Dot Indicators (Consistently Indigo for Events, Amber for Tasks) */}
                    <div className="flex items-center gap-1.5 mt-1">
                      {eventCount > 0 && (
                        <div className="flex items-center gap-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-600'}`} />
                          {eventCount > 1 && (
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-indigo-100' : 'text-slate-500'}`}>
                              {eventCount}
                            </span>
                          )}
                        </div>
                      )}
                      {taskCount > 0 && (
                        <div className="flex items-center gap-1">
                          <span className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-amber-300' : 'bg-amber-500'}`} />
                          {taskCount > 1 && (
                            <span className={`text-[10px] font-bold ${isSelected ? 'text-amber-100' : 'text-amber-700'}`}>
                              {taskCount}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SELECTED DAY DETAILS / AGENDA */}
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
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Today
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 no-scrollbar">
              {selectedDayItems.map((item) => {
                const isTask = item.type === 'task';
                const isCompleted = completedTaskIds.has(item.id);

                return (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-2xl bg-white/90 border border-slate-100 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex items-start gap-3">
                      {isTask ? (
                        <button
                          onClick={(e) => toggleTaskCompletion(item.id, e)}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 ${
                            isCompleted
                              ? 'bg-emerald-500 text-white'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : <CheckSquare className="w-5 h-5" />}
                        </button>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                          <CalendarIcon className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-extrabold tracking-tight leading-snug ${
                          isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}>
                          {item.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs font-semibold text-slate-400">
                          <span className="flex items-center gap-1 text-indigo-600 font-bold">
                            <Clock className="w-3.5 h-3.5" />
                            {formatItemTime(item)}
                          </span>
                          {item.source && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px]">
                              {item.source}
                            </span>
                          )}
                          {item.location && (
                            <span className="flex items-center gap-1 truncate max-w-[140px] text-slate-500">
                              <MapPin className="w-3.5 h-3.5" />
                              {item.location}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-500 mt-2 line-clamp-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

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

      {/* VIEW 3: FULL AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div className="glass-card rounded-3xl p-6 border border-white/90 shadow-sm flex-1 overflow-y-auto no-scrollbar space-y-3">
          {filteredSchedule.map((item) => {
            const itemDate = new Date(item.start || item.startTime || item.dueDate || '');
            const isValidDate = !isNaN(itemDate.getTime());
            const isTask = item.type === 'task';
            const isCompleted = completedTaskIds.has(item.id);

            return (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-white/90 border border-slate-100 shadow-2xs hover:shadow-xs transition flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {isTask ? (
                    <button
                      onClick={(e) => toggleTaskCompletion(item.id, e)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition active:scale-95 ${
                        isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isCompleted ? <Check className="w-5 h-5 stroke-[3]" /> : <CheckSquare className="w-5 h-5" />}
                    </button>
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0 shadow-xs">
                      <CalendarIcon className="w-6 h-6" />
                    </div>
                  )}

                  <div>
                    <h4 className={`text-base font-extrabold tracking-tight ${
                      isCompleted ? 'line-through text-slate-400' : 'text-slate-800'
                    }`}>
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
                          <MapPin className="w-3.5 h-3.5" />
                          {item.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
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
