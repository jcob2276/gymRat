import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Yazio } from "https://esm.sh/yazio"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, sync_history } = await req.json().catch(() => ({ userId: null, sync_history: false }))
    console.log(`Function sync-yazio triggered. User: ${userId}, History Mode: ${sync_history}`)
    if (!userId) throw new Error('Missing userId')

    // ... (Get Credentials stays same)
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('yazio_username, yazio_password, yazio_token')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings?.yazio_username || !settings?.yazio_password) {
      throw new Error('Yazio credentials not found in user_settings')
    }

    const yazio = new Yazio({
      token: settings.yazio_token ? JSON.parse(settings.yazio_token) : undefined,
      onRefresh: async ({ token }) => {
        await supabase.from('user_settings').update({ yazio_token: JSON.stringify(token) }).eq('user_id', userId)
      },
      credentials: { username: settings.yazio_username, password: settings.yazio_password },
    })

    const daysToSync = sync_history ? 30 : 1
    const results = []

    for (let i = 0; i < daysToSync; i++) {
      const targetDate = new Date()
      // If sync_history, go back i days. If normal, handle the "yesterday" logic.
      if (sync_history) {
        targetDate.setDate(targetDate.getDate() - i)
      } else if (targetDate.getHours() < 4) {
        targetDate.setDate(targetDate.getDate() - 1)
      }

      try {
        const summary = await yazio.user.getDailySummary({ date: targetDate })
    
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack']
        let totalCalories = 0
        let totalProtein = 0

        mealTypes.forEach(meal => {
          const mealData = (summary as any).meals?.[meal]
          if (mealData?.nutrients) {
            totalCalories += mealData.nutrients["energy.energy"] || 0
            totalProtein += mealData.nutrients["nutrient.protein"] || 0
          }
        })

        const dateStr = targetDate.toISOString().split('T')[0]
        
        if (totalCalories > 0 || totalProtein > 0) {
          await supabase.from('daily_nutrition').upsert({
            user_id: userId,
            date: dateStr,
            calories: Math.round(totalCalories),
            protein: parseFloat(totalProtein.toFixed(2))
          }, { onConflict: 'user_id,date' })
          results.push({ date: dateStr, success: true })
        }
      } catch (e) {
        console.error(`Error syncing date ${targetDate.toISOString()}:`, e)
      }
      
      // Small delay to prevent rate limits
      if (sync_history) await new Promise(r => setTimeout(r, 200))
    }

    return new Response(JSON.stringify({ success: true, synced_days: results.length }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error) {
    console.error('Yazio Sync Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})
