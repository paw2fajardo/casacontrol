import React, { useState } from 'react';
import { Wind, Power, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className={`glass-card rounded-3xl overflow-hidden transition-all duration-300 ${
      isOn
        ? 'ring-2 ring-indigo-400/40 shadow-[0_20px_40px_-10px_rgba(99,102,241,0.18)]'
        : 'opacity-90'
    }`}>
      {/* Primary Unit Controller Header */}
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              isOn
                ? 'bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-500/25'
                : 'bg-slate-100 text-slate-400'
            }`}>
              <Wind className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{name}</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                  isOn ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/60' : 'bg-slate-100 text-slate-500'
                }`}>
                  {hvacMode}
                </span>
                {currentTemp && (
                  <span className="text-xs font-semibold text-slate-500">
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
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 cursor-pointer shadow-md ${
              isOn
                ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-indigo-500/30'
                : 'bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Power className="w-7 h-7" />
          </button>
        </div>

        {/* Temperature Dial Controls */}
        {isOn && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50/80 to-indigo-50/50 rounded-2xl p-4 border border-slate-200/50">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Set Point</div>
              <div className="text-3xl font-black text-slate-800 font-mono mt-0.5">
                {targetTemp ? `${targetTemp}°C` : '--'}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={(e) => handleTempAdjust(-1, e)}
                className="w-12 h-12 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-black text-xl flex items-center justify-center cursor-pointer shadow-sm border border-slate-200/80"
              >
                -
              </button>
              <button
                onClick={(e) => handleTempAdjust(1, e)}
                className="w-12 h-12 rounded-xl bg-white hover:bg-slate-50 active:scale-95 text-slate-700 font-black text-xl flex items-center justify-center cursor-pointer shadow-sm border border-slate-200/80"
              >
                +
              </button>
            </div>

            {/* Fan Mode Selector */}
            <button
              onClick={handleFanCycle}
              className="h-12 px-4 rounded-xl bg-white hover:bg-slate-50 active:scale-95 shadow-sm border border-slate-200/80 flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700"
            >
              <Wind className="w-4 h-4 text-indigo-500" />
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
            className="w-full px-6 py-3 flex items-center justify-between text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <span>{subSwitches.length} Secondary Aircon Controls</span>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4" />}
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
                        ? 'bg-indigo-50/90 border-indigo-200 text-indigo-900 shadow-sm'
                        : 'bg-white/80 border-slate-200/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="text-xs font-bold truncate pr-2">{label}</span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      swIsOn ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
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
