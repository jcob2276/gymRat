import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Fingerprint, Dna, Compass, Target, BookOpen, Users, Save, ChevronLeft, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

const SECTIONS = [
  { id: 'identity', title: '1. Tożsamość', icon: Fingerprint, placeholder: 'Kim jestem szczerze, nie aspiracyjnie...\nMoje mocne strony...\nMoje słabości...\nBłędy poznawcze...\nWzorce zachowań...' },
  { id: 'philosophy', title: '2. Wartości i Filozofia', icon: Dna, placeholder: 'Co jest najważniejsze?\nPieniądze i inwestowanie...\nRelacje...\nZasady...\nCzego nigdy nie zrobię...' },
  { id: 'vision', title: '3. Wizja', icon: Compass, placeholder: 'Życie za 5 lat...\nJakiej dziewczyny szukam...\nGdzie chcę mieszkać...\nBucket list...' },
  { id: 'finances', title: '4. Praca i Finanse', icon: Target, placeholder: 'Zawodowo...\nStrategia inwestycyjna...\nŹródła dochodu...\nUmiejętności...' },
  { id: 'knowledge', title: '5. Wiedza', icon: BookOpen, placeholder: 'Książki i wnioski...\nPodcasty...\nLekcje życiowe...\nCo chcę umieć...' },
  { id: 'relationships', title: '6. Relacje', icon: Users, placeholder: 'Ludzie energetyzujący vs wyczerpujący...\nCo chcę dawać innym...\nSpołeczność...' },
];

export default function Fundament({ onBack }) {
  const { session } = useStore();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState(null);

  useEffect(() => {
    fetchFundament();
  }, []);

  async function fetchFundament() {
    try {
      const { data: fundament, error } = await supabase
        .from('user_fundament')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (fundament) {
        setData(fundament);
      } else {
        // Create if doesn't exist
        await supabase.from('user_fundament').insert({ user_id: session.user.id });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Autosave logic (debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading && Object.keys(data).length > 0) {
        saveFundament();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [data]);

  async function saveFundament() {
    setSaving(true);
    try {
      const updateData = { ...data, updated_at: new Date().toISOString() };
      delete updateData.user_id; // Don't update PK
      
      await supabase
        .from('user_fundament')
        .update(updateData)
        .eq('user_id', session.user.id);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setSaving(false), 500);
    }
  }

  const handleChange = (id, value) => {
    setData(prev => ({ ...prev, [id]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="p-6 border-b border-neutral-800 flex justify-between items-center sticky top-0 bg-background/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-neutral-900 rounded-full text-neutral-400">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white uppercase italic tracking-tighter">Fundament Tożsamości</h1>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-2">
              {saving ? <><Loader2 size={10} className="animate-spin" /> Zapisywanie...</> : 'Wszystkie zmiany zapisane'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            
            return (
              <div 
                key={section.id}
                className={`transition-all duration-500 ${isActive ? 'md:col-span-2' : ''}`}
              >
                <div className={`card group border-neutral-800 transition-all ${isActive ? 'ring-2 ring-primary bg-neutral-900/50' : 'hover:border-neutral-700'}`}>
                  <div className="p-5 flex items-center justify-between border-b border-neutral-800/50">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl bg-neutral-900 text-primary transition-transform group-hover:scale-110`}>
                        <Icon size={18} />
                      </div>
                      <h2 className="text-xs font-black text-white uppercase tracking-widest">{section.title}</h2>
                    </div>
                  </div>
                  <textarea
                    value={data[section.id] || ''}
                    onChange={(e) => handleChange(section.id, e.target.value)}
                    onFocus={() => setActiveSection(section.id)}
                    onBlur={() => setActiveSection(null)}
                    placeholder={section.placeholder}
                    className="w-full bg-transparent p-5 text-sm text-neutral-300 placeholder:text-neutral-700 focus:outline-none min-h-[150px] md:min-h-[200px] resize-none leading-relaxed font-medium"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <footer className="mt-12 text-center">
          <p className="text-[10px] font-black text-neutral-600 uppercase italic tracking-[0.2em]">
            Prawda o sobie to najpotężniejsza broń.
          </p>
        </footer>
      </main>
    </div>
  );
}
