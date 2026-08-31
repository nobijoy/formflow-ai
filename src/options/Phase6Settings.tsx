import { useEffect, useState } from 'react';
import type {
  FormflowBugReportSettingsResponse,
  FormflowDataPacksResponse,
  FormflowResponse,
  FormflowTeamSyncResponse,
  FormflowTeamWorkspaceResponse,
} from '@/shared/messages';
import type { BugReportSettingsPublic } from '@/shared/types/bug-report';
import type { DataPackId } from '@/shared/types/data-packs';
import type { TeamWorkspaceState } from '@/shared/types/team-workspace';
import type { Tier } from '@/shared/types/entitlements';
import { DATA_PACK_CHECKOUT_URL } from '@/shared/constants/data-packs';
import { DEV_DATA_PACK_KEYS } from '@/shared/constants/data-packs';
import { DEV_TEAM_INVITE_CODES } from '@/shared/constants/team-workspace';
import { FOUNDING_LIFETIME_CHECKOUT_URL } from '@/shared/constants/licensing';

interface Props {
  tier: Tier;
  source: string;
  onStatus: (msg: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

export function Phase6Settings({ tier, source, onStatus, loading, setLoading }: Props) {
  const [bugSettings, setBugSettings] = useState<BugReportSettingsPublic | null>(null);
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [linearTeam, setLinearTeam] = useState('');
  const [linearToken, setLinearToken] = useState('');
  const [jiraUrl, setJiraUrl] = useState('');
  const [jiraProject, setJiraProject] = useState('');
  const [jiraEmail, setJiraEmail] = useState('');
  const [jiraToken, setJiraToken] = useState('');

  const [packOwned, setPackOwned] = useState<DataPackId[]>([]);
  const [packActive, setPackActive] = useState<DataPackId[]>([]);
  const [packKey, setPackKey] = useState('');

  const [workspace, setWorkspace] = useState<TeamWorkspaceState | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [teamName, setTeamName] = useState('');
  const [sharedFlowCount, setSharedFlowCount] = useState(0);
  const [seedCount, setSeedCount] = useState(0);

  useEffect(() => {
    void loadBugSettings();
    void loadDataPacks();
    void loadTeam();
  }, []);

  async function loadBugSettings() {
    const res = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_GET_BUG_REPORT_SETTINGS',
    })) as FormflowResponse;
    if (res.ok && 'settings' in res) {
      const s = (res as FormflowBugReportSettingsResponse).settings;
      setBugSettings(s);
      setGhOwner(s.github.owner);
      setGhRepo(s.github.repo);
      setLinearTeam(s.linear.teamId);
      setJiraUrl(s.jira.baseUrl);
      setJiraProject(s.jira.projectKey);
      setJiraEmail(s.jira.email);
    }
  }

  async function loadDataPacks() {
    const res = (await chrome.runtime.sendMessage({ type: 'FORMFLOW_GET_DATA_PACKS' })) as FormflowResponse;
    if (res.ok && 'owned' in res) {
      const p = res as FormflowDataPacksResponse;
      setPackOwned(p.owned);
      setPackActive(p.active);
    }
  }

  async function loadTeam() {
    const res = (await chrome.runtime.sendMessage({ type: 'FORMFLOW_GET_TEAM_WORKSPACE' })) as FormflowResponse;
    if (res.ok && 'workspace' in res) {
      const ws = (res as FormflowTeamWorkspaceResponse).workspace;
      setWorkspace(ws);
      if (!ws) return;
    } else {
      return;
    }

    try {
      const syncRes = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_SYNC_TEAM_WORKSPACE',
      })) as FormflowResponse;
      if (syncRes.ok && 'sharedFlows' in syncRes) {
        const sync = syncRes as FormflowTeamSyncResponse;
        setSharedFlowCount(sync.sharedFlows.length);
        setSeedCount(sync.seedProfiles.length);
      }
    } catch {
      /* not joined */
    }
  }

  async function saveBugSettings() {
    setLoading(true);
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_SAVE_BUG_REPORT_SETTINGS',
        github: { owner: ghOwner, repo: ghRepo, token: ghToken || undefined },
        linear: { teamId: linearTeam, token: linearToken || undefined },
        jira: {
          baseUrl: jiraUrl,
          projectKey: jiraProject,
          email: jiraEmail,
          token: jiraToken || undefined,
        },
      })) as FormflowResponse;
      if (!res.ok) throw new Error('error' in res ? res.error : 'Save failed.');
      setGhToken('');
      setLinearToken('');
      setJiraToken('');
      await loadBugSettings();
      onStatus('Bug report integrations saved.');
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setLoading(false);
    }
  }

  async function activatePack() {
    if (!packKey.trim()) return;
    setLoading(true);
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_ACTIVATE_DATA_PACK',
        key: packKey.trim(),
      })) as FormflowResponse;
      if (!res.ok) throw new Error('error' in res ? res.error : 'Activation failed.');
      const p = res as FormflowDataPacksResponse;
      setPackOwned(p.owned);
      setPackActive(p.active);
      setPackKey('');
      onStatus('Data pack activated.');
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Activation failed.');
    } finally {
      setLoading(false);
    }
  }

  async function togglePack(id: DataPackId) {
    const next = packActive.includes(id) ? packActive.filter((p) => p !== id) : [...packActive, id];
    const res = (await chrome.runtime.sendMessage({
      type: 'FORMFLOW_SET_ACTIVE_DATA_PACKS',
      packIds: next,
    })) as FormflowResponse;
    if (res.ok && 'active' in res) {
      setPackActive((res as FormflowDataPacksResponse).active);
    }
  }

  async function joinTeam() {
    setLoading(true);
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_JOIN_TEAM_WORKSPACE',
        inviteCode,
      })) as FormflowResponse;
      if (!res.ok) throw new Error('error' in res ? res.error : 'Join failed.');
      setWorkspace((res as FormflowTeamWorkspaceResponse).workspace);
      await loadTeam();
      onStatus('Joined team workspace.');
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Join failed.');
    } finally {
      setLoading(false);
    }
  }

  async function createTeam() {
    setLoading(true);
    try {
      const res = (await chrome.runtime.sendMessage({
        type: 'FORMFLOW_CREATE_TEAM_WORKSPACE',
        name: teamName,
      })) as FormflowResponse;
      if (!res.ok) throw new Error('error' in res ? res.error : 'Create failed.');
      setWorkspace((res as FormflowTeamWorkspaceResponse).workspace);
      onStatus('Team workspace created.');
    } catch (err) {
      onStatus(err instanceof Error ? err.message : 'Create failed.');
    } finally {
      setLoading(false);
    }
  }

  const isPro = tier === 'PRO' || tier === 'TEAM';
  const isTeam = tier === 'TEAM';

  return (
    <>
      {source === 'founding_lifetime' && (
        <section className="mb-6 rounded border border-amber-300 bg-amber-50 p-4">
          <h2 className="mb-1 text-sm font-medium text-amber-950">Founding Lifetime Pro</h2>
          <p className="text-xs text-amber-900">
            You have a lifetime Pro entitlement (distinct from subscriptions for cohort tracking).
          </p>
        </section>
      )}

      {source !== 'founding_lifetime' && (
        <section className="mb-6 rounded border border-slate-200 p-4">
          <h2 className="mb-2 text-sm font-medium">Founding Lifetime Offer (FR-5.6)</h2>
          <p className="mb-2 text-xs text-slate-500">Limited one-time Pro license — tracked separately from subscriptions.</p>
          <button
            type="button"
            onClick={() => chrome.tabs.create({ url: FOUNDING_LIFETIME_CHECKOUT_URL })}
            className="rounded border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
          >
            View founding offer
          </button>
        </section>
      )}

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">Bug report integrations {isPro ? '' : '(Pro)'}</h2>
        <p className="mb-3 text-xs text-slate-500">PATs encrypted locally. Creates real issues via API.</p>
        <div className="mb-3 space-y-2 text-xs">
          <p className="font-medium text-slate-700">GitHub</p>
          <input value={ghOwner} onChange={(e) => setGhOwner(e.target.value)} placeholder="owner" className="mb-1 w-full rounded border px-2 py-1" />
          <input value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} placeholder="repo" className="mb-1 w-full rounded border px-2 py-1" />
          <input type="password" value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder={bugSettings?.github.hasToken ? 'PAT (keep blank to retain)' : 'PAT'} className="w-full rounded border px-2 py-1" />
          <p className="mt-2 font-medium text-slate-700">Linear</p>
          <input value={linearTeam} onChange={(e) => setLinearTeam(e.target.value)} placeholder="team UUID" className="mb-1 w-full rounded border px-2 py-1" />
          <input type="password" value={linearToken} onChange={(e) => setLinearToken(e.target.value)} placeholder="API key" className="w-full rounded border px-2 py-1" />
          <p className="mt-2 font-medium text-slate-700">Jira Cloud</p>
          <input value={jiraUrl} onChange={(e) => setJiraUrl(e.target.value)} placeholder="https://yours.atlassian.net" className="mb-1 w-full rounded border px-2 py-1" />
          <input value={jiraProject} onChange={(e) => setJiraProject(e.target.value)} placeholder="project key" className="mb-1 w-full rounded border px-2 py-1" />
          <input value={jiraEmail} onChange={(e) => setJiraEmail(e.target.value)} placeholder="email" className="mb-1 w-full rounded border px-2 py-1" />
          <input type="password" value={jiraToken} onChange={(e) => setJiraToken(e.target.value)} placeholder="API token" className="w-full rounded border px-2 py-1" />
        </div>
        <button type="button" disabled={loading || !isPro} onClick={() => void saveBugSettings()} className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">
          Save integrations
        </button>
      </section>

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">Vertical data packs (add-on)</h2>
        <p className="mb-2 text-xs text-slate-500">Layer industry heuristics on Happy-Path fill.</p>
        <div className="mb-2 flex gap-2">
          <input value={packKey} onChange={(e) => setPackKey(e.target.value)} placeholder="Pack activation key" className="min-w-0 flex-1 rounded border px-2 py-1 text-xs font-mono" />
          <button type="button" disabled={loading} onClick={() => void activatePack()} className="rounded border px-2 py-1 text-xs">Activate</button>
        </div>
        <details className="mb-2 text-[11px] text-slate-500">
          <summary className="cursor-pointer">Dev pack keys</summary>
          <ul className="mt-1 list-inside list-disc">{Object.keys(DEV_DATA_PACK_KEYS).map((k) => <li key={k}><code>{k}</code></li>)}</ul>
        </details>
        <ul className="space-y-1 text-xs">
          {(['fintech', 'healthcare', 'ecommerce'] as DataPackId[]).map((id) => (
            <li key={id} className="flex items-center gap-2">
              <input type="checkbox" checked={packActive.includes(id)} disabled={!packOwned.includes(id)} onChange={() => void togglePack(id)} />
              <span className={packOwned.includes(id) ? '' : 'text-slate-400'}>{id}{packOwned.includes(id) ? '' : ' (locked)'}</span>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => chrome.tabs.create({ url: DATA_PACK_CHECKOUT_URL })} className="mt-2 text-xs text-indigo-600 underline">
          Browse data packs
        </button>
      </section>

      <section className="mb-6 rounded border border-slate-200 p-4">
        <h2 className="mb-2 text-sm font-medium">Team workspace {isTeam ? '' : '(Team)'}</h2>
        {workspace ? (
          <div className="mb-2 text-xs text-slate-600">
            <p><strong>{workspace.name}</strong> · invite: <code>{workspace.inviteCode}</code></p>
            <p>{sharedFlowCount} shared flows · {seedCount} seed profiles</p>
            <button type="button" className="mt-1 text-red-600 underline" onClick={() => void chrome.runtime.sendMessage({ type: 'FORMFLOW_LEAVE_TEAM_WORKSPACE' }).then(() => setWorkspace(null))}>
              Leave workspace
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <input value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} placeholder="Invite code" className="w-full rounded border px-2 py-1 font-mono" />
            <button type="button" disabled={loading || !isTeam} onClick={() => void joinTeam()} className="rounded border px-2 py-1">Join</button>
            <p className="text-slate-500">Dev invite: <code>{Object.keys(DEV_TEAM_INVITE_CODES)[0]}</code></p>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="New workspace name" className="w-full rounded border px-2 py-1" />
            <button type="button" disabled={loading || !isTeam} onClick={() => void createTeam()} className="rounded border px-2 py-1">Create workspace</button>
          </div>
        )}
      </section>
    </>
  );
}
