import React, { useState } from 'react';
import { Camera, Maximize2, Minimize2, RefreshCw, AlertCircle } from 'lucide-react';
import { HAEntityState } from '../types';

interface CameraFeedCardProps {
  camera: HAEntityState;
  customName?: string;
}

export const CameraFeedCard: React.FC<CameraFeedCardProps> = ({ camera, customName }) => {
  const [useStream, setUseStream] = useState<boolean>(true);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(() => Date.now());

  const displayName =
    customName ||
    camera.attributes.friendly_name
      ?.replace(/%28.*?%29/g, '')
      ?.replace(/\(.*?\)/g, '')
      ?.trim() ||
    camera.entity_id;

  const streamUrl = `/api/homeassistant/camera/stream/${encodeURIComponent(camera.entity_id)}?t=${refreshKey}`;
  const snapshotUrl = `/api/homeassistant/camera/snapshot/${encodeURIComponent(camera.entity_id)}?t=${refreshKey}`;

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoadError(false);
    setRefreshKey(Date.now());
  };

  const handleToggleFeedMode = (e: React.MouseEvent) => {
    e.stopPropagation();
    setUseStream((prev) => !prev);
    setLoadError(false);
    setRefreshKey(Date.now());
  };

  return (
    <div
      className={`glass-card rounded-2xl overflow-hidden border border-white/80 transition-all duration-300 flex flex-col ${
        isExpanded ? 'col-span-full' : ''
      }`}
    >
      {/* Header bar */}
      <div className="px-4 py-3 bg-white/70 border-b border-white/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black text-slate-800 truncate" title={displayName}>
              {displayName}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{useStream ? 'Live MJPEG Stream' : 'Snapshot Preview'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleToggleFeedMode}
            className="px-2.5 py-1 rounded-xl text-[10px] font-black tracking-wider uppercase transition cursor-pointer bg-slate-100/80 hover:bg-slate-200 text-slate-600 shadow-2xs"
            title="Toggle between live video stream and snapshot preview"
          >
            {useStream ? 'Stream' : 'Still'}
          </button>
          <button
            onClick={handleRefresh}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title="Reload video feed"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Video / Snapshot Display Viewport */}
      <div className={`relative bg-slate-950 flex items-center justify-center overflow-hidden ${
        isExpanded ? 'h-96 sm:h-[480px]' : 'h-52 sm:h-64'
      }`}>
        {!loadError ? (
          <img
            key={`${refreshKey}-${useStream}`}
            src={useStream ? streamUrl : snapshotUrl}
            alt={displayName}
            className="w-full h-full object-contain select-none"
            onError={() => {
              // If stream fails, fallback to snapshot
              if (useStream) {
                setUseStream(false);
              } else {
                setLoadError(true);
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 p-6 text-center">
            <AlertCircle className="w-8 h-8 text-amber-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-300">Camera feed unavailable</p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-[10px] font-bold hover:bg-slate-700 cursor-pointer"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Live status badge overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 text-white text-[10px] font-black uppercase tracking-wider shadow-sm pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LIVE</span>
        </div>
      </div>
    </div>
  );
};
