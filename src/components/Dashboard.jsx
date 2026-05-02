import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, Play, Dumbbell, BarChart2, Camera, ChevronDown, ChevronUp, Trophy, History, Compass, Shield, RotateCw } from 'lucide-react';
import WorkoutExecution from './WorkoutExecution';
import ProgressionTable from './ProgressionTable';
import Stats from './Stats';
import Photos from './Photos';
import Direction from './Direction';
import OuraWidget from './OuraWidget';
import { format, parseISO, startOfWeek } from 'date-fns';

export default function Dashboard({ session }) {
  const [view, setView] = useState('workout');
  const [selectedDay, setSelectedDay] = useState(null);
  const [mspFeedbackMap, setMspFeedbackMap] = useState({});
  const [lastDayASession, setLastDayASession] = useState(null);
  const [showProgression, setShowProgression] = useState(false);
  const [weeklyCalories, setWeeklyCalories] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const weeklyBudget = 12600; // 1800 * 7

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    // Fetch MSP feedback
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('*, exercise_logs(*)')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (sessions) {
      const feedbackMap = {};
      sessions.forEach(s => {
        if (feedbackMap[s.workout_day] === undefined) {
          feedbackMap[s.workout_day] = s.msp_passed;
        }
      });
      setMspFeedbackMap(feedbackMap);

      // Fetch Weekly Calories (reset on Monday)
      const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data: nutrition } = await supabase
        .from('daily_nutrition')
        .select('calories')
        .gte('date', monday);
      
      if (nutrition) {
        const total = nutrition.reduce((sum, n) => sum + (n.calories || 0), 0);
        setWeeklyCalories(total);
      }

      // Find last Day A for the summary widget
      const lastA = sessions.find(s => s.workout_day === 'A');
      if (lastA) {
        const benchLogs = lastA.exercise_logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie'));
        setLastDayASession({ ...lastA, benchLogs });
      }
    }
  }

  async function syncYazio() {
    setIsSyncing(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-yazio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`
        },
        body: JSON.stringify({ userId: session.user.id })
      });
      const res = await response.json();
      if (res.success) {
        fetchDashboardData();
      } else {
        alert('Błąd synchronizacji: ' + res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  }

  if (selectedDay) {
    return <WorkoutExecution dayKey={selectedDay} session={session} onBack={() => setSelectedDay(null)} />;
  }

  const getDaySuggestion = (dayKey) => {
    const lastA = lastDayASession;
    if (dayKey === 'A' && lastA?.benchLogs) {
      const avgMsp = lastA.benchLogs.reduce((acc, l) => acc + (l.rpe || 0), 0) / lastA.benchLogs.length;
      if (avgMsp < 0.5) return '+2,5 kg (Brak MSP)';
      if (avgMsp > 1.5) return 'Zostań / Deload (Za ciężko)';
      return '+1-2 kg (Idealne MSP)';
    }

    const lastMsp = mspFeedbackMap[dayKey];
    switch(dayKey) {
      case 'A': return lastMsp === true ? '+2,5 kg' : lastMsp === false ? 'Szlifuj MSP' : 'Ciężka Góra';
      case 'B': return '6 serii – tył barku';
      case 'C': return 'Pamiętaj o podwinięciu miednicy';
      case 'D': return 'LEKKO – zostaw 1-2 powt.';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative bg-background border-x border-neutral-900 shadow-2xl">
      
      {/* Header */}
      <header className="p-4 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-20">
        <div>
          <h1 className="font-black text-xl text-white uppercase tracking-tighter italic">Kuba Tracker V2.1</h1>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{session.user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2 text-neutral-500 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {view === 'workout' && (
          <div className="p-6 space-y-8">
            <OuraWidget session={session} />

            {/* Weekly Calorie Budget */}
            <section className="card bg-neutral-900 border-neutral-800 p-5 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Budżet Kaloryczny (Tydzień)</h3>
                  <p className="text-xl font-black text-white uppercase italic">
                    {weeklyCalories.toLocaleString()} <span className="text-xs text-neutral-500">/ {weeklyBudget.toLocaleString()} kcal</span>
                  </p>
                </div>
                <button 
                  onClick={syncYazio} 
                  disabled={isSyncing}
                  className={`p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-primary hover:text-white transition-all ${isSyncing ? 'animate-spin' : ''}`}
                >
                  <RotateCw size={14} />
                </button>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-black text-neutral-500 uppercase tracking-widest mb-1">Status</p>
                  <p className="text-[10px] font-black text-white uppercase italic">
                    {weeklyCalories > weeklyBudget ? 'Przekroczono!' : 'W normie'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-primary uppercase">Zostało</p>
                  <p className="text-sm font-black text-white italic">{(weeklyBudget - weeklyCalories).toLocaleString()} kcal</p>
                </div>
              </div>
              
              <div className="w-full h-3 bg-neutral-950 rounded-full border border-neutral-800 overflow-hidden p-0.5">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ${weeklyCalories > weeklyBudget ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]'}`}
                  style={{ width: `${Math.min((weeklyCalories / weeklyBudget) * 100, 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[8px] font-black uppercase text-neutral-600">
                <span>Reset w Poniedziałek</span>
                <span>Cel: 1800 / Dzień Średnio</span>
              </div>
            </section>

            {/* Treningi */}
            <section>
              <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-4">🏋️ Plan Treningowy</h2>
              <div className="grid gap-3">
                {[
                  { key: 'A', title: 'Dzień A', sub: 'Góra Ciężka / Bench', color: 'dayA' },
                  { key: 'B', title: 'Dzień B', sub: 'Plecy / Tył Barku', color: 'dayB' },
                  { key: 'C', title: 'Dzień C', sub: 'Nogi / ATP / Core', color: 'dayC' },
                  { key: 'D', title: 'Dzień D', sub: 'Lekki Bench / Ramiona', color: 'dayD' },
                ].map((day) => (
                  <button 
                    key={day.key}
                    onClick={() => setSelectedDay(day.key)}
                    className={`card text-left p-5 flex items-center justify-between group hover:bg-neutral-900/50 transition-all border-l-4 border-l-${day.color} relative`}
                  >
                    <div>
                      <h3 className="font-black text-white uppercase italic text-lg">{day.title}</h3>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase mb-1">{day.sub}</p>
                      <div className="text-[10px] font-black text-primary uppercase tracking-widest">
                        {getDaySuggestion(day.key)}
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Play size={16} fill="currentColor" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Ostatni Trening A Widget */}
            {lastDayASession && (
              <section className="card bg-primary/5 border-primary/20 p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2">
                    <History size={12} /> Ostatni Trening A ({format(parseISO(lastDayASession.created_at), 'dd.MM')})
                  </h3>
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${lastDayASession.msp_passed ? 'bg-dayC text-white' : 'bg-neutral-800 text-neutral-400'}`}>
                    MSP: {lastDayASession.msp_passed ? 'TAK' : 'NIE'}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {lastDayASession.benchLogs.map((l, i) => (
                    <div key={i} className="bg-neutral-950 px-2 py-1 rounded border border-neutral-900 text-[10px] font-bold text-white">
                      {l.weight}kg x {l.reps}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] font-black text-white uppercase italic">
                  Werdykt: <span className="text-primary">
                    {(() => {
                      const avgMsp = lastDayASession.benchLogs.reduce((acc, l) => acc + (l.rpe || 0), 0) / lastDayASession.benchLogs.length;
                      if (avgMsp < 0.5) return 'Dołóż +2.5kg (Lekko)';
                      if (avgMsp > 1.5) return 'Zostań (Za ciężko / Grind)';
                      return 'Dołóż +1-2kg (MSP Trafione)';
                    })()}
                  </span>
                </p>
              </section>
            )}

            {/* Progresja */}
            <section className="space-y-3">
              <button 
                onClick={() => setShowProgression(!showProgression)}
                className="w-full card flex items-center justify-between p-4 border-neutral-800 hover:bg-neutral-900/30 transition-all"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="text-primary" size={20} />
                  <div className="text-left">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Planowana Progresja</h3>
                    <p className="text-[8px] text-neutral-500 font-bold uppercase">Cel: 100 kg Bench Press</p>
                  </div>
                </div>
                {showProgression ? <ChevronUp size={16} className="text-neutral-500" /> : <ChevronDown size={16} className="text-neutral-500" />}
              </button>
              
              {showProgression && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <ProgressionTable />
                </div>
              )}
            </section>

            {/* Zasady 2.1 */}
            <section className="card bg-neutral-900/20 border-neutral-800 p-5 space-y-4">
              <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase flex items-center gap-2">
                <Shield size={12} className="text-primary" /> Zasady Grande Finale 2.1
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-[8px] text-neutral-500 font-bold uppercase">Białko</p>
                  <p className="text-[12px] font-black text-white uppercase italic">2.0-2.2g / KG</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] text-neutral-500 font-bold uppercase">Deficyt</p>
                  <p className="text-[12px] font-black text-white uppercase italic">300-500 KCAL</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] text-neutral-500 font-bold uppercase">Kroki</p>
                  <p className="text-[12px] font-black text-white uppercase italic">8-10K Dziennie</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] text-neutral-500 font-bold uppercase">Sen</p>
                  <p className="text-[12px] font-black text-white uppercase italic">Min. 7.5 H</p>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-800/50">
                <p className="text-[9px] font-black text-primary uppercase italic text-center italic tracking-widest">
                  16 tygodni bez wymówek. Rób swoje.
                </p>
              </div>
            </section>
          </div>
        )}
        {view === 'stats' && <Stats session={session} />}
        {view === 'photos' && <Photos session={session} />}
        {view === 'direction' && <Direction session={session} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-background/90 backdrop-blur-xl border-t border-neutral-800 p-3 flex justify-around items-center z-30">
        <button onClick={() => setView('workout')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'workout' ? 'text-primary' : 'text-neutral-500'}`}>
          <Dumbbell size={24} /><span className="text-[8px] font-bold uppercase">Trening</span>
        </button>
        <button onClick={() => setView('direction')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'direction' ? 'text-primary' : 'text-neutral-500'}`}>
          <Compass size={24} /><span className="text-[8px] font-bold uppercase">Kierunek</span>
        </button>
        <button onClick={() => setView('stats')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'stats' ? 'text-primary' : 'text-neutral-500'}`}>
          <BarChart2 size={24} /><span className="text-[8px] font-bold uppercase">Statystyki</span>
        </button>
        <button onClick={() => setView('photos')} className={`flex flex-col items-center gap-1 transition-colors ${view === 'photos' ? 'text-primary' : 'text-neutral-500'}`}>
          <Camera size={24} /><span className="text-[8px] font-bold uppercase">Zdjęcia</span>
        </button>
      </nav>
    </div>
  );
}
