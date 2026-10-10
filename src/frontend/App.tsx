import React, { useState, useEffect } from 'react';
import { Sidebar, NavTab } from './components/Sidebar';
import { Header } from './components/Header';
import { EntityCard } from './components/EntityCard';
import { ClimateUnitCard } from './components/ClimateUnitCard';
import { ConfirmationModal } from './components/ConfirmationModal';
import { GroceryView } from './components/GroceryView';
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
  // Sync tab with URL path (/home, /security, /schedule, /groceries)
  const getTabFromPath = (): NavTab => {
    const path = window.location.pathname.replace(/^\//, '').toLowerCase();
    if (path === 'security') return 'security';
    if (path === 'schedule') return 'schedule';
    if (path === 'groceries') return 'groceries';
    return 'home';
  };

  const [currentTab, setCurrentTab] = useState<NavTab>(getTabFromPath);

  const handleSelectTab = (tab: NavTab) => {
    setCurrentTab(tab);
    const targetPath = `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getTabFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
    confirmed = false,
    serviceData?: Record<string, any>
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
          service_data: serviceData,
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

  const executeServiceCallWithData = (
    entity: HAEntityState,
    domain: string,
    service: string,
    serviceData?: Record<string, any>
  ) => {
    executeServiceCall(entity, domain, service, false, serviceData);
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

  // Actionable controllable domains only
  const ACTIONABLE_DOMAINS = ['light', 'switch', 'climate', 'cover', 'lock', 'fan'];

  // Persistent user customization: pinned or hidden entities (stored in localStorage)
  const [hiddenEntities, setHiddenEntities] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('casacontrol_hidden_entities');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isManageMode, setIsManageMode] = useState<boolean>(false);
  const [showUnavailable, setShowUnavailable] = useState<boolean>(false);

  const toggleHideEntity = (entityId: string) => {
    setHiddenEntities((prev) => {
      const updated = prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId];
      try {
        localStorage.setItem('casacontrol_hidden_entities', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Identify all climate units
  const climateEntities = entities.filter((e) => e.entity_id.startsWith('climate.'));

  // Separate sub-switches belonging to AC units so they don't clutter the main grid
  const getSubSwitchesForClimate = (climate: HAEntityState) => {
    const climateId = climate.entity_id.replace('climate.', '').toLowerCase();
    const prefix = climateId.split('_')[0]; // e.g. 'master', 'kuya', 'girls', 'living'
    return entities.filter((e) => {
      if (!e.entity_id.startsWith('switch.')) return false;
      const swId = e.entity_id.toLowerCase();
      return swId.includes(prefix) || swId.includes('aircon') || swId.includes('ac_');
    });
  };

  const isAirconSubSwitch = (entityId: string) => {
    if (!entityId.startsWith('switch.')) return false;
    const lower = entityId.toLowerCase();
    return lower.includes('aircon') || lower.includes('_ac_') || lower.includes('air_conditioner');
  };

  // Filtered entities for Home tab:
  // 1. Must belong to actionable domain (light, switch, cover, fan)
  // 2. Hide sensors, persons, zones, sun, events, conversations
  // 3. Hide secondary aircon sub-switches (handled inside ClimateUnitCard)
  // 4. Hide unavailable devices unless explicitly toggled
  const filteredEntities = entities.filter((e) => {
    const [domain] = e.entity_id.split('.');

    // Domain filter bar
    if (selectedDomain !== 'all') {
      if (domain !== selectedDomain) return false;
      if (domain === 'switch' && isAirconSubSwitch(e.entity_id)) return false;
    } else {
      if (!ACTIONABLE_DOMAINS.includes(domain)) return false;
      if (domain === 'climate') return false; // Rendered in dedicated Climate section
      if (isAirconSubSwitch(e.entity_id)) return false; // Handled under its respective AC card
      if (isHighImpact(e.entity_id, e.attributes.device_class)) return false;
    }

    // Hide unavailable devices unless explicitly toggled
    if (!showUnavailable && (e.state === 'unavailable' || e.state === 'unknown')) {
      return false;
    }

    // Hide if user marked as hidden (unless currently in Manage Mode)
    if (!isManageMode && hiddenEntities.includes(e.entity_id)) {
      return false;
    }

    return true;
  });

  const activeDeviceCount = entities.filter((e) => {
    const [domain] = e.entity_id.split('.');
    return ACTIONABLE_DOMAINS.includes(domain) && (e.state === 'on' || e.state === 'open' || e.state === 'unlocked' || (domain === 'climate' && e.state !== 'off'));
  }).length;

  // Security entities (Locks, Garages, Alarms)
  const securityEntities = entities.filter((e) =>
    isHighImpact(e.entity_id, e.attributes.device_class)
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-800">
      {/* Persistent Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
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
              {/* Domain Filter Pills & Tablet Control Bar */}
              <div className="flex items-center justify-between gap-4 overflow-x-auto pb-2 no-scrollbar">
                <div className="flex items-center gap-3">
                  {['all', 'light', 'switch', 'climate', 'cover'].map((dom) => (
                    <button
                      key={dom}
                      onClick={() => setSelectedDomain(dom)}
                      className={`h-12 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 shadow-sm border ${
                        selectedDomain === dom
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-indigo-500/25 scale-102 font-extrabold'
                          : 'bg-white/80 hover:bg-white text-slate-600 border-white/90'
                      }`}
                    >
                      {dom}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowUnavailable(!showUnavailable)}
                    className={`h-12 px-4 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm border ${
                      showUnavailable
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        : 'bg-white/80 text-slate-500 hover:text-slate-800 border-white/90'
                    }`}
                  >
                    <span>{showUnavailable ? 'Showing All' : 'Hiding Inactive'}</span>
                  </button>

                  <button
                    onClick={() => setIsManageMode(!isManageMode)}
                    className={`h-12 px-5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm border ${
                      isManageMode
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black border-transparent shadow-amber-500/25'
                        : 'bg-white/80 hover:bg-white text-slate-700 border-white/90'
                    }`}
                  >
                    <span>{isManageMode ? 'Done Editing' : 'Customize Cards'}</span>
                  </button>
                </div>
              </div>

              {isManageMode && (
                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-900 text-xs font-semibold flex items-center justify-between shadow-xs">
                  <span>Tap any card below to hide or unhide it from this tablet's main dashboard.</span>
                  <span className="font-mono font-bold text-amber-700">{hiddenEntities.length} hidden</span>
                </div>
              )}

              {/* Status warning pill if HA is offline */}
              {haError && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="text-sm font-semibold">{haError}</span>
                </div>
              )}

              {/* SECTION: CLIMATE & AIR CONDITIONING (Grouped Units) */}
              {(selectedDomain === 'all' || selectedDomain === 'climate') && climateEntities.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Air Conditioning & Climate Units ({climateEntities.filter(c => c.state !== 'unavailable').length} online)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {climateEntities
                      .filter((c) => showUnavailable || c.state !== 'unavailable')
                      .map((climate) => (
                        <ClimateUnitCard
                          key={climate.entity_id}
                          climateEntity={climate}
                          subSwitches={getSubSwitchesForClimate(climate)}
                          onAction={(entity, domain, service, serviceData) =>
                            executeServiceCallWithData(entity, domain, service, serviceData)
                          }
                          isLoading={loadingEntityId === climate.entity_id}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* SECTION: OTHER ROOM CONTROLS (Lights, Plugs, Switches) */}
              {(selectedDomain === 'all' || selectedDomain !== 'climate') && (
                <div className="space-y-4 pt-2">
                  {selectedDomain === 'all' && (
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                      Switches & Room Lights
                    </h3>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredEntities.map((entity) => {
                  const isHidden = hiddenEntities.includes(entity.entity_id);
                  return (
                    <div key={entity.entity_id} className="relative">
                      {isManageMode && (
                        <button
                          onClick={() => toggleHideEntity(entity.entity_id)}
                          className={`absolute -top-2 -right-2 z-20 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider cursor-pointer shadow-lg transition ${
                            isHidden
                              ? 'bg-red-500 text-white'
                              : 'bg-emerald-500 text-slate-950'
                          }`}
                        >
                          {isHidden ? 'Hidden' : 'Visible'}
                        </button>
                      )}
                      <div className={isManageMode && isHidden ? 'opacity-30' : ''}>
                        <EntityCard
                          entity={entity}
                          onAction={isManageMode ? () => toggleHideEntity(entity.entity_id) : handleEntityAction}
                          isLoading={loadingEntityId === entity.entity_id}
                        />
                      </div>
                    </div>
                  );
                })}

                {filteredEntities.length === 0 && !haError && (
                  <div className="col-span-full h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-400">
                    <Sparkles className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm font-semibold">No devices found in this filter category</p>
                  </div>
                )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SECURITY & PERIMETER */}
          {currentTab === 'security' && (
            <div className="space-y-6 max-w-5xl mx-auto">
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  Security & Perimeter Center
                </h2>
                <p className="text-xs font-semibold text-slate-400 mt-1">
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
                  <div className="col-span-full h-72 flex flex-col items-center justify-center rounded-3xl glass-panel p-8 text-center">
                    <ShieldCheck className="w-14 h-14 text-emerald-500 mb-3 opacity-70" />
                    <h3 className="text-xl font-extrabold text-slate-800">All Perimeters Normal</h3>
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
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                      <CalendarIcon className="w-5 h-5" />
                    </div>
                    Today's Schedule & Family Tasks
                  </h2>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    Unified calendar and tasks from the shared household Google account.
                  </p>
                </div>
              </div>

              {scheduleError && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-500" />
                  <span className="text-sm font-semibold">{scheduleError}</span>
                </div>
              )}

              <div className="space-y-3.5">
                {schedule.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card p-5 rounded-2xl flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                        item.type === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {item.type === 'calendar' ? <CalendarIcon className="w-6 h-6" /> : <CheckSquare className="w-6 h-6" />}
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-800 tracking-tight">{item.title}</h4>
                        <div className="text-xs font-semibold text-slate-400 flex items-center gap-3 mt-1">
                          <span className="capitalize text-indigo-600 font-bold">{item.type}</span>
                          {item.listName && <span>• {item.listName}</span>}
                          {item.startTime && <span>• {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                          {item.dueDate && <span>• Due {new Date(item.dueDate).toLocaleDateString()}</span>}
                        </div>
                      </div>
                    </div>

                    <span className="px-3.5 py-1 rounded-full bg-slate-100 text-[11px] font-black text-slate-600 uppercase tracking-wider">
                      {item.isAllDay ? 'All Day' : 'Scheduled'}
                    </span>
                  </div>
                ))}

                {schedule.length === 0 && !scheduleError && (
                  <div className="h-72 flex flex-col items-center justify-center rounded-3xl glass-panel text-slate-500">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2 opacity-60" />
                    <p className="text-lg font-extrabold text-slate-800">All Clear for Today</p>
                    <p className="text-xs text-slate-400 mt-1">No pending calendar events or active reminders.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: GROCERY LIST */}
          {currentTab === 'groceries' && (
            <GroceryView groceries={groceries} error={groceriesError} />
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
