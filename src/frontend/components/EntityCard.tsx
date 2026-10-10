import React from 'react';
import { Lightbulb, Power, Lock, Unlock, Thermometer, Shield, ShieldCheck, DoorClosed, DoorOpen, Fan } from 'lucide-react';
import { HAEntityState } from '../types';

interface EntityCardProps {
  entity: HAEntityState;
  onAction: (entity: HAEntityState, domain: string, service: string) => void;
  isLoading: boolean;
}

export const EntityCard: React.FC<EntityCardProps> = ({ entity, onAction, isLoading }) => {
  const [domain] = entity.entity_id.split('.');
  const name = entity.attributes.friendly_name || entity.entity_id;
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

  // Determine Icon
  const getIcon = () => {
    if (isLight) return <Lightbulb className={`w-7 h-7 ${isOn ? 'text-amber-400 fill-amber-400/20' : 'text-slate-400'}`} />;
    if (isSwitch) return <Power className={`w-7 h-7 ${isOn ? 'text-amber-400' : 'text-slate-400'}`} />;
    if (isLock) return isLocked ? <Lock className="w-7 h-7 text-emerald-400" /> : <Unlock className="w-7 h-7 text-amber-400" />;
    if (isCover) return state === 'closed' ? <DoorClosed className="w-7 h-7 text-emerald-400" /> : <DoorOpen className="w-7 h-7 text-amber-400" />;
    if (isClimate) return <Thermometer className="w-7 h-7 text-blue-400" />;
    if (isAlarm) return <ShieldCheck className="w-7 h-7 text-emerald-400" />;
    return <Power className="w-7 h-7 text-slate-400" />;
  };

  return (
    <div
      onClick={handleToggle}
      className={`group relative min-h-[140px] p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] ${
        isOn && (isLight || isSwitch)
          ? 'bg-[#181d2a] border-amber-500/40 glow-amber'
          : isLock && isLocked
          ? 'bg-[#141d1a] border-emerald-500/40 glow-emerald'
          : 'bg-[#121620] border-slate-800/80 hover:border-slate-700/80 hover:bg-[#161b26]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${
          isOn ? 'bg-amber-500/15' : isLock && isLocked ? 'bg-emerald-500/15' : 'bg-slate-800/60'
        }`}>
          {getIcon()}
        </div>

        {/* Tactile State Toggle Pill */}
        <div className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
          isOn
            ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
            : isLock && isLocked
            ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
            : 'bg-slate-800 text-slate-300'
        }`}>
          {state}
        </div>
      </div>

      <div>
        <h4 className="text-base font-bold text-white tracking-tight line-clamp-1 group-hover:text-amber-200 transition">
          {name}
        </h4>
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
        <div className="absolute inset-0 bg-black/40 rounded-3xl backdrop-blur-[2px] flex items-center justify-center">
          <span className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};
