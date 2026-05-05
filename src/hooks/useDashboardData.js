import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfWeek } from 'date-fns';
import { useStore } from '../store/useStore';

export function useDashboardData() {
  const { session, setSyncing } = useStore();
  const [data, setData] = useState({
    mspFeedbackMap: {},
    lastDayASession: null,
    weeklyCalories: 0,
    todayWin: null,
    loading: true
  });

  const fetchData = useCallback(async () => {
    if (!session) return;
    
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

      const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const { data: nutrition } = await supabase
        .from('daily_nutrition')
        .select('calories')
        .gte('date', monday);
      
      const totalCal = nutrition?.reduce((sum, n) => sum + (n.calories || 0), 0) || 0;

      const lastA = sessions.find(s => s.workout_day === 'A');
      if (lastA) {
        lastA.benchLogs = lastA.exercise_logs.filter(l => l.exercise_name.includes('Wyciskanie płaskie'));
      }

      const today = format(new Date(), 'yyyy-MM-dd');
      const { data: todayData } = await supabase
        .from('daily_wins')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .single();
      
      setData({
        mspFeedbackMap: feedbackMap,
        lastDayASession: lastA,
        weeklyCalories: totalCal,
        todayWin: todayData,
        loading: false
      });
    }
  }, [session]);

  const syncYazio = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-yazio`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: session.user.id })
      });
      const res = await response.json();
      if (res.success) {
        await fetchData();
      } else {
        throw new Error(res.error);
      }
    } catch (err) {
      console.error('Yazio Sync Error:', err);
      alert('Błąd synchronizacji: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...data, refresh: fetchData, syncYazio };
}
