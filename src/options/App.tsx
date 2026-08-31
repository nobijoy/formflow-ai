/**
 * Options page shell — Phase 2/5 placeholder for BYOK key entry (FR-3.3)
 * and license management (FR-5.2). Kept as a separate extension page (not
 * the popup) since these are infrequent, deliberate configuration actions.
 */
export function App() {
  return (
    <div className="mx-auto max-w-lg p-8 font-sans text-slate-900">
      <h1 className="mb-1 text-xl font-semibold">FormFlow AI Settings</h1>
      <p className="mb-6 text-sm text-slate-500">
        BYOK provider keys, saved flows, and license management will live here.
      </p>

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">AI Provider (BYOK)</h2>
        <p className="text-xs text-slate-500">Gemini / Groq / local Ollama — Phase 2.</p>
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">License</h2>
        <p className="text-xs text-slate-500">Free tier — Phase 5 adds upgrade + license key entry.</p>
      </section>
    </div>
  );
}
