import React, { useState } from 'react';
import { Pencil, Check, X, RotateCcw } from 'lucide-react';

interface RenameModalProps {
  isOpen: boolean;
  entityId: string;
  currentName: string;
  defaultName: string;
  onSave: (entityId: string, newName: string) => void;
  onReset: (entityId: string) => void;
  onClose: () => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  entityId,
  currentName,
  defaultName,
  onSave,
  onReset,
  onClose,
}) => {
  const [name, setName] = useState(currentName);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(entityId, name.trim());
      onClose();
    }
  };

  const handleReset = () => {
    onReset(entityId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 shadow-2xl border border-white/80 bg-white/95">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Rename Device</h3>
              <p className="text-xs font-semibold text-slate-400">Custom display name for this tablet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Device Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={defaultName}
              autoFocus
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
            <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
              <span>Original: <strong className="text-slate-600 font-semibold">{defaultName}</strong></span>
              {currentName !== defaultName && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Reset
                </button>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-sm shadow-md shadow-indigo-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> Save Name
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
