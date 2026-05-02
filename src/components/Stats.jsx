import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Trophy, Clock, Trash2, FileText, ChevronDown, ChevronUp, Scale, Ruler, Activity, Zap, TrendingUp, Target, Battery, CheckSquare } from 'lucide-react';
import { format, differenceInDays, parseISO, startOfWeek, addWeeks } from 'date-fns';
import { pl } from 'date-fns/locale';

const START_DATE = new Date('2026-04-26');

export default function Stats({ session }) {
  const [loading, setLoading] = useState(true);
  const [bodyData, setBodyData] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [newMetric, setNewMetric] = useState({ weight: '', waist: '' });
  const [ouraTrend, setOuraTrend] = useState([]);
  const [nutritionData, setNutritionData] = useState([]);
  const [weeklyStats, setWeeklyStats] = useState({ compliance: 0 });
  const [correlation, setCorrelation] = useState(null);
  const [dateRange, setDateRange] = useState({ 
    from: format(addWeeks(new Date(), -4), 'yyyy-MM-dd'), 
    to: format(new Date(), 'yyyy-MM-dd') 
  });
  const [isExporting, setIsExporting] = useState(false);
  const [includeYazio, setIncludeYazio] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({ date: '', logs: [] });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    const { data: logs } = await supabase.from('exercise_logs').select('*, workout_sessions(created_at, workout_day, msp_passed)').eq('user_id', session.user.id).order('created_at', { ascending: true });
    const { data: body } = await supabase.from('body_metrics').select('*').eq('user_id', session.user.id).order('date', { ascending: true });
    const { data: sessions } = await supabase.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', session.user.id).order('date', { ascending: false });
    const { data: oura } = await supabase.from('oura_daily_summary').select('*').eq('user_id', session.user.id).order('date', { ascending: false }).limit(60);
    const { data: nutrition } = await supabase.from('daily_nutrition').select('*').order('date', { ascending: false }).limit(60);
    
    if (logs) {
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
  async function syncHistory() {
    setIsSyncing(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-yazio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({ userId: session.user.id, sync_history: true, days: 25 })
      });
      const res = await response.json();
      if (res.success) {
        alert(`Zsynchronizowano ${res.synced_days} dni!`);
        fetchStats();
      } else {
        alert('Błąd synchronizacji: ' + res.error);
      }
    } catch (err) {
      alert('Błąd połączenia z funkcją');
    } finally {
      setIsSyncing(false);
    }
  }
  async function startEditing(session) {
    setEditingSession(session.id);
    setEditForm({
      date: session.date,
      logs: [...session.exercise_logs]
    });
  }

  async function updateSession() {
    try {
      // 1. Update session date
      await supabase.from('workout_sessions').update({ date: editForm.date }).eq('id', editingSession);
      
      // 2. Update all logs
      for (const log of editForm.logs) {
        await supabase.from('exercise_logs').update({ 
          weight: parseFloat(log.weight), 
          reps: parseInt(log.reps) 
        }).eq('id', log.id);
      }
      
      alert('Trening zaktualizowany!');
      setEditingSession(null);
      fetchStats();
    } catch (err) {
      alert('Błąd podczas aktualizacji');
    }
  }

  async function deleteLog(id) {
    if (confirm('Usunąć tę serię?')) {
      await supabase.from('exercise_logs').delete().eq('id', id);
      setEditForm({ ...editForm, logs: editForm.logs.filter(l => l.id !== id) });
    }
  }

  async function exportData() {
    setIsExporting(true);
    try {
      const { data: sessions } = await supabase.from('workout_sessions').select('*, exercise_logs(*)').eq('user_id', session.user.id).gte('date', dateRange.from).lte('date', dateRange.to).order('date', { ascending: true });
      
      let foodEntries = [];
      if (includeYazio) {
        const { data: food } = await supabase.from('daily_food_entries').select('*').eq('user_id', session.user.id).gte('date', dateRange.from).lte('date', dateRange.to).order('date', { ascending: true });
        foodEntries = food || [];
      }

      let md = `# RAPORT TRENINGOWY KUBA\n`;
      md += `Okres: ${dateRange.from} do ${dateRange.to}\n\n`;

      const dates = [...new Set([
        ...sessions.map(s => s.date),
        ...foodEntries.map(f => f.date)
      ])].sort();

      dates.forEach(dateStr => {
        const daySessions = sessions.filter(s => s.date === dateStr);
        if (daySessions.length === 0 && (!includeYazio || foodEntries.filter(f => f.date === dateStr).length === 0)) return;

        md += `## ${format(parseISO(dateStr), 'd MMMM yyyy (EEEE)', { locale: pl })}\n\n`;

        daySessions.forEach(s => {
          md += `### 🏋️ Trening: Dzień ${s.workout_day}\n`;
          s.exercise_logs.forEach(l => { 
            md += `- **${l.exercise_name}**: ${l.weight}kg x ${l.reps} ${l.is_pws_or_msp ? '🔥' : ''}\n`; 
          });
          md += `\n`;
        });

        if (includeYazio) {
          const dayFood = foodEntries.filter(f => f.date === dateStr);
          if (dayFood.length > 0) {
            md += `### 🥗 Dieta (Yazio)\n`;
            const meals = { breakfast: 'Śniadanie', lunch: 'Obiad', dinner: 'Kolacja', snack: 'Przekąski' };
            
            Object.entries(meals).forEach(([key, label]) => {
              const mealItems = dayFood.filter(f => f.meal_type === key);
              if (mealItems.length > 0) {
                md += `#### ${label}\n`;
                mealItems.forEach(item => {
                  md += `- ${item.name} (${item.amount || ''}): ${item.calories} kcal | B: ${item.protein}g | W: ${item.carbs || 0}g | T: ${item.fat || 0}g\n`;
                });
              }
            });
            
            const totalCal = dayFood.reduce((sum, f) => sum + (f.calories || 0), 0);
            const totalProt = dayFood.reduce((sum, f) => sum + (Number(f.protein) || 0), 0);
            const totalCarb = dayFood.reduce((sum, f) => sum + (Number(f.carbs) || 0), 0);
            const totalFat = dayFood.reduce((sum, f) => sum + (Number(f.fat) || 0), 0);
            md += `\n**Suma dnia: ${totalCal} kcal | B: ${totalProt.toFixed(1)}g | W: ${totalCarb.toFixed(1)}g | T: ${totalFat.toFixed(1)}g**\n`;
          }
        }
        md += `---\n\n`;
      });

      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `raport_kuba_${dateRange.from}.md`; a.click();
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
              {recentSessions.slice(0, 40).map(s => (
                <tr key={s.id} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="p-4">
                    {editingSession === s.id ? (
                      <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} className="bg-neutral-950 border border-neutral-800 rounded p-1 text-[10px] text-white" />
                    ) : (
                      format(parseISO(s.date), 'dd.MM')
                    )}
                  </td>
                  <td className="p-4 text-center text-neutral-400">
                    {editingSession === s.id ? (
                      <div className="space-y-2 text-left">
                        {editForm.logs.map((log, idx) => (
                          <div key={log.id} className="flex items-center gap-2 bg-neutral-950 p-2 rounded border border-neutral-800">
                            <span className="text-[8px] w-12 truncate">{log.exercise_name}</span>
                            <input type="number" step="0.5" value={log.weight} onChange={e => {
                              const newLogs = [...editForm.logs];
                              newLogs[idx].weight = e.target.value;
                              setEditForm({...editForm, logs: newLogs});
                            }} className="w-12 bg-neutral-900 border border-neutral-800 rounded p-1 text-[10px]" />
                            <span className="text-[8px]">kg x</span>
                            <input type="number" value={log.reps} onChange={e => {
                              const newLogs = [...editForm.logs];
                              newLogs[idx].reps = e.target.value;
                              setEditForm({...editForm, logs: newLogs});
                            }} className="w-10 bg-neutral-900 border border-neutral-800 rounded p-1 text-[10px]" />
                            <button onClick={() => deleteLog(log.id)} className="text-red-900 hover:text-red-500 ml-auto"><Trash2 size={10} /></button>
                          </div>
                        ))}
                        <button onClick={updateSession} className="w-full bg-primary text-white py-2 rounded text-[8px] font-black uppercase">Zapisz Zmiany</button>
                        <button onClick={() => setEditingSession(null)} className="w-full text-neutral-500 py-1 text-[8px] font-black uppercase">Anuluj</button>
                      </div>
                    ) : (
                      s.workout_day
                    )}
                  </td>
                  <td className="p-4 text-right">
                    {editingSession !== s.id && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEditing(s)} className="text-neutral-700 hover:text-primary p-2"><Zap size={12} /></button>
                        <button onClick={() => deleteSession(s.id)} className="text-neutral-700 hover:text-red-500 p-2"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-black uppercase text-primary">Eksportuj Raport</h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Od</label>
            <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-[10px] font-bold text-white outline-none" />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Do</label>
            <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-[10px] font-bold text-white outline-none" />
          </div>
        </div>

        <button onClick={() => setIncludeYazio(!includeYazio)} className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors">
          <div className={`w-4 h-4 rounded border flex items-center justify-center ${includeYazio ? 'bg-primary border-primary text-white' : 'border-neutral-800'}`}>
            {includeYazio && <CheckSquare size={10} />}
          </div>
          <span className="text-[10px] font-black uppercase">Dołącz dietę z Yazio</span>
        </button>

        <div className="flex justify-between items-center pt-2">
          <button onClick={syncHistory} disabled={isSyncing} className="text-[8px] font-black uppercase text-neutral-600 hover:text-primary transition-colors">
            {isSyncing ? 'Syncing...' : 'Wymuś Sync Yazio (30 dni)'}
          </button>
          <button onClick={exportData} disabled={isExporting} className="bg-primary text-white px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform shadow-xl shadow-primary/20 flex-1 ml-4">
            {isExporting ? 'Generowanie...' : 'Pobierz Raport (.md)'}
          </button>
        </div>
      </section>
    </div>
  );
}
