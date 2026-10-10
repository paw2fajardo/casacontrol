import React, { useState } from 'react';
import { ShoppingCart, Check, Tag, Folder, Package } from 'lucide-react';
import { GroceryItem } from '../types';

interface GroceryViewProps {
  groceries: GroceryItem[];
  error: string | null;
}

// Category palette styling matching the Framer Assets glassmorphic reference
const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; glow: string; iconBg: string }> = {
  produce: {
    bg: 'from-emerald-50 to-teal-50/60',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    glow: 'rgba(16, 185, 129, 0.12)',
    iconBg: 'bg-emerald-500 text-white',
  },
  'dairy & eggs': {
    bg: 'from-amber-50 to-orange-50/60',
    text: 'text-amber-800',
    border: 'border-amber-200/80',
    glow: 'rgba(245, 158, 11, 0.12)',
    iconBg: 'bg-amber-500 text-white',
  },
  frozen: {
    bg: 'from-cyan-50 to-blue-50/60',
    text: 'text-cyan-800',
    border: 'border-cyan-200/80',
    glow: 'rgba(6, 182, 212, 0.12)',
    iconBg: 'bg-cyan-500 text-white',
  },
  pantry: {
    bg: 'from-indigo-50 to-purple-50/60',
    text: 'text-indigo-800',
    border: 'border-indigo-200/80',
    glow: 'rgba(99, 102, 241, 0.12)',
    iconBg: 'bg-indigo-500 text-white',
  },
  'household & cleaning': {
    bg: 'from-violet-50 to-fuchsia-50/60',
    text: 'text-violet-800',
    border: 'border-violet-200/80',
    glow: 'rgba(139, 92, 246, 0.12)',
    iconBg: 'bg-violet-500 text-white',
  },
  'personal care': {
    bg: 'from-rose-50 to-pink-50/60',
    text: 'text-rose-800',
    border: 'border-rose-200/80',
    glow: 'rgba(244, 63, 94, 0.12)',
    iconBg: 'bg-rose-500 text-white',
  },
  beverages: {
    bg: 'from-sky-50 to-blue-50/60',
    text: 'text-sky-800',
    border: 'border-sky-200/80',
    glow: 'rgba(14, 165, 233, 0.12)',
    iconBg: 'bg-sky-500 text-white',
  },
  other: {
    bg: 'from-slate-50 to-slate-100/60',
    text: 'text-slate-700',
    border: 'border-slate-200',
    glow: 'rgba(148, 163, 184, 0.10)',
    iconBg: 'bg-slate-500 text-white',
  },
};

export const GroceryView: React.FC<GroceryViewProps> = ({ groceries, error }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Extract all categories
  const categoriesMap: Record<string, GroceryItem[]> = {};
  groceries.forEach((item) => {
    const rawCat = (item.category || 'Other').trim();
    const cat = rawCat.toLowerCase();
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(item);
  });

  const categories = Object.keys(categoriesMap).sort();

  const filteredItems =
    selectedCategory === 'all'
      ? groceries
      : groceries.filter((i) => (i.category || 'Other').toLowerCase() === selectedCategory);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header bar with glassmorphic count pill */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            CartSync Groceries
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Household essentials synced in real-time from CartSync.
          </p>
        </div>

        <div className="px-5 py-2.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 text-indigo-600 font-extrabold text-sm shadow-sm flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          <span>{groceries.length} Items Total</span>
        </div>
      </div>

      {/* Category Folders Bar (Framer Assets inspiration) */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`h-12 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-2.5 shadow-sm border ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-indigo-500/25 scale-102 font-extrabold'
              : 'bg-white/80 hover:bg-white text-slate-600 border-white/80'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>All Items ({groceries.length})</span>
        </button>

        {categories.map((catKey) => {
          const items = categoriesMap[catKey] || [];
          const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.other;
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`h-12 px-5 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-2.5 shadow-sm border capitalize ${
                isSelected
                  ? 'bg-white text-slate-900 border-indigo-400/60 ring-2 ring-indigo-400/20 shadow-md scale-102 font-extrabold'
                  : 'bg-white/70 hover:bg-white text-slate-600 border-white/90'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${style.iconBg}`} />
              <span>{catKey}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500">
                {items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Grouped Category Display or Filtered View */}
      {selectedCategory === 'all' ? (
        <div className="space-y-8">
          {categories.map((catKey) => {
            const items = categoriesMap[catKey];
            const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.other;

            return (
              <div key={catKey} className="space-y-4">
                {/* Category Section Banner */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${style.iconBg} shadow-sm`}>
                    <Folder className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-800 capitalize tracking-tight">
                    {catKey}
                  </h3>
                  <span className="text-xs font-bold text-slate-400 bg-white/80 px-2.5 py-0.5 rounded-full border border-slate-200/80 shadow-xs">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                {/* Items in Category */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="glass-card p-4 rounded-2xl flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-7 h-7 rounded-xl bg-slate-100/90 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 transition-colors shadow-xs">
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800 tracking-tight">
                            {item.name}
                          </h4>
                        </div>
                      </div>

                      {item.quantity && (
                        <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-slate-100 to-indigo-50/50 border border-slate-200/60 font-mono font-black text-xs text-indigo-700 shadow-xs">
                          {item.quantity} {item.unit || ''}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Single Filtered Category View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="glass-card p-5 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                  <Check className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-800 tracking-tight">
                    {item.name}
                  </h4>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>

              {item.quantity && (
                <span className="px-3.5 py-1.5 rounded-xl bg-slate-100 font-mono font-black text-sm text-indigo-700">
                  {item.quantity} {item.unit || ''}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {groceries.length === 0 && !error && (
        <div className="glass-panel h-72 rounded-3xl flex flex-col items-center justify-center text-slate-500">
          <ShoppingCart className="w-12 h-12 text-indigo-400 mb-3 opacity-60" />
          <h3 className="text-lg font-extrabold text-slate-800">Your Pantry is Fully Stocked</h3>
          <p className="text-xs text-slate-400 mt-1">No items currently on the household grocery list.</p>
        </div>
      )}
    </div>
  );
};
