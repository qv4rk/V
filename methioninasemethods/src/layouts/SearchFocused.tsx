import React, { useState } from 'react';
import { Search, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAppState } from '../store';
import { FOODS, QUICK_ADD_FOODS, searchFoods, getFoodById } from '../foods';

interface Props {
  state: ReturnType<typeof useAppState>;
}

export default function SearchFocusedLayout({ state }: Props) {
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof FOODS>([]);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (q.length > 0) {
      setSearchResults(searchFoods(q));
      setShowSearch(true);
    } else {
      setShowSearch(false);
    }
  };

  const handleAddFood = (foodId: string) => {
    const food = getFoodById(foodId);
    if (food) {
      state.addLog(food.name, food.methionine, true);
      setQuery('');
      setShowSearch(false);
    }
  };

  const todayTotal = state.getTodayTotal();
  const dailyLimit = state.settings.dailyLimit;
  const remaining = dailyLimit - todayTotal;
  const percentage = (todayTotal / dailyLimit) * 100;
  const isSafe = remaining >= 0;

  const getQuickAddFoods = () => {
    return QUICK_ADD_FOODS.buttons
      .map(id => getFoodById(id))
      .filter(Boolean) as typeof FOODS;
  };

  const todayLogs = state.getTodayLogs();

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Header - Daily Methionine Status */}
      <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Daily Methionine</h1>
            <p className="text-xs text-gray-500 mt-1">{new Date().toLocaleDateString()}</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-semibold ${isSafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isSafe ? 'SAFE' : 'OVER'}
          </div>
        </div>

        {/* Daily Total Card */}
        <div className="bg-gradient-to-r from-green-50 to-white rounded-lg p-3 border border-green-100">
          <div className="flex items-end justify-between">
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-gray-900">{Math.round(todayTotal)}</span>
              <span className="text-sm text-gray-600 mb-1">/ {dailyLimit} mg</span>
            </div>
            {isSafe ? (
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            ) : (
              <AlertCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${isSafe ? 'bg-green-500' : 'bg-red-500'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          {!isSafe && (
            <p className="text-xs text-red-600 mt-2 font-medium">
              {Math.round(Math.abs(remaining))}mg over daily limit
            </p>
          )}
        </div>
      </div>

      <div className="overflow-y-auto flex-1">
        <div className="p-4 space-y-4">
          {/* Quick Add Buttons */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Quick Add</p>
            <div className="grid grid-cols-4 gap-2">
              {getQuickAddFoods().map(food => (
                <button
                  key={food.id}
                  onClick={() => handleAddFood(food.id)}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors active:scale-95"
                >
                  <span className="text-2xl">{food.emoji}</span>
                  <span className="text-xs font-medium text-center text-gray-700 line-clamp-1">{food.name}</span>
                  <span className="text-xs text-gray-500">{food.methionine}mg</span>
                </button>
              ))}
            </div>
          </div>

          {/* Today's Journal */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Today's Intake</p>
            {todayLogs.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <p className="text-xs">No entries yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todayLogs.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{Math.round(entry.amount)}mg</p>
                      <button
                        onClick={() => state.removeLog(entry.id)}
                        className="text-gray-400 hover:text-red-600 text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search foods..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => query && setShowSearch(true)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-sm"
          />

          {/* Search results */}
          {showSearch && searchResults.length > 0 && (
            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
              {searchResults.slice(0, 8).map(food => (
                <button
                  key={food.id}
                  onClick={() => handleAddFood(food.id)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{food.emoji}</span>
                    <div>
                      <span className="font-medium text-gray-900">{food.name}</span>
                      <p className="text-xs text-gray-500">{food.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{food.methionine}mg</p>
                    {food.citation && (
                      <a
                        href={food.citation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:text-blue-700 inline-block"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {remaining >= 0
            ? `${Math.round(remaining)}mg remaining`
            : `${Math.round(Math.abs(remaining))}mg over limit`}
        </p>
      </div>
    </div>
  );
}
