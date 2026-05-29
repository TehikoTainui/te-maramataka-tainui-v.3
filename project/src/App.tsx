import { useState, useEffect, useCallback } from 'react';
import {
  Moon, Calendar, History, Info, Settings, Star, Download,
  Share2, ChevronLeft, Menu, X, Sun, Clock, MapPin, Trash2,
  CheckCircle, StickyNote
} from 'lucide-react';
import MoonCanvas from './components/MoonCanvas';
import { calculateMoonDay } from './lunarEngine';
import {
  loadHistory, addHistoryEntry, updateHistoryEntry, deleteHistoryEntry,
  loadSettings, saveSettings, exportCSV
} from './storage';
import type { MoonDayResult, HistoryEntry, AppSettings, Screen } from './types';

const ENERGY_STYLES: Record<string, string> = {
  Low: 'bg-stone-600 text-stone-100',
  Moderate: 'bg-sky-700 text-sky-100',
  High: 'bg-amber-600 text-amber-100',
  Peak: 'bg-red-700 text-red-100',
};

const PHASE_LABEL: Record<string, string> = {
  'new': 'New Moon',
  'waxing-crescent': 'Waxing Crescent',
  'first-quarter': 'First Quarter',
  'waxing-gibbous': 'Waxing Gibbous',
  'full': 'Full Moon',
  'waning-gibbous': 'Waning Gibbous',
  'last-quarter': 'Last Quarter',
  'waning-crescent': 'Waning Crescent',
};

function getLocalOffset(): number {
  return -(new Date().getTimezoneOffset() / 60);
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatDate(e: HistoryEntry): string {
  return `${e.year}-${pad(e.month)}-${pad(e.day)} ${pad(e.hour)}:${pad(e.minute)}`;
}

export default function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [screen, setScreen] = useState<Screen>('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  // Form state — month/day/hour/minute start empty so fields are easy to type into
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>(now.getHours() >= 12 ? 'PM' : 'AM');

  // Current moon phase for live display on calculate screen (computed once on mount)
  const [currentMoonPhase] = useState(() => {
    const n = new Date();
    return calculateMoonDay(n.getFullYear(), n.getMonth() + 1, n.getDate(), n.getHours(), n.getMinutes(), getLocalOffset());
  });

  // Result state
  const [result, setResult] = useState<MoonDayResult | null>(null);
  const [resultDate, setResultDate] = useState<{ year: number; month: number; day: number; hour: number; minute: number } | null>(null);
  const [currentEntry, setCurrentEntry] = useState<HistoryEntry | null>(null);
  const [noteText, setNoteText] = useState('');
  const [editingNote, setEditingNote] = useState(false);

  // Live clock
  const [liveTime, setLiveTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setLiveTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const isDark = settings.darkMode;

  const bg = isDark ? 'bg-[#0a0f1a]' : 'bg-[#f0ebe3]';
  const surface = isDark ? 'bg-[#111827]' : 'bg-white';
  const surfaceAlt = isDark ? 'bg-[#1a2335]' : 'bg-[#f7f2eb]';
  const text = isDark ? 'text-[#f0e6d0]' : 'text-[#1a1208]';
  const textMuted = isDark ? 'text-[#8b9ab0]' : 'text-[#6b5c42]';
  const border = isDark ? 'border-[#2a3548]' : 'border-[#d4c8b8]';
  const inputBg = isDark ? 'bg-[#1e2b3d] border-[#2a3d54] text-[#e8dcc8]' : 'bg-white border-[#c8b89a] text-[#1a1208]';

  const toggleSetting = useCallback(<K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    const next = { ...settings, [key]: val };
    setSettings(next);
    saveSettings(next);
  }, [settings]);

  const utcOffset = settings.timezone === 'utc' ? 0 : getLocalOffset();

  function fillToday() {
    const n = new Date();
    setYear(n.getFullYear());
    setMonth(n.getMonth() + 1);
    setDay(n.getDate());
    setHour(n.getHours());
    setMinute(n.getMinutes());
    setAmpm(n.getHours() >= 12 ? 'PM' : 'AM');
  }

  function handleCalculate() {
    const m = month ?? now.getMonth() + 1;
    const d = day ?? now.getDate();
    const rawH = hour ?? now.getHours();
    const min = minute ?? 0;
    let h = rawH;
    if (!settings.use24Hour) {
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
    }
    const res = calculateMoonDay(year, m, d, h, min, utcOffset);
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      year, month: m, day: d,
      hour: h, minute: min,
      utcOffset,
      result: res,
      savedAt: new Date().toISOString(),
    };
    setResult(res);
    setResultDate({ year, month: m, day: d, hour: h, minute: min });
    setCurrentEntry(entry);
    setNoteText('');
    setEditingNote(false);
    const updated = addHistoryEntry(entry);
    setHistory(updated);
    setScreen('result');
  }

  function openHistoryEntry(e: HistoryEntry) {
    const res = calculateMoonDay(e.year, e.month, e.day, e.hour, e.minute, e.utcOffset);
    setResult(res);
    setResultDate({ year: e.year, month: e.month, day: e.day, hour: e.hour, minute: e.minute });
    setCurrentEntry(e);
    setNoteText(e.note ?? '');
    setScreen('result');
  }

  function navigateResult(delta: { years?: number; months?: number; days?: number }) {
    if (!resultDate) return;
    const d = new Date(resultDate.year, resultDate.month - 1, resultDate.day, resultDate.hour, resultDate.minute);
    if (delta.days) d.setDate(d.getDate() + delta.days);
    if (delta.months) d.setMonth(d.getMonth() + delta.months);
    if (delta.years) d.setFullYear(d.getFullYear() + delta.years);
    const nd = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate(), hour: d.getHours(), minute: d.getMinutes() };
    const res = calculateMoonDay(nd.year, nd.month, nd.day, nd.hour, nd.minute, utcOffset);
    setResult(res);
    setResultDate(nd);
  }

  function handleFavoriteToggle() {
    if (!currentEntry) return;
    const patch = { favorite: !currentEntry.favorite };
    const updated = updateHistoryEntry(currentEntry.id, patch);
    setHistory(updated);
    setCurrentEntry({ ...currentEntry, ...patch });
  }

  function handleSaveNote() {
    if (!currentEntry) return;
    const patch = { note: noteText };
    const updated = updateHistoryEntry(currentEntry.id, patch);
    setHistory(updated);
    setCurrentEntry({ ...currentEntry, ...patch });
    setEditingNote(false);
  }

  function handleShare() {
    if (!result) return;
    const text = `Te Maramataka o Tainui\nDay ${result.dayNumber}/30: ${result.tainuiDay.name}\nIllumination: ${result.illumination}%\n${result.tainuiDay.desc}`;
    if (navigator.share) {
      navigator.share({ title: 'Maramataka', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
    }
  }

  function navigate(s: Screen) {
    setScreen(s);
    setDrawerOpen(false);
  }

  // Recent 5 for home
  const recent = history.slice(0, 5);

  // ── Patterns SVG ──
  const KowhaiwhaiBg = () => (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="kw" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M30 0 C45 10 50 25 30 30 C10 35 15 50 30 60" stroke="#C2410C" strokeWidth="1.5" fill="none"/>
          <path d="M0 30 C10 15 25 10 30 30 C35 50 50 45 60 30" stroke="#1B4D3E" strokeWidth="1.5" fill="none"/>
          <circle cx="30" cy="30" r="3" fill="#C2410C" opacity="0.6"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#kw)"/>
    </svg>
  );

  // ── NavDrawer ──
  const NavDrawer = () => (
    <>
      {drawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
      )}
      <aside className={`fixed left-0 top-0 h-full z-50 w-72 ${isDark ? 'bg-[#0d1525]' : 'bg-[#faf6f0]'} shadow-2xl transform transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[#1B4D3E]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="text-[#C2410C]" size={24} />
              <span className={`font-bold text-lg ${text}`}>Maramataka</span>
            </div>
            <button onClick={() => setDrawerOpen(false)} className={`${textMuted} hover:${text}`}><X size={20}/></button>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          {([
            ['home', Moon, 'Home'],
            ['calculate', Calendar, 'Calculate'],
            ['history', History, 'History'],
            ['about', Info, 'About'],
            ['settings', Settings, 'Settings'],
          ] as [Screen, React.ElementType, string][]).map(([s, Icon, label]) => (
            <button key={s} onClick={() => navigate(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors
                ${screen === s ? 'bg-[#1B4D3E] text-[#F5E6D3]' : `${textMuted} hover:bg-[#1B4D3E]/20 hover:${text}`}`}>
              <Icon size={20}/><span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </aside>
    </>
  );

  // ── TopBar ──
  const TopBar = ({ title, back }: { title: string; back?: Screen }) => (
    <div className={`sticky top-0 z-30 ${isDark ? 'bg-[#0a0f1a]/95' : 'bg-[#f0ebe3]/95'} backdrop-blur border-b ${border} px-4 py-3 flex items-center gap-3`}>
      {back ? (
        <button onClick={() => setScreen(back)} className={`${textMuted} hover:${text} p-1`}><ChevronLeft size={22}/></button>
      ) : (
        <button onClick={() => setDrawerOpen(true)} className={`${textMuted} hover:${text} p-1`}><Menu size={22}/></button>
      )}
      <span className={`font-semibold text-base ${text} flex-1`}>{title}</span>
      <button onClick={() => toggleSetting('darkMode', !isDark)} className={`${textMuted} hover:${text} p-1`}>
        {isDark ? <Sun size={20}/> : <Moon size={20}/>}
      </button>
    </div>
  );

  // ══════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════

  if (screen === 'home') {
    const tz = settings.timezone === 'utc' ? 'UTC' : Intl.DateTimeFormat().resolvedOptions().timeZone;
    return (
      <div className={`min-h-screen ${bg} ${text} relative overflow-hidden`}>
        <KowhaiwhaiBg />
        <NavDrawer />
        <TopBar title="Te Maramataka o Tainui" />

        <div className="relative z-10 max-w-2xl mx-auto px-4 pb-8">
          {/* Hero */}
          <div className="text-center py-10">
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
              Te Maramataka
            </h1>
            <p className={`text-sm mt-1 ${textMuted} tracking-widest uppercase`}>Tainui Lunar Calendar</p>
            <div className="flex justify-center mt-2">
              <MoonCanvas illumination={75} phase="waxing-gibbous" size={20}/>
            </div>

            {/* Live time */}
            <div className={`mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl ${surfaceAlt} border ${border}`}>
              <Clock size={16} className="text-[#C2410C]"/>
              <span className="font-mono text-base font-semibold">
                {liveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`text-xs ${textMuted}`}>{liveTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
            <div className={`flex items-center justify-center gap-1 mt-2 text-xs ${textMuted}`}>
              <MapPin size={12}/> {tz}
            </div>

            <button onClick={() => { fillToday(); setScreen('calculate'); }}
              className="mt-6 flex items-center gap-2 mx-auto bg-[#1B4D3E] hover:bg-[#246352] text-[#F5E6D3] font-semibold px-8 py-4 rounded-2xl transition-all shadow-lg hover:shadow-[#1B4D3E]/40 hover:scale-105 active:scale-95 text-base">
              <Moon size={20}/> Calculate Today
            </button>
          </div>

          {/* Quick Calculate */}
          <button onClick={() => setScreen('calculate')}
            className={`w-full ${surfaceAlt} border ${border} rounded-2xl p-4 flex items-center gap-4 mb-6 hover:border-[#1B4D3E] transition-colors group`}>
            <div className="w-10 h-10 rounded-xl bg-[#1B4D3E]/20 flex items-center justify-center group-hover:bg-[#1B4D3E]/40 transition-colors">
              <Calendar size={18} className="text-[#1B4D3E]"/>
            </div>
            <div className="text-left">
              <p className={`font-semibold text-sm ${text}`}>Calculate Any Date</p>
              <p className={`text-xs ${textMuted}`}>Year 1000 – 3000 CE supported</p>
            </div>
            <ChevronLeft size={18} className={`${textMuted} ml-auto rotate-180`}/>
          </button>

          {/* Recent History */}
          {recent.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`font-semibold text-sm ${textMuted} uppercase tracking-wider`}>Recent Calculations</h2>
                <div className="flex items-center gap-3">
                  <button onClick={() => {
                    if (confirm('Clear all recent calculations? This cannot be undone.')) {
                      localStorage.removeItem('maramataka_history');
                      setHistory([]);
                    }
                  }} className={`text-xs ${textMuted} hover:text-red-400 flex items-center gap-1 transition-colors`}>
                    <Trash2 size={11}/> Clear all
                  </button>
                  <button onClick={() => setScreen('history')} className="text-xs text-[#C2410C] hover:underline">See all</button>
                </div>
              </div>
              <div className="space-y-2">
                {recent.map((e) => (
                  <div key={e.id} className={`${surface} border ${border} rounded-xl overflow-hidden hover:border-[#1B4D3E] transition-colors group`}>
                    <button
                      onClick={() => openHistoryEntry(e)}
                      className="w-full px-4 py-3 flex items-center gap-3 text-left">
                      <span className="text-2xl">{e.result.phaseEmoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${text} truncate`}>{e.result.tainuiDay.name}</p>
                        <p className={`text-xs ${textMuted}`}>{formatDate(e)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ENERGY_STYLES[e.result.tainuiDay.energy]}`}>
                        {e.result.tainuiDay.energy}
                      </span>
                    </button>
                    <div className={`border-t ${border} px-4 py-1.5 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <button onClick={() => {
                        const updated = deleteHistoryEntry(e.id);
                        setHistory(updated);
                      }} className={`text-xs ${textMuted} hover:text-red-400 flex items-center gap-1 transition-colors`}>
                        <Trash2 size={11}/> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (screen === 'calculate') {
    const display12 = !settings.use24Hour;
    const rawDisplayHour = hour !== null ? (display12 ? (hour % 12 === 0 ? 12 : hour % 12) : hour) : null;

    return (
      <div className={`min-h-screen ${bg} ${text} relative overflow-hidden`}>
        <KowhaiwhaiBg />
        <NavDrawer />
        <TopBar title="Calculate Lunar Day" back="home" />

        <div className="relative z-10 max-w-lg mx-auto px-4 pb-10 pt-6">
          <div className={`${surface} border ${border} rounded-2xl p-6 space-y-6`}>

            {/* Live moon phase — small */}
            <div className="flex flex-col items-center pb-2">
              <MoonCanvas illumination={currentMoonPhase.illumination} phase={currentMoonPhase.phase} size={20}/>
              <p className={`text-xs mt-1.5 ${textMuted}`}>
                {PHASE_LABEL[currentMoonPhase.phase]} · {currentMoonPhase.illumination}% illuminated
              </p>
            </div>

            {/* Date */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider ${textMuted} mb-3`}>Date</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={`text-xs ${textMuted} block mb-1`}>Year</label>
                  <input type="number" value={year} min={1000} max={3000}
                    onChange={(e) => setYear(parseInt(e.target.value) || now.getFullYear())}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] ${inputBg}`}/>
                </div>
                <div>
                  <label className={`text-xs ${textMuted} block mb-1`}>Month</label>
                  <input type="number" value={month ?? ''} min={1} max={12} placeholder="MM"
                    onChange={(e) => { const v = parseInt(e.target.value); setMonth(isNaN(v) ? null : Math.max(1, Math.min(12, v))); }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] ${inputBg}`}/>
                </div>
                <div>
                  <label className={`text-xs ${textMuted} block mb-1`}>Day</label>
                  <input type="number" value={day ?? ''} min={1} max={31} placeholder="DD"
                    onChange={(e) => { const v = parseInt(e.target.value); setDay(isNaN(v) ? null : Math.max(1, Math.min(31, v))); }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] ${inputBg}`}/>
                </div>
              </div>
            </div>

            {/* Time */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider ${textMuted} mb-3`}>Time</label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className={`text-xs ${textMuted} block mb-1`}>Hour</label>
                  <input type="number" value={rawDisplayHour ?? ''} min={display12 ? 1 : 0} max={display12 ? 12 : 23}
                    placeholder={display12 ? 'HH' : '00'}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (isNaN(v)) { setHour(null); return; }
                      if (display12) {
                        const clamped = Math.max(1, Math.min(12, v));
                        setHour(ampm === 'PM' ? (clamped === 12 ? 12 : clamped + 12) : (clamped === 12 ? 0 : clamped));
                      } else {
                        setHour(Math.max(0, Math.min(23, v)));
                      }
                    }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] ${inputBg}`}/>
                </div>
                <div className="flex-1">
                  <label className={`text-xs ${textMuted} block mb-1`}>Minute</label>
                  <input type="number" value={minute ?? ''} min={0} max={59} placeholder="00"
                    onChange={(e) => { const v = parseInt(e.target.value); setMinute(isNaN(v) ? null : Math.max(0, Math.min(59, v))); }}
                    className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] ${inputBg}`}/>
                </div>
                {display12 && (
                  <div>
                    <label className={`text-xs ${textMuted} block mb-1`}>AM/PM</label>
                    <div className="flex rounded-xl overflow-hidden border border-[#2a3548]">
                      {(['AM', 'PM'] as const).map((v) => (
                        <button key={v} onClick={() => {
                          setAmpm(v);
                          if (hour !== null) {
                            if (v === 'PM' && hour < 12) setHour(hour + 12);
                            if (v === 'AM' && hour >= 12) setHour(hour - 12);
                          }
                        }}
                          className={`px-3 py-2.5 text-sm font-semibold transition-colors ${ampm === v ? 'bg-[#1B4D3E] text-[#F5E6D3]' : `${inputBg}`}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timezone */}
            <div>
              <label className={`block text-xs font-semibold uppercase tracking-wider ${textMuted} mb-3`}>Timezone</label>
              <div className="flex gap-2">
                {(['local', 'utc'] as const).map((tz) => (
                  <button key={tz} onClick={() => toggleSetting('timezone', tz)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border
                      ${settings.timezone === tz ? 'bg-[#1B4D3E] text-[#F5E6D3] border-[#1B4D3E]' : `${inputBg} border-[#2a3548]`}`}>
                    {tz === 'local' ? `Local (UTC${utcOffset >= 0 ? '+' : ''}${utcOffset})` : 'UTC'}
                  </button>
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button onClick={fillToday}
                className={`flex-1 py-3 rounded-xl border ${border} ${textMuted} hover:${text} text-sm font-semibold transition-colors`}>
                Use Today
              </button>
              <button onClick={handleCalculate}
                className="flex-2 flex items-center justify-center gap-2 bg-[#1B4D3E] hover:bg-[#246352] text-[#F5E6D3] font-bold px-8 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-[#1B4D3E]/30 active:scale-95 text-base flex-1">
                <Moon size={18}/> Calculate
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) {
    const day = result.tainuiDay;
    const rd = resultDate;
    const rdLabel = rd
      ? new Date(rd.year, rd.month - 1, rd.day).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    return (
      <div className={`min-h-screen ${bg} ${text} relative overflow-hidden`}>
        <KowhaiwhaiBg />
        <NavDrawer />
        <TopBar title="Lunar Day Result" back="calculate" />

        <div className="relative z-10 max-w-lg mx-auto px-4 pb-10 pt-4 space-y-4">

          {/* Date navigation */}
          {rd && (
            <div className={`${surface} border ${border} rounded-2xl p-3`}>
              <p className={`text-xs text-center font-semibold ${textMuted} mb-2 uppercase tracking-wider`}>{rdLabel}</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Year', back: { years: -1 }, fwd: { years: 1 } },
                  { label: 'Month', back: { months: -1 }, fwd: { months: 1 } },
                  { label: 'Day', back: { days: -1 }, fwd: { days: 1 } },
                ].map(({ label, back, fwd }) => (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <span className={`text-xs ${textMuted}`}>{label}</span>
                    <div className="flex gap-1 w-full">
                      <button onClick={() => navigateResult(back)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold border ${border} ${surface} ${textMuted} hover:text-[#C2410C] hover:border-[#C2410C]/50 transition-colors`}>
                        ‹
                      </button>
                      <button onClick={() => navigateResult(fwd)}
                        className={`flex-1 py-1.5 rounded-lg text-sm font-bold border ${border} ${surface} ${textMuted} hover:text-[#1B4D3E] hover:border-[#1B4D3E]/50 transition-colors`}>
                        ›
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Large moon visual above the card */}
          <div className="flex flex-col items-center py-2">
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-amber-400/20 rounded-full scale-150"/>
              <MoonCanvas illumination={result.illumination} phase={result.phase} size={140}/>
            </div>
            <div className="text-center mt-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-2xl">{result.phaseEmoji}</span>
                <span className={`text-sm ${textMuted}`}>{PHASE_LABEL[result.phase]}</span>
              </div>
              <p className={`text-sm ${textMuted}`}>{result.illumination}% illuminated</p>
            </div>
          </div>

          {/* Main card */}
          <div className={`${surface} border ${border} rounded-2xl overflow-hidden`}>

            {/* Day info */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className={`text-xs ${textMuted} uppercase tracking-widest mb-1`}>Day {result.dayNumber} of 30</p>
                  <h2 className="text-3xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>{day.name}</h2>
                  <p className={`text-sm ${textMuted} mt-0.5 italic`}>{day.pronunciation}</p>
                </div>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold mt-1 ${ENERGY_STYLES[day.energy]}`}>
                  {day.energy}
                </span>
              </div>
              <p className={`text-sm ${textMuted} mt-3 leading-relaxed`}>{day.desc}</p>
            </div>
          </div>

          {/* Good / Avoid */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`${surface} border border-[#1B4D3E]/40 rounded-2xl p-4`}>
              <p className="text-xs font-semibold text-[#4ade80] uppercase tracking-wider mb-3 flex items-center gap-1">
                <CheckCircle size={13}/> Good For
              </p>
              <ul className="space-y-1.5">
                {day.goodFor.map((a) => (
                  <li key={a} className={`text-sm ${text} flex items-start gap-2`}>
                    <span className="text-[#1B4D3E] mt-0.5">•</span>{a}
                  </li>
                ))}
              </ul>
            </div>
            <div className={`${surface} border border-[#C2410C]/30 rounded-2xl p-4`}>
              <p className="text-xs font-semibold text-[#fb923c] uppercase tracking-wider mb-3 flex items-center gap-1">
                <X size={13}/> Avoid
              </p>
              <ul className="space-y-1.5">
                {day.avoidFor.map((a) => (
                  <li key={a} className={`text-sm ${text} flex items-start gap-2`}>
                    <span className="text-[#C2410C] mt-0.5">•</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Moon age detail */}
          <div className={`${surface} border ${border} rounded-2xl p-4`}>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-xs ${textMuted} uppercase tracking-wider`}>Moon Age</span>
              <span className={`text-sm font-mono ${text}`}>{result.moonAge.toFixed(2)} days</span>
            </div>
            <div className="h-2 rounded-full bg-[#1a2335] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#1B4D3E] to-[#C2410C] transition-all"
                style={{ width: `${(result.moonAge / 29.53) * 100}%` }}/>
            </div>
            <div className={`flex justify-between text-xs ${textMuted} mt-1`}>
              <span>New Moon</span><span>Full Moon</span><span>New Moon</span>
            </div>
          </div>

          {/* Notes */}
          {currentEntry && (
            <div className={`${surface} border ${border} rounded-2xl p-4`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${textMuted} flex items-center gap-1`}><StickyNote size={13}/> Note</p>
                <button onClick={() => setEditingNote(!editingNote)} className="text-xs text-[#C2410C] hover:underline">
                  {editingNote ? 'Cancel' : 'Edit'}
                </button>
              </div>
              {editingNote ? (
                <div className="space-y-2">
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} rows={3}
                    placeholder="Add a personal note..."
                    className={`w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#1B4D3E] ${inputBg}`}/>
                  <button onClick={handleSaveNote} className="w-full py-2 rounded-xl bg-[#1B4D3E] text-[#F5E6D3] text-sm font-semibold">Save Note</button>
                </div>
              ) : (
                <p className={`text-sm ${currentEntry.note ? text : textMuted} italic`}>
                  {currentEntry.note || 'No note added yet.'}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            <button onClick={handleFavoriteToggle}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-semibold transition-colors
                ${currentEntry?.favorite ? 'bg-amber-600 text-white border-amber-600' : `${surface} border-[${border}] ${textMuted} hover:border-amber-600`}`}>
              <Star size={16} fill={currentEntry?.favorite ? 'currentColor' : 'none'}/> Favourite
            </button>
            <button onClick={handleShare}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border ${border} ${surface} ${textMuted} hover:${text} text-sm font-semibold transition-colors`}>
              <Share2 size={16}/> Share
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'history') {
    const favorites = history.filter((e) => e.favorite);
    const all = history;

    return (
      <div className={`min-h-screen ${bg} ${text} relative overflow-hidden`}>
        <KowhaiwhaiBg />
        <NavDrawer />
        <TopBar title="History" back="home" />

        <div className="relative z-10 max-w-lg mx-auto px-4 pb-10 pt-4">
          <div className="flex items-center justify-between mb-4">
            <span className={`text-xs ${textMuted}`}>{all.length} calculation{all.length !== 1 ? 's' : ''}</span>
            {all.length > 0 && (
              <button onClick={() => exportCSV(all)}
                className="flex items-center gap-1.5 text-xs text-[#C2410C] hover:underline font-semibold">
                <Download size={13}/> Export CSV
              </button>
            )}
          </div>

          {favorites.length > 0 && (
            <div className="mb-5">
              <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-2 flex items-center gap-1`}><Star size={12}/> Favourites</p>
              <div className="space-y-2">
                {favorites.map((e) => <HistoryRow key={e.id} entry={e} />)}
              </div>
            </div>
          )}

          <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-2`}>All Calculations</p>
          {all.length === 0 && (
            <div className={`${surface} border ${border} rounded-2xl p-8 text-center`}>
              <Moon size={40} className={`mx-auto ${textMuted} mb-3`}/>
              <p className={textMuted}>No calculations yet.</p>
            </div>
          )}
          <div className="space-y-2">
            {all.map((e) => <HistoryRow key={e.id} entry={e} />)}
          </div>
        </div>
      </div>
    );

    function HistoryRow({ entry: e }: { entry: HistoryEntry }) {
      return (
        <div className={`${surface} border ${border} rounded-xl overflow-hidden`}>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-left"
            onClick={() => openHistoryEntry(e)}>
            <span className="text-2xl">{e.result.phaseEmoji}</span>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold text-sm ${text} truncate`}>{e.result.tainuiDay.name}</p>
              <p className={`text-xs ${textMuted}`}>{formatDate(e)}</p>
              {e.note && <p className={`text-xs ${textMuted} truncate italic mt-0.5`}>{e.note}</p>}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${ENERGY_STYLES[e.result.tainuiDay.energy]}`}>{e.result.tainuiDay.energy}</span>
              {e.favorite && <Star size={12} className="text-amber-400" fill="currentColor"/>}
            </div>
          </button>
          <div className={`border-t ${border} px-4 py-2 flex justify-end`}>
            <button onClick={() => {
              const updated = deleteHistoryEntry(e.id);
              setHistory(updated);
            }} className={`text-xs ${textMuted} hover:text-red-400 flex items-center gap-1 transition-colors`}>
              <Trash2 size={12}/> Delete
            </button>
          </div>
        </div>
      );
    }
  }

  if (screen === 'about') {
    return (
      <div className={`min-h-screen ${bg} ${text} relative overflow-hidden`}>
        <KowhaiwhaiBg />
        <NavDrawer />
        <TopBar title="About" back="home" />
        <div className="relative z-10 max-w-lg mx-auto px-4 pb-10 pt-6 space-y-4">

          <div className={`${surface} border ${border} rounded-2xl p-6`}>
            <div className="flex items-center gap-3 mb-4">
              <Moon className="text-[#C2410C]" size={28}/>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Te Maramataka o Tainui</h2>
            </div>
            <p className={`text-sm leading-relaxed ${text}`}>
              The Maramataka is the Māori lunar calendar, used by iwi across Aotearoa New Zealand for
              thousands of years to guide planting, fishing, harvesting, and ceremony. Each lunar day
              has a name and carries specific energies and guidance.
            </p>
          </div>

          <div className={`${surface} border ${border} rounded-2xl p-6 space-y-3`}>
            <h3 className="font-semibold text-[#C2410C]">Tainui Tradition</h3>
            <p className={`text-sm leading-relaxed ${textMuted}`}>
              This application follows the Tainui tradition of the Maramataka. Other iwi such as Ngāi Tahu,
              Ngāti Porou, and others may use different day names or slightly different interpretations.
              The 30-day lunar cycle is tied to the marama (moon) and reflects the relationship between
              people, the land, and the cosmos.
            </p>
          </div>

          <div className={`${surface} border ${border} rounded-2xl p-6`}>
            <h3 className="font-semibold text-[#C2410C] mb-3">Astronomical Accuracy</h3>
            <p className={`text-sm leading-relaxed ${textMuted}`}>
              Lunar phases are calculated using the Jean Meeus algorithm from <em>Astronomical Algorithms</em>
              (Chapter 47 — Phases of the Moon), providing accuracy to within a few minutes for any date
              between 1000 CE and 3000 CE. All calculations run entirely on your device.
            </p>
          </div>

          <div className={`${surface} border border-amber-700/30 rounded-2xl p-5`}>
            <h3 className="font-semibold text-amber-500 mb-2 text-sm">Disclaimer</h3>
            <p className={`text-xs leading-relaxed ${textMuted}`}>
              This app is based on publicly available Tainui Maramataka knowledge. Other iwi may have
              variations. This is an educational and planning tool — for tikanga guidance, consult your
              local kaumātua or tohunga.
            </p>
          </div>

          <div className={`${surface} border ${border} rounded-2xl p-5 text-center`}>
            <p className={`text-xs ${textMuted}`}>Built with respect for Māori astronomical knowledge.</p>
            <p className={`text-xs ${textMuted} mt-1`}>Calculations: Jean Meeus "Astronomical Algorithms"</p>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'settings') {
    return (
      <div className={`min-h-screen ${bg} ${text} relative overflow-hidden`}>
        <KowhaiwhaiBg />
        <NavDrawer />
        <TopBar title="Settings" back="home" />
        <div className="relative z-10 max-w-lg mx-auto px-4 pb-10 pt-6 space-y-4">

          <div className={`${surface} border ${border} rounded-2xl overflow-hidden divide-y ${border}`}>
            {[
              {
                label: 'Dark Mode', sub: 'Switch between dark and light theme',
                icon: isDark ? Moon : Sun,
                control: <ToggleSwitch val={isDark} onChange={(v) => toggleSetting('darkMode', v)}/>,
              },
              {
                label: '24-Hour Time', sub: 'Use 24-hour time format instead of 12-hour AM/PM',
                icon: Clock,
                control: <ToggleSwitch val={settings.use24Hour} onChange={(v) => toggleSetting('use24Hour', v)}/>,
              },
              {
                label: 'Default Timezone', sub: 'Use local device timezone or UTC',
                icon: MapPin,
                control: (
                  <div className="flex gap-1">
                    {(['local', 'utc'] as const).map((tz) => (
                      <button key={tz} onClick={() => toggleSetting('timezone', tz)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors
                          ${settings.timezone === tz ? 'bg-[#1B4D3E] text-[#F5E6D3]' : `${inputBg}`}`}>
                        {tz.toUpperCase()}
                      </button>
                    ))}
                  </div>
                ),
              },
            ].map(({ label, sub, icon: Icon, control }) => (
              <div key={label} className="flex items-center gap-4 px-5 py-4">
                <Icon size={20} className="text-[#1B4D3E] shrink-0"/>
                <div className="flex-1">
                  <p className={`text-sm font-semibold ${text}`}>{label}</p>
                  <p className={`text-xs ${textMuted} mt-0.5`}>{sub}</p>
                </div>
                {control}
              </div>
            ))}
          </div>

          <div className={`${surface} border ${border} rounded-2xl p-5`}>
            <p className={`text-xs font-semibold ${textMuted} uppercase tracking-wider mb-3`}>Data</p>
            <div className="space-y-2">
              <button onClick={() => exportCSV(history)}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border border-[#1B4D3E]/40 hover:border-[#1B4D3E] text-sm font-semibold transition-colors"
                style={{ color: '#1B4D3E' }}>
                <Download size={16}/> Export History CSV
              </button>
              <button onClick={() => {
                if (confirm('Clear all history? This cannot be undone.')) {
                  localStorage.removeItem('maramataka_history');
                  setHistory([]);
                }
              }}
                className="w-full flex items-center gap-3 py-3 px-4 rounded-xl border border-red-800/30 hover:border-red-600 text-sm font-semibold text-red-500 transition-colors">
                <Trash2 size={16}/> Clear All History
              </button>
            </div>
          </div>

          <div className={`text-center text-xs ${textMuted} pt-2`}>
            Te Maramataka o Tainui · v1.0
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ToggleSwitch({ val, onChange }: { val: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!val)} className={`relative w-12 h-6 rounded-full transition-colors ${val ? 'bg-[#1B4D3E]' : 'bg-[#2a3548]'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${val ? 'translate-x-6' : 'translate-x-0'}`}/>
    </button>
  );
}
