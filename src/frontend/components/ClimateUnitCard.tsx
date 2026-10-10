import React, { useState } from 'react';
import { Wind, Power, ChevronDown, ChevronUp } from 'lucide-react';
import { HAEntityState } from '../types';

interface ClimateUnitProps {
  climateEntity: HAEntityState;
  customName?: string;
  subSwitches: HAEntityState[];
  onAction: (entity: HAEntityState, domain: string, service: string, serviceData?: any) => void;
  onRename?: (entity: HAEntityState) => void;
  isLoading: boolean;
}

export const ClimateUnitCard: React.FC<ClimateUnitProps> = ({
  climateEntity,
  customName,
  subSwitches,
  onAction,
  onRename,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const defaultName =
    climateEntity.attributes.friendly_name
      ?.replace(/\(.*?\) Climate/i, '')
      ?.replace(/ Climate/i, '')
      ?.trim() || climateEntity.entity_id;

  const name = customName || defaultName;

  const currentTemp = climateEntity.attributes.current_temperature;
  const targetTemp = climateEntity.attributes.temperature;
  const hvacMode = climateEntity.state; // 'cool', 'off', etc.
  const fanMode = climateEntity.attributes.fan_mode || 'Auto';
  const isOn = hvacMode !== 'off';

  const handleTogglePower = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction(climateEntity, 'climate', 'set_hvac_mode', {
      hvac_mode: isOn ? 'off' : 'cool',
    });
  };

  const handleTempAdjust = (delta: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTemp = (targetTemp || 24) + delta;
    if (newTemp >= 16 && newTemp <= 30) {
      onAction(climateEntity, 'climate', 'set_temperature', {
        temperature: newTemp,
      });
    }
  };

  const handleFanCycle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const modes = climateEntity.attributes.fan_modes || ['Auto', 'Low', 'Medium', 'High'];
    const currentIndex = modes.indexOf(fanMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    onAction(climateEntity, 'climate', 'set_fan_mode', {
      fan_mode: nextMode,
    });
  };

  return (
    <div className={`glass-card rounded-2xl overflow-hidden transition-all duration-300 ${
      isOn
        ? 'ring-2 ring-indigo-400/40 shadow-[0_16px_32px_-8px_rgba(99,102,241,0.15)]'
        : 'opacity-90'
    }`}>
      {/* Primary Unit Controller Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
              isOn
                ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-sm shadow-indigo-500/20'
                : 'bg-slate-100 text-slate-400'
            }`}>
              <Wind className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">{name}</h3>
                {onRename && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(climateEntity);
                    }}
                    title="Rename aircon"
                    className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white flex items-center gap-1 cursor-pointer transition shrink-0 shadow-xs"
                  >
                    <span className="text-[10px] font-bold">✎ Rename</span>
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isOn ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'bg-slate-100 text-slate-500'
                }`}>
                  {hvacMode}
                </span>
                {currentTemp && (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Room: <strong className="text-slate-800">{currentTemp}°C</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Master Power Button */}
          <button
            onClick={handleTogglePower}
            disabled={isLoading}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-sm ${
              isOn
                ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-500/25'
                : 'bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Power className="w-5 h-5" />
          </button>
        </div>

        {/* Temperature Dial Controls */}
        {isOn && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-indigo-50/50 rounded-xl p-3 border border-slate-200/50">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Set Point</div>
              <div className="text-2xl font-black text-slate-800 font-mono mt-0.5">
                {targetTemp ? `${targetTemp}°C` : '--'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => handleTempAdjust(-1, e)}
                className="w-9 h-9 rounded-lg bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-black text-lg flex items-center justify-center cursor-pointer shadow-xs border border-slate-200/80"
              >
                -
              </button>
              <button
                onClick={(e) => handleTempAdjust(1, e)}
                className="w-9 h-9 rounded-lg bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-black text-lg flex items-center justify-center cursor-pointer shadow-xs border border-slate-200/80"
              >
                +
              </button>
            </div>

            {/* Fan Mode Selector */}
            <button
              onClick={handleFanCycle}
              className="h-9 px-3 rounded-lg bg-white hover:bg-slate-50 active:scale-95 shadow-xs border border-slate-200/80 flex items-center gap-1.5 cursor-pointer text-[11px] font-bold text-slate-700"
            >
              <Wind className="w-3.5 h-3.5 text-indigo-500" />
              <span>{fanMode}</span>
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Sub-Features */}
      {subSwitches.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/60 backdrop-blur-md">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 sm:px-5 py-2.5 flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <span>{subSwitches.length} Secondary Aircon Controls</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-indigo-500" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {isExpanded && (
            <div className="px-4 sm:px-5 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {subSwitches.map((sw) => {
                const swIsOn = sw.state === 'on';
                let label = sw.attributes.friendly_name || sw.entity_id;
                // Strip redundant brand / hardware suffixes
                label = label
                  .replace(/Master's Bedroom AC/i, '')
                  .replace(/Kuya's AC/i, '')
                  .replace(/Girls Ac/i, '')
                  .replace(/Living room aircon/i, '')
                  .replace(/\([^)]*\)/g, '')
                  .replace(/Switch/gi, '')
                  .replace(/_/g, ' ')
                  .trim();

                // Capitalize nicely
                label = label.charAt(0).toUpperCase() + label.slice(1);

                return (
                  <button
                    key={sw.entity_id}
                    onClick={() => onAction(sw, 'switch', 'toggle')}
                    className={`min-h-[46px] px-3.5 py-2.5 rounded-xl border text-left transition-all active:scale-95 cursor-pointer flex items-center justify-between gap-3 ${
                      swIsOn
                        ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950 font-semibold shadow-xs'
                        : 'bg-white/80 border-slate-200/80 text-slate-700 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-semibold leading-tight text-slate-800 break-words flex-1">
                      {label}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md shrink-0 ${
                      swIsOn ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {sw.state}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
