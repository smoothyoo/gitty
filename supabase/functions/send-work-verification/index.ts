import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 개인 이메일 도메인 차단 목록 (서버 측 검증)
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com', 'naver.com', 'daum.net', 'kakao.com',
  'hanmail.net', 'hotmail.com', 'yahoo.com', 'outlook.com',
  'icloud.com', 'me.com', 'mac.com', 'nate.com',
]

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, userId } = await req.json()

    // 입력 검증
    if (!email || !userId) {
      return new Response(
        JSON.stringify({ error: '이메일과 사용자 ID가 필요합니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 이메일 형식 검증
    if (!email.includes('@')) {
      return new Response(
        JSON.stringify({ error: '올바른 이메일 주소를 입력해주세요' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 개인 이메일 차단
    const domain = email.split('@')[1]?.toLowerCase()
    if (!domain || PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      return new Response(
        JSON.stringify({ error: '개인 이메일은 사용할 수 없어요. 회사 이메일을 입력해주세요.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase 클라이언트 (Service Role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 6자리 인증코드 생성
    const code = String(Math.floor(100000 + Math.random() * 900000))

    // 만료 시간: 10분 후
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // 기존 미인증 코드 삭제 (같은 유저 + 같은 이메일)
    await supabase
      .from('work_verification_codes')
      .delete()
      .eq('user_id', userId)
      .eq('verified', false)

    // 인증코드 DB 저장
    const { error: insertError } = await supabase
      .from('work_verification_codes')
      .insert({
        user_id: userId,
        email,
        code,
        expires_at: expiresAt,
      })

    if (insertError) {
      console.error('DB insert error:', insertError)
      return new Response(
        JSON.stringify({ error: '인증코드 저장에 실패했습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Resend API로 이메일 발송
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set')
      return new Response(
        JSON.stringify({ error: '이메일 서비스가 설정되지 않았습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Gitty <onboarding@resend.dev>',
        to: email,
        subject: '[Gitty] 직장 인증 코드',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
            <h2 style="color: #f97316; margin-bottom: 8px;">Gitty 직장 인증</h2>
            <p style="color: #71717a; font-size: 14px; margin-bottom: 24px;">아래 인증 코드를 앱에 입력해주세요.</p>
            <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">${code}</span>
            </div>
            <p style="color: #a1a1aa; font-size: 12px;">이 코드는 10분 후 만료됩니다.</p>
            <p style="color: #a1a1aa; font-size: 12px;">본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
          </div>
        `,
      }),
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.text()
      console.error('Resend API error:', resendError)
      return new Response(
        JSON.stringify({ error: '이메일 전송에 실패했어요. 잠시 후 다시 시도해주세요.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: '인증코드가 발송되었습니다' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: '서버 오류가 발생했습니다' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
