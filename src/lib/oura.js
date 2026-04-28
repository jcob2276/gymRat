import { supabase } from './supabase';
import { format, subDays, parseISO } from 'date-fns';

const OURA_BASE_URL = 'https://corsproxy.io/?' + encodeURIComponent('https://api.ouraring.com/v2/usercollection');

export async function syncOuraData(userId) {
  try {
    const { data, error } = await supabase.functions.invoke('sync-oura', {
      body: { userId }
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Edge Function error:', error);
    return { success: false, error: error.message };
  }
}

// updateDisciplinedStreak is no longer needed here as it's handled server-side

