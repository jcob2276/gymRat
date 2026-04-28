import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogOut, CheckCircle2, Circle, Play, Dumbbell, BarChart2 } from 'lucide-react';
import WorkoutExecution from './WorkoutExecution';
import ProgressionTable from './ProgressionTable';
import Stats from './Stats';

export default function Dashboard({ session }) {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('workout'); // 'workout' | 'stats'
  const [selectedDay, setSelectedDay] = useState(null);
  const [habits, setHabits] = useState({
    couch_stretch: false,
    chin_tucks: false,
    glute_bridge: false,
    child_pose: false,
    protein_170g: false
  });

  useEffect(() => {
    fetchTodayHabits();
  }, []);

  async function fetchTodayHabits() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('daily_habits')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', today)
      .single();

    if (data) {
      setHabits({
        couch_stretch: data.couch_stretch,
        chin_tucks: data.chin_tucks,
        glute_bridge: data.glute_bridge,
        child_pose: data.child_pose,
        protein_170g: data.protein_170g
      });
    }
    setLoading(false);
  }

  async function toggleHabit(key) {
    const newVal = !habits[key];
    const today = new Date().toISOString().split('T')[0];
    
    setHabits(prev => ({ ...prev, [key]: newVal }));

    const { error } = await supabase
      .from('daily_habits')
      .upsert({ 
        user_id: session.user.id, 
        date: today,
        ...habits,
        [key]: newVal 
      }, { onConflict: 'user_id,date' });

    if (error) {
      console.error(error);
      alert('Błąd zapisu nawyku');
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
        {view === 'workout' ? (
          <div className="p-6 space-y-10">
            {/* Korekta Postawy Widget */}
            <section>
              <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-4">🧘 Korekta Postawy</h2>
              <div className="space-y-2">
                {[
                  { id: 'couch_stretch', label: 'Couch stretch (2 min/str)' },
                  { id: 'chin_tucks', label: 'Chin tucks (20 powt.)' },
                  { id: 'glute_bridge', label: 'Glute bridge (1x20)' },
                  { id: 'child_pose', label: 'Child pose (2 min)' },
                  { id: 'protein_170g', label: 'Białko 170g' },
                ].map((habit) => (
                  <button 
                    key={habit.id}
                    onClick={() => toggleHabit(habit.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                      habits[habit.id] 
                        ? 'bg-dayC/10 border-dayC/30 text-dayC' 
                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="text-sm font-bold uppercase tracking-tight">{habit.label}</span>
                    {habits[habit.id] ? <CheckCircle2 size={20} /> : <Circle size={20} className="opacity-20" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Treningi Widget */}
            <section>
              <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-4">🏋️ Plan Treningowy</h2>
              <div className="grid gap-3">
                {[
                  { key: 'A', title: 'Dzień A', sub: 'Góra Ciężka', color: 'dayA' },
                  { key: 'B', title: 'Dzień B', sub: 'Plecy + Barki', color: 'dayB' },
                  { key: 'C', title: 'Dzień C', sub: 'Nogi (Siła)', color: 'dayC' },
                  { key: 'D', title: 'Dzień D', sub: 'Lekki Bench', color: 'dayD' },
                ].map((day) => (
                  <button 
                    key={day.key}
                    onClick={() => setSelectedDay(day.key)}
                    className={`card text-left flex items-center justify-between group hover:bg-neutral-900 transition-all border-l-4 border-l-${day.color}`}
                  >
                    <div>
                      <h3 className="font-black text-white uppercase italic">{day.title}</h3>
                      <p className="text-[10px] text-neutral-500 font-bold uppercase">{day.sub}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-700 group-hover:text-primary transition-colors">
                      <Play size={16} fill="currentColor" />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Progresja Widget */}
            <section>
              <h2 className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase mb-4">📈 Planowana Progresja</h2>
              <ProgressionTable />
            </section>
          </div>
        ) : (
          <Stats session={session} />
        )}
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
      </nav>

    </div>
  );
}


