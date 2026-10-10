import React, { useState } from 'react';
import { Layers, Plus, Trash2, Check, X, CheckSquare, Square } from 'lucide-react';
import { HAEntityState, DeviceGroup } from '../types';

interface GroupModalProps {
  isOpen: boolean;
  availableEntities: HAEntityState[];
  customNames: Record<string, string>;
  groupToEdit?: DeviceGroup | null;
  onSave: (group: DeviceGroup) => void;
  onDelete?: (groupId: string) => void;
  onClose: () => void;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  availableEntities,
  customNames,
  groupToEdit,
  onSave,
  onDelete,
  onClose,
}) => {
  const [name, setName] = useState(groupToEdit ? groupToEdit.name : '');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    groupToEdit ? groupToEdit.entityIds : []
  );

  if (!isOpen) return null;

  const toggleEntity = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      id: groupToEdit ? groupToEdit.id : `group_${Date.now()}`,
      name: name.trim(),
      entityIds: selectedIds,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl glass-card rounded-3xl p-6 shadow-2xl border border-white/80 bg-white/95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {groupToEdit ? 'Edit Room / Group' : 'Create Room / Group'}
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Bundle your aircon, lights, and smart plugs into one area
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Group Name (e.g. Master Bedroom, Kuya's Room, Living Room)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Bedroom"
              autoFocus
              className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Select Devices to Include ({selectedIds.length} selected)
            </label>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 rounded-2xl border border-slate-100 p-2 bg-slate-50/50">
              {availableEntities.map((entity) => {
                const isSelected = selectedIds.includes(entity.entity_id);
                const [domain] = entity.entity_id.split('.');
                const displayName =
                  customNames[entity.entity_id] ||
                  entity.attributes.friendly_name?.replace(/\(.*?\) Climate/i, '')?.replace(/ Climate/i, '')?.trim() ||
                  entity.entity_id;

                return (
                  <div
                    key={entity.entity_id}
                    onClick={() => toggleEntity(entity.entity_id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                      isSelected
                        ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200/70 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        isSelected ? 'text-indigo-600' : 'text-slate-300'
                      }`}>
                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate text-slate-800">{displayName}</div>
                        <div className="text-[10px] text-slate-400 capitalize flex items-center gap-1.5">
                          <span>{domain}</span>
                          <span>•</span>
                          <span className="font-mono">{entity.state}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {isSelected ? 'Included' : 'Add'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            {groupToEdit && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  onDelete(groupToEdit.id);
                  onClose();
                }}
                className="h-11 px-4 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" /> Delete Group
              </button>
            ) : <div />}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs shadow-md shadow-indigo-500/25 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Save Group
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
