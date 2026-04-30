import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, CheckCircle2, Circle, Play, Dumbbell, BarChart2, Camera } from 'lucide-react';
import WorkoutExecution from './WorkoutExecution';
import ProgressionTable from './ProgressionTable';
import Stats from './Stats';
import Photos from './Photos';
import OuraWidget from './OuraWidget';



export default function Dashboard({ session }) {
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('workout'); // 'workout' | 'stats' | 'photos'
  const [selectedDay, setSelectedDay] = useState(null);
  const [mspFeedbackMap, setMspFeedbackMap] = useState({}); // { dayKey: lastMspPassed }

  useEffect(() => {
    fetchLatestMspFeedback();
  }, []);

  async function fetchLatestMspFeedback() {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('workout_day, msp_passed, created_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) {
      const feedbackMap = {};
      data.forEach(s => {
        if (feedbackMap[s.workout_day] === undefined) {
          feedbackMap[s.workout_day] = s.msp_passed;
        }
      });
      setMspFeedbackMap(feedbackMap);
    }
  }

  if (selectedDay) {
    return <WorkoutExecution dayKey={selectedDay} session={session} onBack={() => setSelectedDay(null)} />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto relative bg-background border-x border-neutral-900 shadow-2xl shadow-blue-500/10">
      
      {/* Header */}
      <header className="p-4 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-md z-20">
        <div>
          <h1 className="font-black text-xl text-white uppercase tracking-tighter italic">Kuba Tracker</h1>
          <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest">{session.user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="p-2 text-neutral-500 hover:text-white transition-colors">
          <LogOut size={20} />
        </button>
      </header>

      {/* Main View Transition */}
      <main className="flex-1 overflow-y-auto pb-24">
        {view === 'workout' && (
          <div className="p-6 space-y-10">
            {/* Oura Insights Widget */}
            <OuraWidget session={session} />

            {/* Treningi Widget */}
            <section>
              <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-4">🏋️ Plan Treningowy</h2>
              <div className="grid gap-3">
                {[
                  { key: 'A', title: 'Dzień A', sub: 'Góra Ciężka / Bench', color: 'dayA' },
                  { key: 'B', title: 'Dzień B', sub: 'Plecy / Tył Barku', color: 'dayB' },
                  { key: 'C', title: 'Dzień C', sub: 'Nogi / ATP / Core', color: 'dayC' },
                  { key: 'D', title: 'Dzień D', sub: 'Lekki Bench / Ramiona', color: 'dayD' },
                ].map((day) => {
                  const lastMsp = mspFeedbackMap[day.key];
                  const showSuggestion = day.key === 'A' && lastMsp !== undefined;
                  
                  return (
                    <button 
                      key={day.key}
                      onClick={() => setSelectedDay(day.key)}
                      className={`card text-left flex items-center justify-between group hover:bg-neutral-900 transition-all border-l-4 border-l-${day.color} relative overflow-hidden`}
                    >
                      {showSuggestion && (
                        <div className={`absolute top-0 right-0 px-2 py-1 text-[8px] font-black uppercase tracking-widest ${lastMsp ? 'bg-dayC text-white' : 'bg-neutral-800 text-neutral-500'}`}>
                          {lastMsp ? 'Sugestia: +2.5kg' : 'Cel: Szlifuj MSP'}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-white uppercase italic">{day.title}</h3>
                        <p className="text-[10px] text-neutral-500 font-bold uppercase">{day.sub}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-700 group-hover:text-primary transition-colors">
                        <Play size={16} fill="currentColor" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Progresja Widget */}
            <section>
              <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-4">📈 Planowana Progresja</h2>
              <ProgressionTable />
            </section>
          </div>
        )}
        {view === 'stats' && <Stats session={session} />}
        {view === 'photos' && <Photos session={session} />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-background/90 backdrop-blur-xl border-t border-neutral-800 p-3 flex justify-around items-center z-30">
        <button 
          onClick={() => setView('workout')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'workout' ? 'text-primary' : 'text-neutral-500'}`}
        >
          <Dumbbell size={24} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Trening</span>
        </button>
        <button 
          onClick={() => setView('stats')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'stats' ? 'text-primary' : 'text-neutral-500'}`}
        >
          <BarChart2 size={24} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Statystyki</span>
        </button>
        <button 
          onClick={() => setView('photos')}
          className={`flex flex-col items-center gap-1 transition-colors ${view === 'photos' ? 'text-primary' : 'text-neutral-500'}`}
        >
          <Camera size={24} />
          <span className="text-[8px] font-bold uppercase tracking-widest">Zdjęcia</span>
        </button>
      </nav>

    </div>
  );
}



