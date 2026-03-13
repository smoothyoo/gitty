import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import {
  WORK_TYPE_LABELS, SMOKING_LABELS, DRINKING_LABELS,
  INTEREST_LABELS, parseInterests,
} from '../lib/constants'

const KAKAO_UNLOCK_COST = 500

const HomePage = () => {
  const navigate = useNavigate()
  const { user, profile, signOut, refreshProfile } = useAuth()

  const [currentMatch, setCurrentMatch] = useState(null)
  const [matchedUser, setMatchedUser] = useState(null)
  const [currentMeetingMatch, setCurrentMeetingMatch] = useState(null)
  const [matchedMeetingUser, setMatchedMeetingUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dating') // 'dating' | 'meeting'

  // 카카오 ID 열람 관련 상태
  const [unlockTarget, setUnlockTarget] = useState(null) // { match, setMatch }
  const [unlockConfirmOpen, setUnlockConfirmOpen] = useState(false)
  const [unlockLoading, setUnlockLoading] = useState(false)
  const [insufficientOpen, setInsufficientOpen] = useState(false)

  useEffect(() => {
    if (user && profile) {
      fetchData()
    }
  }, [user, profile?.id])

  const getWeekStart = () => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - daysFromMonday)
    return weekStart.toISOString().split('T')[0]
  }

  const fetchData = async () => {
    try {
      const weekStartStr = getWeekStart()

      // 이번 주 매칭 전체 조회 (match_type 기준 클라이언트 분리)
      const { data: weekMatches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .gte('cycle_start', weekStartStr)
        .order('cycle_start', { ascending: false })

      if (error) throw error

      const datingMatch = weekMatches?.find(m => m.match_type !== 'meeting') || null
      const meetingMatch = weekMatches?.find(m => m.match_type === 'meeting') || null

      const fetchOtherUser = async (match) => {
        if (!match) return null
        const otherId = match.user_a === user.id ? match.user_b : match.user_a
        const { data } = await supabase.from('users').select('*').eq('id', otherId).single()
        return data
      }

      const [datingUser, meetingUser] = await Promise.all([
        fetchOtherUser(datingMatch),
        fetchOtherUser(meetingMatch),
      ])

      setCurrentMatch(datingMatch)
      setMatchedUser(datingUser)
      setCurrentMeetingMatch(meetingMatch)
      setMatchedMeetingUser(meetingUser)
    } catch (err) {
      console.error('fetchData error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (response, match, setMatch) => {
    if (!match) return
    // 마감 후 응답 제출 방지
    if (match.response_deadline && new Date() > new Date(match.response_deadline)) {
      return
    }
    try {
      const responseField = match.user_a === user.id ? 'response_a' : 'response_b'
      const otherResponseField = match.user_a === user.id ? 'response_b' : 'response_a'
      const otherResponse = match[otherResponseField]
      const updateData = { [responseField]: response }

      if (otherResponse !== null) {
        updateData.status = (response === true && otherResponse === true) ? 'matched' : 'rejected'
      }

      const { error } = await supabase.from('matches').update(updateData).eq('id', match.id)
      if (error) throw error

      setMatch({ ...match, ...updateData })
    } catch (err) {
      console.error('handleResponse error:', err)
    }
  }

  const getMyResponse = (match) =>
    match ? (match.user_a === user.id ? match.response_a : match.response_b) : null

  const getTheirResponse = (match) =>
    match ? (match.user_a === user.id ? match.response_b : match.response_a) : null

  const getTimeRemaining = (match) => {
    if (!match?.response_deadline) return null
    const diff = new Date(match.response_deadline) - new Date()
    if (diff <= 0) return '마감됨'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}시간 ${m}분 남음` : `${m}분 남음`
  }

  // 유저 아바타 이모지 반환 (emoji 필드 우선, 없으면 성별 기본값)
  const getUserEmoji = (userData) =>
    userData?.emoji || (userData?.gender === 'male' ? '👨' : '👩')

  // result_date가 지났는지 확인
  const isResultReady = (match) => {
    if (!match?.result_date) return false
    return new Date() >= new Date(match.result_date)
  }

  // 현재 유저가 해당 매칭의 카카오 ID를 이미 열람했는지 확인
  const isKakaoUnlocked = (match) => {
    if (!match || !user) return false
    return match.user_a === user.id ? match.kakao_unlocked_a : match.kakao_unlocked_b
  }

  // 카카오 ID 열람 버튼 클릭 핸들러
  const handleUnlockKakao = (match, setMatch) => {
    // 잔액 부족 확인
    if ((profile?.points ?? 0) < KAKAO_UNLOCK_COST) {
      setInsufficientOpen(true)
      return
    }
    setUnlockTarget({ match, setMatch })
    setUnlockConfirmOpen(true)
  }

  // 실제 열람 처리 (원자적 RPC 호출)
  const confirmUnlock = async (match, setMatch) => {
    const targetMatch = match || unlockTarget?.match
    const targetSetMatch = setMatch || unlockTarget?.setMatch
    if (!targetMatch || !user) return

    setUnlockLoading(true)
    try {
      const isUserA = targetMatch.user_a === user.id
      const unlockField = isUserA ? 'kakao_unlocked_a' : 'kakao_unlocked_b'

      // 원자적 처리: 포인트 차감 + 거래 기록 + 매칭 열람 (DB 함수)
      const { data, error } = await supabase.rpc('unlock_kakao', {
        p_user_id: user.id,
        p_match_id: targetMatch.id,
        p_cost: KAKAO_UNLOCK_COST,
      })

      if (error) throw error
      if (!data?.success) {
        if (data?.error === 'insufficient_points') {
          setUnlockConfirmOpen(false)
          setInsufficientOpen(true)
          return
        }
        throw new Error(data?.error || '열람 처리 실패')
      }

      await refreshProfile()

      // 로컬 상태 업데이트
      targetSetMatch(prev => ({ ...prev, [unlockField]: true }))
      setUnlockConfirmOpen(false)
      setUnlockTarget(null)
    } catch (err) {
      console.error('unlock error:', err)
    } finally {
      setUnlockLoading(false)
    }
  }

  // 범용 매칭 카드 렌더러
  const renderMatchCard = (match, matchedUserData, matchType) => {
    const isDating = matchType === 'dating'
    const setMatch = isDating ? setCurrentMatch : setCurrentMeetingMatch
    const bioField = isDating ? 'bio_dating' : 'bio_meeting'
    const myResponse = getMyResponse(match)
    const theirResponse = getTheirResponse(match)
    const status = match?.status
    const resultReady = isResultReady(match)

    // 매칭 없음 (준비 중)
    if (!match) {
      return (
        <div className="bg-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-4xl">💝</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            {isDating ? '매칭 준비 중이에요' : '미팅 매칭 준비 중이에요'}
          </h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            다음 주 월요일 오후 1시에 매칭 상대가 공개돼요!<br />조금만 기다려주세요
          </p>
        </div>
      )
    }

    // 결과 공개 전 대기 카드 (응답 완료 or 결과 집계 중)
    if ((status === 'matched' || status === 'rejected' || (myResponse !== null && status === 'waiting')) && !resultReady) {
      const resultDate = match.result_date
        ? new Date(match.result_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '내일'
      return (
        <div className="bg-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-4xl">⏳</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">응답이 완료됐어요!</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">
            상대방의 응답까지 확인 후<br />결과를 함께 공개해드릴게요 😊
          </p>
          <div className="mt-4 inline-flex items-center gap-2 bg-zinc-700 px-4 py-2 rounded-full">
            <span className="text-zinc-400 text-xs">결과 공개</span>
            <span className="text-white text-xs font-medium">{resultDate}</span>
          </div>
        </div>
      )
    }

    // 매칭 성사
    if (status === 'matched') {
      return (
        <div className="bg-zinc-800 rounded-3xl overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎉</span>
              <span className="text-white font-bold text-lg">{isDating ? '소개팅 성사!' : '미팅 성사!'}</span>
              <span className="text-2xl">🎉</span>
            </div>
          </div>

          <div className="p-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center">
              <span className="text-3xl">{getUserEmoji(matchedUserData)}</span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">{matchedUserData?.name} 님</h2>
              <div className="flex items-center justify-center gap-2">
                <p className="text-zinc-400 text-sm">
                  {matchedUserData?.birth_year ? `${new Date().getFullYear() - matchedUserData.birth_year + 1}세` : ''} · {matchedUserData?.gender === 'male' ? '남성' : '여성'}
                </p>
                {matchedUserData?.work_verified && (
                  <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                    ✅ 직장인증
                  </span>
                )}
              </div>
            </div>

            {isKakaoUnlocked(match) ? (
              // 열람 완료 (양쪽 공통)
              <>
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">💬</span>
                    </div>
                    <div>
                      <p className="text-yellow-400 text-xs font-medium">카카오톡으로 연락해보세요!</p>
                      <p className="text-yellow-300 font-bold text-xl">{matchedUserData?.kakao_id || '미등록'}</p>
                    </div>
                  </div>
                </div>
                <p className="text-zinc-500 text-xs text-center mb-2">
                  ⏰ 카카오톡 ID는 다음 주 매칭 전까지만 표시돼요. 꼭 이번 주에 연락하세요!
                </p>
                <p className="text-zinc-600 text-xs text-center mb-4">
                  ID가 맞지 않거나 문제가 있으신가요?{' '}
                  <a
                    href="https://n08x4.channel.io"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-500 underline underline-offset-2 hover:text-zinc-300 transition-colors"
                  >
                    고객센터 문의
                  </a>
                </p>
              </>
            ) : profile?.gender === 'female' ? (
              // 여성: 결제 버튼 없이 대기 메시지
              <div className="bg-zinc-800/60 rounded-2xl p-5 text-center border border-zinc-700 mb-4">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-white font-semibold text-sm mb-1">연락처 공개 대기 중</p>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  상대방이 연락처를 열람하면<br />함께 공개돼요
                </p>
              </div>
            ) : (
              // 남성: 결제 버튼
              <div className="bg-zinc-800/60 rounded-2xl p-5 text-center border border-zinc-700 mb-4">
                <div className="text-3xl mb-2">🔒</div>
                <p className="text-white font-semibold text-sm mb-1">카카오 ID가 잠겨있어요</p>
                <p className="text-zinc-400 text-xs mb-4">💎 {KAKAO_UNLOCK_COST}P를 사용해 열람할 수 있어요</p>
                <button
                  onClick={() => handleUnlockKakao(match, setMatch)}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all"
                >
                  💎 {KAKAO_UNLOCK_COST}P로 카카오 ID 보기
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'MBTI', value: matchedUserData?.mbti },
                { label: '흡연', value: SMOKING_LABELS[matchedUserData?.smoking] },
                { label: '음주', value: DRINKING_LABELS[matchedUserData?.drinking] },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-zinc-800/80 rounded-xl text-center">
                  <p className="text-zinc-500 text-xs mb-1">{label}</p>
                  <p className="text-white font-medium">{value || '-'}</p>
                </div>
              ))}
            </div>

            {matchedUserData?.interests && (
              <div className="p-4 bg-zinc-800/80 rounded-xl mb-4">
                <p className="text-zinc-500 text-xs mb-2">관심사</p>
                <div className="flex flex-wrap gap-2">
                  {parseInterests(matchedUserData.interests).map(i => (
                    <span key={i} className="px-2 py-1 bg-orange-500/15 text-orange-400 rounded-full text-xs">
                      {INTEREST_LABELS[i] || i}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(matchedUserData?.[bioField] || matchedUserData?.bio) && (
              <div className="p-4 bg-zinc-700/50 rounded-xl">
                <p className="text-zinc-500 text-xs mb-2">자기소개</p>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {matchedUserData?.[bioField] || matchedUserData?.bio}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // 거절됨 (result_date 이후)
    if (status === 'rejected') {
      const rejectionTitle = myResponse === false
        ? '매칭을 거절했어요'
        : theirResponse === false
        ? '상대방이 거절했어요'
        : '매칭이 성사되지 않았어요'
      const rejectionDesc = myResponse === false
        ? '다음에 더 좋은 인연이 올 거예요!'
        : theirResponse === false
        ? '괜찮아요! 더 좋은 인연이 기다리고 있어요'
        : '시간 내에 응답이 이루어지지 않았어요'

      return (
        <div className="bg-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-4xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{rejectionTitle}</h2>
          <p className="text-zinc-400 text-sm">{rejectionDesc}<br />다음 주 월요일에 새로운 분을 소개해드릴게요</p>
        </div>
      )
    }

    // 시간 초과 (result_date 이후에도 status가 'waiting'인 경우)
    if (status === 'waiting' && resultReady) {
      const bothNoResponse = myResponse === null && theirResponse === null
      const iResponded = myResponse !== null && theirResponse === null
      const theyResponded = myResponse === null && theirResponse !== null

      const timeoutTitle = bothNoResponse
        ? '매칭이 성사되지 않았어요'
        : iResponded
        ? '상대방이 응답하지 않았어요'
        : theyResponded
        ? '시간 내에 응답하지 못했어요'
        : '매칭이 성사되지 않았어요'

      const timeoutDesc = bothNoResponse
        ? '시간 내에 응답이 이루어지지 않았어요'
        : iResponded
        ? '괜찮아요! 더 좋은 인연이 기다리고 있어요'
        : theyResponded
        ? '다음에는 꼭 시간 내에 응답해주세요!'
        : '시간 내에 응답이 이루어지지 않았어요'

      return (
        <div className="bg-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-4xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{timeoutTitle}</h2>
          <p className="text-zinc-400 text-sm">{timeoutDesc}<br />다음 주 월요일에 새로운 분을 소개해드릴게요</p>
        </div>
      )
    }

    // 상대 없음
    if (status === 'no_match') {
      return (
        <div className="bg-zinc-800 rounded-3xl p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-4xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">이번 주는 상대를 못 찾았어요</h2>
          <p className="text-zinc-400 text-sm">
            {isDating ? '자기소개를 더 자세히 쓰면 매칭 확률이 높아져요!' : '미팅 의사가 있는 분이 이번엔 없었어요.'}<br />
            다음 주 월요일 오후 1시에 다시 매칭해드릴게요
          </p>
        </div>
      )
    }

    // 응답 대기 중
    return (
      <div className="bg-zinc-800 rounded-3xl overflow-hidden border border-zinc-700 border-t-2 border-t-orange-500">
        <div className="px-6 pt-5 pb-2 flex items-center justify-between">
          <span className="text-orange-400 text-xs font-semibold uppercase tracking-wider">
            {isDating ? '오늘의 인연' : '이번 주 미팅'}
          </span>
          <span className="bg-zinc-700 text-zinc-400 text-xs px-3 py-1 rounded-full">
            {getTimeRemaining(match) || '응답 대기 중'}
          </span>
        </div>

        <div className="px-6 pb-6 pt-2">
          <div className="w-20 h-20 mx-auto mb-4 bg-zinc-700 rounded-full flex items-center justify-center">
            <span className="text-3xl">{getUserEmoji(matchedUserData)}</span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-white mb-1">
              {matchedUserData?.name?.charAt(0)}** 님
            </h2>
            <div className="flex items-center justify-center gap-2">
              <p className="text-zinc-400 text-sm">
                {matchedUserData?.birth_year ? `${new Date().getFullYear() - matchedUserData.birth_year + 1}세` : ''} · {matchedUserData?.gender === 'male' ? '남성' : '여성'}
              </p>
              {matchedUserData?.work_verified && (
                <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 text-xs px-2 py-0.5 rounded-full font-medium">
                  ✅ 직장인증
                </span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { icon: '📍', label: '거주지', value: matchedUserData?.region || '비공개' },
              { icon: '💼', label: '직장 위치', value: matchedUserData?.work_location || '비공개' },
              { icon: '🏢', label: '직장 유형', value: WORK_TYPE_LABELS[matchedUserData?.work_type] || '비공개' },
            ].map(({ icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-3 border-b border-zinc-700/60">
                <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center">
                  <span>{icon}</span>
                </div>
                <div>
                  <p className="text-zinc-500 text-xs">{label}</p>
                  <p className="text-white font-medium">{value}</p>
                </div>
              </div>
            ))}

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'MBTI', value: matchedUserData?.mbti },
                { label: '흡연', value: SMOKING_LABELS[matchedUserData?.smoking] },
                { label: '음주', value: DRINKING_LABELS[matchedUserData?.drinking] },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 bg-zinc-800/80 rounded-xl text-center">
                  <p className="text-zinc-500 text-xs mb-1">{label}</p>
                  <p className="text-white font-medium text-sm">{value || '-'}</p>
                </div>
              ))}
            </div>

            {matchedUserData?.interests && (
              <div className="p-4 bg-zinc-800/80 rounded-xl">
                <p className="text-zinc-500 text-xs mb-2">관심사</p>
                <div className="flex flex-wrap gap-2">
                  {parseInterests(matchedUserData.interests).map(i => (
                    <span key={i} className="px-2 py-1 bg-orange-500/15 text-orange-400 rounded-full text-xs">
                      {INTEREST_LABELS[i] || i}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(matchedUserData?.[bioField] || matchedUserData?.bio) && (
              <div className="p-4 bg-zinc-800/80 rounded-xl">
                <p className="text-zinc-500 text-xs mb-2">자기소개</p>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {matchedUserData?.[bioField] || matchedUserData?.bio}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6">
            {myResponse === null ? (
              match.response_deadline && new Date() >= new Date(match.response_deadline) ? (
                <div className="text-center py-4">
                  <p className="text-zinc-500 text-sm">응답 마감 시간이 지났어요</p>
                  <p className="text-zinc-600 text-xs mt-1">
                    {match.result_date
                      ? `오늘 ${new Date(match.result_date).getHours()}시에 결과가 공개돼요 !`
                      : '결과는 곧 공개됩니다'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-center text-zinc-500 text-sm mb-3">
                    {isDating ? '둘 중 하나를 선택해야 다음 매칭이 활성화됩니다!' : '미팅 의사를 알려주세요!'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleResponse(false, match, setMatch)}
                      className="py-4 px-6 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-semibold rounded-xl transition-all"
                    >
                      {isDating ? '매칭 안할래요' : '미팅 안할래요'}
                    </button>
                    <button
                      onClick={() => handleResponse(true, match, setMatch)}
                      className="py-4 px-6 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all"
                    >
                      {isDating ? '매칭할래요!' : '미팅할래요!'}
                    </button>
                  </div>
                </div>
              )
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 z-50">
        <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-between">
          <img src="/Gitty2.png" alt="GITTY" className="h-8 w-auto" />
          <button
            onClick={() => navigate('/shop')}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-full transition-all"
          >
            <span className="text-sm">💎</span>
            <span className="text-white font-bold text-sm">{profile?.points ?? 0}P</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-6 pt-4">
        <div className="flex gap-2 bg-zinc-800 p-1 rounded-xl">
          {[
            { key: 'dating', label: '💘 소개팅' },
            { key: 'meeting', label: '🎉 미팅' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                activeTab === key ? 'bg-zinc-700 text-white' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-white">
            안녕하세요, {profile?.name || '회원'}님!
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

        {/* 직장 인증 유도 카드 */}
        {profile && !profile.work_verified && (
          <button
            onClick={() => navigate('/profile')}
            className="w-full mb-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center gap-3 hover:bg-orange-500/15 transition-all text-left"
          >
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🔥</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-orange-400 font-semibold text-sm">직장 인증하고 매칭률 올리기</p>
              <p className="text-orange-400/70 text-xs mt-0.5">인증 뱃지 획득 · 매칭 점수 +15점</p>
            </div>
            <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* 소개팅 탭 */}
        {activeTab === 'dating' && (
          profile?.mode_dating
            ? renderMatchCard(currentMatch, matchedUser, 'dating')
            : (
              <div className="bg-zinc-800 rounded-3xl p-8 text-center">
                <span className="text-5xl mb-4 block">💘</span>
                <h2 className="text-xl font-bold text-white mb-2">소개팅 해보실래요?</h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  매주 월요일, 딱 맞는 분을 소개해드려요.<br />
                  자기소개를 적고 소개팅 매칭을 활성화해보세요!
                </p>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all"
                >
                  소개팅 활성화하기
                </button>
              </div>
            )
        )}

        {/* 미팅 탭 */}
        {activeTab === 'meeting' && (
          profile?.mode_meeting
            ? renderMatchCard(currentMeetingMatch, matchedMeetingUser, 'meeting')
            : (
              <div className="bg-zinc-800 rounded-3xl p-8 text-center">
                <span className="text-5xl mb-4 block">🎉</span>
                <h2 className="text-xl font-bold text-white mb-2">미팅도 해보세요!</h2>
                <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                  여럿이서 함께하는 미팅 매칭이에요.<br />
                  자기소개를 적고 미팅 매칭을 활성화해보세요!
                </p>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all"
                >
                  미팅 활성화하기
                </button>
              </div>
            )
        )}
      </main>

      <BottomNav />

      {/* 카카오 ID 열람 확인 BottomSheet */}
      <BottomSheet
        isOpen={unlockConfirmOpen}
        onClose={() => { setUnlockConfirmOpen(false); setUnlockTarget(null) }}
        title="카카오 ID 열람"
      >
        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">사용 포인트</span>
              <span className="text-orange-400 font-bold">-{KAKAO_UNLOCK_COST}P</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">현재 잔액</span>
              <span className="text-white font-bold">{profile?.points ?? 0}P</span>
            </div>
            <div className="border-t border-zinc-700 pt-3 flex justify-between text-sm">
              <span className="text-zinc-400">차감 후 잔액</span>
              <span className="text-zinc-300 font-bold">
                {((profile?.points ?? 0) - KAKAO_UNLOCK_COST)}P
              </span>
            </div>
          </div>
          <button
            onClick={() => confirmUnlock()}
            disabled={unlockLoading}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold rounded-2xl transition-all"
          >
            {unlockLoading ? '처리 중...' : `💎 ${KAKAO_UNLOCK_COST}P로 열람하기`}
          </button>
          <button
            onClick={() => { setUnlockConfirmOpen(false); setUnlockTarget(null) }}
            className="w-full py-3 text-zinc-400 text-sm"
          >
            취소
          </button>
        </div>
      </BottomSheet>

      {/* 잔액 부족 BottomSheet */}
      <BottomSheet
        isOpen={insufficientOpen}
        onClose={() => setInsufficientOpen(false)}
        title="포인트가 부족해요"
      >
        <div className="text-center space-y-4">
          <div className="text-4xl">😢</div>
          <div className="space-y-1">
            <p className="text-zinc-400 text-sm">현재 잔액: <span className="text-white font-bold">{profile?.points ?? 0}P</span></p>
            <p className="text-zinc-400 text-sm">카카오 ID 열람: <span className="text-orange-400 font-bold">{KAKAO_UNLOCK_COST}P 필요</span></p>
          </div>
          <button
            onClick={() => { setInsufficientOpen(false); navigate('/shop') }}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl transition-all"
          >
            💎 포인트 충전하기
          </button>
          <button onClick={() => setInsufficientOpen(false)} className="w-full py-3 text-zinc-400 text-sm">
            취소
          </button>
        </div>
      </BottomSheet>
    </div>
  )
}

export default HomePage
