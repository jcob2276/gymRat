import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { TrendingUp, Scale, Ruler, Trophy, Calendar, Clock, Trash2, History, Download, FileText } from 'lucide-react';
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
  const [durationData, setDurationData] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [newMetric, setNewMetric] = useState({ 
    waist: '', belly: '', chest: '', biceps_l: '', biceps_r: '', thigh: '' 
  });
  const [plateauAlert, setPlateauAlert] = useState(null); // { exercise, type: 'deload' | 'warning' }
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
    
    // Fetch Exercise Logs (Bench & Pullups)
    const { data: logs } = await supabase
      .from('exercise_logs')
      .select('exercise_name, weight, reps, rpe, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: true });

    // Fetch Body Metrics
    const { data: body } = await supabase
      .from('body_metrics')
      .select('*')
      .eq('user_id', session.user.id)
      .order('date', { ascending: true });

    // Fetch Session Durations
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (logs) {
      const bench = logs
        .filter(l => l.exercise_name === 'Wyciskanie płaskie (ciężko)')
        .map(l => ({
          date: format(parseISO(l.created_at), 'dd.MM'),
          weight: l.weight,
          target: calculateTarget(parseISO(l.created_at))
        }));
      setBenchData(bench || []);

      const pullups = logs
        .filter(l => l.exercise_name.includes('Pull-upy'))
        .reduce((acc, curr) => {
          const date = format(parseISO(curr.created_at), 'dd.MM');
          if (!acc[date]) acc[date] = curr.reps;
          return acc;
        }, {});
      setPullupData(Object.entries(pullups).map(([date, reps]) => ({ date, reps })) || []);

      // Plateau Detection Logic
      const benchLogs = logs.filter(l => l.exercise_name === 'Wyciskanie płaskie (Heavy)');
      if (benchLogs.length >= 3) {
        const last = benchLogs[benchLogs.length - 1];
        const prev = benchLogs[benchLogs.length - 2];
        const prev2 = benchLogs[benchLogs.length - 3];

        const isWeightStalled = last.weight <= prev.weight && prev.weight <= prev2.weight;
        const isRpeRising = last.rpe > prev.rpe || (last.rpe >= 9 && prev.rpe >= 9);

        if (isWeightStalled && isRpeRising) {
          setPlateauAlert({
            exercise: 'Bench Press',
            message: 'Wykryto plateau. Ciężar stoi, a zmęczenie (RPE) rośnie. Zalecany DELOAD w następnym tygodniu: 2 serie, 70% ciężaru, MSP 5+.'
          });
        }
      }
    }

    if (body) {
      setBodyData(body.map(b => ({
        date: format(parseISO(b.date), 'dd.MM'),
        waist: b.waist,
        belly: b.belly,
        chest: b.chest,
        biceps_l: b.biceps_l,
        biceps_r: b.biceps_r,
        thigh: b.thigh,
        calf: b.calf
      })) || []);
    }

    if (sessions) {
      setRecentSessions(sessions || []);
      const sessionList = sessions || [];
      setDurationData([...sessionList].reverse().filter(s => s.start_time).map(s => ({
        date: format(parseISO(s.created_at), 'dd.MM'),
        time: s.start_time ? `${format(parseISO(s.start_time), 'HH:mm')} - ${format(parseISO(s.end_time), 'HH:mm')}` : '--'
      })));
    }

    setLoading(false);
  }

  async function deleteSession(id) {
    if (!confirm('Czy na pewno chcesz usunąć ten trening? Wszystkie serie zostaną usunięte.')) return;
    
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', id);

    if (error) alert(error.message);
    else fetchStats();
  }

  function calculateTarget(date) {
    const daysPassed = differenceInDays(date, START_DATE);
    const weeksPassed = Math.floor(daysPassed / 7);
    return 80 + (weeksPassed * 1.66); 
  }

  async function saveMetrics(e) {
    e.preventDefault();
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase
      .from('body_metrics')
      .upsert({
        user_id: session.user.id,
        date: today,
        waist: parseFloat(newMetric.waist),
        belly: parseFloat(newMetric.belly),
        chest: parseFloat(newMetric.chest),
        biceps_l: parseFloat(newMetric.biceps_l),
        biceps_r: parseFloat(newMetric.biceps_r),
        thigh: parseFloat(newMetric.thigh),
      }, { onConflict: 'user_id,date' });

    if (error) alert(error.message);
    else {
      alert('Pomiary zapisane!');
      setNewMetric({ waist: '', belly: '', chest: '', biceps_l: '', biceps_r: '', thigh: '' });
      fetchStats();
    }
  }

  async function exportData() {
    setIsExporting(true);
    try {
      const { data: sessions, error: sError } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          exercise_logs (*)
        `)
        .eq('user_id', session.user.id)
        .gte('date', exportRange.start)
        .lte('date', exportRange.end)
        .order('date', { ascending: true });

      if (sError) throw sError;

      // Format for LLM/Human readability
      let text = `# RAPORT TRENINGOWY: KUBA\n`;
      text += `Okres: ${exportRange.start} - ${exportRange.end}\n\n`;

      sessions.forEach(s => {
        text += `## ${format(parseISO(s.created_at), 'eeee, d MMMM yyyy', { locale: pl }).toUpperCase()}\n`;
        text += `Typ: Dzień ${s.workout_day} | Godziny: ${s.start_time ? `${format(parseISO(s.start_time), 'HH:mm')} - ${format(parseISO(s.end_time), 'HH:mm')}` : '--'}\n`;
        if (s.session_notes) text += `Notatki: ${s.session_notes}\n`;
        
        const sortedLogs = [...s.exercise_logs].sort((a, b) => a.exercise_name.localeCompare(b.exercise_name) || a.set_number - b.set_number);
        
        let currentEx = '';
        sortedLogs.forEach(log => {
          if (log.exercise_name !== currentEx) {
            currentEx = log.exercise_name;
            text += `\n### ${currentEx}\n`;
          }
          text += `- Seria ${log.set_number}: ${log.weight}kg x ${log.reps}${log.rpe ? ` (RPE ${log.rpe})` : ''}\n`;
        });
        text += `\n---\n\n`;
      });

      const blob = new Blob([text], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kuba-workout-export-${exportRange.start}-${exportRange.end}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert('Eksport zakończony pomyślnie!');
    } catch (err) {
      console.error(err);
      alert('Błąd eksportu: ' + err.message);
    } finally {
      setIsExporting(false);
    }
  }

  const daysPassed = differenceInDays(new Date(), START_DATE);
  const progressPercent = Math.min(100, Math.max(0, (daysPassed / TOTAL_DAYS) * 100));
  const daysLeft = differenceInDays(END_DATE, new Date());
  const avgDuration = durationData.length > 0 
    ? Math.round(durationData.reduce((acc, curr) => acc + curr.duration, 0) / durationData.length)
    : 0;

  if (loading) return <div className="p-8 text-center text-neutral-500 uppercase font-black animate-pulse">Ładowanie statystyk...</div>;

  return (
    <div className="flex-1 p-6 space-y-10 pb-24">
      
      {/* Plateau Alert */}
      {plateauAlert && (
        <div className="bg-dayB/10 border-2 border-dayB/50 p-4 rounded-2xl space-y-2 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 text-dayB">
            <Trophy size={18} />
            <h3 className="font-black uppercase tracking-tighter italic text-sm">ALERT: PLATEAU WYKRYTE</h3>
          </div>
          <p className="text-[10px] text-neutral-400 font-bold uppercase leading-relaxed">
            {plateauAlert.message}
          </p>
        </div>
      )}

      {/* Progress Bar */}
      <section className="space-y-3">
        <div className="flex justify-between items-end">
          <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase">📅 Postęp do 1 sierpnia</h2>
          <span className="text-xs font-black text-white">{Math.round(progressPercent)}% ({daysPassed}/{TOTAL_DAYS} dni)</span>
        </div>
        <div className="h-4 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800 p-0.5">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
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
      {/* Body Measurements Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Pomiary Obwodów</h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Śledź centymetry, nie kilogramy</p>
          </div>
          <Maximize2 className="text-neutral-800" size={24} />
        </div>

        {/* Input Grid */}
        <div className="card bg-neutral-900/50 border-neutral-800 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'waist', label: 'Talia (najwęższe)' },
              { id: 'belly', label: 'Pas (pępek)' },
              { id: 'chest', label: 'Klatka' },
              { id: 'biceps_l', label: 'Biceps L' },
              { id: 'biceps_r', label: 'Biceps P' },
              { id: 'thigh', label: 'Udo' },
            ].map(m => (
              <div key={m.id} className="space-y-1">
                <label className="text-[8px] font-black text-neutral-500 uppercase tracking-widest ml-1">{m.label}</label>
                <div className="relative">
                  <input 
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={newMetric[m.id]}
                    onChange={(e) => setNewMetric({ ...newMetric, [m.id]: e.target.value })}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm font-black text-white focus:border-primary outline-none"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-neutral-700">CM</span>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={saveMetrics}
            className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Zapisz Pomiary
          </button>
        </div>

        {/* History List */}
        <div className="space-y-3">
          <h3 className="text-[8px] font-black text-neutral-600 uppercase tracking-[0.2em] ml-1">Ostatnie Wpisy</h3>
          <div className="space-y-2">
            {[...bodyData].reverse().slice(0, 3).map((entry, idx) => (
              <div key={idx} className="card p-4 border-neutral-900 bg-neutral-950/50 flex justify-between items-center group">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase mb-1">{format(parseISO(entry.date), 'dd MMMM yyyy')}</p>
                  <div className="flex gap-4 text-[10px] font-bold text-neutral-500 uppercase">
                    <span>Pas: <b className="text-white">{entry.belly || entry.waist}</b></span>
                    <span>Klatka: <b className="text-white">{entry.chest || '--'}</b></span>
                    <span>Biceps: <b className="text-white">{entry.biceps_r || '--'}</b></span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-neutral-800 group-hover:text-primary transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <section className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black uppercase italic text-white tracking-tighter">Wykresy Postępu</h2>
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">Talia i Podciąganie</p>
          </div>
        </div>

        {/* Training Hours List */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest px-1">Ostatnie Godziny Treningu</h3>
          <div className="space-y-2">
            {durationData.slice(0, 5).map((d, i) => (
              <div key={i} className="card p-4 border-neutral-900 bg-neutral-950/50 flex justify-between items-center">
                <span className="text-[10px] font-black text-neutral-400 uppercase">{d.date}</span>
                <span className="text-[10px] font-black text-primary uppercase">{d.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Waist Chart */}
        <div className="card h-64 p-4 border-neutral-900">
          <h3 className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-4">Zmiana w Pasie (cm)</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bodyData}>
              <XAxis dataKey="date" hide />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} hide />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #262626', borderRadius: '12px' }}
                itemStyle={{ color: '#3b82f6', fontWeight: '900', fontSize: '10px' }}
                labelStyle={{ display: 'none' }}
              />
              <Line 
                type="monotone" 
                dataKey="waist" 
                stroke="#3b82f6" 
                strokeWidth={4} 
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} 
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Duration Chart */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase flex items-center gap-2">
          <Clock size={14} className="text-dayD" /> Czas Treningu (min)
        </h2>
        <div className="h-40 card p-2 bg-neutral-950/50">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={durationData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
              <XAxis dataKey="date" stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#525252" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626' }} />
              <Bar dataKey="duration" fill="#facc15" radius={[4, 4, 0, 0]} name="Minuty" />
            </BarChart>
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
                { label: 'Śr. czas (min)', val: avgDuration || '-', trend: '~stały', color: 'text-dayD' },
                { label: 'Talia (cm)', val: bodyData[bodyData.length-1]?.waist || '-', trend: '-1,5 ▼', color: 'text-dayC' },
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

      {/* Recent Sessions (History) */}
      <section className="space-y-4">
        <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase flex items-center gap-2">
          <History size={14} className="text-neutral-500" /> Historia Treningów
        </h2>
        <div className="space-y-2">
          {recentSessions.map((s) => (
            <div key={s.id} className="card p-4 flex justify-between items-center group">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-black text-white uppercase italic">Dzień {s.workout_day}</span>
                  <span className="text-[10px] text-neutral-500 font-bold uppercase">{format(parseISO(s.created_at), 'eeee, d MMM', { locale: pl })}</span>

                </div>
                <div className="flex gap-3 text-[10px] text-neutral-500 font-bold uppercase">
                  <span className="flex items-center gap-1"><Clock size={10} /> {s.duration_minutes || '?'} min</span>
                  {s.session_notes && <span className="text-primary tracking-tighter">● Ma notatki</span>}
                </div>
              </div>
              <button 
                onClick={() => deleteSession(s.id)}
                className="p-2 text-neutral-800 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {recentSessions.length === 0 && <p className="text-center py-10 text-xs text-neutral-600 uppercase font-black">Brak historii treningów</p>}
        </div>
      </section>

      {/* Body Metric Input Form */}
      <section className="card space-y-4 bg-gradient-to-br from-neutral-900 to-neutral-950">
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

      {/* Data Export Section */}
      <section className="card space-y-4 border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-primary" />
          <h3 className="text-xs font-black uppercase text-white tracking-widest">Eksportuj Dane do AI</h3>
        </div>
        <p className="text-[10px] text-neutral-500 font-bold uppercase leading-relaxed">
          Wybierz zakres dat, aby pobrać pełną historię treningów w formacie gotowym do analizy przez Claude lub GPT.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Od</label>
            <input 
              type="date" 
              value={exportRange.start}
              onChange={e => setExportRange({...exportRange, start: e.target.value})}
              className="input text-xs" 
            />
          </div>
          <div>
            <label className="label">Do</label>
            <input 
              type="date" 
              value={exportRange.end}
              onChange={e => setExportRange({...exportRange, end: e.target.value})}
              className="input text-xs" 
            />
          </div>
          <button 
            onClick={exportData}
            disabled={isExporting}
            className="btn-primary col-span-2 py-3 text-xs flex items-center justify-center gap-2 font-black tracking-widest uppercase"
          >
            {isExporting ? 'Generowanie...' : <><FileText size={16} /> Pobierz Raport (.md)</>}
          </button>
        </div>
      </section>

    </div>
  );
}

