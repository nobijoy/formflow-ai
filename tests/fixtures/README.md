# Fixture Matrix (PROJECT.md Section 10.1)

One small, fixed set of test pages, reused across every phase's exit
criteria so a framework-specific regression is caught immediately instead
of only when that feature is later touched.

| Fixture | Purpose |
| --- | --- |
| `vanilla-html/` | Plain `<input>`/`<form>` — no framework, baseline behavior. |
| `react-controlled/` | Controlled inputs backed by React state — tests native setter interception (FR-1.1). |
| `vue-controlled/` | Vue `v-model` controlled inputs. |
| `angular-controlled/` | Angular reactive-forms controlled inputs. |
| `svelte-controlled/` | Svelte bound inputs. |
| `shadow-dom-open/` | Web component with an **open** shadow root — must be reachable (FR-1.3). |
| `shadow-dom-closed/` | Web component with a **closed** shadow root — must surface the "not reachable" indicator, not fail silently (FR-1.3 known limitation). |

Each fixture should be a minimal, standalone static page (or a tiny dev
server) — just enough markup to exercise the behavior in its "Purpose"
column, not a realistic app. Run every phase's exit criteria (see
`docs/roadmap.md`) against this same matrix before shipping that phase, and
re-run *previous* phases' criteria too (regression re-check, not just
new-feature check).

## Local testing

Content scripts only run on `http(s)://` pages — not `file://`. Serve fixtures with:

```bash
npm run fixtures
```

Then open e.g. `http://localhost:3333/react-controlled/`, load the unpacked
extension from `dist/`, and click **Fill Form** in the popup.
