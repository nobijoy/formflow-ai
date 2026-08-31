export const TEAM_WORKSPACE_STORAGE_KEY = 'formflow.team.workspace';
export const TEAM_WORKSPACE_CACHE_KEY = 'formflow.team.syncCache';

/** Remote workspace API — replace with Supabase/Firebase client when live. */
export const TEAM_WORKSPACE_API = 'https://api.formflow.ai/v1/workspace';

/** Dev invite codes join a local-simulated workspace (no hosted backend required). */
export const DEV_TEAM_INVITE_CODES: Record<string, { workspaceId: string; name: string }> = {
  'FFAI-TEAM-JOIN-DEV': { workspaceId: 'ws_dev_formflow', name: 'FormFlow Dev Team' },
};

export const TEAM_WORKSPACE_JOIN_URL = 'https://formflow.ai/team/join';
export const FOUNDING_LIFETIME_CHECKOUT_URL = 'https://formflow.ai/founding-lifetime';
