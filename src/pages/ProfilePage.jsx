import { useState } from 'react'
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

const WORK_TYPES = [
  { value: 'large', label: '대기업', icon: '🏢' },
  { value: 'mid', label: '중견기업', icon: '🏬' },
  { value: 'startup', label: '스타트업', icon: '🚀' },
  { value: 'small', label: '중소기업', icon: '🏠' },
  { value: 'entrepreneur', label: '창업/자영업', icon: '💼' },
]

const SMOKING_LABELS = {
  no: '비흡연',
  sometimes: '가끔',
  yes: '흡연',
}

const SMOKING_OPTIONS = [
  { value: 'no', label: '비흡연', icon: '🚭' },
  { value: 'sometimes', label: '가끔', icon: '🚬' },
  { value: 'yes', label: '흡연', icon: '🚬' },
]

const DRINKING_LABELS = {
  no: '안 마셔요',
  sometimes: '가끔 마셔요',
  often: '자주 마셔요',
}

const DRINKING_OPTIONS = [
  { value: 'no', label: '안 마셔요', icon: '🚫' },
  { value: 'sometimes', label: '가끔 마셔요', icon: '🍺' },
  { value: 'often', label: '자주 마셔요', icon: '🍻' },
]

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

const INTEREST_OPTIONS = [
  { value: 'exercise', label: '운동/헬스', icon: '🏃' },
  { value: 'movie', label: '영화/넷플릭스', icon: '🎬' },
  { value: 'reading', label: '독서', icon: '📚' },
  { value: 'food', label: '맛집탐방', icon: '🍽️' },
  { value: 'travel', label: '여행', icon: '✈️' },
  { value: 'music', label: '음악/공연', icon: '🎵' },
  { value: 'cafe', label: '카페', icon: '☕' },
  { value: 'game', label: '게임', icon: '🎮' },
  { value: 'pet', label: '반려동물', icon: '🐶' },
  { value: 'photo', label: '사진', icon: '📷' },
  { value: 'cooking', label: '요리', icon: '🍳' },
  { value: 'drink', label: '술/와인', icon: '🍷' },
  { value: 'sports', label: '스포츠관람', icon: '⚽' },
  { value: 'culture', label: '전시/문화', icon: '🎨' },
  { value: 'selfdev', label: '자기계발', icon: '💪' },
]

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

const ProfilePage = () => {
  const navigate = useNavigate()
  const { profile, signOut, refreshProfile, user } = useAuth()
  
  // 수정 모달 상태
  const [editModal, setEditModal] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editInterests, setEditInterests] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  
  // 전화번호 수정용
  const [phoneStep, setPhoneStep] = useState('input')
  const [newPhone, setNewPhone] = useState('')
  const [verifyCode, setVerifyCode] = useState('')

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  // 관심사 문자열을 배열로 변환
  const getInterests = () => {
    if (!profile?.interests) return []
    return profile.interests.split(',').filter(i => i)
  }

  // 수정 모달 열기
  const openEditModal = (field) => {
    setError('')
    setEditModal(field)
    
    if (field === 'region') setEditValue(profile?.region || '')
    else if (field === 'workLocation') setEditValue(profile?.work_location || '')
    else if (field === 'workType') setEditValue(profile?.work_type || '')
    else if (field === 'mbti') setEditValue(profile?.mbti || '')
    else if (field === 'smoking') setEditValue(profile?.smoking || '')
    else if (field === 'drinking') setEditValue(profile?.drinking || '')
    else if (field === 'interests') setEditInterests(getInterests())
    else if (field === 'phone') {
      setPhoneStep('input')
      setNewPhone('')
      setVerifyCode('')
    }
  }

  // 수정 모달 닫기
  const closeEditModal = () => {
    setEditModal(null)
    setEditValue('')
    setEditInterests([])
    setError('')
    setPhoneStep('input')
    setNewPhone('')
    setVerifyCode('')
  }

  // 관심사 토글
  const toggleInterest = (value) => {
    if (editInterests.includes(value)) {
      setEditInterests(editInterests.filter(i => i !== value))
    } else if (editInterests.length < 5) {
      setEditInterests([...editInterests, value])
    }
  }

  // 저장하기
  const handleSave = async () => {
    setSaving(true)
    setError('')
    
    try {
      let updateData = {}
      
      if (editModal === 'region') updateData.region = editValue
      else if (editModal === 'workLocation') updateData.work_location = editValue
      else if (editModal === 'workType') updateData.work_type = editValue
      else if (editModal === 'mbti') updateData.mbti = editValue
      else if (editModal === 'smoking') updateData.smoking = editValue
      else if (editModal === 'drinking') updateData.drinking = editValue
      else if (editModal === 'interests') updateData.interests = editInterests.join(',')
      
      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
      
      if (updateError) throw updateError
      
      await refreshProfile(user.id)
      closeEditModal()
    } catch (err) {
      console.error('Update error:', err)
      setError('저장 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  // 전화번호 인증번호 전송
  const handlePhoneSendCode = () => {
    if (newPhone.length < 10) {
      setError('올바른 전화번호를 입력해주세요')
      return
    }
    setError('')
    setPhoneStep('verify')
  }

  // 전화번호 인증 및 저장
  const handlePhoneVerify = async () => {
    if (verifyCode !== '1234') {
      setError('인증번호가 일치하지 않습니다')
      return
    }
    
    setSaving(true)
    setError('')
    
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ phone: newPhone })
        .eq('id', user.id)
      
      if (updateError) throw updateError
      
      await refreshProfile(user.id)
      closeEditModal()
    } catch (err) {
      console.error('Phone update error:', err)
      setError('전화번호 변경 중 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-surface-50/80 backdrop-blur-lg border-b border-surface-200 z-50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2 text-surface-600 hover:text-surface-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-lg">내 정보</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6">
        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-lg shadow-surface-200/50 overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-primary-500 to-accent-500 px-6 py-8">
            <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">
                {profile?.gender === 'male' ? '👨' : '👩'}
              </span>
            </div>
            <h2 className="text-center text-white text-xl font-bold">
              {profile?.name || '이름 없음'}
            </h2>
            <p className="text-center text-white/80 text-sm mt-1">
              {profile?.birth_year ? `${new Date().getFullYear() - profile.birth_year + 1}세` : ''} · {profile?.gender === 'male' ? '남성' : '여성'}
            </p>
          </div>

          <div className="p-6 space-y-4">
            {/* 휴대폰 */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">휴대폰</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{profile?.phone || '-'}</span>
                <button onClick={() => openEditModal('phone')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>
            
            {/* 거주 지역 */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">거주 지역</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{profile?.region || '-'}</span>
                <button onClick={() => openEditModal('region')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>
            
            {/* 직장 위치 */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">직장 위치</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{profile?.work_location || '-'}</span>
                <button onClick={() => openEditModal('workLocation')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>
            
            {/* 직장 유형 */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">직장 유형</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{WORK_TYPE_LABELS[profile?.work_type] || '-'}</span>
                <button onClick={() => openEditModal('workType')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>
            
            {/* MBTI */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">MBTI</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{profile?.mbti || '-'}</span>
                <button onClick={() => openEditModal('mbti')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>
            
            {/* 흡연 */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">흡연</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{SMOKING_LABELS[profile?.smoking] || '-'}</span>
                <button onClick={() => openEditModal('smoking')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>
            
            {/* 음주 */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">음주</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{DRINKING_LABELS[profile?.drinking] || '-'}</span>
                <button onClick={() => openEditModal('drinking')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>

            {/* 관심사 */}
            <div className="py-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-surface-500">관심사</span>
                <button onClick={() => openEditModal('interests')} className="text-primary-500 text-sm">수정</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {getInterests().length > 0 ? (
                  getInterests().map((interest) => (
                    <span 
                      key={interest}
                      className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-sm"
                    >
                      {INTEREST_LABELS[interest] || interest}
                    </span>
                  ))
                ) : (
                  <span className="text-surface-400">-</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full py-4 px-6 bg-white border border-surface-200 text-surface-600 font-medium rounded-xl hover:bg-surface-50 transition-all"
          >
            로그아웃
          </button>
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-200">
        <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-around">
          <button 
            onClick={() => navigate('/home')}
            className="flex flex-col items-center gap-1 text-surface-400"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="text-xs font-medium">매칭</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-primary-500">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
            <span className="text-xs font-medium">내 정보</span>
          </button>
        </div>
      </nav>

      {/* 수정 모달 - 텍스트 입력 (거주 지역, 직장 위치) */}
      {(editModal === 'region' || editModal === 'workLocation') && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4">
              {editModal === 'region' ? '거주 지역 수정' : '직장 위치 수정'}
            </h3>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder={editModal === 'region' ? '서울 강남구' : '판교'}
              className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={closeEditModal}
                className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 - 직장 유형 */}
      {editModal === 'workType' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4">직장 유형 수정</h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {WORK_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setEditValue(type.value)}
                  className={`py-4 px-4 rounded-xl border-2 font-medium transition-all text-left ${
                    editValue === type.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 bg-surface-50 text-surface-600'
                  }`}
                >
                  <span className="text-xl mb-1 block">{type.icon}</span>
                  <span className="text-sm">{type.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={closeEditModal} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 - MBTI */}
      {editModal === 'mbti' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-surface-900 mb-4">MBTI 수정</h3>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {MBTI_TYPES.map((mbti) => (
                <button
                  key={mbti}
                  onClick={() => setEditValue(mbti)}
                  className={`py-3 px-2 rounded-xl border-2 font-medium text-sm transition-all ${
                    editValue === mbti
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 bg-surface-50 text-surface-600'
                  }`}
                >
                  {mbti}
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={closeEditModal} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 - 흡연 */}
      {editModal === 'smoking' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4">흡연 여부 수정</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {SMOKING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEditValue(option.value)}
                  className={`py-4 px-3 rounded-xl border-2 font-medium transition-all ${
                    editValue === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 bg-surface-50 text-surface-600'
                  }`}
                >
                  <span className="text-xl mb-1 block">{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={closeEditModal} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 - 음주 */}
      {editModal === 'drinking' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4">음주 여부 수정</h3>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {DRINKING_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setEditValue(option.value)}
                  className={`py-4 px-3 rounded-xl border-2 font-medium transition-all ${
                    editValue === option.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-surface-200 bg-surface-50 text-surface-600'
                  }`}
                >
                  <span className="text-xl mb-1 block">{option.icon}</span>
                  <span className="text-sm">{option.label}</span>
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={closeEditModal} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">취소</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50">
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 - 관심사 */}
      {editModal === 'interests' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-surface-900 mb-2">관심사 수정</h3>
            <p className="text-surface-500 text-sm mb-4">최소 1개, 최대 5개까지 선택 가능해요</p>
            <div className="flex flex-wrap gap-3 mb-4">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = editInterests.includes(interest.value)
                const isDisabled = !isSelected && editInterests.length >= 5
                return (
                  <button
                    key={interest.value}
                    onClick={() => !isDisabled && toggleInterest(interest.value)}
                    disabled={isDisabled}
                    className={`py-3 px-4 rounded-full border-2 font-medium transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : isDisabled
                        ? 'border-surface-200 bg-surface-100 text-surface-400 cursor-not-allowed'
                        : 'border-surface-200 bg-surface-50 text-surface-600'
                    }`}
                  >
                    <span>{interest.icon}</span>
                    <span className="text-sm">{interest.label}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-surface-500 text-sm text-center mb-4">{editInterests.length}/5 선택됨</p>
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={closeEditModal} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">취소</button>
              <button 
                onClick={handleSave} 
                disabled={saving || editInterests.length < 1} 
                className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 수정 모달 - 전화번호 */}
      {editModal === 'phone' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6">
            <h3 className="text-lg font-bold text-surface-900 mb-4">전화번호 수정</h3>
            
            {phoneStep === 'input' && (
              <>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="새 전화번호 입력"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                  maxLength={11}
                />
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={closeEditModal} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">취소</button>
                  <button 
                    onClick={handlePhoneSendCode} 
                    disabled={newPhone.length < 10}
                    className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50"
                  >
                    인증번호 받기
                  </button>
                </div>
              </>
            )}
            
            {phoneStep === 'verify' && (
              <>
                <p className="text-surface-500 text-sm mb-2">{newPhone}로 전송된 인증번호</p>
                <p className="text-accent-500 text-sm mb-4">테스트용 인증번호: 1234</p>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="인증번호 4자리"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 text-center text-2xl tracking-[0.5em] placeholder:text-surface-400 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
                  maxLength={4}
                />
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex gap-3">
                  <button onClick={() => setPhoneStep('input')} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">이전</button>
                  <button 
                    onClick={handlePhoneVerify} 
                    disabled={saving || verifyCode.length < 4}
                    className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50"
                  >
                    {saving ? '변경 중...' : '변경하기'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
