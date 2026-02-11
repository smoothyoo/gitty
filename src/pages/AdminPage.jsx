import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

// 관리자 전화번호 (이 번호로 로그인한 사람만 접근 가능)
const ADMIN_PHONE = '01053768084'

const WORK_TYPE_LABELS = {
  large: '대기업',
  mid: '중견기업',
  startup: '스타트업',
  small: '중소기업',
  entrepreneur: '창업/자영업',
}

const AdminPage = () => {
  const navigate = useNavigate()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [users, setUsers] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedMale, setSelectedMale] = useState(null)
  const [selectedFemale, setSelectedFemale] = useState(null)
  const [activeTab, setActiveTab] = useState('users')
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')

  // 관리자 권한 체크
  const isAdmin = profile?.phone === ADMIN_PHONE

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
      return
    }
    
    if (!authLoading && profile && !isAdmin) {
      // 관리자 아니면 홈으로
      navigate('/home')
      return
    }

    if (isAdmin) {
      fetchAllData()
    }
  }, [user, profile, authLoading, isAdmin])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([fetchUsers(), fetchMatches()])
    setLoading(false)
  }

  // 모든 유저 가져오기 (RLS 우회 필요 - 아래 설명)
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  // 모든 매칭 가져오기
  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setMatches(data || [])
    } catch (error) {
      console.error('Error fetching matches:', error)
    }
  }

  // 매칭 생성
  const createMatch = async () => {
    if (!selectedMale || !selectedFemale) {
      setMessage('남자와 여자를 각각 선택해주세요!')
      return
    }

    setCreating(true)
    setMessage('')

    try {
      const today = new Date()
      const cycleStart = today.toISOString().split('T')[0]
      
      // 응답 마감: 오늘 밤 10시
      const deadline = new Date(today)
      deadline.setHours(22, 0, 0, 0)
      
      // 결과 발표: 내일 오후 5시
      const resultDate = new Date(today)
      resultDate.setDate(resultDate.getDate() + 1)
      resultDate.setHours(17, 0, 0, 0)

      const { error } = await supabase
        .from('matches')
        .insert({
          user_a: selectedMale.id,
          user_b: selectedFemale.id,
          cycle_start: cycleStart,
          response_deadline: deadline.toISOString(),
          result_date: resultDate.toISOString(),
          status: 'waiting'
        })

      if (error) throw error

      setMessage(`✅ 매칭 생성 완료! ${selectedMale.name} ↔ ${selectedFemale.name}`)
      setSelectedMale(null)
      setSelectedFemale(null)
      fetchMatches()
    } catch (error) {
      console.error('Error creating match:', error)
      setMessage(`❌ 에러: ${error.message}`)
    } finally {
      setCreating(false)
    }
  }

  // 매칭 삭제
  const deleteMatch = async (matchId) => {
    if (!confirm('정말 이 매칭을 삭제할까요?')) return

    try {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)

      if (error) throw error
      
      setMessage('✅ 매칭 삭제됨')
      fetchMatches()
    } catch (error) {
      console.error('Error deleting match:', error)
      setMessage(`❌ 에러: ${error.message}`)
    }
  }

  // 유저 이름 찾기
  const getUserName = (userId) => {
    const user = users.find(u => u.id === userId)
    return user?.name || '알 수 없음'
  }

  // 남자/여자 분리
  const maleUsers = users.filter(u => u.gender === 'male')
  const femaleUsers = users.filter(u => u.gender === 'female')

  // 로딩 중
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 관리자 아님
  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      {/* Header */}
      <header className="bg-surface-800 border-b border-surface-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">G</span>
            </div>
            <div>
              <h1 className="font-bold text-lg">GITTY Admin</h1>
              <p className="text-surface-400 text-xs">관리자 페이지</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-surface-300">{profile?.name}</p>
              <p className="text-xs text-surface-500">{profile?.phone}</p>
            </div>
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm transition-colors"
            >
              홈으로
            </button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-800 rounded-xl p-4">
            <p className="text-surface-400 text-sm">전체 유저</p>
            <p className="text-2xl font-bold">{users.length}명</p>
          </div>
          <div className="bg-surface-800 rounded-xl p-4">
            <p className="text-surface-400 text-sm">남자</p>
            <p className="text-2xl font-bold text-blue-400">{maleUsers.length}명</p>
          </div>
          <div className="bg-surface-800 rounded-xl p-4">
            <p className="text-surface-400 text-sm">여자</p>
            <p className="text-2xl font-bold text-pink-400">{femaleUsers.length}명</p>
          </div>
          <div className="bg-surface-800 rounded-xl p-4">
            <p className="text-surface-400 text-sm">총 매칭</p>
            <p className="text-2xl font-bold text-green-400">{matches.length}건</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-2 border-b border-surface-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            }`}
          >
            👥 유저 관리
          </button>
          <button
            onClick={() => setActiveTab('match')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'match'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            }`}
          >
            💕 매칭 생성
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 -mb-px ${
              activeTab === 'history'
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-200'
            }`}
          >
            📋 매칭 현황
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* 메시지 */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl ${
            message.startsWith('✅') ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* 유저 관리 탭 */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-2 gap-6">
            {/* 남자 목록 */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-blue-400">👨</span> 남자 ({maleUsers.length})
              </h2>
              <div className="space-y-3">
                {maleUsers.map(user => (
                  <div key={user.id} className="bg-surface-800 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-surface-400 text-sm">{user.birth_year}년생 · {user.region}</p>
                        <p className="text-surface-500 text-xs">{WORK_TYPE_LABELS[user.work_type]} · {user.work_location}</p>
                      </div>
                      <span className="text-xs text-surface-500">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    {user.bio && (
                      <p className="mt-2 text-sm text-surface-300 line-clamp-2">{user.bio}</p>
                    )}
                    <p className="mt-2 text-xs text-surface-500">📱 {user.phone}</p>
                  </div>
                ))}
                {maleUsers.length === 0 && (
                  <p className="text-surface-500 text-center py-8">아직 남자 유저가 없어요</p>
                )}
              </div>
            </div>

            {/* 여자 목록 */}
            <div>
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-pink-400">👩</span> 여자 ({femaleUsers.length})
              </h2>
              <div className="space-y-3">
                {femaleUsers.map(user => (
                  <div key={user.id} className="bg-surface-800 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{user.name}</p>
                        <p className="text-surface-400 text-sm">{user.birth_year}년생 · {user.region}</p>
                        <p className="text-surface-500 text-xs">{WORK_TYPE_LABELS[user.work_type]} · {user.work_location}</p>
                      </div>
                      <span className="text-xs text-surface-500">
                        {new Date(user.created_at).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                    {user.bio && (
                      <p className="mt-2 text-sm text-surface-300 line-clamp-2">{user.bio}</p>
                    )}
                    <p className="mt-2 text-xs text-surface-500">📱 {user.phone}</p>
                  </div>
                ))}
                {femaleUsers.length === 0 && (
                  <p className="text-surface-500 text-center py-8">아직 여자 유저가 없어요</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 매칭 생성 탭 */}
        {activeTab === 'match' && (
          <div>
            {/* 선택된 유저 표시 */}
            <div className="bg-surface-800 rounded-xl p-6 mb-6">
              <h3 className="font-bold mb-4">선택된 유저</h3>
              <div className="grid grid-cols-3 gap-4 items-center">
                {/* 남자 */}
                <div className={`p-4 rounded-xl border-2 ${
                  selectedMale ? 'border-blue-500 bg-blue-500/10' : 'border-surface-600 border-dashed'
                }`}>
                  {selectedMale ? (
                    <div>
                      <p className="font-bold text-blue-400">{selectedMale.name}</p>
                      <p className="text-sm text-surface-400">{selectedMale.birth_year}년생</p>
                      <button
                        onClick={() => setSelectedMale(null)}
                        className="mt-2 text-xs text-red-400 hover:text-red-300"
                      >
                        선택 취소
                      </button>
                    </div>
                  ) : (
                    <p className="text-surface-500 text-center">남자 선택</p>
                  )}
                </div>

                {/* 화살표 */}
                <div className="text-center">
                  <span className="text-4xl">💕</span>
                </div>

                {/* 여자 */}
                <div className={`p-4 rounded-xl border-2 ${
                  selectedFemale ? 'border-pink-500 bg-pink-500/10' : 'border-surface-600 border-dashed'
                }`}>
                  {selectedFemale ? (
                    <div>
                      <p className="font-bold text-pink-400">{selectedFemale.name}</p>
                      <p className="text-sm text-surface-400">{selectedFemale.birth_year}년생</p>
                      <button
                        onClick={() => setSelectedFemale(null)}
                        className="mt-2 text-xs text-red-400 hover:text-red-300"
                      >
                        선택 취소
                      </button>
                    </div>
                  ) : (
                    <p className="text-surface-500 text-center">여자 선택</p>
                  )}
                </div>
              </div>

              {/* 매칭 생성 버튼 */}
              <button
                onClick={createMatch}
                disabled={!selectedMale || !selectedFemale || creating}
                className="w-full mt-6 py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-600 disabled:to-surface-600 text-white font-bold rounded-xl transition-all disabled:cursor-not-allowed"
              >
                {creating ? '생성 중...' : '매칭 생성하기'}
              </button>
            </div>

            {/* 유저 선택 목록 */}
            <div className="grid grid-cols-2 gap-6">
              {/* 남자 목록 */}
              <div>
                <h3 className="font-bold mb-4 text-blue-400">👨 남자 선택</h3>
                <div className="space-y-2">
                  {maleUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedMale(user)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        selectedMale?.id === user.id
                          ? 'bg-blue-500/20 border-2 border-blue-500'
                          : 'bg-surface-800 hover:bg-surface-700 border-2 border-transparent'
                      }`}
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-surface-400">
                        {user.birth_year}년생 · {user.region} · {WORK_TYPE_LABELS[user.work_type]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 여자 목록 */}
              <div>
                <h3 className="font-bold mb-4 text-pink-400">👩 여자 선택</h3>
                <div className="space-y-2">
                  {femaleUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedFemale(user)}
                      className={`w-full text-left p-4 rounded-xl transition-all ${
                        selectedFemale?.id === user.id
                          ? 'bg-pink-500/20 border-2 border-pink-500'
                          : 'bg-surface-800 hover:bg-surface-700 border-2 border-transparent'
                      }`}
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-surface-400">
                        {user.birth_year}년생 · {user.region} · {WORK_TYPE_LABELS[user.work_type]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 매칭 현황 탭 */}
        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">전체 매칭 ({matches.length}건)</h2>
              <button
                onClick={fetchMatches}
                className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg text-sm transition-colors"
              >
                새로고침
              </button>
            </div>

            <div className="space-y-3">
              {matches.map(match => {
                const userA = users.find(u => u.id === match.user_a)
                const userB = users.find(u => u.id === match.user_b)
                
                return (
                  <div key={match.id} className="bg-surface-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* 유저 A */}
                        <div className="text-center">
                          <p className="font-medium text-blue-400">{userA?.name || '?'}</p>
                          <p className="text-xs text-surface-500">{userA?.birth_year}년생</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                            match.response_a === true ? 'bg-green-500/20 text-green-400' :
                            match.response_a === false ? 'bg-red-500/20 text-red-400' :
                            'bg-surface-600 text-surface-400'
                          }`}>
                            {match.response_a === true ? 'OK' : match.response_a === false ? 'NO' : '대기'}
                          </span>
                        </div>

                        <span className="text-2xl">↔</span>

                        {/* 유저 B */}
                        <div className="text-center">
                          <p className="font-medium text-pink-400">{userB?.name || '?'}</p>
                          <p className="text-xs text-surface-500">{userB?.birth_year}년생</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${
                            match.response_b === true ? 'bg-green-500/20 text-green-400' :
                            match.response_b === false ? 'bg-red-500/20 text-red-400' :
                            'bg-surface-600 text-surface-400'
                          }`}>
                            {match.response_b === true ? 'OK' : match.response_b === false ? 'NO' : '대기'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                          match.status === 'matched' ? 'bg-green-500/20 text-green-400' :
                          match.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {match.status === 'matched' ? '성사 💕' : 
                           match.status === 'rejected' ? '불발' : '진행중'}
                        </span>
                        <p className="text-xs text-surface-500 mt-1">
                          {new Date(match.cycle_start).toLocaleDateString('ko-KR')}
                        </p>
                        <button
                          onClick={() => deleteMatch(match.id)}
                          className="text-xs text-red-400 hover:text-red-300 mt-1"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {matches.length === 0 && (
                <div className="text-center py-12 text-surface-500">
                  아직 매칭 기록이 없어요
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminPage
