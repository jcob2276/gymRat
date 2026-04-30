import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Trophy, Clock, Trash2, FileText, ChevronDown, ChevronUp, Scale, Ruler, Activity } from 'lucide-react';
import { format, differenceInDays, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';

const START_DATE = new Date('2026-04-26');
const END_DATE = new Date('2026-08-01');
const GOAL_WEIGHT = 100;

export default function Stats({ session }) {
  const [loading, setLoading] = useState(true);
  const [benchData, setBenchData] = useState([]);
  const [bodyData, setBodyData] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [showMoreMetrics, setShowMoreMetrics] = useState(false);
  const [newMetric, setNewMetric] = useState({ 
    weight: '', waist: '', belly: '', chest: '', hips: '', 
    biceps_l: '', biceps_r: '', forearm: '', thigh: '', calf: '' 
  });
  const [exportRange, setExportRange] = useState({ 
    start: format(addWeeks(new Date(), -4), 'yyyy-MM-dd'), 
    end: format(new Date(), 'yyyy-MM-dd') 
  });
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    const { data: logs } = await supabase.from('exercise_logs').select('*, workout_sessions(created_at, workout_day)').eq('user_id', session.user.id).order('created_at', { ascending: true });
    const { data: body } = await supabase.from('body_metrics').select('*').eq('user_id', session.user.id).order('date', { ascending: true });
    const { data: sessions } = await supabase.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', session.user.id).order('created_at', { ascending: false });

    if (logs) {
      // Map to weeks for chart
      const benchLogs = logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie (Heavy)'));
      const charted = benchLogs.map(l => {
        const weekNum = Math.floor(differenceInDays(parseISO(l.created_at), START_DATE) / 7) + 1;
        return { week: `T${weekNum}`, kg: l.weight };
      });
      setBenchData(charted);
    }

    if (body) setBodyData(body);
    if (sessions) {
      const formattedSessions = sessions.map(s => {
        const benchLogs = s.exercise_logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie'));
        const bestBench = benchLogs.length > 0 ? Math.max(...benchLogs.map(l => l.weight)) : null;
        const duration = s.start_time && s.end_time 
          ? Math.round((new Date(s.end_time) - new Date(s.start_time)) / 60000) 
          : '--';
        return { ...s, bestBench, duration };
      });
      setRecentSessions(formattedSessions);
    }
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
      alert('Zapisano pomiary!');
      fetchStats();
    }
  }

  async function exportData() {
    setIsExporting(true);
    try {
      const { data: sessions } = await supabase.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', session.user.id).gte('date', exportRange.start).lte('date', exportRange.end);
      let text = `# RAPORT TRENINGOWY KUBA\n\n`;
      text += `Okres: ${exportRange.start} do ${exportRange.end}\n\n`;
      sessions.forEach(s => {
        text += `## ${format(parseISO(s.created_at), 'd MMMM yyyy', { locale: pl })} - Dzień ${s.workout_day}\n`;
        s.exercise_logs.forEach(l => {
          text += `- ${l.exercise_name}: ${l.weight}kg x ${l.reps} (RPE ${l.rpe || '--'})\n`;
        });
        text += `\n---\n`;
      });
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `raport_kuba.md`; a.click();
    } finally { setIsExporting(false); }
  }

  const currentBench = benchData.length > 0 ? benchData[benchData.length - 1].kg : 0;
  const weeksPassed = Math.floor(differenceInDays(new Date(), START_DATE) / 7);
  const weeksLeft = 12 - weeksPassed;
  const kgNeeded = GOAL_WEIGHT - currentBench;
  const rateNeeded = (kgNeeded / weeksLeft).toFixed(1);

  if (loading) return <div className="p-8 text-center text-neutral-500 uppercase font-black animate-pulse tracking-widest">Wczytywanie Grande Finale...</div>;

  return (
    <div className="flex-1 p-6 space-y-12 pb-24">
      
      {/* Sekcja 1: Kluczowe Parametry */}
      <section className="space-y-6">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Parametry</h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Kluczowe metryki rekompozycji</p>
          </div>
          <Activity className="text-primary/20" size={32} />
        </header>

        <div className="card bg-neutral-900/50 border-neutral-800 p-6 space-y-8">
          <div className="grid grid-cols-2 gap-6">
            {[
              { id: 'weight', label: 'Waga (kg)', icon: Scale },
              { id: 'waist', label: 'Talia (cm)', icon: Ruler },
              { id: 'chest', label: 'Klatka (cm)', icon: Activity },
              { id: 'hips', label: 'Biodra (cm)', icon: Ruler },
            ].map(m => (
              <div key={m.id} className="space-y-1.5">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
                  <m.icon size={10} className="text-primary" /> {m.label}
                </label>
                <input 
                  type="number" step="0.1" 
                  placeholder={bodyData.length > 0 ? bodyData[bodyData.length-1][m.id] || '0.0' : '0.0'}
                  value={newMetric[m.id]} 
                  onChange={(e) => setNewMetric({...newMetric, [m.id]: e.target.value})}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-lg font-black text-white outline-none focus:border-primary transition-all" 
                />
              </div>
            ))}
          </div>

          <div className="border-t border-neutral-800 pt-4">
            <button 
              onClick={() => setShowMoreMetrics(!showMoreMetrics)}
              className="w-full flex justify-between items-center text-[10px] font-black text-neutral-500 uppercase tracking-widest hover:text-white transition-colors"
            >
              <span>{showMoreMetrics ? 'Schowaj wymiary' : 'Więcej wymiarów (Biceps, Uda...)'}</span>
              {showMoreMetrics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {showMoreMetrics && (
              <div className="grid grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2">
                {[
                  { id: 'biceps_l', label: 'Biceps L' }, { id: 'biceps_r', label: 'Biceps P' },
                  { id: 'forearm', label: 'Przedramię' }, { id: 'thigh', label: 'Udo' },
                  { id: 'calf', label: 'Łydka' }
                ].map(m => (
                  <div key={m.id} className="space-y-1">
                    <label className="text-[8px] font-black text-neutral-600 uppercase">{m.label}</label>
                    <input 
                      type="number" step="0.1" 
                      value={newMetric[m.id]} 
                      onChange={(e) => setNewMetric({...newMetric, [m.id]: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-bold text-white outline-none focus:border-primary" 
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button onClick={saveMetrics} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">Zapisz Pomiary</button>
        </div>
      </section>

      {/* Sekcja 2: Progresja Bench */}
      <section className="space-y-6">
        <header>
          <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter flex items-center gap-2">
            <Trophy className="text-primary" size={24} /> Bench Progress
          </h2>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Droga do 100 KG</p>
        </header>

        <div className="card bg-neutral-900 border-neutral-800 p-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={benchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="week" stroke="#525252" fontSize={10} fontWeight="bold" />
              <YAxis domain={[70, 105]} stroke="#525252" fontSize={10} fontWeight="bold" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                itemStyle={{ color: '#3b82f6', fontWeight: '900', fontSize: '12px' }}
              />
              <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="5 5" label={{ position: 'right', value: '100KG', fill: '#ef4444', fontSize: 10, fontWeight: '900' }} />
              <Line type="monotone" dataKey="kg" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.1em]">
            Zostało {weeksLeft} tygodni. Celuj w <span className="text-white">+{rateNeeded} kg/tydzień</span>, aby osiągnąć 100 kg.
          </p>
          {rateNeeded > 2.5 && (
             <p className="text-[8px] text-red-400 font-bold uppercase mt-1">⚠️ Tempo musi wzrosnąć! Dołóż +2,5kg w Dniu A.</p>
          )}
        </div>
      </section>

      {/* Sekcja 3: Ostatnie Treningi */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Ostatnie Sesje</h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-900/30">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-900 text-[8px] font-black text-neutral-500 uppercase tracking-widest">
                <th className="p-4">Data</th>
                <th className="p-4 text-center">Dzień</th>
                <th className="p-4 text-center">Czas</th>
                <th className="p-4 text-right text-primary">Best Bench</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-[10px] font-bold text-white">
              {recentSessions.slice(0, 5).map(s => (
                <tr key={s.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="p-4">{format(parseISO(s.created_at), 'dd.MM')}</td>
                  <td className="p-4 text-center text-neutral-400">{s.workout_day}</td>
                  <td className="p-4 text-center text-neutral-500">{s.duration} min</td>
                  <td className="p-4 text-right font-black">{s.bestBench ? `${s.bestBench} kg` : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sekcja 4: Eksport do AI */}
      <section className="card p-6 border-primary/20 bg-primary/5 space-y-6">
        <header className="flex items-center gap-3">
          <div className="p-2 bg-primary/20 rounded-lg text-primary"><FileText size={20} /></div>
          <div>
            <h3 className="text-xs font-black uppercase text-primary">Eksportuj do ChatGPT/Claude</h3>
            <p className="text-[8px] text-neutral-500 font-bold uppercase">Wszystkie serie, RPE i postępy w jednym pliku</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-neutral-600 uppercase">Od</label>
            <input type="date" value={exportRange.start} onChange={e => setExportRange({...exportRange, start: e.target.value})} className="w-full bg-neutral-950 border border-neutral-900 rounded-lg p-2 text-[10px] text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-neutral-600 uppercase">Do</label>
            <input type="date" value={exportRange.end} onChange={e => setExportRange({...exportRange, end: e.target.value})} className="w-full bg-neutral-950 border border-neutral-900 rounded-lg p-2 text-[10px] text-white" />
          </div>
        </div>

        <button 
          onClick={exportData} 
          disabled={isExporting} 
          className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          {isExporting ? 'Generowanie...' : 'Pobierz Raport .md'}
        </button>
      </section>

    </div>
  );
}
