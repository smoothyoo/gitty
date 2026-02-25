import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generatePassword, generateEmail } from '../lib/auth'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import {
  WORK_TYPES, WORK_TYPE_LABELS, MBTI_TYPES,
  SMOKING_OPTIONS, SMOKING_LABELS, DRINKING_OPTIONS, DRINKING_LABELS,
  INTEREST_OPTIONS, INTEREST_LABELS, parseInterests,
  REGIONS, PERSONAL_EMAIL_DOMAINS,
  DUMMY_SMS_CODE, SHOW_TEST_HINTS, WORK_VERIFICATION_FORM_URL,
} from '../lib/constants'

// "seoul:강남구" → "서울 강남구"
const formatRegion = (regionStr) => {
  if (!regionStr) return '-'
  const [city, district] = regionStr.split(':')
  const cityLabel = REGIONS[city]?.label || city
  return district ? `${cityLabel} ${district}` : cityLabel
}

const ProfilePage = () => {
  const navigate = useNavigate()
  const { profile, signOut, refreshProfile, user } = useAuth()

  const [editModal, setEditModal] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editInterests, setEditInterests] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [phoneStep, setPhoneStep] = useState('input')
  const [newPhone, setNewPhone] = useState('')
  const [verifyCode, setVerifyCode] = useState('')

  // 직장 인증 상태
  const [workEmail, setWorkEmail] = useState('')
  const [workVerifyCode, setWorkVerifyCode] = useState('')
  const [workCodeSent, setWorkCodeSent] = useState(false)
  const [workVerifyLoading, setWorkVerifyLoading] = useState(false)
  const [workVerifyError, setWorkVerifyError] = useState('')

  const currentInterests = parseInterests(profile?.interests)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const openEditModal = (field) => {
    setError('')
    setEditModal(field)

    if (field === 'region') setEditValue(profile?.region || '')
    else if (field === 'workLocation') setEditValue(profile?.work_location || '')
    else if (field === 'workType') setEditValue(profile?.work_type || '')
    else if (field === 'mbti') setEditValue(profile?.mbti || '')
    else if (field === 'smoking') setEditValue(profile?.smoking || '')
    else if (field === 'drinking') setEditValue(profile?.drinking || '')
    else if (field === 'interests') setEditInterests(parseInterests(profile?.interests))
    else if (field === 'bio') setEditValue(profile?.bio || '')
    else if (field === 'kakaoId') setEditValue(profile?.kakao_id || '')
    else if (field === 'phone') {
      setPhoneStep('input')
      setNewPhone('')
      setVerifyCode('')
    }
  }

  const closeEditModal = () => {
    setEditModal(null)
    setEditValue('')
    setEditInterests([])
    setError('')
    setPhoneStep('input')
    setNewPhone('')
    setVerifyCode('')
  }

  const toggleInterest = (value) => {
    if (editInterests.includes(value)) {
      setEditInterests(editInterests.filter(i => i !== value))
    } else if (editInterests.length < 5) {
      setEditInterests([...editInterests, value])
    }
  }

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
      else if (editModal === 'bio') updateData.bio = editValue
      else if (editModal === 'kakaoId') updateData.kakao_id = editValue

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

  const handlePhoneSendCode = () => {
    if (newPhone.length < 10) {
      setError('올바른 전화번호를 입력해주세요')
      return
    }
    setError('')
    setPhoneStep('verify')
  }

  const handlePhoneVerify = async () => {
    if (verifyCode !== DUMMY_SMS_CODE) {
      setError('인증번호가 일치하지 않습니다')
      return
    }

    setSaving(true)
    setError('')

    try {
      // Supabase Auth 이메일+비밀번호도 함께 변경
      const { error: authError } = await supabase.auth.updateUser({
        email: generateEmail(newPhone),
        password: generatePassword(newPhone),
      })

      if (authError) throw authError

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

  const isPersonalEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase()
    return !domain || PERSONAL_EMAIL_DOMAINS.includes(domain)
  }

  const handleWorkEmailSend = () => {
    setWorkVerifyError('')
    if (!workEmail.includes('@')) {
      setWorkVerifyError('올바른 이메일 주소를 입력해주세요')
      return
    }
    if (isPersonalEmail(workEmail)) {
      setWorkVerifyError('개인 이메일은 사용할 수 없어요. 회사 이메일을 입력해주세요.')
      return
    }
    setWorkVerifyLoading(true)
    setTimeout(() => {
      setWorkVerifyLoading(false)
      setWorkCodeSent(true)
    }, 1000)
  }

  const handleWorkVerifyCode = async () => {
    setWorkVerifyError('')
    if (workVerifyCode !== DUMMY_SMS_CODE) {
      setWorkVerifyError('인증코드가 일치하지 않습니다')
      return
    }
    setWorkVerifyLoading(true)
    try {
      const domain = workEmail.split('@')[1]
      const company = domain.split('.')[0]
      await supabase.from('users').update({
        work_verified: true,
        work_email: workEmail,
        work_company: company,
        verified_at: new Date().toISOString(),
      }).eq('id', user.id)
      await refreshProfile(user.id)
      setEditModal(null)
      setWorkEmail('')
      setWorkVerifyCode('')
      setWorkCodeSent(false)
    } catch (err) {
      console.error('Work verify error:', err)
      setWorkVerifyError('인증 중 오류가 발생했습니다')
    } finally {
      setWorkVerifyLoading(false)
    }
  }

  const ModalButtons = ({ onCancel, onSave, disabled }) => (
    <div className="flex gap-3">
      <button onClick={onCancel} className="flex-1 py-4 bg-surface-100 text-surface-600 font-medium rounded-xl">취소</button>
      <button
        onClick={onSave}
        disabled={disabled || saving}
        className="flex-1 py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-medium rounded-xl disabled:opacity-50"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )

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
            {profile?.work_verified && (
              <div className="flex justify-center mt-2">
                <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs px-3 py-1 rounded-full">
                  ✅ 직장 인증됨 · {profile.work_company}
                </span>
              </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            {[
              { label: '휴대폰', value: profile?.phone, field: 'phone' },
              { label: '거주 지역', value: formatRegion(profile?.region), field: 'region' },
              { label: '직장 유형', value: WORK_TYPE_LABELS[profile?.work_type], field: 'workType' },
              { label: 'MBTI', value: profile?.mbti, field: 'mbti' },
              { label: '흡연', value: SMOKING_LABELS[profile?.smoking], field: 'smoking' },
              { label: '음주', value: DRINKING_LABELS[profile?.drinking], field: 'drinking' },
            ].map((item) => (
              <div key={item.field} className="flex items-center justify-between py-3 border-b border-surface-100">
                <span className="text-surface-500">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-surface-900 font-medium">{item.value || '-'}</span>
                  <button onClick={() => openEditModal(item.field)} className="text-primary-500 text-sm">수정</button>
                </div>
              </div>
            ))}

            {/* 관심사 */}
            <div className="py-3 border-b border-surface-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-surface-500">관심사</span>
                <button onClick={() => openEditModal('interests')} className="text-primary-500 text-sm">수정</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentInterests.length > 0 ? (
                  currentInterests.map((interest) => (
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

            {/* 자기소개 */}
            <div className="py-3 border-b border-surface-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-surface-500">자기소개</span>
                <button onClick={() => openEditModal('bio')} className="text-primary-500 text-sm">수정</button>
              </div>
              <p className="text-surface-900 text-sm leading-relaxed">
                {profile?.bio ? profile.bio : <span className="text-surface-400">-</span>}
              </p>
            </div>

            {/* 카카오톡 ID */}
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">카카오톡 ID</span>
              <div className="flex items-center gap-2">
                <span className="text-surface-900 font-medium">{profile?.kakao_id || '-'}</span>
                <button onClick={() => openEditModal('kakaoId')} className="text-primary-500 text-sm">수정</button>
              </div>
            </div>

            {/* 직장 인증 */}
            <div className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-surface-500">직장 인증</span>
                {profile?.work_verified ? (
                  <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-medium">
                    ✅ 인증됨
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setWorkEmail('')
                      setWorkVerifyCode('')
                      setWorkCodeSent(false)
                      setWorkVerifyError('')
                      setEditModal('workVerify')
                    }}
                    className="text-sm px-3 py-1 bg-orange-100 text-orange-600 rounded-full font-medium hover:bg-orange-200 transition-all"
                  >
                    🔥 인증하기
                  </button>
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

      <BottomNav />

      {/* 수정 모달 - 텍스트 입력 (거주 지역, 직장 위치) */}
      <BottomSheet
        isOpen={editModal === 'region' || editModal === 'workLocation'}
        onClose={closeEditModal}
        title={editModal === 'region' ? '거주 지역 수정' : '직장 위치 수정'}
      >
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={editModal === 'region' ? '서울 강남구' : '판교'}
          className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-4"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} />
      </BottomSheet>

      {/* 수정 모달 - 직장 유형 */}
      <BottomSheet isOpen={editModal === 'workType'} onClose={closeEditModal} title="직장 유형 수정">
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
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} />
      </BottomSheet>

      {/* 수정 모달 - MBTI */}
      <BottomSheet isOpen={editModal === 'mbti'} onClose={closeEditModal} title="MBTI 수정" maxHeight>
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
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} />
      </BottomSheet>

      {/* 수정 모달 - 흡연 */}
      <BottomSheet isOpen={editModal === 'smoking'} onClose={closeEditModal} title="흡연 여부 수정">
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
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} />
      </BottomSheet>

      {/* 수정 모달 - 음주 */}
      <BottomSheet isOpen={editModal === 'drinking'} onClose={closeEditModal} title="음주 여부 수정">
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
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} />
      </BottomSheet>

      {/* 수정 모달 - 관심사 */}
      <BottomSheet isOpen={editModal === 'interests'} onClose={closeEditModal} title="관심사 수정" maxHeight>
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
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} disabled={editInterests.length < 1} />
      </BottomSheet>

      {/* 수정 모달 - 전화번호 */}
      <BottomSheet isOpen={editModal === 'phone'} onClose={closeEditModal} title="전화번호 수정">
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
            {SHOW_TEST_HINTS && (
              <p className="text-accent-500 text-sm mb-4">테스트용 인증번호: {DUMMY_SMS_CODE}</p>
            )}
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
      </BottomSheet>

      {/* 수정 모달 - 자기소개 */}
      <BottomSheet isOpen={editModal === 'bio'} onClose={closeEditModal} title="자기소개 수정" maxHeight>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={'자기소개를 작성해주세요.\n\n이상형도 간단히 적어주시면 매칭에 도움이 됩니다!'}
          rows={6}
          maxLength={300}
          className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2 resize-none"
        />
        <p className={`text-right text-xs mb-4 ${editValue.length < 10 ? 'text-red-500' : 'text-surface-400'}`}>
          {editValue.length}/300 (최소 10글자)
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} disabled={editValue.length < 10} />
      </BottomSheet>

      {/* 수정 모달 - 카카오톡 ID */}
      <BottomSheet isOpen={editModal === 'kakaoId'} onClose={closeEditModal} title="카카오톡 ID 수정">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="카카오톡 ID를 입력해주세요"
          className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 mb-2"
        />
        <p className="text-surface-400 text-xs mb-4">
          매칭 성사 시 상대방에게 공개됩니다
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} disabled={!editValue} />
      </BottomSheet>

      {/* 직장 인증 모달 */}
      <BottomSheet
        isOpen={editModal === 'workVerify'}
        onClose={() => setEditModal(null)}
        title="직장 인증"
      >
        <div className="space-y-4">
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl">
            <p className="text-primary-700 text-sm">✨ 인증 시 매칭 점수 +15점 · 인증 뱃지 표시</p>
          </div>

          {!workCodeSent ? (
            <>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">회사 이메일</label>
                <input
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-surface-400 text-xs mt-1">gmail, naver 등 개인 이메일 불가</p>
              </div>
              {workVerifyError && <p className="text-red-500 text-sm">{workVerifyError}</p>}
              <button
                onClick={handleWorkEmailSend}
                disabled={!workEmail || workVerifyLoading}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {workVerifyLoading ? '전송 중...' : '인증코드 받기'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">인증코드</label>
                <input
                  type="text"
                  value={workVerifyCode}
                  onChange={(e) => setWorkVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 text-lg text-center tracking-[1em] placeholder:tracking-normal placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  maxLength={4}
                />
                {SHOW_TEST_HINTS && (
                  <p className="text-surface-400 text-xs mt-2 text-center">테스트용 인증코드: {DUMMY_SMS_CODE}</p>
                )}
              </div>
              {workVerifyError && <p className="text-red-500 text-sm">{workVerifyError}</p>}
              <button
                onClick={handleWorkVerifyCode}
                disabled={workVerifyCode.length < 4 || workVerifyLoading}
                className="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold rounded-xl disabled:opacity-50"
              >
                {workVerifyLoading ? '인증 중...' : '인증 완료'}
              </button>
            </>
          )}

          {WORK_VERIFICATION_FORM_URL && (
            <a
              href={WORK_VERIFICATION_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-primary-500 text-sm hover:text-primary-700"
            >
              회사 이메일이 없으신가요? → 서류 제출하기
            </a>
          )}
        </div>
      </BottomSheet>
    </div>
  )
}

export default ProfilePage
