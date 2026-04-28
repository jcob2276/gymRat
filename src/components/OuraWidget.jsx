import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncOuraData } from '../lib/oura';
import { Battery, Moon, Footprints, Star, RefreshCw, Key, Plus } from 'lucide-react';

export default function OuraWidget({ session }) {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [data, setData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tempToken, setTempToken] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch settings
      const { data: userSettings, error: settingsError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (!settingsError) {
        setSettings(userSettings);
      }

      // 2. Fetch 2 most recent summaries
      const { data: summaries, error: summaryError } = await supabase
        .from('oura_daily_summary')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false })
        .limit(2);
      
      if (!summaryError && summaries) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayRecord = summaries.find(s => s.date === todayStr);
        const yesterdayRecord = summaries.find(s => s.date !== todayStr);
        
        setData({
          today: todayRecord || null,
          yesterday: yesterdayRecord || null
        });
      }
    } catch (err) {
      console.error('Error fetching Oura data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    if (!settings?.oura_token) {
      setShowTokenInput(true);
      return;
    }

    setSyncing(true);
    const res = await syncOuraData(session.user.id, settings.oura_token);
    if (res.success) {
      await fetchData();
    } else {
      alert('Błąd synchronizacji: ' + res.error);
    }
    setSyncing(false);
  }

  async function saveToken() {
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: session.user.id, oura_token: tempToken });
    
    if (error) alert(error.message);
    else {
      setShowTokenInput(false);
      setSettings({ ...settings, oura_token: tempToken });
      alert('Token zapisany!');
    }
  }

  if (loading) return null;

  if (!settings?.oura_token && !showTokenInput) {
    return (
      <button 
        onClick={() => setShowTokenInput(true)}
        className="card w-full flex items-center justify-between p-4 border-dashed border-neutral-700 bg-neutral-900/20 text-neutral-500 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-3">
          <Key size={20} />
          <span className="text-[10px] font-bold uppercase tracking-widest">Połącz z Oura Ring</span>
        </div>
        <Plus size={16} />
      </button>
    );
  }

  if (showTokenInput) {
    return (
      <div className="card space-y-4">
        <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Konfiguracja Oura PAT</h3>
        <input 
          type="password" 
          value={tempToken}
          onChange={e => setTempToken(e.target.value)}
          placeholder="Wklej Personal Access Token..."
          className="input"
        />
        <div className="flex gap-2">
          <button onClick={saveToken} className="btn-primary flex-1 py-2 text-[10px]">Zapisz</button>
          <button onClick={() => setShowTokenInput(false)} className="btn-outline flex-1 py-2 text-[10px]">Anuluj</button>
        </div>
      </div>
    );
  }

  const activeReadiness = data?.today?.readiness_score || data?.yesterday?.readiness_score;
  const activeSleep = (data?.today?.total_sleep_hours > 0) ? data?.today : data?.yesterday;
  const activeSteps = data?.yesterday; // Zawsze wczorajsze kroki jako pełny dzień

  const sleepHours = Math.floor(activeSleep?.total_sleep_hours || 0);
  const sleepMinutes = Math.round(((activeSleep?.total_sleep_hours || 0) % 1) * 60);

  return (
    <div className="space-y-4">
      
      {/* Readiness Widget */}
      <section className="card bg-gradient-to-br from-neutral-900 to-neutral-950 overflow-hidden relative border-primary/20 shadow-lg shadow-primary/5">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <Battery size={18} className={activeReadiness < 70 ? 'text-red-500' : 'text-primary'} />
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Gotowość Oura</h3>
          </div>
          <button onClick={handleSync} disabled={syncing} className={`text-neutral-500 hover:text-white ${syncing ? 'animate-spin' : ''}`}>
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-end gap-4 mb-4">
          <span className="text-4xl font-black text-white italic">{activeReadiness || '--'}</span>
          <div className="pb-1">
            {activeReadiness ? (
              activeReadiness < 70 
                ? <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter italic">⚠️ Niska. Sugeruję deload (70%)</p>
                : <p className="text-[10px] font-black text-primary uppercase tracking-tighter italic">✅ Możesz trenować normalnie</p>
            ) : <p className="text-[10px] text-neutral-600 uppercase">Brak danych</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Moon size={10} className="text-dayB" />
                <span className="text-[7px] font-bold text-neutral-600 uppercase">Sen</span>
              </div>
              <span className="text-[6px] text-neutral-700 font-bold uppercase">{activeSleep?.date === data?.today?.date ? 'Dziś' : 'Wczoraj'}</span>
            </div>
            <p className="text-xs font-black text-white">{sleepHours}h {sleepMinutes}m</p>
            {activeSleep?.total_sleep_hours < 7 && <p className="text-[7px] text-red-500 font-bold uppercase mt-0.5">Za krótko!</p>}
          </div>

          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Footprints size={10} className="text-dayC" />
                <span className="text-[7px] font-bold text-neutral-600 uppercase">Kroki</span>
              </div>
              <span className="text-[6px] text-neutral-700 font-bold uppercase">Wczoraj</span>
            </div>
            <p className="text-xs font-black text-white">{activeSteps?.steps?.toLocaleString() || '--'}</p>
            {activeSteps?.steps < 10000 && <p className="text-[7px] text-orange-500 font-bold uppercase mt-0.5">Dołóż spacer</p>}
          </div>

          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Star size={10} className="text-dayD" />
                <span className="text-[7px] font-bold text-neutral-600 uppercase">Streak</span>
              </div>
            </div>
            <p className="text-xs font-black text-white">{settings?.disciplined_streak || 0} dni</p>
            <p className="text-[6px] text-neutral-700 font-bold uppercase mt-0.5 truncate">Sen przed 23:30</p>
          </div>
        </div>
      </section>

    </div>
  );
}
