import React, { useState } from 'react';
import { Users, Plus, Trash2, Shield, Check, X, Lock } from 'lucide-react';
import { UserProfile, DeviceGroup } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  users: UserProfile[];
  deviceGroups: DeviceGroup[];
  onSaveUsers: (users: UserProfile[]) => void;
  onClose: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  users,
  deviceGroups,
  onSaveUsers,
  onClose,
}) => {
  const [userList, setUserList] = useState<UserProfile[]>(users);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpdateUser = (id: string, patch: Partial<UserProfile>) => {
    setUserList((prev) =>
      prev.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  };

  const handleAddUser = () => {
    const newUser: UserProfile = {
      id: `user_${Date.now()}`,
      name: 'New Tablet Profile',
      role: 'user',
      pin: '',
      allowedGroupIds: [],
    };
    setUserList((prev) => [...prev, newUser]);
    setEditingUserId(newUser.id);
  };

  const handleDeleteUser = (id: string) => {
    setUserList((prev) => prev.filter((u) => u.id !== id));
    if (editingUserId === id) setEditingUserId(null);
  };

  const toggleGroupForUser = (userId: string, groupId: string) => {
    const target = userList.find((u) => u.id === userId);
    if (!target) return;

    const currentGroups = target.allowedGroupIds || [];
    const updatedGroups = currentGroups.includes(groupId)
      ? currentGroups.filter((g) => g !== groupId)
      : [...currentGroups, groupId];

    handleUpdateUser(userId, { allowedGroupIds: updatedGroups });
  };

  const handleSaveAndClose = () => {
    onSaveUsers(userList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl glass-card rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/90 bg-white/95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Household Users & Room Access
              </h3>
              <p className="text-xs font-semibold text-slate-400">
                Assign specific rooms to each tablet or user profile
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

        {/* User list */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {userList.map((u) => {
            const isAdmin = u.role === 'admin';
            const isEditing = editingUserId === u.id;

            return (
              <div
                key={u.id}
                className="p-4 rounded-2xl border border-slate-200/80 bg-white shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'
                    }`}>
                      {isAdmin ? <Shield className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="text"
                        value={u.name}
                        onChange={(e) => handleUpdateUser(u.id, { name: e.target.value })}
                        className="text-sm font-extrabold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full py-0.5"
                        placeholder="User Name"
                      />
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-2">
                        <span className="uppercase font-bold text-indigo-600">{u.role}</span>
                        {u.pin ? <span>• PIN Protected ({u.pin})</span> : <span>• No PIN required</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingUserId(isEditing ? null : u.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                    >
                      {isEditing ? 'Done' : 'Permissions & PIN'}
                    </button>
                    {!isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u.id)}
                        className="w-8 h-8 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Permissions & PIN Editor Drawer */}
                {isEditing && (
                  <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/70 p-3.5 rounded-xl">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          Role
                        </label>
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateUser(u.id, { role: e.target.value as 'admin' | 'user' })
                          }
                          className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="user">User (Restricted Rooms)</option>
                          <option value="admin">Admin (All Rooms & Config)</option>
                        </select>
                      </div>

                      <div className="flex-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                          PIN Code (4 digits, optional for users)
                        </label>
                        <input
                          type="password"
                          maxLength={6}
                          value={u.pin}
                          onChange={(e) => handleUpdateUser(u.id, { pin: e.target.value })}
                          placeholder="e.g. 1234"
                          className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    {!isAdmin && (
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Assigned Rooms for this Profile:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {deviceGroups.map((g) => {
                            const isAssigned = (u.allowedGroupIds || []).includes(g.id);
                            return (
                              <button
                                key={g.id}
                                type="button"
                                onClick={() => toggleGroupForUser(u.id, g.id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                                  isAssigned
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                {isAssigned && <Check className="w-3.5 h-3.5" />}
                                <span>{g.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleAddUser}
            className="h-11 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add User Profile
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs shadow-md shadow-indigo-500/25 transition cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" /> Save User Profiles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
