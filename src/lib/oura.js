import { supabase } from './supabase';
import { format, subDays, parseISO } from 'date-fns';

const OURA_BASE_URL = '/oura-api/v2/usercollection';

export async function syncOuraData(userId, token) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const startDate = format(subDays(new Date(), 3), 'yyyy-MM-dd'); // 3 days to catch up

  try {
    const headers = { 'Authorization': `Bearer ${token}` };

    // 1. Fetch Readiness
    const readinessRes = await fetch(`${OURA_BASE_URL}/daily_readiness?start_date=${startDate}&end_date=${today}`, { headers });
    const readinessData = await readinessRes.json();

    // 2. Fetch Sleep
    const sleepRes = await fetch(`${OURA_BASE_URL}/daily_sleep?start_date=${startDate}&end_date=${today}`, { headers });
    const sleepData = await sleepRes.json();

    // 3. Fetch Activity
    const activityRes = await fetch(`${OURA_BASE_URL}/daily_activity?start_date=${startDate}&end_date=${today}`, { headers });
    const activityData = await activityRes.json();

    // 4. Process and Upsert
    const summaries = {};

    readinessData.data?.forEach(item => {
      summaries[item.day] = { ...summaries[item.day], readiness_score: item.score, date: item.day };
    });

    sleepData.data?.forEach(item => {
      const totalHours = item.total_sleep_duration / 3600;
      summaries[item.day] = { 
        ...summaries[item.day], 
        total_sleep_hours: totalHours,
        bedtime_timestamp: item.bedtime_start,
        date: item.day 
      };
    });

    activityData.data?.forEach(item => {
      summaries[item.day] = { ...summaries[item.day], steps: item.steps, date: item.day };
    });

    const upsertData = Object.values(summaries).map(s => {
      // Check discipline (bedtime before 23:30)
      let isDisciplined = false;
      if (s.bedtime_timestamp) {
        const bedtime = new Date(s.bedtime_timestamp);
        const hours = bedtime.getHours();
        const minutes = bedtime.getMinutes();
        
        // Discipline: bedtime between 18:00 and 23:30
        // If hours is 0, 1, 2 etc. it's after midnight (not disciplined)
        // If hours is 23 and minutes >= 30, it's after 23:30 (not disciplined)
        if (hours >= 18 && (hours < 23 || (hours === 23 && minutes < 30))) {
           isDisciplined = true;
        }
      }

      return {
        user_id: userId,
        date: s.date,
        readiness_score: s.readiness_score || null,
        total_sleep_hours: s.total_sleep_hours ? parseFloat(s.total_sleep_hours.toFixed(2)) : null,
        steps: s.steps || null,
        bedtime_timestamp: s.bedtime_timestamp || null,
        is_disciplined: isDisciplined
      };
    });

    if (upsertData.length > 0) {
      const { error } = await supabase
        .from('oura_daily_summary')
        .upsert(upsertData, { onConflict: 'user_id,date' });
      
      if (error) throw error;
      
      // Update streak
      await updateDisciplinedStreak(userId);
    }

    return { success: true };
  } catch (error) {
    console.error('Oura sync error:', error);
    return { success: false, error: error.message };
  }
}

async function updateDisciplinedStreak(userId) {
  // Fetch all disciplined flags to calculate total and streak
  const { data: summaries } = await supabase
    .from('oura_daily_summary')
    .select('date, is_disciplined')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (!summaries || summaries.length === 0) return;

  // Calculate streak
  let streak = 0;
  for (const s of summaries) {
    if (s.is_disciplined) streak++;
    else if (s.date === format(new Date(), 'yyyy-MM-dd')) continue; // Ignore today if not yet disciplined
    else break;
  }

  const totalDisciplined = summaries.filter(s => s.is_disciplined).length;

  await supabase
    .from('user_settings')
    .upsert({ 
      user_id: userId, 
      disciplined_streak: streak,
      total_disciplined_days: totalDisciplined,
      updated_at: new Date().toISOString()
    });
}

