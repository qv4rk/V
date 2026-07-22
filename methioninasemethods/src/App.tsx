/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Low-Methionine Meal Planner
 * Tracks daily methionine intake with verified nutritional data
 */

import { useState } from 'react';
import { LayoutMode } from './types';
import SearchFocusedLayout from './layouts/SearchFocused';
import { useAppState } from './store';
import { Settings } from 'lucide-react';

export default function App() {
  const [layout, setLayout] = useState<LayoutMode>('search-focused');
  const [showSettings, setShowSettings] = useState(false);

  const state = useAppState();

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="relative font-sans antialiased text-gray-900 w-full max-w-md mx-auto shadow-2xl overflow-hidden bg-white min-h-[800px] h-[90vh] sm:rounded-[2.5rem] border-4 border-gray-800 flex flex-col">
        {/* Dev-only Layout Switcher & Settings */}
        <div className="absolute top-2 right-2 z-50 p-2 opacity-50 hover:opacity-100 transition-opacity bg-white/80 rounded-lg backdrop-blur-sm flex items-center gap-2">
          <select
            id="layout-switcher"
            value={layout}
            onChange={(e) => setLayout(e.target.value as LayoutMode)}
            className="text-xs bg-gray-900 text-white p-2 rounded-md outline-none cursor-pointer border-none shadow-sm font-medium"
          >
            <option value="search-focused">Search Focused</option>
          </select>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-gray-200 p-2 rounded-md hover:bg-gray-300 transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4 text-gray-700" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <SearchFocusedLayout state={state} />
        </div>
      </div>
    </div>
  );
}
