import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import {
  WORK_TYPE_LABELS, SMOKING_LABELS, DRINKING_LABELS,
  INTEREST_LABELS, parseInterests,
} from '../lib/constants'

const HomePage = () => {
  const navigate = useNavigate()
  const { user, profile, signOut, needsModeSelect } = useAuth()

  const [currentMatch, setCurrentMatch] = useState(null)
  const [matchedUser, setMatchedUser] = useState(null)
  const [currentMeetingMatch, setCurrentMeetingMatch] = useState(null)
  const [matchedMeetingUser, setMatchedMeetingUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [matchHistory, setMatchHistory] = useState([])
  const [activeTab, setActiveTab] = useState('today')
  const [activeMode, setActiveMode] = useState('dating') // 'dating' | 'meeting'

  // 모드 미선택 시 /mode-select로 리다이렉트
  useEffect(() => {
    if (needsModeSelect) navigate('/mode-select')
  }, [needsModeSelect])

  useEffect(() => {
    if (user && profile && !needsModeSelect) {
      // 초기 활성 모드 설정
      setActiveMode(profile.mode_dating ? 'dating' : 'meeting')
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

      await fetchMatchHistory()
    } catch (err) {
      console.error('fetchData error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMatchHistory = async () => {
    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('cycle_start', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!matches || matches.length === 0) { setMatchHistory([]); return }

      const otherUserIds = [...new Set(matches.map(m => m.user_a === user.id ? m.user_b : m.user_a))]
      const { data: otherUsers } = await supabase.from('users').select('*').in('id', otherUserIds)

      const userMap = {}
      ;(otherUsers || []).forEach(u => { userMap[u.id] = u })

      setMatchHistory(matches.map(match => ({
        ...match,
        otherUser: userMap[match.user_a === user.id ? match.user_b : match.user_a] || null,
        myResponse: match.user_a === user.id ? match.response_a : match.response_b,
        theirResponse: match.user_a === user.id ? match.response_b : match.response_a,
      })))
    } catch (err) {
      console.error('fetchMatchHistory error:', err)
    }
  }

  const handleResponse = async (response, match, setMatch) => {
    if (!match) return
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
      fetchMatchHistory()
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

  const getMatchSummary = (match, matchType) => {
    if (!match) return matchType === 'dating' ? '매칭 준비 중' : '미팅 준비 중'
    if (match.status === 'matched') return '🎉 성사!'
    if (match.status === 'rejected') return '이번엔 불발'
    if (match.status === 'no_match') return '상대 없음'
    const myResp = getMyResponse(match)
    if (myResp === null) return '응답 대기'
    return myResp === true ? '수락함 ✓' : '거절함'
  }

  // 범용 매칭 카드 렌더러
  const renderMatchCard = (match, matchedUserData, matchType) => {
    const isDating = matchType === 'dating'
    const setMatch = isDating ? setCurrentMatch : setCurrentMeetingMatch
    const bioField = isDating ? 'bio_dating' : 'bio_meeting'
    const myResponse = getMyResponse(match)
    const theirResponse = getTheirResponse(match)
    const status = match?.status

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
            {isDating
              ? '내일 오후 1시에 매칭 상대가 공개돼요!\n조금만 기다려주세요'
              : '이번 주 미팅 매칭 결과를\n기다려주세요!'}
          </p>
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
              <span className="text-3xl">{matchedUserData?.gender === 'male' ? '👨' : '👩'}</span>
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

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl mb-4">
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

    // 거절됨
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
          <p className="text-zinc-400 text-sm">{rejectionDesc}<br />내일 오후 1시에 새로운 분을 소개해드릴게요</p>
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
            내일 오후 1시에 다시 매칭해드릴게요
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
            <span className="text-3xl">{matchedUserData?.gender === 'male' ? '👨' : '👩'}</span>
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
            ) : (
              <div className="text-center py-4">
                {myResponse === true ? (
                  <div>
                    <div className="inline-flex items-center gap-2 bg-orange-500/15 text-orange-400 px-4 py-2 rounded-full mb-2">
                      <span className="font-medium">{isDating ? '매칭할래요를 선택했어요!' : '미팅할래요를 선택했어요!'}</span>
                    </div>
                    <p className="text-zinc-400 text-sm">
                      {theirResponse === null
                        ? '상대방의 응답을 기다리고 있어요...'
                        : theirResponse === true
                        ? '상대방도 수락했어요! 결과를 기다려주세요'
                        : '상대방이 거절했어요'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="inline-flex items-center gap-2 bg-zinc-700 text-zinc-400 px-4 py-2 rounded-full mb-2">
                      <span className="font-medium">{isDating ? '매칭 안할래요를 선택했어요' : '미팅 안할래요를 선택했어요'}</span>
                    </div>
                    <p className="text-zinc-500 text-sm">다음 매칭을 기다려주세요!</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const getStatusLabel = (match) => {
    if (match.status === 'matched') return { text: '성사', color: 'bg-green-500/15 text-green-400' }
    if (match.status === 'rejected') return { text: '불발', color: 'bg-zinc-700 text-zinc-400' }
    return { text: '진행중', color: 'bg-orange-500/15 text-orange-400' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const hasDating = profile?.mode_dating
  const hasMeeting = profile?.mode_meeting
  const bothModes = hasDating && hasMeeting

  return (
    <div className="min-h-screen bg-zinc-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 z-50">
        <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-between">
          <img src="/Gitty2.png" alt="GITTY" className="h-8 w-auto" />
          <button
            onClick={async () => { await signOut(); navigate('/') }}
            className="text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-6 pt-4">
        <div className="flex gap-2 bg-zinc-800 p-1 rounded-xl">
          {[
            { key: 'today', label: '매칭현황' },
            { key: 'history', label: '결과안내' },
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
        {activeTab === 'today' && (
          <>
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

            {/* 듀얼 모드: 2컬럼 탭 셀렉터 */}
            {bothModes && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { mode: 'dating', emoji: '💑', label: '소개팅', match: currentMatch },
                  { mode: 'meeting', emoji: '🎉', label: '미팅', match: currentMeetingMatch },
                ].map(({ mode, emoji, label, match }) => (
                  <button
                    key={mode}
                    onClick={() => setActiveMode(mode)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      activeMode === mode
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{emoji}</span>
                      <span className="text-white font-semibold text-sm">{label}</span>
                    </div>
                    <p className="text-zinc-400 text-xs">{getMatchSummary(match, mode)}</p>
                  </button>
                ))}
              </div>
            )}

            {/* 매칭 카드 */}
            {hasDating && (!bothModes || activeMode === 'dating') &&
              renderMatchCard(currentMatch, matchedUser, 'dating')}
            {hasMeeting && (!bothModes || activeMode === 'meeting') &&
              renderMatchCard(currentMeetingMatch, matchedMeetingUser, 'meeting')}
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">매칭 히스토리</h2>

            {matchHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-zinc-500">아직 매칭 기록이 없어요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchHistory.map((match) => {
                  const statusLabel = getStatusLabel(match)
                  const isMeeting = match.match_type === 'meeting'
                  return (
                    <div key={match.id} className="bg-zinc-800 rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center">
                            <span className="text-xl">
                              {match.otherUser?.gender === 'male' ? '👨' : '👩'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-medium text-white">
                                {match.status === 'matched'
                                  ? match.otherUser?.name
                                  : `${match.otherUser?.name?.charAt(0)}**`} 님
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                isMeeting ? 'bg-purple-500/15 text-purple-400' : 'bg-zinc-700 text-zinc-400'
                              }`}>
                                {isMeeting ? '미팅' : '소개팅'}
                              </span>
                            </div>
                            <p className="text-zinc-500 text-xs">
                              {new Date(match.cycle_start).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabel.color}`}>
                          {statusLabel.text}
                        </span>
                      </div>

                      {match.status === 'matched' && (
                        <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="text-yellow-400 text-xs">카카오톡 ID</p>
                          <p className="text-yellow-300 font-bold">{match.otherUser?.kakao_id || '미등록'}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

export default HomePage
