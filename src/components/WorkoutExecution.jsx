import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Timer, CheckCircle2, ChevronRight, Play, AlertTriangle, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';
import workoutPlan from '../data/workoutPlan';

export default function WorkoutExecution({ session, dayKey, onBack }) {
  const plan = workoutPlan.days[dayKey];
  const [startTime] = useState(new Date());
  const [exercises, setExercises] = useState(
    plan.exercises.map(ex => ({
      ...ex,
      sets: Array(ex.setsCount).fill({ weight: '', reps: '', rpe: '' })
    }))
  );
  const [activeExerciseIdx, setActiveExerciseIdx] = useState(0);
  const [restTimer, setRestTimer] = useState(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [showMspPrompt, setShowMspPrompt] = useState(false);
  const [mspFeedback, setMspFeedback] = useState(null);

  useEffect(() => {
    let interval;
    if (restTimer > 0) {
      interval = setInterval(() => setRestTimer(prev => prev - 1), 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const updateSet = (exIdx, setIdx, field, value) => {
    const newEx = [...exercises];
    const newSets = [...newEx[exIdx].sets];
    newSets[setIdx] = { ...newSets[setIdx], [field]: value };
    newEx[exIdx].sets = newSets;
    setExercises(newEx);

    // Auto-save draft
    localStorage.setItem(`workout_draft_${dayKey}`, JSON.stringify(newEx));

    // Auto-rest timer trigger
    if (field === 'reps' && value !== '' && newSets[setIdx].weight !== '') {
      setRestTimer(90);
      
      // MSP Check trigger for Heavy Bench
      if (newEx[exIdx].name.includes('Wyciskanie płaskie (Heavy)') && setIdx === newEx[exIdx].setsCount - 1) {
        setShowMspPrompt(true);
      }
    }
  };

  async function finishWorkout() {
    setIsFinishing(true);
    try {
      const endTime = new Date();
      const { data: sessionData } = await supabase.from('workout_sessions').insert([{ 
        user_id: session.user.id, 
        workout_day: dayKey,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        session_notes: sessionNotes,
        msp_passed: mspFeedback
      }]).select();

      const sessionId = sessionData[0].id;
      const logs = exercises.flatMap(ex => 
        ex.sets.filter(s => s.weight && s.reps).map((s, idx) => ({
          session_id: sessionId,
          user_id: session.user.id,
          exercise_name: ex.name,
          set_number: idx + 1,
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps),
          rpe: s.rpe ? parseFloat(s.rpe) : null
        }))
      );

      await supabase.from('exercise_logs').insert(logs);
      localStorage.removeItem(`workout_draft_${dayKey}`);
      alert('Trening zapisany!');
      onBack();
    } catch (err) {
      alert(err.message);
    } finally { setIsFinishing(false); }
  }

  return (
    <div className="flex-1 bg-background pb-32">
      {/* Fixed Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-neutral-900 p-4 flex justify-between items-center">
        <button onClick={onBack} className="p-2 text-neutral-400 hover:text-white"><ChevronRight className="rotate-180" /></button>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-dayB rounded-full animate-pulse shadow-[0_0_8px_rgba(192,57,43,0.8)]" />
            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Session</span>
          </div>
          <span className="text-[10px] font-bold text-neutral-500 uppercase mt-0.5">{plan.title}</span>
        </div>
        <button onClick={finishWorkout} disabled={isFinishing} className="bg-primary text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest">{isFinishing ? '...' : 'Zakończ'}</button>
      </header>

      <div className="p-4 space-y-8">
        {exercises.map((ex, exIdx) => (
          <section key={exIdx} className={`space-y-4 transition-opacity ${activeExerciseIdx === exIdx ? 'opacity-100' : 'opacity-40'}`} onClick={() => setActiveExerciseIdx(exIdx)}>
            <header className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black uppercase italic text-white tracking-tighter">{ex.name}</h3>
                <p className="text-[10px] text-primary font-bold uppercase">{ex.target}</p>
              </div>
            </header>

            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 px-2 text-[8px] font-black text-neutral-600 uppercase tracking-widest">
                <span>Seria</span><span>KG</span><span>Reps</span><span>RPE</span>
              </div>
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className="grid grid-cols-4 gap-2 bg-neutral-900/30 p-2 rounded-xl border border-neutral-900/50">
                  <div className="flex items-center justify-center text-xs font-black text-neutral-500">{setIdx + 1}</div>
                  <input type="number" placeholder="0" value={set.weight} onChange={(e) => updateSet(exIdx, setIdx, 'weight', e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-black text-white text-center outline-none focus:border-primary" />
                  <input type="number" placeholder="0" value={set.reps} onChange={(e) => updateSet(exIdx, setIdx, 'reps', e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-black text-white text-center outline-none focus:border-primary" />
                  <input type="number" placeholder="-" value={set.rpe} onChange={(e) => updateSet(exIdx, setIdx, 'rpe', e.target.value)} className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 text-sm font-black text-white text-center outline-none focus:border-primary" />
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="space-y-3 pt-8 border-t border-neutral-900">
          <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest flex items-center gap-2"><MessageSquare size={12} /> Notatki z sesji</label>
          <textarea value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} placeholder="Jak się czułeś? Coś bolało? Jakieś rekordy?" className="w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-4 text-sm text-white min-h-[120px] outline-none focus:border-primary transition-colors" />
        </section>
      </div>

      {/* Floating Rest Timer */}
      {restTimer !== null && (
        <div className="fixed bottom-24 right-4 bg-primary text-white px-6 py-3 rounded-full font-black shadow-2xl shadow-primary/40 flex items-center gap-3 animate-bounce">
          <Clock size={18} /> {Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}
        </div>
      )}

      {/* MSP Prompt Modal */}
      {showMspPrompt && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-neutral-950 border-2 border-primary p-8 rounded-3xl w-full max-w-sm space-y-6 text-center shadow-[0_0_50px_rgba(59,130,246,0.3)]">
            <Trophy className="mx-auto text-primary" size={48} />
            <h3 className="text-xl font-black uppercase italic text-white tracking-tight">MSP CHECK</h3>
            <p className="text-xs text-neutral-400 font-bold uppercase leading-relaxed">Czy ostatnie 2-3 powtórzenia były wyraźnie wolniejsze (MSP)?</p>
            <div className="flex gap-4">
              <button onClick={() => { setMspFeedback(true); setShowMspPrompt(false); }} className="flex-1 bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">TAK</button>
              <button onClick={() => { setMspFeedback(false); setShowMspPrompt(false); }} className="flex-1 bg-neutral-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs">NIE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
