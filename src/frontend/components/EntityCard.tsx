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
  const name = customName || entity.attributes.friendly_name || entity.entity_id;
  const state = entity.state;
  const isLight = domain === 'light';
  const isSwitch = domain === 'switch';
  const isLock = domain === 'lock';
  const isCover = domain === 'cover';
  const isClimate = domain === 'climate';
  const isAlarm = domain === 'alarm_control_panel';

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
    if (isSwitch) return <Power className={`w-7 h-7 ${isOn ? 'text-indigo-500' : 'text-slate-400'}`} />;
    if (isLock) return isLocked ? <Lock className="w-7 h-7 text-emerald-500" /> : <Unlock className="w-7 h-7 text-amber-500" />;
    if (isCover) return state === 'closed' ? <DoorClosed className="w-7 h-7 text-emerald-500" /> : <DoorOpen className="w-7 h-7 text-amber-500" />;
    if (isClimate) return <Thermometer className="w-7 h-7 text-indigo-500" />;
    if (isAlarm) return <ShieldCheck className="w-7 h-7 text-emerald-500" />;
    return <Power className="w-7 h-7 text-slate-400" />;
  };

  return (
    <div
      onClick={handleToggle}
      className={`glass-card group relative min-h-[140px] p-5 rounded-3xl transition-all duration-300 flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] ${
        isOn && (isLight || isSwitch)
          ? 'ring-2 ring-indigo-400/50 bg-gradient-to-br from-white/95 to-indigo-50/50'
          : isLock && isLocked
          ? 'ring-2 ring-emerald-400/50 bg-gradient-to-br from-white/95 to-emerald-50/50'
          : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
          isOn ? 'bg-indigo-50 text-indigo-600 shadow-sm' : isLock && isLocked ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'bg-slate-100/80 text-slate-400'
        }`}>
          {getIcon()}
        </div>

        {/* Tactile State Toggle Pill */}
        <div className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider shadow-sm ${
          isOn
            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
            : isLock && isLocked
            ? 'bg-emerald-500 text-white'
            : 'bg-slate-100 text-slate-500'
        }`}>
          {state}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-base font-extrabold text-slate-800 tracking-tight line-clamp-1 group-hover:text-indigo-600 transition flex-1">
            {name}
          </h4>
          {onRename && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename(entity);
              }}
              title="Rename device"
              className="w-7 h-7 rounded-lg text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 flex items-center justify-center cursor-pointer transition opacity-0 group-hover:opacity-100"
            >
              <span className="text-xs font-bold">✎</span>
            </button>
          )}
        </div>
        <div className="text-xs font-semibold text-slate-400 flex items-center gap-2 mt-0.5">
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
        <div className="absolute inset-0 bg-white/70 rounded-3xl backdrop-blur-[2px] flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
