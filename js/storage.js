/* localStorage wrappers that never throw (private mode, blocked storage, quota). */

export function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable — keep working in memory */ }
}

export function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}
