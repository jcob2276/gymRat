import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { syncOuraData } from '../lib/oura';
import { Battery, Moon, Footprints, Star, RefreshCw, Key } from 'lucide-react';

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
    
    // 1. Fetch settings
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();
    
    setSettings(userSettings);

    // 2. Fetch today's summary
    const today = new Date().toISOString().split('T')[0];
    const { data: summary } = await supabase
      .from('oura_daily_summary')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('date', today)
      .single();
    
    setData(summary);
    setLoading(false);
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

  const sleepHours = Math.floor(data?.total_sleep_hours || 0);
  const sleepMinutes = Math.round(((data?.total_sleep_hours || 0) % 1) * 60);

  return (
    <div className="space-y-4">
      
      {/* Readiness Widget */}
      <section className="card bg-gradient-to-br from-neutral-900 to-neutral-950 overflow-hidden relative">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-2">
            <Battery size={18} className={data?.readiness_score < 70 ? 'text-red-500' : 'text-primary'} />
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Gotowość Oura</h3>
          </div>
          <button onClick={handleSync} disabled={syncing} className={`text-neutral-500 hover:text-white ${syncing ? 'animate-spin' : ''}`}>
            <RefreshCw size={14} />
          </button>
        </div>

        <div className="flex items-end gap-4 mb-4">
          <span className="text-4xl font-black text-white italic">{data?.readiness_score || '--'}</span>
          <div className="pb-1">
            {data?.readiness_score ? (
              data.readiness_score < 70 
                ? <p className="text-[10px] font-black text-red-500 uppercase tracking-tighter italic">⚠️ Niska. Sugeruję deload (70%)</p>
                : <p className="text-[10px] font-black text-primary uppercase tracking-tighter italic">✅ Możesz trenować normalnie</p>
            ) : <p className="text-[10px] text-neutral-600 uppercase">Brak danych na dziś</p>}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
            <div className="flex items-center gap-2 mb-1">
              <Moon size={12} className="text-dayB" />
              <span className="text-[8px] font-bold text-neutral-600 uppercase">Sen</span>
            </div>
            <p className="text-xs font-black text-white">{sleepHours}h {sleepMinutes}m</p>
            {data?.total_sleep_hours < 7 && <p className="text-[7px] text-red-500 font-bold uppercase mt-1">Za krótko!</p>}
          </div>

          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
            <div className="flex items-center gap-2 mb-1">
              <Footprints size={12} className="text-dayC" />
              <span className="text-[8px] font-bold text-neutral-600 uppercase">Kroki</span>
            </div>
            <p className="text-xs font-black text-white">{data?.steps?.toLocaleString() || '--'}</p>
            {data?.steps < 10000 && <p className="text-[7px] text-orange-500 font-bold uppercase mt-1">Dołóż spacer</p>}
          </div>

          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-900">
            <div className="flex items-center gap-2 mb-1">
              <Star size={12} className="text-dayD" />
              <span className="text-[8px] font-bold text-neutral-600 uppercase">Streak</span>
            </div>
            <p className="text-xs font-black text-white">{settings?.disciplined_streak || 0} dni</p>
            <p className="text-[7px] text-neutral-500 font-bold uppercase mt-1">Sen przed 23:30</p>
          </div>
        </div>
      </section>

    </div>
  );
}
