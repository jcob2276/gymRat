import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2, ChevronRight, Play, Timer, Save } from 'lucide-react';
import { WORKOUT_PLAN } from '../data/workoutPlan';

export default function WorkoutExecution({ dayKey, session, onBack }) {
  const plan = WORKOUT_PLAN[dayKey];
  const [currentStep, setCurrentStep] = useState(0); // 0: intro, 1+: exercises
  const [logs, setLogs] = useState({}); // { exerciseId: [{ weight, reps, isDone }] }
  const [startTime, setStartTime] = useState(null);
  const [sessionNotes, setSessionNotes] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const currentExercise = plan.exercises[currentStep - 1];

  // Load draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(`workout_draft_${dayKey}`);
    if (draft) {
      const { logs: savedLogs, currentStep: savedStep, startTime: savedStart, notes: savedNotes } = JSON.parse(draft);
      if (confirm('Masz niezapisany postęp z tego treningu. Czy chcesz go przywrócić?')) {
        setLogs(savedLogs);
        setCurrentStep(savedStep);
        setStartTime(savedStart ? new Date(savedStart) : null);
        setSessionNotes(savedNotes || '');
      } else {
        localStorage.removeItem(`workout_draft_${dayKey}`);
      }
    }
  }, [dayKey]);

  // Save draft on every change
  useEffect(() => {
    if (currentStep > 0) {
      localStorage.setItem(`workout_draft_${dayKey}`, JSON.stringify({
        logs,
        currentStep,
        startTime,
        notes: sessionNotes
      }));
    }
  }, [logs, currentStep, startTime, sessionNotes, dayKey]);

  const handleStart = () => {
    setStartTime(new Date());
    setCurrentStep(1);
  };

  const updateSet = (exerciseId, setIdx, field, value) => {
    setLogs(prev => {
      const exerciseLogs = prev[exerciseId] || Array(plan.exercises.find(e => e.id === exerciseId).sets).fill({ weight: '', reps: '', isDone: false });
      const newLogs = [...exerciseLogs];
      newLogs[setIdx] = { ...newLogs[setIdx], [field]: value };
      return { ...prev, [exerciseId]: newLogs };
    });
  };

  const toggleSetDone = (exerciseId, setIdx) => {
    setLogs(prev => {
      const exerciseLogs = prev[exerciseId] || Array(plan.exercises.find(e => e.id === exerciseId).sets).fill({ weight: '', reps: '', isDone: false });
      const newLogs = [...exerciseLogs];
      newLogs[setIdx] = { ...newLogs[setIdx], isDone: !newLogs[setIdx].isDone };
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
          if (s.isDone) {
            flatLogs.push({
              session_id: sessionData.id,
              user_id: session.user.id,
              exercise_name: exercise.name,
              set_number: idx + 1,
              reps: Number(s.reps),
              weight: Number(s.weight),
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

  if (currentStep === 0) {
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

  const isLastExercise = currentStep === plan.exercises.length;

  return (
    <div className="min-h-screen bg-background text-white flex flex-col relative">
      {/* Top Header */}
      <div className="p-4 border-b border-neutral-800 flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={() => setCurrentStep(prev => prev - 1)} className="flex items-center gap-1 p-2 text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft size={18} />
          <span className="text-[10px] font-black uppercase tracking-tighter">Poprzednie</span>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
            Ćwiczenie {currentStep} z {plan.exercises.length}
          </span>
          {startTime && (
            <span className="text-[8px] text-primary font-black uppercase flex items-center gap-1">
              <Timer size={10} /> Aktywny trening
            </span>
          )}
        </div>
        <div className="w-16"></div> {/* Spacer to balance the header */}
      </div>

      {/* Exercise Info */}
      <main className="flex-1 p-6 space-y-8">
        <section>
          <h2 className="text-2xl font-black uppercase mb-1">{currentExercise.name}</h2>
          <div className="flex gap-4 mb-4">
            <div className="bg-neutral-900 px-3 py-1 rounded-md text-[10px] font-bold text-neutral-400 uppercase border border-neutral-800">
              Tempo: {currentExercise.tempo}
            </div>
            {currentExercise.msp && (
              <div className="bg-dayB/10 px-3 py-1 rounded-md text-[10px] font-bold text-dayB uppercase border border-dayB/30">
                MSP: {currentExercise.msp}
              </div>
            )}
          </div>
        </section>

        {/* Set Tracker */}
        <div className="space-y-3">
          {Array(currentExercise.sets).fill(0).map((_, idx) => {
            const setLog = logs[currentExercise.id]?.[idx] || { weight: '', reps: '', isDone: false };
            return (
              <div key={idx} className={`card p-4 flex items-center gap-4 transition-all ${setLog.isDone ? 'opacity-40 border-neutral-900 bg-neutral-900/20' : 'border-neutral-800'}`}>
                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                  {idx + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <input 
                    type="number" 
                    placeholder="kg"
                    value={setLog.weight}
                    onChange={(e) => updateSet(currentExercise.id, idx, 'weight', e.target.value)}
                    className="bg-transparent border-b border-neutral-800 w-full focus:border-primary outline-none text-center text-lg font-black"
                  />
                  <input 
                    type="number" 
                    placeholder="reps"
                    value={setLog.reps}
                    onChange={(e) => updateSet(currentExercise.id, idx, 'reps', e.target.value)}
                    className="bg-transparent border-b border-neutral-800 w-full focus:border-primary outline-none text-center text-lg font-black"
                  />
                </div>
                <button 
                  onClick={() => toggleSetDone(currentExercise.id, idx)}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${setLog.isDone ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-neutral-900 text-neutral-700'}`}
                >
                  <CheckCircle2 size={28} />
                </button>
              </div>
            );
          })}
        </div>

        {isLastExercise && (
          <section className="space-y-3 pt-8">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Notatki z sesji</h3>
            <textarea 
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              placeholder="Jak się czułeś? Coś do poprawy?"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4 text-sm focus:outline-none focus:border-primary min-h-[100px]"
            />
          </section>
        )}
        
        {currentExercise.notes && (
          <p className="text-xs text-neutral-500 italic bg-neutral-900/30 p-3 rounded-lg border border-neutral-800/50">
            💡 Podpowiedź: {currentExercise.notes}
          </p>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="p-4 border-t border-neutral-800 bg-background/80 backdrop-blur-md sticky bottom-0">
        {isLastExercise ? (
          <button 
            disabled={isFinishing}
            onClick={finishWorkout} 
            className="btn-primary w-full py-4 uppercase font-black tracking-widest flex items-center justify-center gap-2"
          >
            {isFinishing ? 'Zapisywanie...' : <><Save size={20} /> Zakończ i zapisz</>}
          </button>
        ) : (
          <button 
            onClick={() => setCurrentStep(prev => prev + 1)} 
            className="btn-outline w-full py-4 flex items-center justify-center gap-2 uppercase font-black tracking-widest"
          >
            Następne ćwiczenie <ChevronRight size={20} />
          </button>
        )}
      </footer>
    </div>
  );
}

