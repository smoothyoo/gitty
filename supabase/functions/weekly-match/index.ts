import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// MBTI 궁합 점수표
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
  mode_dating: boolean
  mode_meeting: boolean
}

// "seoul:강남구" 에서 도시 파트만 추출
function getRegionCity(region: string): string {
  return region?.split(':')[0] || ''
}

// 소개팅용 궁합 점수 계산
function calcDatingScore(a: User, b: User): number {
  let score = 0

  // 1. 공통 관심사 (개당 10점)
  if (a.interests && b.interests) {
    const aInterests = a.interests.split(',').map((s: string) => s.trim())
    const bInterests = b.interests.split(',').map((s: string) => s.trim())
    const common = aInterests.filter((i: string) => bInterests.includes(i))
    score += common.length * 10
  }

  // 2. 흡연 성향 유사 (15점)
  if (a.smoking && b.smoking && a.smoking === b.smoking) score += 15

  // 3. 음주 성향 유사 (15점)
  if (a.drinking && b.drinking && a.drinking === b.drinking) score += 15

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
    if (compatibleWithA.includes(b.mbti)) score += 25
  }

  // 7. 직장 인증 유저끼리 보너스 (15점)
  if (a.work_verified && b.work_verified) {
    score += 15
  }

  return score
}

// Fisher-Yates 셔플
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 마감/결과 날짜 생성
function makeDeadlines() {
  const deadline = new Date()
  deadline.setUTCHours(14, 59, 0, 0) // 오늘 23:59 KST

  const resultDate = new Date()
  resultDate.setDate(resultDate.getDate() + 1)
  resultDate.setUTCHours(8, 0, 0, 0) // 다음날 17:00 KST

  return { deadline, resultDate }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const today = new Date().toISOString().split('T')[0]

    // 이번 주 시작일 계산 (월요일 기준)
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysFromMonday)
    const weekStartStr = weekStart.toISOString().split('T')[0]

    // ──────────────────────────────────────
    // 이번 주 기존 매칭 조회 (소개팅 / 미팅 분리)
    // ──────────────────────────────────────
    const { data: existingMatches } = await supabase
      .from('matches')
      .select('user_a, user_b, match_type')
      .gte('cycle_start', weekStartStr)

    const datingMatchedIds = new Set<string>()
    const meetingMatchedIds = new Set<string>()

    ;(existingMatches || []).forEach((m: { user_a: string; user_b: string; match_type: string }) => {
      if (m.match_type === 'meeting') {
        meetingMatchedIds.add(m.user_a)
        meetingMatchedIds.add(m.user_b)
      } else {
        // 'dating' 또는 null (기존 레코드)
        datingMatchedIds.add(m.user_a)
        datingMatchedIds.add(m.user_b)
      }
    })

    // 전체 유저 조회 (mode_dating, mode_meeting, work_verified 포함)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, gender, birth_year, smoking, drinking, interests, mbti, region, work_verified, mode_dating, mode_meeting')

    if (usersError) throw usersError

    const users = allUsers || []
    const allInserts: object[] = []

    // ══════════════════════════════════════
    // [1] 소개팅 매칭 (mode_dating = TRUE)
    //     점수 기반 그리디 매칭
    // ══════════════════════════════════════
    const datingPool = users.filter(
      (u: User) => u.mode_dating && !datingMatchedIds.has(u.id)
    )

    const datingMales = datingPool.filter((u: User) => u.gender === 'male')
    const datingFemales = datingPool.filter((u: User) => u.gender === 'female')

    if (datingMales.length > 0 && datingFemales.length > 0) {
      // 모든 남녀 조합 점수 계산
      const pairs: { male: User; female: User; score: number }[] = []
      for (const male of datingMales) {
        for (const female of datingFemales) {
          pairs.push({ male, female, score: calcDatingScore(male, female) })
        }
      }
      pairs.sort((a, b) => b.score - a.score)

      const matchedMales = new Set<string>()
      const matchedFemales = new Set<string>()

      for (const pair of pairs) {
        if (matchedMales.has(pair.male.id) || matchedFemales.has(pair.female.id)) continue

        const { deadline, resultDate } = makeDeadlines()
        allInserts.push({
          user_a: pair.male.id,
          user_b: pair.female.id,
          match_type: 'dating',
          cycle_start: today,
          response_deadline: deadline.toISOString(),
          result_date: resultDate.toISOString(),
          status: 'waiting',
        })

        matchedMales.add(pair.male.id)
        matchedFemales.add(pair.female.id)
      }

      // 매칭 못 된 소개팅 유저 → no_match
      const datingNoMatch = [
        ...datingMales.filter((u: User) => !matchedMales.has(u.id)),
        ...datingFemales.filter((u: User) => !matchedFemales.has(u.id)),
      ]
      for (const u of datingNoMatch) {
        allInserts.push({
          user_a: u.id,
          user_b: u.id,
          match_type: 'dating',
          cycle_start: today,
          response_deadline: new Date().toISOString(),
          result_date: new Date().toISOString(),
          status: 'no_match',
        })
      }
    }

    // ══════════════════════════════════════
    // [2] 미팅 매칭 (mode_meeting = TRUE)
    //     조건: 이성 간 + 나이 차 ±9세 이내
    //     단순 그리디 (랜덤 셔플 후 나이 조건 우선)
    // ══════════════════════════════════════
    const meetingPool = users.filter(
      (u: User) => u.mode_meeting && !meetingMatchedIds.has(u.id)
    )

    const meetingMales = shuffle(meetingPool.filter((u: User) => u.gender === 'male'))
    const meetingFemales = shuffle(meetingPool.filter((u: User) => u.gender === 'female'))

    if (meetingMales.length > 0 && meetingFemales.length > 0) {
      const meetingMatchedMales = new Set<string>()
      const meetingMatchedFemales = new Set<string>()

      for (const male of meetingMales) {
        if (meetingMatchedMales.has(male.id)) continue

        // 나이 차 ±9세 이내인 여성 중 아직 매칭 안 된 첫 번째 선택
        const partner = meetingFemales.find(
          (f) =>
            !meetingMatchedFemales.has(f.id) &&
            Math.abs((male.birth_year || 0) - (f.birth_year || 0)) <= 9
        )

        if (partner) {
          const { deadline, resultDate } = makeDeadlines()
          allInserts.push({
            user_a: male.id,
            user_b: partner.id,
            match_type: 'meeting',
            cycle_start: today,
            response_deadline: deadline.toISOString(),
            result_date: resultDate.toISOString(),
            status: 'waiting',
          })
          meetingMatchedMales.add(male.id)
          meetingMatchedFemales.add(partner.id)
        }
      }

      // 미팅 매칭 못 된 유저 → no_match
      const meetingNoMatch = [
        ...meetingMales.filter((u: User) => !meetingMatchedMales.has(u.id)),
        ...meetingFemales.filter((u: User) => !meetingMatchedFemales.has(u.id)),
      ]
      for (const u of meetingNoMatch) {
        allInserts.push({
          user_a: u.id,
          user_b: u.id,
          match_type: 'meeting',
          cycle_start: today,
          response_deadline: new Date().toISOString(),
          result_date: new Date().toISOString(),
          status: 'no_match',
        })
      }
    }

    // ──────────────────────────────────────
    // DB insert
    // ──────────────────────────────────────
    if (allInserts.length > 0) {
      const { error: insertError } = await supabase.from('matches').insert(allInserts)
      if (insertError) throw insertError
    }

    const datingCount = allInserts.filter((m: any) => m.match_type === 'dating' && m.status === 'waiting').length
    const meetingCount = allInserts.filter((m: any) => m.match_type === 'meeting' && m.status === 'waiting').length

    return new Response(
      JSON.stringify({
        message: '매칭 완료',
        dating: { matched: datingCount },
        meeting: { matched: meetingCount },
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
