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

    // 2. Get Access Token (Logic remains the same...)
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

    // 3. List Data Sources (Debugging)
    const sourcesResponse = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataSources', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
    const sourcesData = await sourcesResponse.json()
    const weightSources = sourcesData.dataSource?.filter((s: any) => 
      s.dataType.name.includes('weight') || s.dataType.name.includes('body')
    ).map((s: any) => s.dataStreamId)

    const endTimeNanos = BigInt(Date.now()) * BigInt(1000000)
    const startTimeNanos = endTimeNanos - (BigInt(30 * 24 * 60 * 60) * BigInt(1000000000))

    const dataTypes = [
      { id: "derived:com.google.weight:com.google.android.gms:merge_weight", field: 'weight' },
      { id: "derived:com.google.body.fat.percentage:com.google.android.gms:merged", field: 'body_fat' },
      { id: "derived:com.google.body.muscle_mass:com.google.android.gms:merged", field: 'muscle_mass' },
      { id: "derived:com.google.body.bone_mass:com.google.android.gms:merged", field: 'bone_mass' },
      { id: "derived:com.google.body.water.percentage:com.google.android.gms:merged", field: 'body_water' }
    ]

    let syncedCount = 0
    const dayData: Record<string, any> = {}

    for (const dt of dataTypes) {
      const datasetId = `${startTimeNanos}-${endTimeNanos}`
      const response = await fetch(
        `https://www.googleapis.com/fitness/v1/users/me/dataSources/${dt.id}/datasets/${datasetId}`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      )
      
      const data = await response.json()
      if (data.point) {
        for (const point of data.point) {
          const date = new Date(parseInt(point.startTimeNanos) / 1000000).toISOString().split('T')[0]
          const value = point.value[0]?.fpVal || point.value[0]?.intVal

          if (value) {
            if (!dayData[date]) dayData[date] = { user_id: userId, date }
            dayData[date][dt.field] = Math.round(value * 10) / 10
          }
        }
      }
    }

    // 4. Save to DB
    const entries = Object.values(dayData)
    for (const entry of entries) {
      await supabaseClient.from('body_metrics').upsert(entry, { onConflict: 'user_id,date' })
      syncedCount++
    }

    return new Response(JSON.stringify({ 
      success: true, 
      synced_days: syncedCount, 
      available_sources: weightSources 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

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
