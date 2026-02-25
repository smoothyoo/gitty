import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MBTI 궁합 점수표 (상보적 타입일수록 높은 점수)
const MBTI_COMPATIBILITY: Record<string, string[]> = {
  INTJ: ['ENFP', 'ENTP'],
  INTP: ['ENTJ', 'ENFJ'],
  ENTJ: ['INTP', 'INFP'],
  ENTP: ['INTJ', 'INFJ'],
  INFJ: ['ENTP', 'ENFP'],
  INFP: ['ENTJ', 'ENFJ'],
  ENFJ: ['INTP', 'INFP'],
  ENFP: ['INTJ', 'INFJ'],
  ISTJ: ['ESFP', 'ESTP'],
  ISFJ: ['ESFP', 'ESTP'],
  ESTJ: ['ISFP', 'ISTP'],
  ESFJ: ['ISFP', 'ISTP'],
  ISTP: ['ESFJ', 'ESTJ'],
  ISFP: ['ESFJ', 'ESTJ'],
  ESTP: ['ISFJ', 'ISTJ'],
  ESFP: ['ISFJ', 'ISTJ'],
}

interface User {
  id: string
  gender: string
  birth_year: number
  smoking: string
  drinking: string
  interests: string
  mbti: string
  region: string
  work_verified: boolean
}

// "seoul:강남구" 에서 도시 파트만 추출
function getRegionCity(region: string): string {
  return region?.split(':')[0] || ''
}

// 두 유저 간 궁합 점수 계산
function calcScore(a: User, b: User): number {
  let score = 0

  // 1. 공통 관심사 (개당 10점)
  if (a.interests && b.interests) {
    const aInterests = a.interests.split(',').map((s: string) => s.trim())
    const bInterests = b.interests.split(',').map((s: string) => s.trim())
    const common = aInterests.filter((i: string) => bInterests.includes(i))
    score += common.length * 10
  }

  // 2. 흡연 성향 유사 (15점)
  if (a.smoking && b.smoking && a.smoking === b.smoking) {
    score += 15
  }

  // 3. 음주 성향 유사 (15점)
  if (a.drinking && b.drinking && a.drinking === b.drinking) {
    score += 15
  }

  // 4. 나이 차 (5세 이내 20점, 10세 이내 10점)
  if (a.birth_year && b.birth_year) {
    const ageDiff = Math.abs(a.birth_year - b.birth_year)
    if (ageDiff <= 5) score += 20
    else if (ageDiff <= 10) score += 10
  }

  // 5. 지역 점수: 같은 구/시 10점, 같은 도시(서울/경기) 5점
  if (a.region && b.region) {
    if (a.region === b.region) {
      score += 10 // 같은 구/시
    } else if (getRegionCity(a.region) === getRegionCity(b.region)) {
      score += 5  // 같은 도시
    }
  }

  // 6. MBTI 궁합 (25점)
  if (a.mbti && b.mbti) {
    const compatibleWithA = MBTI_COMPATIBILITY[a.mbti] || []
    if (compatibleWithA.includes(b.mbti)) {
      score += 25
    }
  }

  // 7. 직장 인증 유저끼리 보너스 (15점)
  if (a.work_verified && b.work_verified) {
    score += 15
  }

  return score
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const today = new Date().toISOString().split('T')[0]

    // 1. 이번 주 시작일 계산 (월요일 기준)
    const now = new Date()
    const dayOfWeek = now.getDay() // 0=일, 1=월, ..., 6=토
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysFromMonday)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // 2. 이번 주에 이미 매칭된 유저 ID 목록 조회
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user_a, user_b')
      .gte('cycle_start', weekStartStr)

    const matchedUserIds = new Set<string>()
    ;(existingMatches || []).forEach((m: { user_a: string; user_b: string }) => {
      matchedUserIds.add(m.user_a)
      matchedUserIds.add(m.user_b)
    })

    // 3. 이번 주 미매칭 유저 전체 조회
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, gender, birth_year, smoking, drinking, interests, mbti, region, work_verified')

    if (usersError) throw usersError

    const unmatchedUsers = (allUsers || []).filter(
      (u: User) => !matchedUserIds.has(u.id)
    )

    const males = unmatchedUsers.filter((u: User) => u.gender === 'male')
    const females = unmatchedUsers.filter((u: User) => u.gender === 'female')

    if (males.length === 0 || females.length === 0) {
      return new Response(
        JSON.stringify({ message: '매칭 가능한 유저 없음', matched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. 모든 남녀 조합 점수 계산
    const pairs: { male: User; female: User; score: number }[] = []
    for (const male of males) {
      for (const female of females) {
        pairs.push({ male, female, score: calcScore(male, female) })
      }
    }

    // 점수 내림차순 정렬
    pairs.sort((a, b) => b.score - a.score)

    // 5. 그리디 매칭 (가장 높은 점수 쌍부터 배정)
    const matchedMales = new Set<string>()
    const matchedFemales = new Set<string>()
    const newMatches: {
      user_a: string
      user_b: string
      cycle_start: string
      response_deadline: string
      result_date: string
      status: string
    }[] = []

    for (const pair of pairs) {
      if (matchedMales.has(pair.male.id) || matchedFemales.has(pair.female.id)) {
        continue
      }

      // 응답 마감: 오늘 밤 23:59 KST (= 14:59 UTC)
      const deadline = new Date()
      deadline.setUTCHours(14, 59, 0, 0)
      // 결과 발표: 다음날 오후 5시 KST (= 08:00 UTC)
      const resultDate = new Date()
      resultDate.setDate(resultDate.getDate() + 1)
      resultDate.setUTCHours(8, 0, 0, 0)

      newMatches.push({
        user_a: pair.male.id,
        user_b: pair.female.id,
        cycle_start: today,
        response_deadline: deadline.toISOString(),
        result_date: resultDate.toISOString(),
        status: 'waiting',
      })

      matchedMales.add(pair.male.id)
      matchedFemales.add(pair.female.id)
    }

    // 6. 매칭 못 된 유저 → no_match 레코드 생성 (자기 자신과 매칭)
    const noMatchUsers = [
      ...males.filter((u: User) => !matchedMales.has(u.id)),
      ...females.filter((u: User) => !matchedFemales.has(u.id)),
    ]

    for (const u of noMatchUsers) {
      newMatches.push({
        user_a: u.id,
        user_b: u.id,  // 자기 자신 = no_match 표시용
        cycle_start: today,
        response_deadline: new Date().toISOString(),
        result_date: new Date().toISOString(),
        status: 'no_match',
      })
    }

    // 7. DB에 insert
    if (newMatches.length > 0) {
      const { error: insertError } = await supabase
        .from('matches')
        .insert(newMatches)

      if (insertError) throw insertError
    }

    return new Response(
      JSON.stringify({
        message: '매칭 완료',
        matched: newMatches.length - noMatchUsers.length,
        noMatch: noMatchUsers.length,
        weekStart: weekStartStr,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('매칭 오류:', error)
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
