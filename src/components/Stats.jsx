import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Trophy, Clock, Trash2, FileText, ChevronDown, ChevronUp, Scale, Ruler, Activity, Zap, TrendingUp, Target, Battery } from 'lucide-react';
import { format, differenceInDays, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';

const START_DATE = new Date('2026-04-26');

export default function Stats({ session }) {
  const [loading, setLoading] = useState(true);
  const [benchData, setBenchData] = useState([]);
  const [bodyData, setBodyData] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [newMetric, setNewMetric] = useState({ weight: '', waist: '' });
  const [ouraTrend, setOuraTrend] = useState([]);
  const [nutritionData, setNutritionData] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({ compliance: 0 });
  const [correlation, setCorrelation] = useState(null);
  const [balanceData, setBalanceData] = useState([]);
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
    const { data: nutrition } = await supabase.from('daily_nutrition').select('*').eq('user_id', session.user.id).order('date', { ascending: false }).limit(21);
    
    if (logs) {
      const benchLogs = logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie (Heavy)'));
      const weeklyGroups = {};
      benchLogs.forEach(l => {
        const weekNum = Math.floor(differenceInDays(parseISO(l.created_at), START_DATE) / 7) + 1;
        const weekKey = `T${weekNum}`;
        if (!weeklyGroups[weekKey] || l.weight > weeklyGroups[weekKey].kg) {
          weeklyGroups[weekKey] = { week: weekKey, kg: l.weight, msp: l.workout_sessions?.msp_passed };
        }
      });
      setBenchData(Object.values(weeklyGroups));

      const now = new Date();
      const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const thisWeekSessions = sessions?.filter(s => parseISO(s.created_at) >= thisWeekStart).length || 0;
      setWeeklyStats({ compliance: thisWeekSessions });
    }

    if (body) setBodyData(body);
    
    if (oura) {
      setOuraTrend(oura.reverse().map(o => ({
        date: format(parseISO(o.date), 'dd.MM'),
        readiness: o.readiness_score,
        sleep: o.total_sleep_hours
      })));
    }

    if (nutrition) {
      setNutritionData(nutrition.reverse().map(n => ({
        date: format(parseISO(n.date), 'dd.MM'),
        protein: n.protein,
        calories: n.calories
      })));
    }

    if (logs && body) {
      const benchLogs = logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie (Heavy)'));
      const pullupLogs = logs.filter(l => l.exercise_name.includes('Pull-upy szerokie'));
      const weeklyBalance = {};
      const getWeightForDate = (dateStr) => {
        const logDate = new Date(dateStr);
        const closest = body.filter(b => new Date(b.date) <= logDate).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        return closest ? parseFloat(closest.weight) : 80;
      };
      const calculate1RM = (weight, reps) => weight * (1 + reps / 30);

      benchLogs.forEach(l => {
        const weekKey = `T${Math.floor(differenceInDays(parseISO(l.created_at), START_DATE) / 7) + 1}`;
        const rm = calculate1RM(l.weight, l.reps);
        if (!weeklyBalance[weekKey]) weeklyBalance[weekKey] = { week: weekKey };
        if (!weeklyBalance[weekKey].bench || rm > weeklyBalance[weekKey].bench) weeklyBalance[weekKey].bench = Math.round(rm);
      });

      pullupLogs.forEach(l => {
        const weekKey = `T${Math.floor(differenceInDays(parseISO(l.created_at), START_DATE) / 7) + 1}`;
        const bw = getWeightForDate(l.created_at);
        const totalWeight = bw + (l.weight || 0);
        const rm = calculate1RM(totalWeight, l.reps);
        if (!weeklyBalance[weekKey]) weeklyBalance[weekKey] = { week: weekKey };
        if (!weeklyBalance[weekKey].pullup || rm > weeklyBalance[weekKey].pullup) weeklyBalance[weekKey].pullup = Math.round(rm);
      });
      setBalanceData(Object.values(weeklyBalance).sort((a, b) => a.week.localeCompare(b.week)));
    }

    if (sessions) {
      setRecentSessions(sessions.map(s => ({
        ...s,
        duration: s.start_time && s.end_time ? Math.round((new Date(s.end_time) - new Date(s.start_time)) / 60000) : '--'
      })));
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
    });
    if (error) alert(error.message);
    else { alert('Zapisano!'); fetchStats(); }
  }

  async function deleteSession(id) {
    if (confirm('Usunąć trening?')) {
      await supabase.from('workout_sessions').delete().eq('id', id);
      fetchStats();
    }
  }

  async function exportData() {
    setIsExporting(true);
    try {
      const { data: sessions } = await supabase.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', session.user.id).gte('date', exportRange.start).lte('date', exportRange.end);
      let text = `# RAPORT TRENINGOWY KUBA\n\n`;
      sessions?.forEach(s => {
        text += `## ${format(parseISO(s.created_at), 'd MMMM yyyy', { locale: pl })} - Dzień ${s.workout_day}\n`;
        s.exercise_logs.forEach(l => { text += `- ${l.exercise_name}: ${l.weight}kg x ${l.reps}\n`; });
        text += `\n---\n`;
      });
      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `raport_kuba.md`; a.click();
    } finally { setIsExporting(false); }
  }
  
  if (loading) return <div className="p-8 text-center text-neutral-500 uppercase font-black animate-pulse tracking-widest">Wczytywanie...</div>;

  return (
    <div className="flex-1 p-6 space-y-12 pb-24">
      <section className="space-y-6">
        <header className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Parametry</h2>
          </div>
          <Activity className="text-primary/20" size={32} />
        </header>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Waga (kg)</label>
              <input type="number" step="0.1" value={newMetric.weight} onChange={e => setNewMetric({...newMetric, weight: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-lg font-black text-white outline-none focus:border-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Talia (cm)</label>
              <input type="number" step="0.1" value={newMetric.waist} onChange={e => setNewMetric({...newMetric, waist: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-lg font-black text-white outline-none focus:border-primary" />
            </div>
          </div>
          <button onClick={saveMetrics} className="w-full bg-primary text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest">Zapisz Pomiary</button>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Bench Progress</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 h-64 overflow-hidden">
          <div className="w-full h-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="week" stroke="#525252" fontSize={10} />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} stroke="#525252" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="kg" stroke="#3b82f6" strokeWidth={4} dot={{ r: 6, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Balance Audit</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 h-64 overflow-hidden">
          <div className="w-full h-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="week" stroke="#525252" fontSize={10} />
                <YAxis domain={['dataMin - 10', 'dataMax + 10']} stroke="#525252" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="bench" name="Bench" stroke="#ffffff" strokeWidth={3} dot={{ r: 4, fill: '#ffffff' }} />
                <Line type="monotone" dataKey="pullup" name="Pull-up" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Body Trends</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 h-64 overflow-hidden">
          <div className="w-full h-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bodyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" hide />
                <YAxis yAxisId="left" domain={['dataMin - 1', 'dataMax + 1']} stroke="#ffffff" fontSize={8} />
                <YAxis yAxisId="right" orientation="right" domain={['dataMin - 1', 'dataMax + 1']} stroke="#3b82f6" fontSize={8} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }} />
                <Line yAxisId="left" type="monotone" dataKey="weight" name="Waga" stroke="#ffffff" strokeWidth={3} dot={false} />
                <Line yAxisId="right" type="monotone" dataKey="waist" name="Talia" stroke="#3b82f6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Oura Readiness</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 h-64 overflow-hidden">
          <div className="w-full h-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ouraTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#525252" fontSize={8} />
                <YAxis domain={[50, 100]} stroke="#525252" fontSize={8} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="readiness" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Protein Intake (Goal: 150g)</h2>
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 h-64 overflow-hidden">
          <div className="w-full h-full min-w-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={nutritionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#525252" fontSize={8} />
                <YAxis domain={[0, 200]} stroke="#525252" fontSize={8} />
                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }} />
                <ReferenceLine y={150} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'GOAL', position: 'right', fill: '#ef4444', fontSize: 10, fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="protein" name="Białko (g)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 3, fill: '#3b82f6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Historia</h2>
        <div className="overflow-hidden rounded-2xl border border-neutral-900 bg-neutral-900/30">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-900 text-[8px] font-black text-neutral-500 uppercase tracking-widest">
                <th className="p-4">Data</th>
                <th className="p-4 text-center">Dzień</th>
                <th className="p-4 text-right">Akcja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 text-[10px] font-bold text-white">
              {recentSessions.slice(0, 10).map(s => (
                <tr key={s.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="p-4">{format(parseISO(s.created_at), 'dd.MM')}</td>
                  <td className="p-4 text-center text-neutral-400">{s.workout_day}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => deleteSession(s.id)} className="text-neutral-700 hover:text-red-500 p-2"><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-black uppercase text-primary">Eksportuj Raport</h3>
        <button onClick={exportData} disabled={isExporting} className="w-full bg-primary text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest">Pobierz .md</button>
      </section>
    </div>
  );
}
