import type { HistoryEntry, AppSettings } from './types';

const HISTORY_KEY = 'maramataka_history';
const SETTINGS_KEY = 'maramataka_settings';

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveHistory(entries: HistoryEntry[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export function addHistoryEntry(entry: HistoryEntry): HistoryEntry[] {
  const history = loadHistory();
  const updated = [entry, ...history].slice(0, 50);
  saveHistory(updated);
  return updated;
}

export function updateHistoryEntry(id: string, patch: Partial<HistoryEntry>): HistoryEntry[] {
  const history = loadHistory();
  const updated = history.map((e) => (e.id === id ? { ...e, ...patch } : e));
  saveHistory(updated);
  return updated;
}

export function deleteHistoryEntry(id: string): HistoryEntry[] {
  const history = loadHistory().filter((e) => e.id !== id);
  saveHistory(history);
  return history;
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const defaults: AppSettings = {
      darkMode: true,
      use24Hour: false,
      timezone: 'local',
    };
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return { darkMode: true, use24Hour: false, timezone: 'local' };
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function exportCSV(entries: HistoryEntry[]): void {
  const header = ['Date', 'Time', 'UTC Offset', 'Day Number', 'Māori Name', 'Energy', 'Illumination %', 'Phase', 'Note'];
  const rows = entries.map((e) => [
    `${e.year}-${String(e.month).padStart(2, '0')}-${String(e.day).padStart(2, '0')}`,
    `${String(e.hour).padStart(2, '0')}:${String(e.minute).padStart(2, '0')}`,
    e.utcOffset >= 0 ? `+${e.utcOffset}` : String(e.utcOffset),
    e.result.dayNumber,
    e.result.tainuiDay.name,
    e.result.tainuiDay.energy,
    e.result.illumination,
    e.result.phase,
    e.note ?? '',
  ]);
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'maramataka_history.csv';
  a.click();
  URL.revokeObjectURL(url);
}
