import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { EntityCard } from './components/EntityCard';
import { ConfirmationModal } from './components/ConfirmationModal';
import { HAEntityState, ScheduleItem, GroceryItem } from './types';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  Lock, 
  Unlock, 
  DoorClosed, 
  DoorOpen, 
  ShieldCheck, 
  AlertCircle, 
  ShoppingCart,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [entities, setEntities] = useState<HAEntityState[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [groceries, setGroceries] = useState<GroceryItem[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string>('all');

  // Loading & refresh states
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [loadingEntityId, setLoadingEntityId] = useState<string | null>(null);

  // Upstream status errors
  const [haError, setHaError] = useState<string | null>(null);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [groceriesError, setGroceriesError] = useState<string | null>(null);

  // Security confirmation modal state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [pendingAction, setPendingAction] = useState<{
    entity: HAEntityState;
    domain: string;
    service: string;
  } | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState<boolean>(false);

  // Fetch Home Assistant entities
  const fetchEntities = async () => {
    try {
      const res = await fetch('/api/homeassistant/entities');
      const data = await res.json();
      if (data.success && Array.isArray(data.entities)) {
        setEntities(data.entities);
        setHaError(null);
      } else {
        setHaError(data.error || 'HA Offline');
      }
    } catch (err: any) {
      setHaError('HA Connection Failed');
    }
  };

  // Fetch Schedule items
  const fetchSchedule = async () => {
    try {
      const res = await fetch('/api/schedule');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setSchedule(data.items);
        setScheduleError(null);
      } else {
        setScheduleError(data.error || 'Google Offline');
      }
    } catch {
      setScheduleError('Google Connection Failed');
    }
  };

  // Fetch Groceries
  const fetchGroceries = async () => {
    try {
      const res = await fetch('/api/groceries');
      const data = await res.json();
      if (data.success && Array.isArray(data.items)) {
        setGroceries(data.items);
        setGroceriesError(null);
      } else {
        setGroceriesError(data.error || 'CartSync Offline');
      }
    } catch {
      setGroceriesError('CartSync Connection Failed');
    }
  };

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchEntities(), fetchSchedule(), fetchGroceries()]);
    setIsRefreshing(false);
  };

  // Polling loops
  useEffect(() => {
    handleRefreshAll();
    const haInterval = setInterval(fetchEntities, 10000);
    const slowInterval = setInterval(() => {
      fetchSchedule();
      fetchGroceries();
    }, 60000);

    return () => {
      clearInterval(haInterval);
      clearInterval(slowInterval);
    };
  }, []);

  // Check if entity is high-impact
  const isHighImpact = (entityId: string, deviceClass?: string) => {
    const [domain] = entityId.split('.');
    if (domain === 'lock') return true;
    if (domain === 'alarm_control_panel') return true;
    if (domain === 'cover' && (deviceClass === 'garage' || entityId.includes('garage'))) return true;
    return false;
  };

  // Dispatch HA action
  const executeServiceCall = async (
    entity: HAEntityState,
    domain: string,
    service: string,
    confirmed = false
  ) => {
    setLoadingEntityId(entity.entity_id);
    try {
      const res = await fetch('/api/homeassistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_id: entity.entity_id,
          domain,
          service,
          confirmed,
        }),
      });
      const data = await res.json();
      if (!res.ok && data.requiresConfirmation) {
        setPendingAction({ entity, domain, service });
        setModalOpen(true);
      } else {
        // Refresh states
        await fetchEntities();
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
    } finally {
      setLoadingEntityId(null);
    }
  };

  const handleEntityAction = (entity: HAEntityState, domain: string, service: string) => {
    if (isHighImpact(entity.entity_id, entity.attributes.device_class)) {
      setPendingAction({ entity, domain, service });
      setModalOpen(true);
    } else {
      executeServiceCall(entity, domain, service, false);
    }
  };

  const handleConfirmModal = async () => {
    if (!pendingAction) return;
    setIsExecutingAction(true);
    await executeServiceCall(
      pendingAction.entity,
      pendingAction.domain,
      pendingAction.service,
      true
    );
    setIsExecutingAction(false);
    setModalOpen(false);
    setPendingAction(null);
  };

  // Filtered entities for Home tab
  const filteredEntities = entities.filter((e) => {
    if (selectedDomain === 'all') return true;
    return e.entity_id.startsWith(`${selectedDomain}.`);
  });

  const activeDeviceCount = entities.filter(
    (e) => e.state === 'on' || e.state === 'open' || e.state === 'unlocked'
  ).length;

  // Security entities
  const securityEntities = entities.filter((e) =>
    isHighImpact(e.entity_id, e.attributes.device_class)
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0d14] text-slate-100">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        groceryCount={groceries.length}
        upcomingCount={schedule.length}
      />

      {/* Main View Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        <Header
          onManualRefresh={handleRefreshAll}
          isRefreshing={isRefreshing}
          activeCount={activeDeviceCount}
        />

        <main className="flex-1 overflow-y-auto p-8 no-scrollbar">
          {/* TAB 1: HOME CONTROLS */}
          {currentTab === 'home' && (
            <div className="space-y-6">
              {/* Domain Filter Pills */}
              <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                {['all', 'light', 'switch', 'climate', 'cover'].map((dom) => (
                  <button
                    key={dom}
                    onClick={() => setSelectedDomain(dom)}
                    className={`h-12 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer active:scale-95 ${
                      selectedDomain === dom
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-102'
                        : 'bg-[#141824] hover:bg-[#1a2030] text-slate-300 border border-slate-800'
                    }`}
                  >
                    {dom}
                  </button>
                ))}
              </div>

              {/* Status warning pill if HA is offline */}
              {haError && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-semibold">{haError}</span>
                </div>
              )}

              {/* Entities Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredEntities.map((entity) => (
                  <EntityCard
                    key={entity.entity_id}
                    entity={entity}
                    onAction={handleEntityAction}
                    isLoading={loadingEntityId === entity.entity_id}
                  />
                ))}

                {filteredEntities.length === 0 && !haError && (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-400">
                    <Sparkles className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No devices found in this filter category</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & PERIMETER */}
          {currentTab === 'security' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-emerald-400" />
                  Security & Perimeter Center
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Protected high-impact home controls. Action confirmation is required on physical toggles.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {securityEntities.map((entity) => (
                  <EntityCard
                    key={entity.entity_id}
                    entity={entity}
                    onAction={handleEntityAction}
                    isLoading={loadingEntityId === entity.entity_id}
                  />
                ))}

                {securityEntities.length === 0 && (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center border border-slate-800 rounded-3xl bg-[#141824] p-8 text-center">
                    <ShieldCheck className="w-12 h-12 text-emerald-400 mb-3" />
                    <h3 className="text-lg font-bold text-white">All Perimeters Normal</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-md">
                      No security doors or alarm entities require attention or manual confirmation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SCHEDULE & ROUTINES */}
          {currentTab === 'schedule' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                    <CalendarIcon className="w-8 h-8 text-amber-400" />
                    Today's Schedule & Family Tasks
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Unified calendar and tasks from the shared household Google account.
                  </p>
                </div>
              </div>

              {scheduleError && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-semibold">{scheduleError}</span>
                </div>
              )}

              <div className="space-y-4">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-[#141824] border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        item.type === 'calendar' ? 'bg-blue-500/15 text-blue-400' : 'bg-amber-500/15 text-amber-400'
                      }`}>
                        {item.type === 'calendar' ? <CalendarIcon className="w-6 h-6" /> : <CheckSquare className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white tracking-tight">{item.title}</h4>
                        <div className="text-xs text-slate-400 flex items-center gap-3 mt-1">
                          <span className="capitalize font-semibold">{item.type}</span>
                          {item.listName && <span>• {item.listName}</span>}
                          {item.startTime && <span>• {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          {item.dueDate && <span>• Due {new Date(item.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>

                    <span className="px-3 py-1.5 rounded-xl bg-slate-800 text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      {item.isAllDay ? 'All Day' : 'Scheduled'}
                    </span>
                  </div>
                ))}

                {schedule.length === 0 && !scheduleError && (
                  <div className="h-64 flex flex-col items-center justify-center border border-slate-800 rounded-3xl bg-[#141824] text-slate-400">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
                    <p className="text-base font-bold text-white">All Clear for Today</p>
                    <p className="text-xs text-slate-400 mt-1">No pending calendar events or active reminders.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: GROCERY LIST */}
          {currentTab === 'groceries' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-white flex items-center gap-3">
                    <ShoppingCart className="w-8 h-8 text-amber-400" />
                    CartSync Grocery List
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Live household items synced with CartSync (Read-only on dashboard).
                  </p>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                  {groceries.length} {groceries.length === 1 ? 'Item' : 'Items'} Needed
                </div>
              </div>

              {groceriesError && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-semibold">{groceriesError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groceries.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-3xl bg-[#141824] border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 rounded-lg border-2 border-slate-600 flex items-center justify-center text-transparent">
                        ✓
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight">{item.name}</h4>
                        {item.category && (
                          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {item.quantity && (
                      <span className="px-3.5 py-1 rounded-xl bg-slate-800 font-mono font-bold text-sm text-amber-300">
                        {item.quantity} {item.unit || ''}
                      </span>
                    )}
                  </div>
                ))}

                {groceries.length === 0 && !groceriesError && (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center border border-slate-800 rounded-3xl bg-[#141824] text-slate-400">
                    <ShoppingCart className="w-10 h-10 text-emerald-400 mb-2 opacity-50" />
                    <p className="text-base font-bold text-white">Pantry is Stocked</p>
                    <p className="text-xs text-slate-400 mt-1">No items currently on the household grocery list.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Universal Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        entityName={pendingAction?.entity.attributes.friendly_name || pendingAction?.entity.entity_id || ''}
        actionName={`${pendingAction?.service || ''} ${pendingAction?.domain || ''}`}
        isHighImpact={true}
        onCancel={() => {
          setModalOpen(false);
          setPendingAction(null);
        }}
        onConfirm={handleConfirmModal}
        isLoading={isExecutingAction}
      />
    </div>
  );
};

export default App;
