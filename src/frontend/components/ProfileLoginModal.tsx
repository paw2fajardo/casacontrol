import React, { useState } from 'react';
import { User, Shield, Lock, ArrowRight, Delete, X } from 'lucide-react';
import { UserProfile } from '../types';

interface ProfileLoginModalProps {
  isOpen: boolean;
  users: UserProfile[];
  onLoginSuccess: (user: UserProfile) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export const ProfileLoginModal: React.FC<ProfileLoginModalProps> = ({
  isOpen,
  users,
  onLoginSuccess,
  onClose,
  canClose = false,
}) => {
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectUser = async (user: UserProfile) => {
    setError(null);
    setSelectedUser(user);
    setPin('');

    // If user has no PIN requirement, log them in immediately
    if (!user.hasPin) {
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json();
        if (data.success && data.user) {
          onLoginSuccess(data.user);
        } else {
          setError(data.error || 'Failed to switch profile');
        }
      } catch {
        setError('Connection error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePinDigit = (digit: string) => {
    if (pin.length < 6) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(null);
      // Auto-submit 4-digit PIN
      if (nextPin.length === 4 && selectedUser) {
        verifyPin(nextPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const verifyPin = async (pinToVerify = pin) => {
    if (!selectedUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, pin: pinToVerify }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        onLoginSuccess(data.user);
      } else {
        setError(data.error || 'Incorrect PIN');
        setPin('');
      }
    } catch {
      setError('Connection error');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/90 bg-white/95 flex flex-col items-center">
        {canClose && onClose && (
          <button
            onClick={onClose}
            className="self-end -mt-2 -mr-2 w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer transition mb-2"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {!selectedUser || !selectedUser.hasPin ? (
          /* Step 1: Profile Selector Screen */
          <div className="w-full flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/25 flex items-center justify-center text-white mb-4">
              <User className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight text-center">
              Who is using this tablet?
            </h2>
            <p className="text-xs font-semibold text-slate-400 text-center mt-1 mb-6">
              Select your profile to view your assigned rooms
            </p>

            <div className="w-full space-y-2.5">
              {users.map((u) => {
                const isAdmin = u.role === 'admin';
                return (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUser(u)}
                    disabled={isLoading}
                    className="w-full p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition ${
                        isAdmin
                          ? 'bg-amber-100 text-amber-700 shadow-xs'
                          : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        {isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-extrabold text-slate-800 group-hover:text-indigo-600 transition">
                          {u.name}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {isAdmin ? 'Full Household Access' : `${u.allowedGroupIds?.length || 0} Assigned Rooms`}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {u.hasPin && <Lock className="w-4 h-4 text-slate-300" />}
                      <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Step 2: PIN Entry Pad */
          <div className="w-full flex flex-col items-center">
            <button
              onClick={() => {
                setSelectedUser(null);
                setPin('');
                setError(null);
              }}
              className="self-start text-xs font-bold text-slate-400 hover:text-slate-700 mb-2 cursor-pointer"
            >
              ← Back to Profiles
            </button>

            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Lock className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-800 tracking-tight text-center">
              Enter PIN for {selectedUser.name}
            </h3>
            <p className="text-xs font-semibold text-slate-400 text-center mt-0.5 mb-4">
              {selectedUser.role === 'admin' ? 'Default admin PIN is 1234' : 'Enter 4-digit PIN'}
            </p>

            {/* PIN Dots Indicator */}
            <div className="flex items-center gap-3 mb-6">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    pin.length > idx
                      ? 'bg-indigo-600 scale-110 shadow-sm shadow-indigo-500/40'
                      : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 mb-4 animate-shake">
                {error}
              </div>
            )}

            {/* Tablet-First Touch Numpad */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handlePinDigit(digit)}
                  disabled={isLoading}
                  className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-extrabold text-xl flex items-center justify-center cursor-pointer shadow-xs transition"
                >
                  {digit}
                </button>
              ))}
              <div />
              <button
                onClick={() => handlePinDigit('0')}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-extrabold text-xl flex items-center justify-center cursor-pointer shadow-xs transition"
              >
                0
              </button>
              <button
                onClick={handlePinBackspace}
                disabled={isLoading}
                className="h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-500 flex items-center justify-center cursor-pointer shadow-xs transition"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
