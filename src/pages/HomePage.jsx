import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const WORK_TYPE_LABELS = {
  large: '대기업',
  mid: '중견기업',
  startup: '스타트업',
  small: '중소기업',
  entrepreneur: '창업/자영업',
}

const SMOKING_LABELS = {
  no: '비흡연',
  sometimes: '가끔',
  yes: '흡연',
}

const DRINKING_LABELS = {
  no: '안 마셔요',
  sometimes: '가끔 마셔요',
  often: '자주 마셔요',
}

const INTEREST_LABELS = {
  exercise: '🏃 운동/헬스',
  movie: '🎬 영화/넷플릭스',
  reading: '📚 독서',
  food: '🍽️ 맛집탐방',
  travel: '✈️ 여행',
  music: '🎵 음악/공연',
  cafe: '☕ 카페',
  game: '🎮 게임',
  pet: '🐶 반려동물',
  photo: '📷 사진',
  cooking: '🍳 요리',
  drink: '🍷 술/와인',
  sports: '⚽ 스포츠관람',
  culture: '🎨 전시/문화',
  selfdev: '💪 자기계발',
}

const HomePage = () => {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading, signOut } = useAuth()
  const [currentMatch, setCurrentMatch] = useState(null)
  const [matchedUser, setMatchedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [matchHistory, setMatchHistory] = useState([])
  const [activeTab, setActiveTab] = useState('today')

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }
    
    if (user) {
      fetchCurrentMatch()
      fetchMatchHistory()
    }
  }, [user, authLoading])

  // 관심사 문자열을 배열로 변환
  const getInterests = (interestsStr) => {
    if (!interestsStr) return []
    return interestsStr.split(',').filter(i => i)
  }

  // 현재 진행 중인 매칭 가져오기
  const fetchCurrentMatch = async () => {
    try {
      // 오늘 날짜
      const today = new Date().toISOString().split('T')[0]
      
      // 가장 최근 매칭 가져오기 (오늘 이후의 매칭)
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .gte('cycle_start', today)
        .order('cycle_start', { ascending: false })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') {
        console.error('Match fetch error:', error)
      }
      
      if (matches) {
        setCurrentMatch(matches)
        
        // 매칭된 상대방 정보 가져오기
        const otherUserId = matches.user_a === user.id ? matches.user_b : matches.user_a
        const { data: otherUser } = await supabase
          .from('users')
          .select('*')
          .eq('id', otherUserId)
          .single()
        
        setMatchedUser(otherUser)
      }
    } catch (error) {
      console.error('Error fetching match:', error)
    } finally {
      setLoading(false)
    }
  }

  // 매칭 히스토리 가져오기
  const fetchMatchHistory = async () => {
    try {
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('cycle_start', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      // 각 매칭의 상대방 정보 가져오기
      const matchesWithUsers = await Promise.all(
        (matches || []).map(async (match) => {
          const otherUserId = match.user_a === user.id ? match.user_b : match.user_a
          const myResponse = match.user_a === user.id ? match.response_a : match.response_b
          const theirResponse = match.user_a === user.id ? match.response_b : match.response_a
          
          const { data: otherUser } = await supabase
            .from('users')
            .select('*')
            .eq('id', otherUserId)
            .single()
          
          return { ...match, otherUser, myResponse, theirResponse }
        })
      )
      
      setMatchHistory(matchesWithUsers)
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  // 매칭 응답하기 (매칭할래요 / 안할래요)
  const handleResponse = async (response) => {
    if (!currentMatch) return
    
    try {
      const responseField = currentMatch.user_a === user.id ? 'response_a' : 'response_b'
      const otherResponseField = currentMatch.user_a === user.id ? 'response_b' : 'response_a'
      const otherResponse = currentMatch[otherResponseField]
      
      // 내 응답 업데이트
      const updateData = { [responseField]: response }
      
      // 둘 다 응답했는지 확인하고 최종 상태 결정
      if (otherResponse !== null) {
        // 상대방이 이미 응답함
        if (response === true && otherResponse === true) {
          updateData.status = 'matched' // 둘 다 OK!
        } else {
          updateData.status = 'rejected' // 한 명이라도 거절
        }
      }
      
      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', currentMatch.id)
      
      if (error) throw error
      
      // 로컬 상태 업데이트
      setCurrentMatch({ ...currentMatch, ...updateData })
      fetchMatchHistory()
    } catch (error) {
      console.error('Error updating response:', error)
    }
  }

  // 내 응답 상태
  const getMyResponse = () => {
    if (!currentMatch) return null
    return currentMatch.user_a === user.id ? currentMatch.response_a : currentMatch.response_b
  }

  // 상대방 응답 상태
  const getTheirResponse = () => {
    if (!currentMatch) return null
    return currentMatch.user_a === user.id ? currentMatch.response_b : currentMatch.response_a
  }

  // 마감까지 남은 시간 계산
  const getTimeRemaining = () => {
    if (!currentMatch?.response_deadline) return null
    const deadline = new Date(currentMatch.response_deadline)
    const now = new Date()
    const diff = deadline - now
    
    if (diff <= 0) return '마감됨'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) return `${hours}시간 ${minutes}분 남음`
    return `${minutes}분 남음`
  }

  // 매칭 상태에 따른 UI 렌더링
  const renderMatchStatus = () => {
    if (!currentMatch) {
      // 매칭 없음 - 내일 공개 예정
      return (
        <div className="bg-white rounded-3xl shadow-lg shadow-surface-200/50 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">💝</span>
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-2">
            매칭 준비 중이에요
          </h2>
          <p className="text-surface-500 text-sm">
            내일 오후 1시에 매칭 상대가 공개돼요!
            <br />
            조금만 기다려주세요 ✨
          </p>
        </div>
      )
    }

    const myResponse = getMyResponse()
    const theirResponse = getTheirResponse()
    const status = currentMatch.status

    // 매칭 성사!
    if (status === 'matched') {
      return (
        <div className="bg-white rounded-3xl shadow-lg shadow-surface-200/50 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
            <div className="flex items-center justify-center gap-2">
              <span className="text-2xl">🎉</span>
              <span className="text-white font-bold text-lg">매칭 성사!</span>
              <span className="text-2xl">🎉</span>
            </div>
          </div>
          
          <div className="p-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-surface-200 to-surface-300 rounded-full flex items-center justify-center">
              <span className="text-3xl">
                {matchedUser?.gender === 'male' ? '👨' : '👩'}
              </span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-surface-900 mb-1">
                {matchedUser?.name} 님
              </h2>
              <p className="text-surface-500 text-sm">
                {matchedUser?.birth_year ? `${new Date().getFullYear() - matchedUser.birth_year + 1}세` : ''} · {matchedUser?.gender === 'male' ? '남성' : '여성'}
              </p>
            </div>

            {/* 카카오톡 ID 공개! */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">💬</span>
                </div>
                <div>
                  <p className="text-yellow-800 text-xs font-medium">카카오톡으로 연락해보세요!</p>
                  <p className="text-yellow-900 font-bold text-xl">{matchedUser?.kakao_id || '미등록'}</p>
                </div>
              </div>
            </div>

            {/* NEW: MBTI, 흡연, 음주 */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-3 bg-surface-50 rounded-xl text-center">
                <p className="text-surface-500 text-xs mb-1">MBTI</p>
                <p className="text-surface-900 font-medium">{matchedUser?.mbti || '-'}</p>
              </div>
              <div className="p-3 bg-surface-50 rounded-xl text-center">
                <p className="text-surface-500 text-xs mb-1">흡연</p>
                <p className="text-surface-900 font-medium">{SMOKING_LABELS[matchedUser?.smoking] || '-'}</p>
              </div>
              <div className="p-3 bg-surface-50 rounded-xl text-center">
                <p className="text-surface-500 text-xs mb-1">음주</p>
                <p className="text-surface-900 font-medium">{DRINKING_LABELS[matchedUser?.drinking] || '-'}</p>
              </div>
            </div>

            {/* NEW: 관심사 */}
            {matchedUser?.interests && (
              <div className="p-4 bg-surface-50 rounded-xl mb-4">
                <p className="text-surface-500 text-xs mb-2">관심사</p>
                <div className="flex flex-wrap gap-2">
                  {getInterests(matchedUser.interests).map((interest) => (
                    <span 
                      key={interest}
                      className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                    >
                      {INTEREST_LABELS[interest] || interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 자기소개 */}
            {matchedUser?.bio && (
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-surface-500 text-xs mb-2">자기소개</p>
                <p className="text-surface-700 text-sm leading-relaxed">{matchedUser.bio}</p>
              </div>
            )}
          </div>
        </div>
      )
    }

    // 거절됨 (결과 발표 후)
    if (status === 'rejected') {
      return (
        <div className="bg-white rounded-3xl shadow-lg shadow-surface-200/50 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-2">
            상대방이 거절했어요
          </h2>
          <p className="text-surface-500 text-sm">
            괜찮아요! 더 좋은 인연이 기다리고 있어요
            <br />
            내일 오후 1시에 새로운 분을 소개해드릴게요 💪
          </p>
        </div>
      )
    }

    // 매칭 상대 없음 (성비 문제 등)
    if (status === 'no_match') {
      return (
        <div className="bg-white rounded-3xl shadow-lg shadow-surface-200/50 p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-surface-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-surface-900 mb-2">
            오늘은 매칭 상대를 못 찾았어요
          </h2>
          <p className="text-surface-500 text-sm">
            자기소개를 더 자세히 쓰면 매칭 확률이 높아져요!
            <br />
            내일 오후 1시에 다시 매칭해드릴게요 💪
          </p>
        </div>
      )
    }

    // 응답 대기 중 (waiting 상태)
    return (
      <div className="bg-white rounded-3xl shadow-lg shadow-surface-200/50 overflow-hidden">
        {/* Card Header */}
        <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <span className="text-white/80 text-sm font-medium">오늘의 인연</span>
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">
              {getTimeRemaining() || '응답 대기 중'}
            </span>
          </div>
        </div>

        {/* Profile Info */}
        <div className="p-6">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-surface-200 to-surface-300 rounded-full flex items-center justify-center">
            <span className="text-3xl">
              {matchedUser?.gender === 'male' ? '👨' : '👩'}
            </span>
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-surface-900 mb-1">
              {matchedUser?.name?.charAt(0)}** 님
            </h2>
            <p className="text-surface-500 text-sm">
              {matchedUser?.birth_year ? `${new Date().getFullYear() - matchedUser.birth_year + 1}세` : ''} · {matchedUser?.gender === 'male' ? '남성' : '여성'}
            </p>
          </div>

          {/* Info Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <span>📍</span>
              </div>
              <div>
                <p className="text-surface-500 text-xs">거주지</p>
                <p className="text-surface-900 font-medium">{matchedUser?.region || '비공개'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center">
                <span>💼</span>
              </div>
              <div>
                <p className="text-surface-500 text-xs">직장 위치</p>
                <p className="text-surface-900 font-medium">{matchedUser?.work_location || '비공개'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-surface-50 rounded-xl">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span>🏢</span>
              </div>
              <div>
                <p className="text-surface-500 text-xs">직장 유형</p>
                <p className="text-surface-900 font-medium">{WORK_TYPE_LABELS[matchedUser?.work_type] || '비공개'}</p>
              </div>
            </div>

            {/* NEW: MBTI, 흡연, 음주 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-surface-50 rounded-xl text-center">
                <p className="text-surface-500 text-xs mb-1">MBTI</p>
                <p className="text-surface-900 font-medium text-sm">{matchedUser?.mbti || '-'}</p>
              </div>
              <div className="p-3 bg-surface-50 rounded-xl text-center">
                <p className="text-surface-500 text-xs mb-1">흡연</p>
                <p className="text-surface-900 font-medium text-sm">{SMOKING_LABELS[matchedUser?.smoking] || '-'}</p>
              </div>
              <div className="p-3 bg-surface-50 rounded-xl text-center">
                <p className="text-surface-500 text-xs mb-1">음주</p>
                <p className="text-surface-900 font-medium text-sm">{DRINKING_LABELS[matchedUser?.drinking] || '-'}</p>
              </div>
            </div>

            {/* NEW: 관심사 */}
            {matchedUser?.interests && (
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-surface-500 text-xs mb-2">관심사</p>
                <div className="flex flex-wrap gap-2">
                  {getInterests(matchedUser.interests).map((interest) => (
                    <span 
                      key={interest}
                      className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs"
                    >
                      {INTEREST_LABELS[interest] || interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 자기소개 */}
            {matchedUser?.bio && (
              <div className="p-4 bg-surface-50 rounded-xl">
                <p className="text-surface-500 text-xs mb-2">자기소개</p>
                <p className="text-surface-700 text-sm leading-relaxed">{matchedUser.bio}</p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6">
            {myResponse === null ? (
              // 아직 응답 안함
              <div className="space-y-3">
                <p className="text-center text-surface-500 text-sm mb-3">
                  둘 중 하나를 선택해야 다음 매칭이 활성화됩니다!
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleResponse(false)}
                    className="py-4 px-6 bg-surface-100 hover:bg-surface-200 text-surface-600 font-semibold rounded-xl transition-all"
                  >
                    매칭 안할래요
                  </button>
                  <button
                    onClick={() => handleResponse(true)}
                    className="py-4 px-6 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold rounded-xl transition-all"
                  >
                    매칭할래요! 💕
                  </button>
                </div>
              </div>
            ) : (
              // 이미 응답함
              <div className="text-center py-4">
                {myResponse === true ? (
                  <div>
                    <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full mb-2">
                      <span>💕</span>
                      <span className="font-medium">매칭할래요를 선택했어요!</span>
                    </div>
                    <p className="text-surface-500 text-sm">
                      {theirResponse === null 
                        ? '상대방의 응답을 기다리고 있어요...'
                        : theirResponse === true
                        ? '상대방도 수락했어요! 결과를 기다려주세요 🎉'
                        : '상대방이 거절했어요 😢'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="inline-flex items-center gap-2 bg-surface-100 text-surface-600 px-4 py-2 rounded-full mb-2">
                      <span>👋</span>
                      <span className="font-medium">매칭 안할래요를 선택했어요</span>
                    </div>
                    <p className="text-surface-500 text-sm">
                      다음 매칭을 기다려주세요!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 히스토리 상태 라벨
  const getStatusLabel = (match) => {
    if (match.status === 'matched') {
      return { text: '성사', color: 'bg-green-100 text-green-700' }
    } else if (match.status === 'rejected') {
      return { text: '불발', color: 'bg-surface-100 text-surface-600' }
    } else {
      return { text: '진행중', color: 'bg-primary-100 text-primary-700' }
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-surface-50/80 backdrop-blur-lg border-b border-surface-200 z-50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm font-[Outfit]">G</span>
            </div>
            <span className="font-bold text-lg font-[Outfit]">GITTY</span>
          </div>
          <button 
            onClick={signOut}
            className="text-surface-500 text-sm hover:text-surface-700"
          >
            로그아웃
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-6 pt-4">
        <div className="flex gap-2 bg-surface-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('today')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'today'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            매칭현황
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${
              activeTab === 'history'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500 hover:text-surface-700'
            }`}
          >
            결과안내
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-lg mx-auto px-6 py-6">
        {activeTab === 'today' && (
          <>
            {/* Welcome message */}
            <div className="mb-6">
              <h1 className="text-xl font-bold text-surface-900">
                안녕하세요, {profile?.name || '회원'}님! 👋
              </h1>
              <p className="text-surface-500 text-sm mt-1">
                {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
            </div>

            {/* Match Status Card */}
            {renderMatchStatus()}
          </>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-surface-900">매칭 히스토리</h2>
            
            {matchHistory.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-surface-500">아직 매칭 기록이 없어요</p>
              </div>
            ) : (
              <div className="space-y-3">
                {matchHistory.map((match) => {
                  const statusLabel = getStatusLabel(match)
                  return (
                    <div key={match.id} className="bg-white rounded-2xl p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center">
                            <span className="text-xl">
                              {match.otherUser?.gender === 'male' ? '👨' : '👩'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-surface-900">
                              {match.status === 'matched' 
                                ? match.otherUser?.name 
                                : `${match.otherUser?.name?.charAt(0)}**`} 님
                            </p>
                            <p className="text-surface-500 text-xs">
                              {new Date(match.cycle_start).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusLabel.color}`}>
                          {statusLabel.text}
                        </span>
                      </div>
                      
                      {/* 성사된 매칭은 카톡 ID 표시 */}
                      {match.status === 'matched' && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                          <p className="text-yellow-800 text-xs">카카오톡 ID</p>
                          <p className="text-yellow-900 font-bold">{match.otherUser?.kakao_id || '미등록'}</p>
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200 z-50">
        <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-around">
          <button className="flex flex-col items-center gap-1 text-primary-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="text-xs font-medium">매칭</span>
          </button>
          <button 
            onClick={() => navigate('/profile')}
            className="flex flex-col items-center gap-1 text-surface-400 hover:text-surface-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs font-medium">내 정보</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default HomePage
