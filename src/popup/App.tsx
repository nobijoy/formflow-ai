import { useState } from 'react';
import type { PresetMode } from '@/shared/schema/action-ledger';

/**
 * Popup shell — Phase 1 placeholder. Wires up the four preset buttons
 * (Module 2) and a record toggle (Module 4); actual chrome.runtime message
 * dispatch to the service worker lands alongside those modules' handlers.
 */
const PRESETS: Array<{ id: PresetMode; label: string; free: boolean }> = [
  { id: 'HAPPY_PATH', label: 'Happy Path', free: true },
  { id: 'BOUNDARY_OVERFLOW', label: 'Boundary & Overflow', free: false },
  { id: 'VALIDATION_STRESS', label: 'Validation Stress', free: false },
  { id: 'SECURITY_SANITY', label: 'Security Sanity', free: false },
];

export function App() {
  const [activePreset, setActivePreset] = useState<PresetMode>('HAPPY_PATH');
  const [isRecording, setIsRecording] = useState(false);

  return (
    <div className="p-4 font-sans text-sm text-slate-900">
      <header className="mb-3 flex items-center justify-between">
        <h1 className="text-base font-semibold">FormFlow AI</h1>
        <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Free</span>
      </header>

      <div className="mb-3 grid grid-cols-2 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => setActivePreset(preset.id)}
            className={`rounded border px-2 py-2 text-left text-xs transition ${
              activePreset === preset.id
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            {preset.label}
            {!preset.free && <span className="ml-1 text-[10px] text-amber-600">PRO</span>}
          </button>
        ))}
      </div>

      <button className="mb-2 w-full rounded bg-indigo-600 py-2 font-medium text-white hover:bg-indigo-500">
        Fill Form
      </button>

      <button
        onClick={() => setIsRecording((prev) => !prev)}
        className={`w-full rounded border py-2 font-medium ${
          isRecording ? 'border-red-500 text-red-600' : 'border-slate-300 text-slate-700'
        }`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
}
