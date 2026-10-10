import React, { useState } from 'react';
import { Wind, Power, Thermometer, ChevronDown, ChevronUp, Sun, Moon, Sparkles } from 'lucide-react';
import { HAEntityState } from '../types';

interface ClimateUnitProps {
  climateEntity: HAEntityState;
  subSwitches: HAEntityState[];
  onAction: (entity: HAEntityState, domain: string, service: string, serviceData?: any) => void;
  isLoading: boolean;
}

export const ClimateUnitCard: React.FC<ClimateUnitProps> = ({
  climateEntity,
  subSwitches,
  onAction,
  isLoading,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const name =
    climateEntity.attributes.friendly_name
      ?.replace(/\(.*?\) Climate/i, '')
      ?.replace(/ Climate/i, '')
      ?.trim() || climateEntity.entity_id;

  const currentTemp = climateEntity.attributes.current_temperature;
  const targetTemp = climateEntity.attributes.temperature;
  const hvacMode = climateEntity.state; // 'cool', 'off', 'auto', etc.
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
    <div className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
      isOn
        ? 'bg-[#121927] border-blue-500/40 shadow-xl shadow-blue-500/10'
        : 'bg-[#10141d] border-slate-800/80 hover:border-slate-700'
    }`}>
      {/* Primary Unit Controller Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition ${
              isOn ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800/70 text-slate-500'
            }`}>
              <Wind className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white tracking-tight">{name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md ${
                  isOn ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400'
                }`}>
                  {hvacMode}
                </span>
                {currentTemp && (
                  <span className="text-xs font-semibold text-slate-400">
                    Room: <strong className="text-slate-200">{currentTemp}°C</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Master Power Button */}
          <button
            onClick={handleTogglePower}
            disabled={isLoading}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition active:scale-90 cursor-pointer shadow-lg ${
              isOn
                ? 'bg-blue-500 text-slate-950 font-black shadow-blue-500/30'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Power className="w-7 h-7" />
          </button>
        </div>

        {/* Temperature Dial Controls (Visible when active) */}
        {isOn && (
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex items-center justify-between bg-[#0a0e17]/60 rounded-2xl p-4">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Set Point</div>
              <div className="text-3xl font-extrabold text-white font-mono mt-0.5">
                {targetTemp ? `${targetTemp}°C` : '--'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => handleTempAdjust(-1, e)}
                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xl flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <button
                onClick={(e) => handleTempAdjust(1, e)}
                className="w-12 h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-black text-xl flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Fan Mode Selector */}
            <button
              onClick={handleFanCycle}
              className="h-12 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300"
            >
              <Wind className="w-4 h-4 text-blue-400" />
              <span>{fanMode}</span>
            </button>
          </div>
        )}
      </div>

      {/* Collapsible Sub-Features (Eco, Beep, Display Light, Health, Dry) */}
      {subSwitches.length > 0 && (
        <div className="border-t border-slate-800/80 bg-[#0c1018]/90">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <span>{subSwitches.length} Secondary Aircon Controls</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {isExpanded && (
            <div className="px-6 pb-6 pt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
              {subSwitches.map((sw) => {
                const swIsOn = sw.state === 'on';
                const label = sw.attributes.friendly_name
                  ?.replace(/Master's Bedroom AC/i, '')
                  ?.replace(/Kuya's AC/i, '')
                  ?.replace(/Girls Ac/i, '')
                  ?.replace(/\(.*?\) /i, '')
                  ?.replace(/Switch/i, '')
                  ?.trim() || sw.entity_id;

                return (
                  <button
                    key={sw.entity_id}
                    onClick={() => onAction(sw, 'switch', 'toggle')}
                    className={`p-3 rounded-xl border text-left transition active:scale-95 cursor-pointer flex items-center justify-between ${
                      swIsOn
                        ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                        : 'bg-slate-800/50 border-slate-700/40 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xs font-bold truncate pr-2">{label}</span>
                    <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                      swIsOn ? 'bg-blue-500 text-slate-950' : 'bg-slate-700 text-slate-300'
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
