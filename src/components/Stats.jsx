import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { Trophy, Clock, Trash2, History, Download, FileText, Plus, ChevronRight, Maximize2 } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';

const START_DATE = new Date('2026-04-26');
const END_DATE = new Date('2026-08-01');
const TOTAL_DAYS = differenceInDays(END_DATE, START_DATE);

export default function Stats({ session }) {
  const [loading, setLoading] = useState(true);
  const [benchData, setBenchData] = useState([]);
  const [bodyData, setBodyData] = useState([]);
  const [pullupData, setPullupData] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [newMetric, setNewMetric] = useState({ 
    waist: '', belly: '', chest: '', biceps_l: '', biceps_r: '', forearm: '', thigh: '', calf: '' 
  });
  const [plateauAlert, setPlateauAlert] = useState(null);
  const [exportRange, setExportRange] = useState({ 
    start: format(START_DATE, 'yyyy-MM-dd'), 
    end: format(new Date(), 'yyyy-MM-dd') 
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    const { data: logs } = await supabase.from('exercise_logs').select('*').eq('user_id', session.user.id).order('created_at', { ascending: true });
    const { data: body } = await supabase.from('body_metrics').select('*').eq('user_id', session.user.id).order('date', { ascending: true });
    const { data: sessions } = await supabase.from('workout_sessions').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false });

    if (logs) {
      const bench = logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie (Heavy)') || l.exercise_name === 'Wyciskanie płaskie (ciężko)')
        .map(l => ({ date: format(parseISO(l.created_at), 'dd.MM'), weight: l.weight }));
      setBenchData(bench);

      const pullups = logs.filter(l => l.exercise_name.includes('Pull-upy'))
        .reduce((acc, curr) => {
          const date = format(parseISO(curr.created_at), 'dd.MM');
          acc[date] = curr.reps;
          return acc;
        }, {});
      setPullupData(Object.entries(pullups).map(([date, reps]) => ({ date, reps })));

      // Plateau Check
      const benchLogs = logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie'));
      if (benchLogs.length >= 3) {
        const last = benchLogs[benchLogs.length - 1];
        const prev = benchLogs[benchLogs.length - 2];
        if (last.weight <= prev.weight && (last.rpe >= 9)) {
          setPlateauAlert("Wykryto plateau. Zalecany DELOAD w następnym tygodniu.");
        }
      }
    }

    if (body) setBodyData(body);
    if (sessions) setRecentSessions(sessions);
    setLoading(false);
  }

  async function saveMetrics(e) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('body_metrics').upsert({
      user_id: session.user.id,
      date: today,
      ...Object.fromEntries(Object.entries(newMetric).map(([k, v]) => [k, v ? parseFloat(v) : null]))
    }, { onConflict: 'user_id,date' });

    if (error) alert(error.message);
    else {
      alert('Zapisano!');
      setNewMetric({ waist: '', belly: '', chest: '', biceps_l: '', biceps_r: '', forearm: '', thigh: '', calf: '' });
      fetchStats();
    }
  }

  async function updateSessionTime(sessionId, field, value) {
    const { error } = await supabase.from('workout_sessions').update({ [field]: value }).eq('id', sessionId);
    if (error) alert(error.message);
    else fetchStats();
  }

  async function deleteSession(id) {
    if (confirm('Usunąć sesję?')) {
      await supabase.from('workout_sessions').delete().eq('id', id);
      fetchStats();
    }
  }

  async function exportData() {
    setIsExporting(true);
    try {
      const { data: sessions } = await supabase.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', session.user.id).gte('date', exportRange.start).lte('date', exportRange.end);
      let text = `# RAPORT TRENINGOWY\n\n`;
      sessions.forEach(s => {
        text += `## ${format(parseISO(s.created_at), 'd MMMM yyyy', { locale: pl })}\n`;
        text += `Godziny: ${s.start_time ? format(parseISO(s.start_time), 'HH:mm') : '--'} - ${s.end_time ? format(parseISO(s.end_time), 'HH:mm') : '--'}\n\n`;
        s.exercise_logs.forEach(l => {
          text += `- ${l.exercise_name}: ${l.weight}kg x ${l.reps}\n`;
        });
        text += `\n---\n`;
      });
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `raport.md`;
      a.click();
    } finally { setIsExporting(false); }
  }

  if (loading) return <div className="p-8 text-center text-neutral-500 uppercase font-black">Ładowanie...</div>;

  return (
    <div className="flex-1 p-6 space-y-10 pb-24">
      <div className="text-[8px] font-black text-primary bg-primary/10 p-1 rounded text-center uppercase tracking-[0.3em]">
        WERSJA 2.0 - NOWE POMIARY & EDYCJA CZASU
      </div>
      {/* Progress Bar */}
      <section className="space-y-3">
        <div className="flex justify-between items-end">
          <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase">📅 Postęp</h2>
          <span className="text-xs font-black text-white">{Math.round((differenceInDays(new Date(), START_DATE) / TOTAL_DAYS) * 100)}%</span>
        </div>
        <div className="h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(differenceInDays(new Date(), START_DATE) / TOTAL_DAYS) * 100}%` }} />
        </div>
      </section>

      {/* Pomiary */}
      <section className="space-y-6">
        <header>
          <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Pomiary Obwodów</h2>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Wpisz centymetry</p>
        </header>

        <div className="card bg-neutral-900/50 border-neutral-800 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'waist', label: 'Talia' }, { id: 'belly', label: 'Pas (pępek)' },
              { id: 'chest', label: 'Klatka' }, { id: 'biceps_l', label: 'Biceps L' },
              { id: 'biceps_r', label: 'Biceps P' }, { id: 'forearm', label: 'Przedramię' },
              { id: 'thigh', label: 'Udo' }, { id: 'calf', label: 'Łydka' }
            ].map(m => (
              <div key={m.id}>
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1">{m.label}</label>
                <div className="relative">
                  <input type="number" step="0.1" value={newMetric[m.id]} onChange={(e) => setNewMetric({ ...newMetric, [m.id]: e.target.value })} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm font-black text-white outline-none focus:border-primary" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-700 font-black">CM</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveMetrics} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest">Zapisz Pomiary</button>
        </div>

        <div className="space-y-2">
          {[...bodyData].reverse().slice(0, 3).map((e, idx) => (
            <div key={idx} className="card p-4 border-neutral-900 bg-neutral-950/50 flex flex-col gap-2">
              <p className="text-[10px] font-black text-primary uppercase">{format(parseISO(e.date), 'd MMMM yyyy', { locale: pl })}</p>
              <div className="grid grid-cols-3 gap-2 text-[8px] font-bold text-neutral-500 uppercase">
                <span>Pas: <b className="text-white">{e.belly || e.waist}</b></span>
                <span>Klatka: <b className="text-white">{e.chest || '--'}</b></span>
                <span>Biceps: <b className="text-white">{e.biceps_r || '--'}</b></span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Historia Sesji */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Historia i Czas</h2>
        <div className="space-y-2">
          {recentSessions.slice(0, 5).map(s => (
            <div key={s.id} className="card p-4 border-neutral-900 bg-neutral-950/50 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-neutral-500 uppercase">Dzień {s.workout_day} | {format(parseISO(s.created_at), 'dd.MM')}</span>
                <button onClick={() => deleteSession(s.id)} className="text-red-900"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input type="time" value={s.start_time ? format(parseISO(s.start_time), 'HH:mm') : '00:00'} onChange={(e) => updateSessionTime(s.id, 'start_time', `${s.created_at.split('T')[0]}T${e.target.value}:00Z`)} className="bg-neutral-900 border border-neutral-800 rounded p-2 text-xs font-black text-white" />
                <input type="time" value={s.end_time ? format(parseISO(s.end_time), 'HH:mm') : '00:00'} onChange={(e) => updateSessionTime(s.id, 'end_time', `${s.created_at.split('T')[0]}T${e.target.value}:00Z`)} className="bg-neutral-900 border border-neutral-800 rounded p-2 text-xs font-black text-white" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Eksport */}
      <section className="card p-6 border-primary/20 bg-primary/5 space-y-4">
        <h3 className="text-xs font-black uppercase italic text-primary">Eksportuj Dane do AI</h3>
        <div className="grid grid-cols-2 gap-2">
          <input type="date" value={exportRange.start} onChange={e => setExportRange({...exportRange, start: e.target.value})} className="bg-neutral-900 border-neutral-800 rounded p-2 text-[10px] text-white" />
          <input type="date" value={exportRange.end} onChange={e => setExportRange({...exportRange, end: e.target.value})} className="bg-neutral-900 border-neutral-800 rounded p-2 text-[10px] text-white" />
        </div>
        <button onClick={exportData} disabled={isExporting} className="btn-primary w-full py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
          <FileText size={14} /> {isExporting ? 'Generowanie...' : 'Pobierz Raport (.md)'}
        </button>
      </section>
    </div>
  );
}
