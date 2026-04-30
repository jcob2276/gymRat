import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Trophy, Clock, Trash2, FileText, ChevronDown, ChevronUp, Scale, Ruler, Activity, Zap, TrendingUp, Target, Battery } from 'lucide-react';
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
    weight: '', waist: ''
  });
  const [ouraTrend, setOuraTrend] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({ currentVolume: 0, prevVolume: 0, compliance: 0 });
  const [correlation, setCorrelation] = useState(null);
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
    const { data: logs } = await supabase.from('exercise_logs').select('*, workout_sessions(created_at, workout_day, msp_passed)').eq('user_id', session.user.id).order('created_at', { ascending: true });
    const { data: body } = await supabase.from('body_metrics').select('*').eq('user_id', session.user.id).order('date', { ascending: true });
    const { data: sessions } = await supabase.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', session.user.id).order('created_at', { ascending: false });
    const { data: oura } = await supabase.from('oura_daily_summary').select('*').eq('user_id', session.user.id).order('date', { ascending: false }).limit(21);
    
    // Safely fetch settings - handle potential 400/missing record
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('height')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (logs) {
      // Fix Bench Progress: Group by week and take MAX weight
      const benchLogs = logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie (Heavy)'));
      const weeklyGroups = {};
      benchLogs.forEach(l => {
        const weekNum = Math.floor(differenceInDays(parseISO(l.created_at), START_DATE) / 7) + 1;
        const weekKey = `T${weekNum}`;
        if (!weeklyGroups[weekKey] || l.weight > weeklyGroups[weekKey].kg) {
          weeklyGroups[weekKey] = { 
            week: weekKey, 
            kg: l.weight,
            msp: l.workout_sessions?.msp_passed 
          };
        }
      });
      setBenchData(Object.values(weeklyGroups));

      // Calculate Volume
      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const lastWeekStart = addWeeks(thisWeekStart, -1);

      const thisWeekLogs = logs.filter(l => parseISO(l.created_at) >= thisWeekStart);
      const lastWeekLogs = logs.filter(l => parseISO(l.created_at) >= lastWeekStart && parseISO(l.created_at) < thisWeekStart);

      const thisWeekSessions = sessions?.filter(s => parseISO(s.created_at) >= thisWeekStart).length || 0;
      
      setWeeklyStats({ compliance: thisWeekSessions });
    }

    if (body) {
      setBodyData(body);
      if (body.length > 0) {
        const last = body[body.length - 1];
        setNewMetric(prev => ({ ...prev, height: settings?.height || '' }));
      }
    }
    
    if (oura) {
      setOuraTrend(oura.reverse().map(o => ({
        date: format(parseISO(o.date), 'dd.MM'),
        readiness: o.readiness_score,
        sleep: o.total_sleep_hours,
        rawDate: o.date
      })));

      // Correlation Analysis
      if (logs && oura.length > 0) {
        const benchHeavy = logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie (Heavy)'));
        const lowReadinessDays = oura.filter(o => o.readiness_score < 70);
        
        let badDaysPerf = 0;
        let count = 0;

        benchHeavy.forEach(l => {
          const logDate = format(parseISO(l.created_at), 'yyyy-MM-dd');
          const readinessOnDay = oura.find(o => o.date === logDate);
          if (readinessOnDay && readinessOnDay.readiness_score < 70) {
            badDaysPerf += l.weight;
            count++;
          }
        });

        if (count > 0) {
          const avgBad = badDaysPerf / count;
          const avgOverall = benchHeavy.reduce((acc, l) => acc + l.weight, 0) / benchHeavy.length;
          const diff = avgOverall - avgBad;
          setCorrelation({
            avgBad: avgBad.toFixed(1),
            avgOverall: avgOverall.toFixed(1),
            diff: diff.toFixed(1),
            count
          });
        }
      }
    }

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
      weight: newMetric.weight ? parseFloat(newMetric.weight) : null,
      waist: newMetric.waist ? parseFloat(newMetric.waist) : null
    }, { onConflict: 'user_id,date' });

    if (error) alert(error.message);
    else {
      alert('Zapisano pomiary!');
      fetchStats();
    }
  }

  async function deleteSession(id) {
    if (!confirm('Czy na pewno chcesz usunąć ten trening?')) return;
    const { error } = await supabase.from('workout_sessions').delete().eq('id', id);
    if (error) alert(error.message);
    else fetchStats();
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

        <div className="card bg-neutral-900/50 border-neutral-800 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {[
              { id: 'weight', label: 'Waga (kg)', icon: Scale },
              { id: 'waist', label: 'Talia (cm)', icon: Ruler },
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

          <button onClick={saveMetrics} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-primary/20">Zapisz Pomiary</button>
        </div>

        {/* Weekly Summary Widget */}
        <div className="card bg-neutral-900/50 p-4 space-y-2">
          <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-1">
            <Zap size={10} className="text-yellow-500" /> Compliance
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white">{weeklyStats.compliance}/4</span>
            <span className="text-[8px] text-neutral-500 font-bold uppercase">Ukończone treningi w tym tygodniu</span>
          </div>
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

        <div className="card bg-neutral-900 border-neutral-800 p-4 h-64 min-h-[256px]">
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
              <Line 
                type="monotone" 
                dataKey="kg" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                dot={({ cx, cy, payload }) => (
                  <circle 
                    cx={cx} cy={cy} r={6} 
                    fill={payload.msp ? '#22c55e' : '#3b82f6'} 
                    strokeWidth={0} 
                  />
                )}
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Sekcja 3: Trendy Ciała */}
      <section className="space-y-6">
        <header>
          <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter flex items-center gap-2">
            <Scale className="text-primary" size={24} /> Trendy Ciała
          </h2>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Waga i Talia w czasie</p>
        </header>

        <div className="card bg-neutral-900 border-neutral-800 p-4 h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" hide />
              <YAxis yAxisId="left" domain={['dataMin - 1', 'dataMax + 1']} stroke="#ffffff" fontSize={8} />
              <YAxis yAxisId="right" orientation="right" domain={['dataMin - 1', 'dataMax + 1']} stroke="#3b82f6" fontSize={8} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                labelStyle={{ fontSize: '10px', color: '#525252' }}
              />
              <Line yAxisId="left" type="monotone" dataKey="weight" name="Waga (kg)" stroke="#ffffff" strokeWidth={3} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="waist" name="Talia (cm)" stroke="#3b82f6" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Sekcja 4: Oura Readiness Trend */}
      <section className="space-y-6">
        <header>
          <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter flex items-center gap-2">
            <Battery className="text-primary" size={24} /> Oura Trend
          </h2>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Ostatnie 3 tygodnie gotowości</p>
        </header>

        <div className="card bg-neutral-900 border-neutral-800 p-4 h-64 min-h-[256px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ouraTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" stroke="#525252" fontSize={8} />
              <YAxis domain={[50, 100]} stroke="#525252" fontSize={8} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                itemStyle={{ color: '#3b82f6', fontWeight: '900', fontSize: '12px' }}
              />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
              <Line type="monotone" dataKey="readiness" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {correlation && (
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 space-y-2">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
              <Zap size={12} /> Analiza Korelacji
            </h4>
            <p className="text-[10px] text-white font-bold leading-relaxed">
              W dni z niską gotowością ({correlation.count} sesji) Twój średni ciężar na klatkę był o <span className="text-red-500">{correlation.diff} kg</span> mniejszy niż średnia ({correlation.avgBad} vs {correlation.avgOverall} kg).
            </p>
            <p className="text-[8px] text-neutral-500 uppercase font-black italic">Wniosek: Słuchaj Oura Ring – oszczędzaj siły gdy readiness jest poniżej 70.</p>
          </div>
        )}
      </section>

      {/* Sekcja 5: Ostatnie Treningi */}
      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Ostatnie Sesje</h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-900/30">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-900 text-[8px] font-black text-neutral-500 uppercase tracking-widest">
                <th className="p-4">Data</th>
                <th className="p-4 text-center">Dzień</th>
                <th className="p-4 text-center text-primary">MSP</th>
                <th className="p-4 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-[10px] font-bold text-white">
              {recentSessions.slice(0, 10).map(s => (
                <tr key={s.id} className="hover:bg-neutral-900/50 transition-colors group">
                  <td className="p-4">{format(parseISO(s.created_at), 'dd.MM')}</td>
                  <td className="p-4 text-center text-neutral-400">{s.workout_day}</td>
                  <td className="p-4 text-center">
                    <div className={`mx-auto w-2 h-2 rounded-full ${s.msp_passed ? 'bg-green-500' : 'bg-neutral-800'}`} />
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => deleteSession(s.id)}
                      className="text-neutral-700 hover:text-red-500 transition-all p-2"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Sekcja 6: Eksport do AI */}
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
