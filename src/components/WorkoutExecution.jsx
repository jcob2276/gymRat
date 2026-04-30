import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2, ChevronRight, Play, Timer, Save } from 'lucide-react';
import { WORKOUT_PLAN } from '../data/workoutPlan';

export default function WorkoutExecution({ dayKey, session, onBack }) {
  const plan = WORKOUT_PLAN[dayKey];
  const [logs, setLogs] = useState({}); // { exerciseId: [{ weight, reps, rpe, isDone }] }
  const [startTime, setStartTime] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);
  const [restTime, setRestTime] = useState(0);
  const [isResting, setIsResting] = useState(false);

  // Timer logic for rest
  useEffect(() => {
    let interval;
    if (isResting) {
      interval = setInterval(() => {
        setRestTime(prev => prev + 1);
      }, 1000);
    } else {
      setRestTime(0);
    }
    return () => clearInterval(interval);
  }, [isResting]);

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(`workout_draft_${dayKey}`);
    if (draft) {
      const { logs: savedLogs, startTime: savedStart, notes: savedNotes } = JSON.parse(draft);
      if (confirm('Masz niezapisany postęp z tego treningu. Czy chcesz go przywrócić?')) {
        setLogs(savedLogs);
        setStartTime(savedStart ? new Date(savedStart) : null);
        setSessionNotes(savedNotes || '');
      } else {
        localStorage.removeItem(`workout_draft_${dayKey}`);
      }
    }
  }, [dayKey]);

  // Save draft on every change
  useEffect(() => {
    if (startTime) {
      localStorage.setItem(`workout_draft_${dayKey}`, JSON.stringify({
        logs,
        startTime,
        notes: sessionNotes
      }));
    }
  }, [logs, startTime, sessionNotes, dayKey]);

  const handleStart = () => {
    setStartTime(new Date());
  };

  const updateSet = (exerciseId, setIdx, field, value) => {
    setLogs(prev => {
      const exerciseLogs = prev[exerciseId] || Array(plan.exercises.find(e => e.id === exerciseId).sets).fill({ weight: '', reps: '', rpe: '', isDone: false });
      const newLogs = [...exerciseLogs];
      newLogs[setIdx] = { ...newLogs[setIdx], [field]: value };
      
      // Auto-start rest timer if weight and reps are filled
      if (newLogs[setIdx].weight && newLogs[setIdx].reps && !newLogs[setIdx].timerStarted) {
        setIsResting(true);
        setRestTime(0);
        newLogs[setIdx].timerStarted = true;
      }
      
      return { ...prev, [exerciseId]: newLogs };
    });
  };

  const finishWorkout = async () => {
    setIsFinishing(true);
    try {
      const endTime = new Date();
      const duration = startTime ? Math.floor((endTime - startTime) / 60000) : 0;

      // 1. Create session
      const { data: sessionData, error: sError } = await supabase
        .from('workout_sessions')
        .insert([{ 
          user_id: session.user.id, 
          workout_day: dayKey,
          duration_minutes: duration,
          session_notes: sessionNotes
        }])
        .select()
        .single();

      if (sError) throw sError;

      // 2. Prepare logs
      const flatLogs = [];
      Object.entries(logs).forEach(([exId, sets]) => {
        const exercise = plan.exercises.find(e => e.id === Number(exId));
        sets.forEach((s, idx) => {
          // Save if weight and reps are present
          if (s.weight && s.reps) {
            flatLogs.push({
              session_id: sessionData.id,
              user_id: session.user.id,
              exercise_name: exercise.name,
              set_number: idx + 1,
              reps: Number(s.reps),
              weight: Number(s.weight),
              rpe: s.rpe ? Number(s.rpe) : null,
              is_pws_or_msp: false 
            });
          }
        });
      });

      if (flatLogs.length > 0) {
        const { error: lError } = await supabase.from('exercise_logs').insert(flatLogs);
        if (lError) throw lError;
      }

      localStorage.removeItem(`workout_draft_${dayKey}`);
      alert(`Trening zapisany! Czas: ${duration} min.`);
      onBack();
    } catch (err) {
      console.error(err);
      alert('Błąd zapisu: ' + err.message);
    } finally {
      setIsFinishing(false);
    }
  };

  if (!startTime) {
    return (
      <div className="min-h-screen bg-background text-white p-6 flex flex-col">
        <button onClick={onBack} className="flex items-center gap-2 text-neutral-500 mb-8">
          <ArrowLeft size={20} /> Wróć
        </button>
        <div className={`w-12 h-1 px-3 py-1 rounded-full bg-${plan.color} mb-4`}></div>
        <h1 className="text-3xl font-black uppercase mb-2">{plan.title}</h1>
        <p className="text-neutral-400 mb-8">{plan.subtitle}</p>

        <div className="space-y-4 mb-12">
          {plan.exercises.map(ex => (
            <div key={ex.id} className="flex justify-between items-center border-b border-neutral-900 pb-2">
              <span className="text-sm font-medium">{ex.name}</span>
              <span className="text-xs text-neutral-600">{ex.sets}x{ex.reps}</span>
            </div>
          ))}
        </div>

        <button onClick={handleStart} className="btn-primary mt-auto w-full flex items-center justify-center gap-2 py-4">
          <Play size={20} fill="currentColor" /> Rozpocznij trening
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white flex flex-col relative">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={onBack} className="flex items-center gap-1 p-2 text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Zakończ sesję</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1">
            <Timer size={10} /> Aktywny trening
          </span>
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            {plan.title}
          </span>
        </div>
        <div className="w-16"></div>
      </div>

      {/* Main Workout List */}
      <main className="flex-1 p-4 space-y-12 pb-32">
        {plan.exercises.map((exercise, exIdx) => (
          <section key={exercise.id} className="space-y-4">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-xl font-black uppercase leading-none">{exercise.name}</h2>
                <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mt-1 block">
                  Tempo: {exercise.tempo} {exercise.msp ? `| MSP: ${exercise.msp}` : ''}
                </span>
              </div>
              <span className="text-[10px] font-black text-neutral-700 bg-neutral-900 px-2 py-1 rounded">
                EX {exIdx + 1}
              </span>
            </div>

            {/* Set Table */}
            <div className="space-y-2">
              <div className="grid grid-cols-[30px_1fr_1fr_1.5fr] gap-2 px-2 text-[8px] font-black uppercase text-neutral-600 tracking-widest">
                <span>Seria</span>
                <span className="text-center">KG</span>
                <span className="text-center">Reps</span>
                <span className="text-center">RPE</span>
              </div>
              
              {Array(exercise.sets).fill(0).map((_, idx) => {
                const setLog = logs[exercise.id]?.[idx] || { weight: '', reps: '', rpe: '' };
                const isCompleted = setLog.weight && setLog.reps;
                return (
                  <div key={idx} className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${isCompleted ? 'bg-primary/5 border-primary/20 opacity-80' : 'bg-neutral-950 border-neutral-900'}`}>
                    <div className="w-[30px] text-[10px] font-black text-neutral-700 text-center">{idx + 1}</div>
                    
                    <input 
                      type="number" 
                      placeholder="--"
                      value={setLog.weight}
                      onChange={(e) => updateSet(exercise.id, idx, 'weight', e.target.value)}
                      className="w-full bg-neutral-900 border-none rounded p-2 text-center text-sm font-black focus:ring-1 focus:ring-primary outline-none"
                    />
                    
                    <input 
                      type="number" 
                      placeholder="--"
                      value={setLog.reps}
                      onChange={(e) => updateSet(exercise.id, idx, 'reps', e.target.value)}
                      className="w-full bg-neutral-900 border-none rounded p-2 text-center text-sm font-black focus:ring-1 focus:ring-primary outline-none"
                    />

                    <div className="flex gap-0.5 overflow-x-auto no-scrollbar justify-center">
                      {[7, 8, 9, 10].map(v => (
                        <button
                          key={v}
                          onClick={() => updateSet(exercise.id, idx, 'rpe', v)}
                          className={`w-6 h-6 rounded text-[8px] font-black transition-colors ${setLog.rpe == v ? 'bg-primary text-white' : 'bg-neutral-800 text-neutral-500'}`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Notes & Finish */}
        <section className="space-y-4 pt-12">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Podsumowanie Treningu</h3>
          <textarea 
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Notatki z sesji..."
            className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm focus:outline-none focus:border-primary min-h-[100px]"
          />
          <button 
            disabled={isFinishing}
            onClick={finishWorkout} 
            className="btn-primary w-full py-5 uppercase font-black tracking-widest flex items-center justify-center gap-2 text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)]"
          >
            {isFinishing ? 'Zapisywanie...' : <><Save size={24} /> Zapisz Trening</>}
          </button>
        </section>
      </main>

      {/* Floating Rest Timer */}
      {isResting && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button 
            onClick={() => setIsResting(false)}
            className="bg-primary text-white px-6 py-3 rounded-full font-black shadow-2xl flex items-center gap-3 border-4 border-background"
          >
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            REST: {Math.floor(restTime / 60)}:{(restTime % 60).toString().padStart(2, '0')}
            <span className="text-[10px] opacity-50 uppercase ml-2">Kliknij by zamknąć</span>
          </button>
        </div>
      )}
    </div>
  );
}
