import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, CheckCircle2, ChevronRight, Play } from 'lucide-react';
import { WORKOUT_PLAN } from '../data/workoutPlan';

export default function WorkoutExecution({ dayKey, session, onBack }) {
  const plan = WORKOUT_PLAN[dayKey];
  const [currentStep, setCurrentStep] = useState(0); // 0: intro, 1+: exercises
  const [logs, setLogs] = useState({}); // { exerciseId: [{ weight, reps, isDone }] }
  const [isFinishing, setIsFinishing] = useState(false);

  const currentExercise = plan.exercises[currentStep - 1];

  const handleStart = () => {
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
      // 1. Create session
      const { data: sessionData, error: sError } = await supabase
        .from('workout_sessions')
        .insert([{ user_id: session.user.id, workout_day: dayKey }])
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
              is_pws_or_msp: false // logic to determine this later
            });
          }
        });
      });

      if (flatLogs.length > 0) {
        const { error: lError } = await supabase.from('exercise_logs').insert(flatLogs);
        if (lError) throw lError;
      }

      alert('Trening zapisany pomyślnie!');
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
        <button onClick={() => setCurrentStep(prev => prev - 1)} className="p-2 text-neutral-500">
          <ArrowLeft size={20} />
        </button>
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
          Ćwiczenie {currentStep} z {plan.exercises.length}
        </span>
        <div className="w-10"></div>
      </div>

      {/* Exercise Info */}
      <main className="flex-1 p-6">
        <h2 className="text-2xl font-black uppercase mb-1">{currentExercise.name}</h2>
        <div className="flex gap-4 mb-8">
          <div className="bg-neutral-900 px-3 py-1 rounded-md text-[10px] font-bold text-neutral-400 uppercase border border-neutral-800">
            Tempo: {currentExercise.tempo}
          </div>
          {currentExercise.msp && (
            <div className="bg-dayB/10 px-3 py-1 rounded-md text-[10px] font-bold text-dayB uppercase border border-dayB/30">
              MSP: {currentExercise.msp}
            </div>
          )}
        </div>

        {/* Set Tracker */}
        <div className="space-y-3">
          {Array(currentExercise.sets).fill(0).map((_, idx) => {
            const setLog = logs[currentExercise.id]?.[idx] || { weight: '', reps: '', isDone: false };
            return (
              <div key={idx} className={`card p-4 flex items-center gap-4 transition-all ${setLog.isDone ? 'opacity-40 border-neutral-900' : 'border-neutral-800'}`}>
                <div className="w-8 h-8 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-500">
                  {idx + 1}
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <input 
                      type="number" 
                      placeholder="kg"
                      value={setLog.weight}
                      onChange={(e) => updateSet(currentExercise.id, idx, 'weight', e.target.value)}
                      className="bg-transparent border-b border-neutral-800 w-full focus:border-primary outline-none text-center"
                    />
                  </div>
                  <div>
                    <input 
                      type="number" 
                      placeholder="reps"
                      value={setLog.reps}
                      onChange={(e) => updateSet(currentExercise.id, idx, 'reps', e.target.value)}
                      className="bg-transparent border-b border-neutral-800 w-full focus:border-primary outline-none text-center"
                    />
                  </div>
                </div>
                <button 
                  onClick={() => toggleSetDone(currentExercise.id, idx)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${setLog.isDone ? 'bg-primary text-white' : 'bg-neutral-900 text-neutral-700'}`}
                >
                  <CheckCircle2 size={24} />
                </button>
              </div>
            );
          })}
        </div>
        
        {currentExercise.notes && (
          <p className="mt-6 text-sm text-neutral-500 italic">Uwagi: {currentExercise.notes}</p>
        )}
      </main>

      {/* Footer Navigation */}
      <footer className="p-4 border-t border-neutral-800 bg-background/80 backdrop-blur-md sticky bottom-0">
        {isLastExercise ? (
          <button 
            disabled={isFinishing}
            onClick={finishWorkout} 
            className="btn-primary w-full py-4 uppercase font-black tracking-widest"
          >
            {isFinishing ? 'Zapisywanie...' : 'Zakończ trening'}
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
