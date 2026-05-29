export type EnergyLevel = 'Low' | 'Moderate' | 'High' | 'Peak';

export interface MoonDay {
  name: string;
  pronunciation: string;
  energy: EnergyLevel;
  goodFor: string[];
  avoidFor: string[];
  desc: string;
}

export interface MoonDayResult {
  moonAge: number;        // 0–29.53 days
  dayNumber: number;      // 1–30
  illumination: number;   // 0–100 %
  phase: 'new' | 'waxing-crescent' | 'first-quarter' | 'waxing-gibbous' | 'full' | 'waning-gibbous' | 'last-quarter' | 'waning-crescent';
  phaseEmoji: string;
  tainuiDay: MoonDay;
}

export interface HistoryEntry {
  id: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  utcOffset: number;
  result: MoonDayResult;
  savedAt: string;
  note?: string;
  favorite?: boolean;
}

export type Screen = 'home' | 'calculate' | 'result' | 'history' | 'about' | 'settings';

export interface AppSettings {
  darkMode: boolean;
  use24Hour: boolean;
  timezone: 'local' | 'utc';
}
