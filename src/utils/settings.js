const KEY = 'cg_settings'

export function getSettings() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {} }
}

export function saveSettings(patch) {
  const current = getSettings()
  localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }))
}
