import React, { useState, useMemo } from 'react';
import { ShoppingCart, Check, Folder, Package, ArrowUpDown, ArrowDownAZ, ArrowUpAZ, Hash } from 'lucide-react';
import { GroceryItem } from '../types';

interface GroceryViewProps {
  groceries: GroceryItem[];
  error: string | null;
}

type SortField = 'name' | 'quantity' | 'category';
type SortOrder = 'asc' | 'desc';

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  produce: {
    bg: 'from-emerald-50 to-teal-50/60',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    iconBg: 'bg-emerald-500 text-white',
  },
  'dairy & eggs': {
    bg: 'from-amber-50 to-orange-50/60',
    text: 'text-amber-800',
    border: 'border-amber-200/80',
    iconBg: 'bg-amber-500 text-white',
  },
  frozen: {
    bg: 'from-cyan-50 to-blue-50/60',
    text: 'text-cyan-800',
    border: 'border-cyan-200/80',
    iconBg: 'bg-cyan-500 text-white',
  },
  pantry: {
    bg: 'from-indigo-50 to-purple-50/60',
    text: 'text-indigo-800',
    border: 'border-indigo-200/80',
    iconBg: 'bg-indigo-500 text-white',
  },
  'household & cleaning': {
    bg: 'from-violet-50 to-fuchsia-50/60',
    text: 'text-violet-800',
    border: 'border-violet-200/80',
    iconBg: 'bg-violet-500 text-white',
  },
  'personal care': {
    bg: 'from-rose-50 to-pink-50/60',
    text: 'text-rose-800',
    border: 'border-rose-200/80',
    iconBg: 'bg-rose-500 text-white',
  },
  beverages: {
    bg: 'from-sky-50 to-blue-50/60',
    text: 'text-sky-800',
    border: 'border-sky-200/80',
    iconBg: 'bg-sky-500 text-white',
  },
  other: {
    bg: 'from-slate-50 to-slate-100/60',
    text: 'text-slate-700',
    border: 'border-slate-200',
    iconBg: 'bg-slate-500 text-white',
  },
};

export const GroceryView: React.FC<GroceryViewProps> = ({ groceries, error }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Compute unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    groceries.forEach((item) => {
      set.add((item.category || 'Other').toLowerCase());
    });
    return Array.from(set).sort();
  }, [groceries]);

  // Sort function
  const sortItems = (items: GroceryItem[]) => {
    return [...items].sort((a, b) => {
      if (sortField === 'name') {
        const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      if (sortField === 'quantity') {
        const qtyA = a.quantity || 0;
        const qtyB = b.quantity || 0;
        return sortOrder === 'asc' ? qtyA - qtyB : qtyB - qtyA;
      }
      if (sortField === 'category') {
        const catA = (a.category || 'Other').toLowerCase();
        const catB = (b.category || 'Other').toLowerCase();
        const cmp = catA.localeCompare(catB);
        return sortOrder === 'asc' ? cmp : -cmp;
      }
      return 0;
    });
  };

  // Group items by category (with sorting applied)
  const groupedData = useMemo(() => {
    const map: Record<string, GroceryItem[]> = {};
    groceries.forEach((item) => {
      const cat = (item.category || 'Other').toLowerCase();
      if (!map[cat]) map[cat] = [];
      map[cat].push(item);
    });

    // Sort items within each category
    Object.keys(map).forEach((k) => {
      map[k] = sortItems(map[k]);
    });

    return map;
  }, [groceries, sortField, sortOrder]);

  // Filtered single category list
  const filteredSortedList = useMemo(() => {
    if (selectedCategory === 'all') {
      return sortItems(groceries);
    }
    const catItems = groceries.filter(
      (i) => (i.category || 'Other').toLowerCase() === selectedCategory
    );
    return sortItems(catItems);
  }, [groceries, selectedCategory, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header bar with controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
              <ShoppingCart className="w-4 h-4" />
            </div>
            CartSync Groceries
          </h2>
          <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
            Household essentials synced in real-time from CartSync.
          </p>
        </div>

        {/* Sorting controls & item counter */}
        <div className="flex items-center gap-3">
          <div className="glass-panel px-3 py-1.5 rounded-2xl flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 pl-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" /> Sort:
            </span>

            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                sortField === 'name'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-slate-600'
              }`}
            >
              <span>Name</span>
              {sortField === 'name' && (
                sortOrder === 'asc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpAZ className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              onClick={() => toggleSort('quantity')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                sortField === 'quantity'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white/70 hover:bg-white text-slate-600'
              }`}
            >
              <span>Qty</span>
              {sortField === 'quantity' && (
                <span className="text-[10px] font-black">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </button>
          </div>

          <div className="px-5 py-2.5 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 text-indigo-600 font-extrabold text-sm shadow-sm flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>{groceries.length} Items</span>
          </div>
        </div>
      </div>

      {/* Category Folders Bar (Auto-fit, no wrapping) */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 no-scrollbar flex-nowrap">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`h-12 px-6 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-2.5 shadow-sm border shrink-0 whitespace-nowrap ${
            selectedCategory === 'all'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-transparent shadow-indigo-500/25 scale-102 font-extrabold'
              : 'bg-white/80 hover:bg-white text-slate-600 border-white/80'
          }`}
        >
          <Package className="w-4 h-4 shrink-0" />
          <span>All Items ({groceries.length})</span>
        </button>

        {categories.map((catKey) => {
          const items = groupedData[catKey] || [];
          const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.other;
          const isSelected = selectedCategory === catKey;

          return (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`h-12 px-5 rounded-2xl text-xs font-bold transition-all duration-300 cursor-pointer active:scale-95 flex items-center gap-2.5 shadow-sm border capitalize shrink-0 whitespace-nowrap min-w-max ${
                isSelected
                  ? 'bg-white text-slate-900 border-indigo-400/60 ring-2 ring-indigo-400/20 shadow-md scale-102 font-extrabold'
                  : 'bg-white/70 hover:bg-white text-slate-600 border-white/90'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${style.iconBg}`} />
              <span className="whitespace-nowrap">{catKey}</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-black text-slate-500 shrink-0">
                {items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Structured Clean Table / List View */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm">
        {selectedCategory === 'all' ? (
          /* Grouped by Category in clean rows */
          <div className="divide-y divide-slate-100">
            {categories.map((catKey) => {
              const items = groupedData[catKey] || [];
              const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES.other;

              return (
                <div key={catKey} className="p-6 space-y-3">
                  {/* Category Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${style.iconBg} shadow-xs`}>
                      <Folder className="w-4 h-4" />
                    </div>
                    <h3 className="text-base font-extrabold text-slate-800 capitalize tracking-tight">
                      {catKey}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                      {items.length} {items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {/* List Rows */}
                  <div className="divide-y divide-slate-100/80 border border-slate-100 rounded-2xl bg-white/70 overflow-hidden">
                    {items.map((item, idx) => (
                      <div
                        key={item.id}
                        className="px-5 py-3.5 flex items-center justify-between hover:bg-indigo-50/40 transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-mono font-bold text-slate-300 w-5">
                            {idx + 1}
                          </span>
                          <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-300 transition-colors">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-sm font-bold text-slate-800 tracking-tight">
                            {item.name}
                          </span>
                        </div>

                        {item.quantity && (
                          <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-full bg-slate-100/90 font-mono font-black text-xs text-indigo-700 shadow-2xs">
                              {item.quantity} {item.unit || ''}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Single Category Pure List */
          <div className="p-6">
            <div className="divide-y divide-slate-100/80 border border-slate-100 rounded-2xl bg-white/70 overflow-hidden">
              {filteredSortedList.map((item, idx) => (
                <div
                  key={item.id}
                  className="px-5 py-4 flex items-center justify-between hover:bg-indigo-50/40 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono font-bold text-slate-300 w-5">
                      {idx + 1}
                    </span>
                    <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-base font-bold text-slate-800 tracking-tight block">
                        {item.name}
                      </span>
                    </div>
                  </div>

                  {item.quantity && (
                    <span className="px-3.5 py-1.5 rounded-full bg-slate-100 font-mono font-black text-xs text-indigo-700 shadow-2xs">
                      {item.quantity} {item.unit || ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {groceries.length === 0 && !error && (
          <div className="h-72 flex flex-col items-center justify-center text-slate-500">
            <ShoppingCart className="w-12 h-12 text-indigo-400 mb-3 opacity-60" />
            <h3 className="text-lg font-extrabold text-slate-800">Your Pantry is Fully Stocked</h3>
            <p className="text-xs text-slate-400 mt-1">No items currently on the household grocery list.</p>
          </div>
        )}
      </div>
    </div>
  );
};
