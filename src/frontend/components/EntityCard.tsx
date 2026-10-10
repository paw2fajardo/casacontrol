import React from 'react';
import { Lightbulb, Power, Lock, Unlock, Thermometer, ShieldCheck, DoorClosed, DoorOpen } from 'lucide-react';
import { HAEntityState } from '../types';

interface EntityCardProps {
  entity: HAEntityState;
  customName?: string;
  onAction: (entity: HAEntityState, domain: string, service: string) => void;
  onRename?: (entity: HAEntityState) => void;
  isLoading: boolean;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  customName,
  onAction,
  onRename,
  isLoading,
}) => {
  const [domain] = entity.entity_id.split('.');
  const lowerId = entity.entity_id.toLowerCase();
  const name = customName || entity.attributes.friendly_name || entity.entity_id;
  const state = entity.state;
  const isLight = domain === 'light';
  const isSwitch = domain === 'switch';
  const isLock = domain === 'lock';
  const isCover = domain === 'cover';
  const isClimate = domain === 'climate';
  const isAlarm = domain === 'alarm_control_panel' || (domain === 'switch' && (lowerId.includes('alarm') || lowerId.includes('guard_mode')));

  const isOn = state === 'on' || state === 'open' || state === 'unlocked';
  const isLocked = state === 'locked';

  const handleToggle = () => {
    if (isLoading) return;

    if (isLight || isSwitch) {
      onAction(entity, domain, 'toggle');
    } else if (isLock) {
      onAction(entity, domain, isLocked ? 'unlock' : 'lock');
    } else if (isCover) {
      onAction(entity, domain, state === 'closed' ? 'open_cover' : 'close_cover');
    }
  };

  const getIcon = () => {
    if (isLight) return <Lightbulb className={`w-7 h-7 ${isOn ? 'text-amber-500 fill-amber-500/20' : 'text-slate-400'}`} />;
    if (isAlarm) return <ShieldCheck className={`w-7 h-7 ${isOn ? 'text-emerald-500' : 'text-slate-400'}`} />;
    if (isSwitch) return <Power className={`w-7 h-7 ${isOn ? 'text-indigo-500' : 'text-slate-400'}`} />;
    if (isLock) return isLocked ? <Lock className="w-7 h-7 text-emerald-500" /> : <Unlock className="w-7 h-7 text-amber-500" />;
    if (isCover) return state === 'closed' ? <DoorClosed className="w-7 h-7 text-emerald-500" /> : <DoorOpen className="w-7 h-7 text-amber-500" />;
    if (isClimate) return <Thermometer className="w-7 h-7 text-indigo-500" />;
    return <Power className="w-7 h-7 text-slate-400" />;
  };

  return (
    <div
      onClick={handleToggle}
      className={`glass-card group relative min-h-[96px] p-3.5 rounded-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] ${
        isOn && isAlarm
          ? 'ring-2 ring-emerald-400/50 bg-gradient-to-br from-white/95 to-emerald-50/50 shadow-sm'
          : isOn && (isLight || isSwitch)
          ? 'ring-2 ring-indigo-400/50 bg-gradient-to-br from-white/95 to-indigo-50/50 shadow-sm'
          : isLock && isLocked
          ? 'ring-2 ring-emerald-400/50 bg-gradient-to-br from-white/95 to-emerald-50/50 shadow-sm'
          : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 ${
          isOn ? 'bg-indigo-50 text-indigo-600 shadow-xs' : isLock && isLocked ? 'bg-emerald-50 text-emerald-600 shadow-xs' : 'bg-slate-100/80 text-slate-400'
        }`}>
          {getIcon()}
        </div>

        {/* Tactile State Toggle Pill */}
        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs shrink-0 ${
          isOn
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
            : isLock && isLocked
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-100 text-slate-500'
        }`}>
          {state}
        </div>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between gap-1.5">
          <h4 className="text-sm font-extrabold text-slate-800 tracking-tight truncate group-hover:text-indigo-600 transition flex-1">
            {name}
          </h4>
          {onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename(entity);
              }}
              title="Rename device"
              className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white flex items-center gap-1 cursor-pointer transition shrink-0 shadow-xs"
            >
              <span className="text-[10px] font-bold">✎ Rename</span>
            </button>
          )}
        </div>
        <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mt-0.5">
          <span className="capitalize">{domain}</span>
          {entity.attributes.current_temperature && (
            <span>• {entity.attributes.current_temperature}°</span>
          )}
          {entity.attributes.brightness && (
            <span>• {Math.round((entity.attributes.brightness / 255) * 100)}%</span>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-white/70 rounded-2xl backdrop-blur-[2px] flex items-center justify-center">
          <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
