(() => {
  'use strict';

  const CONFIG = Object.freeze({
    endpoint: 'https://fra.cloud.appwrite.io/v1',
    projectId: '6ab7db6c002620a88131',
    databaseId: '6ab7dc680033548fdc4e',
    tableId: '6ab7dc7f0016db4b5a50'
  });
  const META_KEY = 'reset90-cloud-meta-v1';
  const ROW_VERSION = 1;

  let client = null;
  let account = null;
  let tablesDB = null;
  let currentUser = null;
  let getLocalState = () => null;
  let applyLocalState = () => {};
  let syncTimer = null;
  let syncing = false;
  let initialized = false;

  const cloudState = {
    ready: false,
    status: 'local',
    user: null,
    lastSyncAt: null,
    error: null
  };

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch { return value; }
  }

  function readMeta() {
    try { return JSON.parse(localStorage.getItem(META_KEY) || '{}'); }
    catch { return {}; }
  }

  function writeMeta(patch) {
    const next = { ...readMeta(), ...patch };
    localStorage.setItem(META_KEY, JSON.stringify(next));
    return next;
  }

  function snapshot() {
    return {
      ...cloudState,
      user: currentUser ? { id: currentUser.$id, email: currentUser.email, name: currentUser.name || '' } : null
    };
  }

  function emit() {
    window.dispatchEvent(new CustomEvent('focus-cloud-status', { detail: snapshot() }));
  }

  function setCloudStatus(status, error = null) {
    cloudState.status = status;
    cloudState.error = error ? friendlyError(error) : null;
    cloudState.user = currentUser;
    emit();
  }

  function friendlyError(error) {
    const code = Number(error?.code || 0);
    const type = String(error?.type || '');
    if (code === 401) return 'אין הרשאה לפעולה הזו ב-Appwrite';
    if (code === 409) return 'כבר קיים חשבון עם האימייל הזה';
    if (code === 429) return 'בוצעו יותר מדי ניסיונות. נסה שוב בעוד כמה דקות';
    if (type.includes('user_invalid_credentials')) return 'האימייל או הסיסמה אינם נכונים';
    if (type.includes('user_password_mismatch')) return 'האימייל או הסיסמה אינם נכונים';
    if (type.includes('user_email_already_exists')) return 'כבר קיים חשבון עם האימייל הזה';
    if (type.includes('general_argument_invalid')) return error?.message || 'אחד הפרטים שהוזנו אינו תקין';
    if (!navigator.onLine) return 'אין כרגע חיבור לאינטרנט. הנתונים נשמרו במכשיר';
    if (error instanceof TypeError && /load failed|failed to fetch|network/i.test(String(error.message||''))) return 'לא ניתן להגיע ל-Appwrite. בדוק שחסימת DNS/VPN/Content Blocker לא חוסמת את fra.cloud.appwrite.io';
    return error?.message || 'הסנכרון נכשל';
  }

  let sdkPromise = null;
  async function ensureSdk() {
    if (window.Appwrite) return initSdk();
    if (!sdkPromise) {
      sdkPromise = new Promise(resolve => {
        const existing = document.querySelector('script[data-focus-appwrite]');
        if (existing) {
          existing.addEventListener('load', () => resolve(!!window.Appwrite), { once: true });
          existing.addEventListener('error', () => resolve(false), { once: true });
          setTimeout(() => resolve(!!window.Appwrite), 8000);
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/appwrite@23.0.0';
        script.async = true;
        script.dataset.focusAppwrite = '1';
        let settled = false;
        const finish = ok => { if (!settled) { settled = true; resolve(ok); } };
        script.onload = () => finish(!!window.Appwrite);
        script.onerror = () => finish(false);
        document.head.appendChild(script);
        setTimeout(() => finish(!!window.Appwrite), 8000);
      });
    }
    try { await sdkPromise; } catch {}
    return initSdk();
  }

  function initSdk() {
    if (client) return true;
    if (!window.Appwrite) {
      cloudState.ready = false;
      setCloudStatus('local', 'Appwrite SDK לא נטען');
      return false;
    }
    client = new Appwrite.Client()
      .setEndpoint(CONFIG.endpoint)
      .setProject(CONFIG.projectId);
    account = new Appwrite.Account(client);
    tablesDB = new Appwrite.TablesDB(client);
    cloudState.ready = true;
    return true;
  }

  function itemKey(item) {
    if (!item || typeof item !== 'object') return JSON.stringify(item);
    return item.id || item.interventionId || item.date || item.localDate || JSON.stringify(item);
  }

  function mergeArray(remote = [], local = []) {
    const map = new Map();
    [...remote, ...local].forEach(item => map.set(itemKey(item), item));
    return [...map.values()].sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')));
  }

  function laterIso(a, b) {
    const ta = Date.parse(a || '') || 0;
    const tb = Date.parse(b || '') || 0;
    return ta >= tb ? a : b;
  }

  function mergeStates(localValue, remoteValue) {
    const local = clone(localValue || {});
    const remote = clone(remoteValue || {});
    const localReset = Date.parse(local.resetAt || '') || 0;
    const remoteReset = Date.parse(remote.resetAt || '') || 0;
    const newestResetSource = localReset >= remoteReset ? local : remote;

    return {
      ...remote,
      ...local,
      startDate: newestResetSource.startDate || local.startDate || remote.startDate,
      resetAt: laterIso(local.resetAt, remote.resetAt) || local.resetAt || remote.resetAt,
      best: Math.max(Number(local.best || 0), Number(remote.best || 0)),
      bestMs: Math.max(Number(local.bestMs || 0), Number(remote.bestMs || 0)),
      slips: mergeArray(remote.slips, local.slips),
      checkins: mergeArray(remote.checkins, local.checkins),
      urges: mergeArray(remote.urges, local.urges),
      interventions: mergeArray(remote.interventions, local.interventions),
      journal: mergeArray(remote.journal, local.journal),
      completedDays: { ...(remote.completedDays || {}), ...(local.completedDays || {}) },
      why: local.why || remote.why || '',
      quoteDeck: Array.isArray(local.quoteDeck) && local.quoteDeck.length ? local.quoteDeck : (remote.quoteDeck || []),
      quoteCursor: Number.isInteger(local.quoteCursor) ? local.quoteCursor : (remote.quoteCursor || 0)
    };
  }

  function rowPayload(appState) {
    return {
      userId: currentUser.$id,
      state: JSON.stringify(appState),
      updatedAt: new Date().toISOString(),
      version: ROW_VERSION
    };
  }

  function privatePermissions() {
    const role = Appwrite.Role.user(currentUser.$id);
    return [
      Appwrite.Permission.read(role),
      Appwrite.Permission.update(role),
      Appwrite.Permission.delete(role)
    ];
  }

  async function getRemoteRow() {
    try {
      return await tablesDB.getRow({
        databaseId: CONFIG.databaseId,
        tableId: CONFIG.tableId,
        rowId: currentUser.$id
      });
    } catch (error) {
      if (Number(error?.code) === 404) return null;
      throw error;
    }
  }

  async function createRemoteRow(appState) {
    return tablesDB.createRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      rowId: currentUser.$id,
      data: rowPayload(appState),
      permissions: privatePermissions()
    });
  }

  async function updateRemoteRow(appState) {
    return tablesDB.updateRow({
      databaseId: CONFIG.databaseId,
      tableId: CONFIG.tableId,
      rowId: currentUser.$id,
      data: rowPayload(appState)
    });
  }

  function parseRemoteState(row) {
    if (!row?.state) return null;
    try { return JSON.parse(row.state); }
    catch { return null; }
  }

  async function syncInitial() {
    if (!currentUser || syncing || !navigator.onLine) return;
    syncing = true;
    setCloudStatus('syncing');
    try {
      const local = clone(getLocalState() || {});
      const row = await getRemoteRow();

      if (!row) {
        await createRemoteRow(local);
      } else {
        const remote = parseRemoteState(row) || {};
        const merged = mergeStates(local, remote);
        const localJson = JSON.stringify(local);
        const mergedJson = JSON.stringify(merged);
        if (mergedJson !== localJson) applyLocalState(merged, { source: 'cloud' });
        await updateRemoteRow(merged);
      }

      const now = new Date().toISOString();
      writeMeta({ userId: currentUser.$id, lastSyncAt: now, lastCloudPullAt: now });
      cloudState.lastSyncAt = now;
      setCloudStatus('synced');
    } catch (error) {
      console.warn('[FocusCloud] initial sync failed', error);
      setCloudStatus('error', error);
    } finally {
      syncing = false;
    }
  }

  async function pushState(appState = getLocalState()) {
    if (!currentUser || syncing || !navigator.onLine || !appState) return false;
    syncing = true;
    setCloudStatus('syncing');
    try {
      const row = await getRemoteRow();
      if (row) await updateRemoteRow(clone(appState));
      else await createRemoteRow(clone(appState));

      const now = new Date().toISOString();
      writeMeta({ userId: currentUser.$id, lastSyncAt: now });
      cloudState.lastSyncAt = now;
      setCloudStatus('synced');
      return true;
    } catch (error) {
      console.warn('[FocusCloud] push failed', error);
      setCloudStatus('error', error);
      return false;
    } finally {
      syncing = false;
    }
  }

  function scheduleSync(appState) {
    writeMeta({ lastLocalChangeAt: new Date().toISOString() });
    if (!currentUser || !navigator.onLine) return;
    clearTimeout(syncTimer);
    const frozen = clone(appState);
    syncTimer = setTimeout(() => pushState(frozen), 1600);
  }

  async function refreshUser() {
    if (!(await ensureSdk())) return null;
    try {
      currentUser = await account.get();
      cloudState.user = currentUser;
      setCloudStatus('connected');
      return currentUser;
    } catch (error) {
      if (Number(error?.code) !== 401) console.warn('[FocusCloud] account check failed', error);
      currentUser = null;
      cloudState.user = null;
      setCloudStatus('local');
      return null;
    }
  }

  async function login(email, password) {
    if (!(await ensureSdk())) throw new Error('Appwrite SDK לא זמין');
    setCloudStatus('connecting');
    try {
      await account.createEmailPasswordSession({ email: String(email).trim(), password });
      await refreshUser();
      await syncInitial();
      return snapshot();
    } catch (error) {
      setCloudStatus('error', error);
      throw new Error(friendlyError(error));
    }
  }

  async function requestPasswordReset(email) {
    if (!(await ensureSdk())) throw new Error('Appwrite SDK לא זמין');
    const cleanEmail = String(email || '').trim();
    if (!cleanEmail) throw new Error('צריך להזין אימייל');
    const recoveryUrl = `${window.location.origin}${window.location.pathname}`;
    try {
      await account.createRecovery({ email: cleanEmail, url: recoveryUrl });
      return true;
    } catch (error) {
      setCloudStatus('error', error);
      throw new Error(friendlyError(error));
    }
  }

  async function completePasswordReset(userId, secret, password) {
    if (!(await ensureSdk())) throw new Error('Appwrite SDK לא זמין');
    try {
      await account.updateRecovery({ userId, secret, password });
      return true;
    } catch (error) {
      setCloudStatus('error', error);
      throw new Error(friendlyError(error));
    }
  }

  async function register(email, password, name = '') {
    if (!(await ensureSdk())) throw new Error('Appwrite SDK לא זמין');
    setCloudStatus('connecting');
    try {
      await account.create({
        userId: Appwrite.ID.unique(),
        email: String(email).trim(),
        password,
        name: String(name || '').trim()
      });
      await account.createEmailPasswordSession({ email: String(email).trim(), password });
      await refreshUser();
      await syncInitial();
      return snapshot();
    } catch (error) {
      setCloudStatus('error', error);
      throw new Error(friendlyError(error));
    }
  }

  async function logout() {
    if (!account || !currentUser) return;
    clearTimeout(syncTimer);
    if (navigator.onLine) await pushState(getLocalState());
    await account.deleteSession({ sessionId: 'current' });
    currentUser = null;
    cloudState.user = null;
    setCloudStatus('local');
  }

  async function syncNow() {
    if (!currentUser) throw new Error('צריך להתחבר לחשבון קודם');
    await syncInitial();
    return snapshot();
  }

  async function init({ getState, applyState } = {}) {
    if (initialized) return snapshot();
    initialized = true;
    if (typeof getState === 'function') getLocalState = getState;
    if (typeof applyState === 'function') applyLocalState = applyState;
    if (!(await ensureSdk())) return snapshot();

    const meta = readMeta();
    cloudState.lastSyncAt = meta.lastSyncAt || null;
    const user = await refreshUser();
    if (user) syncInitial();

    window.addEventListener('online', () => {
      if (currentUser) syncInitial();
    });

    return snapshot();
  }

  window.FocusCloud = {
    CONFIG,
    init,
    snapshot,
    login,
    register,
    requestPasswordReset,
    completePasswordReset,
    logout,
    syncNow,
    scheduleSync,
    mergeStates
  };
})();
