import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { TrendingUp, Scale, Ruler, Trophy, Calendar } from 'lucide-react';
import { format, differenceInDays, parseISO, isAfter, isBefore } from 'date-fns';

const START_DATE = new Date('2026-04-26');
const END_DATE = new Date('2026-08-01');
const TOTAL_DAYS = differenceInDays(END_DATE, START_DATE);

export default function Stats({ session }) {
  const [loading, setLoading] = useState(true);
  const [benchData, setBenchData] = useState([]);
  const [bodyData, setBodyData] = useState([]);
  const [pullupData, setPullupData] = useState([]);
  const [newMetric, setNewMetric] = useState({ weight: '', waist: '' });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoading(true);
    
    // Fetch Exercise Logs (Bench & Pullups)
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('exercise_name, weight, reps, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    // Fetch Body Metrics
    const { data: body } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: true });

    if (logs) {
      // Process Bench Data (Day A heavy)
      const bench = logs
        .filter(l => l.exercise_name === 'Wyciskanie płaskie (ciężko)')
        .map(l => ({
          date: format(parseISO(l.created_at), 'dd.MM'),
          weight: l.weight,
          target: calculateTarget(parseISO(l.created_at))
        }));
      setBenchData(bench);

      // Process Pullups (Max reps from first set)
      const pullups = logs
        .filter(l => l.exercise_name.includes('Pull-upy'))
        .reduce((acc, curr) => {
          const date = format(parseISO(curr.created_at), 'dd.MM');
          if (!acc[date]) acc[date] = curr.reps;
          return acc;
        }, {});
      
      setPullupData(Object.entries(pullups).map(([date, reps]) => ({ date, reps })));
    }

    if (body) {
      setBodyData(body.map(b => ({
        date: format(parseISO(b.date), 'dd.MM'),
        weight: b.weight,
        waist: b.waist
      })));
    }

    setLoading(false);
  }

  function calculateTarget(date) {
    const daysPassed = differenceInDays(date, START_DATE);
    const weeksPassed = Math.floor(daysPassed / 7);
    return 80 + (weeksPassed * 1.66); // Simple linear to 100 in 12 weeks
  }

  async function saveMetrics(e) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('body_metrics')
      .upsert({
        user_id: session.user.id,
        date: today,
        weight: parseFloat(newMetric.weight),
        waist: parseFloat(newMetric.waist)
      });

    if (error) alert(error.message);
    else {
      alert('Pomiary zapisane!');
      setNewMetric({ weight: '', waist: '' });
      fetchStats();
    }
  }

  const daysPassed = differenceInDays(new Date(), START_DATE);
  const progressPercent = Math.min(100, Math.max(0, (daysPassed / TOTAL_DAYS) * 100));
  const daysLeft = differenceInDays(END_DATE, new Date());

  if (loading) return <div className="p-8 text-center text-neutral-500 uppercase font-black animate-pulse">Ładowanie statystyk...</div>;

  return (
    <div className="flex-1 p-6 space-y-10 pb-24">
      
      {/* Progress Bar */}
      <section className="space-y-3">
        <div className="flex justify-between items-end">
          <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase">📅 Postęp do 1 sierpnia</h2>
          <span className="text-xs font-black text-white">{Math.round(progressPercent)}% ({daysPassed}/{TOTAL_DAYS} dni)</span>
        </div>
        <div className="h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-1000" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[10px] text-center text-neutral-500 font-bold uppercase tracking-tighter">
          Zostało {daysLeft} dni do celu 100 kg
        </p>
      </section>

      {/* Bench Chart */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase flex items-center gap-2">
          <Trophy size={14} className="text-primary" /> Progresja Bench (Cel 100kg)
        </h2>
        <div className="h-64 card p-2 bg-neutral-950/50">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={benchData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="date" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis domain={[70, 105]} stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Line type="monotone" dataKey="target" stroke="#525252" strokeDasharray="5 5" dot={false} name="Plan" />
              <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} name="Wynik" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Weight & Waist Chart */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase flex items-center gap-2">
          <Scale size={14} className="text-dayC" /> Waga i Talia
        </h2>
        <div className="h-64 card p-2 bg-neutral-950/50">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="date" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis yId="left" orientation="left" domain={['dataMin - 2', 'dataMax + 2']} stroke="#525252" fontSize={10} />
              <YAxis yId="right" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} stroke="#525252" fontSize={10} />
              <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626' }} />
              <Line yId="left" type="monotone" dataKey="weight" stroke="#22c55e" strokeWidth={2} name="Waga (kg)" />
              <Line yId="right" type="monotone" dataKey="waist" stroke="#f59e0b" strokeWidth={2} name="Talia (cm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Body Metric Input Form */}
      <section className="card space-y-4">
        <h3 className="text-xs font-black uppercase text-white">Dodaj pomiary tygodniowe</h3>
        <form onSubmit={saveMetrics} className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Waga (kg)</label>
            <input 
              type="number" 
              step="0.1"
              value={newMetric.weight}
              onChange={e => setNewMetric({...newMetric, weight: e.target.value})}
              className="input text-center" 
              placeholder="0.0"
            />
          </div>
          <div>
            <label className="label">Talia (cm)</label>
            <input 
              type="number" 
              step="0.1"
              value={newMetric.waist}
              onChange={e => setNewMetric({...newMetric, waist: e.target.value})}
              className="input text-center" 
              placeholder="0.0"
            />
          </div>
          <button type="submit" className="btn-primary col-span-2 py-2 text-xs">Zapisz pomiar</button>
        </form>
      </section>

      {/* Trends Table */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase">📊 Kluczowe Trendy</h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-neutral-900 text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
              <tr>
                <th className="p-4">Metryka</th>
                <th className="p-4">Dziś</th>
                <th className="p-4">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {[
                { label: 'Bench (kg)', val: benchData[benchData.length-1]?.weight || '-', trend: '+2,5 ▲', color: 'text-primary' },
                { label: 'Talia (cm)', val: bodyData[bodyData.length-1]?.waist || '-', trend: '-1,5 ▼', color: 'text-dayC' },
                { label: 'Waga (kg)', val: bodyData[bodyData.length-1]?.weight || '-', trend: '-0,5 ▼', color: 'text-dayC' },
                { label: 'Pull-upy (max)', val: pullupData[pullupData.length-1]?.reps || '-', trend: '+1 ▲', color: 'text-primary' },
              ].map((row, i) => (
                <tr key={i}>
                  <td className="p-4 text-xs font-bold text-neutral-400">{row.label}</td>
                  <td className="p-4 text-sm font-black text-white">{row.val}</td>
                  <td className={`p-4 text-xs font-black ${row.color}`}>{row.trend}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}
