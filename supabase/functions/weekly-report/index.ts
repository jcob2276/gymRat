import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { jsPDF } from "https://esm.sh/jspdf@2.5.1"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 1. Get all users (Kuba)
    const { data: users, error: usersError } = await supabase.from('user_settings').select('user_id')
    if (usersError) throw usersError

    for (const u of users) {
      const userId = u.user_id
      
      // Get User Email from auth
      const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId)
      if (authError || !user?.email) continue

      const now = new Date()
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const startDate = lastWeek.toISOString().split('T')[0]
      const endDate = now.toISOString().split('T')[0]

      // 2. Fetch Weekly Metrics
      const [body, logs, sessions, oura] = await Promise.all([
        supabase.from('body_metrics').select('*').eq('user_id', userId).gte('date', startDate).order('date', { ascending: true }),
        supabase.from('exercise_logs').select('*').eq('user_id', userId).gte('created_at', startDate).ilike('exercise_name', '%Wyciskanie płaskie (Heavy)%'),
        supabase.from('workout_sessions').select('*').eq('user_id', userId).gte('date', startDate),
        supabase.from('oura_daily_summary').select('*').eq('user_id', userId).gte('date', startDate)
      ])

      // 3. Aggregate Data
      const weightStart = body.data?.[0]?.weight || '--'
      const weightEnd = body.data?.[body.data.length - 1]?.weight || '--'
      const waistStart = body.data?.[0]?.waist || '--'
      const waistEnd = body.data?.[body.data.length - 1]?.waist || '--'
      
      const benchMax = logs.data?.length ? Math.max(...logs.data.map(l => l.weight)) : '--'
      const compliance = sessions.data?.length || 0
      
      const avgReadiness = oura.data?.length 
        ? (oura.data.reduce((acc, o) => acc + (o.readiness_score || 0), 0) / oura.data.length).toFixed(1)
        : '--'

      // 4. Generate PDF
      const doc = new jsPDF()
      doc.setFontSize(22)
      doc.text("RAPORT TYGODNIOWY: KUBA WORKOUT", 20, 30)
      
      doc.setFontSize(12)
      doc.text(`Okres: ${startDate} do ${endDate}`, 20, 45)
      
      doc.setFontSize(16)
      doc.text("PODSUMOWANIE REKOMPOZYCJI", 20, 65)
      doc.setFontSize(12)
      doc.text(`- Waga: ${weightStart}kg -> ${weightEnd}kg`, 25, 75)
      doc.text(`- Talia: ${waistStart}cm -> ${waistEnd}cm`, 25, 82)
      
      doc.setFontSize(16)
      doc.text("SIŁA I TRENING", 20, 100)
      doc.setFontSize(12)
      doc.text(`- Bench Max (Heavy): ${benchMax}kg`, 25, 110)
      doc.text(`- Compliance: ${compliance}/4 treningi`, 25, 117)
      
      doc.setFontSize(16)
      doc.text("REGENERACJA (OURA)", 20, 135)
      doc.setFontSize(12)
      doc.text(`- Średnia Gotowość: ${avgReadiness}`, 25, 145)
      
      doc.setFontSize(10)
      doc.setTextColor(150)
      doc.text("Wygenerowano automatycznie przez Kuba Tracker V2", 20, 280)

      const pdfBase64 = doc.output('datauristring').split(',')[1]

      // 5. Send Email via Resend
      if (RESEND_API_KEY) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'Kuba Tracker <onboarding@resend.dev>', 
            to: user.email,
            subject: `Raport Tygodniowy (${startDate})`,
            html: `<p>Cześć Kuba! Oto Twój raport z ostatniego tygodnia. Twoja waga to obecnie <strong>${weightEnd}kg</strong>.</p>`,
            attachments: [
              {
                filename: `raport_${startDate}.pdf`,
                content: pdfBase64
              }
            ]
          })
        })
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
