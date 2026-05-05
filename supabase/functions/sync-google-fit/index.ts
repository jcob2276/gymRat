import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId } = await req.json()
    if (!userId) throw new Error('Brak userId')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get credentials
    const { data: settings, error: settingsError } = await supabaseClient
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings.google_fit_refresh_token) {
      throw new Error('Google Fit nie jest połączony')
    }

    // 2. Get Access Token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: settings.google_fit_client_id,
        client_secret: settings.google_fit_client_secret,
        refresh_token: settings.google_fit_refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // 3. Fetch Weight Data (last 30 days)
    const endTimeMillis = Date.now()
    const startTimeMillis = endTimeMillis - (30 * 24 * 60 * 60 * 1000)

    const fitnessResponse = await fetch(
      `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aggregateBy: [{
            dataSourceId: "derived:com.google.weight:com.google.android.gms:merge_weight"
          }],
          bucketByTime: { durationMillis: 86400000 }, // Daily buckets
          startTimeMillis,
          endTimeMillis,
        })
      }
    )

    const data = await fitnessResponse.json()
    let syncedCount = 0

    // 4. Process and Save to body_metrics
    if (data.bucket) {
      for (const bucket of data.bucket) {
        const date = new Date(parseInt(bucket.startTimeMillis)).toISOString().split('T')[0]
        const weightValue = bucket.dataset[0].point[0]?.value[0]?.fpVal

        if (weightValue) {
          const { error: upsertError } = await supabaseClient
            .from('body_metrics')
            .upsert({
              user_id: userId,
              date: date,
              weight: Math.round(weightValue * 10) / 10 // Round to 1 decimal
            }, { onConflict: 'user_id,date' })

          if (!upsertError) syncedCount++
        }
      }
    }

    return new Response(JSON.stringify({ success: true, synced_days: syncedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
