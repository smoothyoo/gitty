import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, email, code } = await req.json()

    // 입력 검증
    if (!userId || !email || !code) {
      return new Response(
        JSON.stringify({ error: '필수 정보가 누락되었습니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Supabase 클라이언트 (Service Role)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 인증코드 조회 (유저 + 이메일 + 코드 + 미인증 + 미만료)
    const { data: verification, error: fetchError } = await supabase
      .from('work_verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('email', email)
      .eq('code', code)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (fetchError || !verification) {
      return new Response(
        JSON.stringify({ error: '인증코드가 일치하지 않거나 만료되었습니다' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. 인증코드 verified 처리
    await supabase
      .from('work_verification_codes')
      .update({ verified: true })
      .eq('id', verification.id)

    // 2. users 테이블 직장 인증 업데이트
    const domain = email.split('@')[1]
    const company = domain.split('.')[0]

    const { error: userError } = await supabase
      .from('users')
      .update({
        work_verified: true,
        work_email: email,
        work_company: company,
        verified_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (userError) {
      console.error('User update error:', userError)
      return new Response(
        JSON.stringify({ error: '인증 정보 저장에 실패했습니다' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, company }),
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
