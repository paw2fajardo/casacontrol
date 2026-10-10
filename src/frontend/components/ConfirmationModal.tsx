import React from 'react';
import { AlertTriangle, Lock, Unlock, ShieldAlert, DoorOpen } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  entityName: string;
  actionName: string;
  isHighImpact: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  entityName,
  actionName,
  isHighImpact,
  onCancel,
  onConfirm,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#141824] border-2 border-amber-500/40 rounded-3xl p-8 shadow-2xl shadow-amber-500/10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
              Security Confirmation Required
            </span>
            <h2 className="text-2xl font-bold text-white mt-1">Execute Device Action?</h2>
          </div>
        </div>

        <div className="bg-[#0c0f17] border border-slate-800 rounded-2xl p-5 mb-8">
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Target Entity</div>
          <div className="text-xl font-bold text-white mb-3">{entityName}</div>
          
          <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">Requested Action</div>
          <div className="text-lg font-semibold text-amber-300 capitalize">{actionName}</div>

          <p className="mt-3 text-xs text-slate-400 leading-relaxed border-t border-slate-800/80 pt-3">
            This action changes physical home access or security perimeter state. A second intentional tap is strictly required.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="h-16 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 active:scale-[0.98] border border-slate-700 text-slate-200 font-bold text-lg transition flex items-center justify-center cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="h-16 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-slate-950 font-extrabold text-lg transition flex items-center justify-center shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="inline-block w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              'Confirm & Execute'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
