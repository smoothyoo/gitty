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
  AVATAR_EMOJIS,
} from '../lib/constants'

// "seoul:강남구" → "서울 강남구"
const formatRegion = (regionStr) => {
  if (!regionStr) return '-'
  const [city, district] = regionStr.split(':')
  const cityLabel = REGIONS[city]?.label || city
  return district ? `${cityLabel} ${district}` : cityLabel
}

const BIO_GUIDES = [
  { label: '성격/가치관', icon: '✨', placeholder: '저는 긍정적이고 활동적인 성격이에요. 새로운 것에 도전하기를 즐기고 주변 사람들에게 에너지를 주려고 해요.' },
  { label: '취미/관심사', icon: '🎯', placeholder: '주말엔 주로 카페 탐방이나 독서를 해요. 최근엔 운동을 시작했는데, 같이 취미를 즐길 수 있는 분이면 더 좋겠어요!' },
  { label: '외적 특징', icon: '👤', placeholder: '단정하고 깔끔한 스타일을 좋아해요. 평소에 캐주얼한 편이지만 분위기에 맞게 코디를 즐기기도 해요.' },
  { label: '이상형', icon: '💕', placeholder: '함께 있을 때 편안하고 대화가 잘 통하는 분이 좋아요. 서로 성장할 수 있고, 작은 것에도 감사할 줄 아는 분을 만나고 싶어요.' },
  { label: '인생 영화/음악', icon: '🎬', placeholder: '인생 영화는 인터스텔라예요. 음악은 재즈나 인디음악을 자주 들어요. 같이 공연 보러 가는 걸 좋아해요.' },
]

const ProfilePage = () => {
  const navigate = useNavigate()
  const { profile, signOut, refreshProfile, user } = useAuth()

  const [editModal, setEditModal] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [editInterests, setEditInterests] = useState([])
  const [editRegionCity, setEditRegionCity] = useState('')
  const [editRegionDistrict, setEditRegionDistrict] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [bioPlaceholder, setBioPlaceholder] = useState('자유롭게 자신을 소개해주세요 😊')
  const [emojiSheetOpen, setEmojiSheetOpen] = useState(false)

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
    setBioPlaceholder('자유롭게 자신을 소개해주세요 😊')
    setEditModal(field)

    if (field === 'region') {
      const [city, district] = (profile?.region || '').split(':')
      setEditRegionCity(city || '')
      setEditRegionDistrict(district || '')
    }
    else if (field === 'workType') setEditValue(profile?.work_type || '')
    else if (field === 'mbti') setEditValue(profile?.mbti || '')
    else if (field === 'smoking') setEditValue(profile?.smoking || '')
    else if (field === 'drinking') setEditValue(profile?.drinking || '')
    else if (field === 'interests') setEditInterests(parseInterests(profile?.interests))
    else if (field === 'bioDating') setEditValue(profile?.bio_dating || '')
    else if (field === 'bioMeeting') setEditValue(profile?.bio_meeting || '')
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
    setEditRegionCity('')
    setEditRegionDistrict('')
    setError('')
    setBioPlaceholder('자유롭게 자신을 소개해주세요 😊')
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

      if (editModal === 'region') updateData.region = `${editRegionCity}:${editRegionDistrict}`
      else if (editModal === 'workType') updateData.work_type = editValue
      else if (editModal === 'mbti') updateData.mbti = editValue
      else if (editModal === 'smoking') updateData.smoking = editValue
      else if (editModal === 'drinking') updateData.drinking = editValue
      else if (editModal === 'interests') updateData.interests = editInterests.join(',')
      else if (editModal === 'bioDating') updateData.bio_dating = editValue
      else if (editModal === 'bioMeeting') updateData.bio_meeting = editValue
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

  const handleModeToggle = async (modeField) => {
    const currentValue = profile?.[modeField]
    const otherModeField = modeField === 'mode_dating' ? 'mode_meeting' : 'mode_dating'

    // 둘 다 꺼지는 것 방지 → 마지막 하나면 mode-select로
    if (currentValue && !profile?.[otherModeField]) {
      navigate('/mode-select')
      return
    }

    setSaving(true)
    try {
      await supabase.from('users').update({ [modeField]: !currentValue }).eq('id', user.id)
      await refreshProfile(user.id)
    } catch (err) {
      console.error('Mode toggle error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEmojiSelect = async (em) => {
    setSaving(true)
    try {
      await supabase.from('users').update({ emoji: em }).eq('id', user.id)
      await refreshProfile(user.id)
      setEmojiSheetOpen(false)
    } catch (err) {
      console.error('Emoji update error:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePhoneSendCode = () => {
    if (newPhone.length < 10) { setError('올바른 전화번호를 입력해주세요'); return }
    setError('')
    setPhoneStep('verify')
  }

  const handlePhoneVerify = async () => {
    if (verifyCode !== DUMMY_SMS_CODE) { setError('인증번호가 일치하지 않습니다'); return }

    setSaving(true)
    setError('')
    try {
      const { error: authError } = await supabase.auth.updateUser({
        email: generateEmail(newPhone),
        password: generatePassword(newPhone),
      })
      if (authError) throw authError

      const { error: updateError } = await supabase
        .from('users').update({ phone: newPhone }).eq('id', user.id)
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
    if (!workEmail.includes('@')) { setWorkVerifyError('올바른 이메일 주소를 입력해주세요'); return }
    if (isPersonalEmail(workEmail)) { setWorkVerifyError('개인 이메일은 사용할 수 없어요. 회사 이메일을 입력해주세요.'); return }
    setWorkVerifyLoading(true)
    setTimeout(() => { setWorkVerifyLoading(false); setWorkCodeSent(true) }, 1000)
  }

  const handleWorkVerifyCode = async () => {
    setWorkVerifyError('')
    if (workVerifyCode !== DUMMY_SMS_CODE) { setWorkVerifyError('인증코드가 일치하지 않습니다'); return }
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
      setWorkEmail(''); setWorkVerifyCode(''); setWorkCodeSent(false)
    } catch (err) {
      console.error('Work verify error:', err)
      setWorkVerifyError('인증 중 오류가 발생했습니다')
    } finally {
      setWorkVerifyLoading(false)
    }
  }

  const ModalButtons = ({ onCancel, onSave, disabled }) => (
    <div className="flex gap-3">
      <button onClick={onCancel} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-medium rounded-xl">취소</button>
      <button
        onClick={onSave}
        disabled={disabled || saving}
        className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
      >
        {saving ? '저장 중...' : '저장'}
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-zinc-900 pb-24">
      {/* Header */}
      <header className="sticky top-0 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 z-50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => navigate('/home')} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-lg text-white">내 정보</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-6">
        {/* Profile Card */}
        <div className="bg-zinc-800 rounded-3xl overflow-hidden mb-4">
          <div className="bg-gradient-to-br from-orange-500 to-orange-900 px-6 py-8">
            <button
              onClick={() => setEmojiSheetOpen(true)}
              className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 relative hover:bg-white/30 transition-all cursor-pointer"
            >
              <span className="text-4xl">
                {profile?.emoji || (profile?.gender === 'male' ? '👨' : '👩')}
              </span>
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs border-2 border-orange-900">
                ✏️
              </span>
            </button>
            <h2 className="text-center text-white text-xl font-bold">{profile?.name || '이름 없음'}</h2>
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

          <div className="p-6 space-y-1">
            {[
              { label: '휴대폰', value: profile?.phone, field: 'phone' },
              { label: '거주 지역', value: formatRegion(profile?.region), field: 'region' },
              { label: '직장 유형', value: WORK_TYPE_LABELS[profile?.work_type], field: 'workType' },
              { label: 'MBTI', value: profile?.mbti, field: 'mbti' },
              { label: '흡연', value: SMOKING_LABELS[profile?.smoking], field: 'smoking' },
              { label: '음주', value: DRINKING_LABELS[profile?.drinking], field: 'drinking' },
            ].map((item) => (
              <div key={item.field} className="flex items-center justify-between py-3 border-b border-zinc-700">
                <span className="text-zinc-400">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{item.value || '-'}</span>
                  <button onClick={() => openEditModal(item.field)} className="text-orange-500 text-sm hover:text-orange-400 transition-colors">수정</button>
                </div>
              </div>
            ))}

            {/* 관심사 */}
            <div className="py-3 border-b border-zinc-700">
              <div className="flex items-center justify-between mb-3">
                <span className="text-zinc-400">관심사</span>
                <button onClick={() => openEditModal('interests')} className="text-orange-500 text-sm hover:text-orange-400 transition-colors">수정</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {currentInterests.length > 0 ? (
                  currentInterests.map((interest) => (
                    <span key={interest} className="px-3 py-1 bg-orange-500/15 text-orange-400 rounded-full text-sm">
                      {INTEREST_LABELS[interest] || interest}
                    </span>
                  ))
                ) : (
                  <span className="text-zinc-500">-</span>
                )}
              </div>
            </div>

            {/* 카카오톡 ID */}
            <div className="flex items-center justify-between py-3 border-b border-zinc-700">
              <span className="text-zinc-400">카카오톡 ID</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-medium">{profile?.kakao_id || '-'}</span>
                <button onClick={() => openEditModal('kakaoId')} className="text-orange-500 text-sm hover:text-orange-400 transition-colors">수정</button>
              </div>
            </div>

            {/* 소개팅 자기소개 */}
            {profile?.mode_dating && (
              <div className="py-3 border-b border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span>💑</span> 소개팅 자기소개
                  </span>
                  <button onClick={() => openEditModal('bioDating')} className="text-orange-500 text-sm hover:text-orange-400 transition-colors">수정</button>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  {profile?.bio_dating || <span className="text-zinc-500">-</span>}
                </p>
              </div>
            )}

            {/* 미팅 자기소개 */}
            {profile?.mode_meeting && (
              <div className="py-3 border-b border-zinc-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <span>🎉</span> 미팅 자기소개
                  </span>
                  <button onClick={() => openEditModal('bioMeeting')} className="text-orange-500 text-sm hover:text-orange-400 transition-colors">수정</button>
                </div>
                <p className="text-white text-sm leading-relaxed">
                  {profile?.bio_meeting || <span className="text-zinc-500">-</span>}
                </p>
              </div>
            )}

            {/* 직장 인증 */}
            <div className="py-3">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">직장 인증</span>
                {profile?.work_verified ? (
                  <span className="inline-flex items-center gap-1 bg-blue-500/15 text-blue-400 text-sm px-3 py-1 rounded-full font-medium">
                    ✅ 인증됨
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setWorkEmail(''); setWorkVerifyCode(''); setWorkCodeSent(false); setWorkVerifyError('')
                      setEditModal('workVerify')
                    }}
                    className="text-sm px-3 py-1 bg-orange-500/15 text-orange-400 rounded-full font-medium hover:bg-orange-500/25 transition-all"
                  >
                    🔥 인증하기
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 매칭 모드 관리 */}
        <div className="bg-zinc-800 rounded-2xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-zinc-700">
            <h3 className="text-zinc-300 font-semibold text-sm">매칭 모드</h3>
          </div>
          <div className="divide-y divide-zinc-700">
            {[
              { field: 'mode_dating', emoji: '💑', label: '1:1 소개팅', desc: '한 명과 집중적으로 연결돼요' },
              { field: 'mode_meeting', emoji: '🎉', label: '미팅', desc: '여럿이서 함께 만나요' },
            ].map(({ field, emoji, label, desc }) => (
              <div key={field} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <p className="text-white text-sm font-medium">{label}</p>
                    <p className="text-zinc-500 text-xs">{desc}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleModeToggle(field)}
                  disabled={saving}
                  className={`relative flex-shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    profile?.[field] ? 'bg-orange-500' : 'bg-zinc-600'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    profile?.[field] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
          <p className="text-zinc-600 text-xs px-4 py-2">최소 하나의 모드는 활성화되어야 해요</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleSignOut}
            className="w-full py-4 px-6 bg-zinc-800 border border-zinc-700 text-zinc-400 font-medium rounded-xl hover:bg-zinc-700 transition-all"
          >
            로그아웃
          </button>
        </div>
      </main>

      <BottomNav />

      {/* 수정 모달 - 거주 지역 */}
      <BottomSheet isOpen={editModal === 'region'} onClose={closeEditModal} title="거주 지역 수정" maxHeight>
        <div className="mb-4">
          <p className="text-sm font-medium text-zinc-300 mb-3">시/도</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(REGIONS).map(([key, region]) => (
              <button
                key={key}
                onClick={() => { setEditRegionCity(key); setEditRegionDistrict('') }}
                className={`py-4 px-4 rounded-xl border-2 font-semibold text-lg transition-all ${
                  editRegionCity === key
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
        </div>

        {editRegionCity && (
          <div className="mb-4">
            <p className="text-sm font-medium text-zinc-300 mb-3">구/시</p>
            <div className="flex flex-wrap gap-2 max-h-44 overflow-y-auto py-1">
              {REGIONS[editRegionCity].districts.map((district) => (
                <button
                  key={district}
                  onClick={() => setEditRegionDistrict(district)}
                  className={`py-2 px-3 rounded-full border-2 text-sm font-medium transition-all ${
                    editRegionDistrict === district
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-zinc-700 bg-zinc-900 text-zinc-400'
                  }`}
                >
                  {district}
                </button>
              ))}
            </div>
          </div>
        )}

        {editRegionCity && editRegionDistrict && (
          <div className="p-3 bg-orange-500/10 rounded-xl text-center mb-4">
            <p className="text-orange-400 font-medium">
              📍 {REGIONS[editRegionCity].label} {editRegionDistrict}
            </p>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} disabled={!editRegionCity || !editRegionDistrict} />
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
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400'
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
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400'
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
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400'
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
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                  : 'border-zinc-700 bg-zinc-800 text-zinc-400'
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
        <p className="text-zinc-400 text-sm mb-4">최소 1개, 최대 5개까지 선택 가능해요</p>
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
                    ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                    : isDisabled
                    ? 'border-zinc-800 bg-zinc-900 text-zinc-600 cursor-not-allowed'
                    : 'border-zinc-700 bg-zinc-800 text-zinc-400'
                }`}
              >
                <span>{interest.icon}</span>
                <span className="text-sm">{interest.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-zinc-400 text-sm text-center mb-4">{editInterests.length}/5 선택됨</p>
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
              className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4 transition-all"
              maxLength={11}
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={closeEditModal} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-medium rounded-xl">취소</button>
              <button
                onClick={handlePhoneSendCode}
                disabled={newPhone.length < 10}
                className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
              >
                인증번호 받기
              </button>
            </div>
          </>
        )}

        {phoneStep === 'verify' && (
          <>
            <p className="text-zinc-400 text-sm mb-2">{newPhone}로 전송된 인증번호</p>
            {SHOW_TEST_HINTS && <p className="text-orange-400 text-sm mb-4">테스트용 인증번호: {DUMMY_SMS_CODE}</p>}
            <input
              type="text"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="인증번호 4자리"
              className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-center text-2xl tracking-[0.5em] placeholder:text-zinc-500 placeholder:tracking-normal placeholder:text-base focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-4 transition-all"
              maxLength={4}
            />
            {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setPhoneStep('input')} className="flex-1 py-4 bg-zinc-800 text-zinc-400 font-medium rounded-xl">이전</button>
              <button
                onClick={handlePhoneVerify}
                disabled={saving || verifyCode.length < 4}
                className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-xl disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
              >
                {saving ? '변경 중...' : '변경하기'}
              </button>
            </div>
          </>
        )}
      </BottomSheet>

      {/* 수정 모달 - 소개팅 자기소개 */}
      <BottomSheet isOpen={editModal === 'bioDating'} onClose={closeEditModal} title="💑 소개팅 자기소개 수정" maxHeight>
        <p className="text-xs text-zinc-500 mb-2">💡 자기소개에 쓰면 좋은 주제</p>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {BIO_GUIDES.map((guide) => (
            <button
              key={guide.label}
              type="button"
              onClick={() => setBioPlaceholder(guide.placeholder)}
              className="flex-shrink-0 py-1.5 px-3 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 text-xs font-medium hover:border-orange-500 hover:text-orange-400 transition-all flex items-center gap-1"
            >
              <span>{guide.icon}</span>
              <span>{guide.label}</span>
            </button>
          ))}
        </div>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={bioPlaceholder}
          rows={6}
          maxLength={300}
          className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-2 resize-none transition-all"
        />
        <p className={`text-right text-xs mb-4 ${editValue.length < 10 ? 'text-red-500' : 'text-zinc-500'}`}>
          {editValue.length}/300 (최소 10글자)
        </p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} disabled={editValue.length < 10} />
      </BottomSheet>

      {/* 수정 모달 - 미팅 자기소개 */}
      <BottomSheet isOpen={editModal === 'bioMeeting'} onClose={closeEditModal} title="🎉 미팅 자기소개 수정" maxHeight>
        <p className="text-xs text-zinc-500 mb-2">💡 자기소개에 쓰면 좋은 주제</p>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
          {BIO_GUIDES.map((guide) => (
            <button
              key={guide.label}
              type="button"
              onClick={() => setBioPlaceholder(guide.placeholder)}
              className="flex-shrink-0 py-1.5 px-3 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-500 text-xs font-medium hover:border-orange-500 hover:text-orange-400 transition-all flex items-center gap-1"
            >
              <span>{guide.icon}</span>
              <span>{guide.label}</span>
            </button>
          ))}
        </div>
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder={bioPlaceholder}
          rows={6}
          maxLength={300}
          className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-2 resize-none transition-all"
        />
        <p className={`text-right text-xs mb-4 ${editValue.length < 10 ? 'text-red-500' : 'text-zinc-500'}`}>
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
          className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-2 transition-all"
        />
        <p className="text-zinc-500 text-xs mb-4">매칭 성사 시 상대방에게 공개됩니다</p>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <ModalButtons onCancel={closeEditModal} onSave={handleSave} disabled={!editValue} />
      </BottomSheet>

      {/* 아바타 이모지 선택 */}
      <BottomSheet isOpen={emojiSheetOpen} onClose={() => setEmojiSheetOpen(false)} title="아바타 선택" maxHeight>
        <p className="text-zinc-400 text-sm mb-4">나를 표현하는 캐릭터를 골라보세요!</p>
        <div className="grid grid-cols-8 gap-3 mb-4">
          {AVATAR_EMOJIS.map((em) => (
            <button
              key={em}
              onClick={() => handleEmojiSelect(em)}
              disabled={saving}
              className={`aspect-square flex items-center justify-center text-3xl rounded-xl transition-all ${
                profile?.emoji === em
                  ? 'bg-orange-500/20 ring-2 ring-orange-500 scale-110'
                  : 'bg-zinc-800 hover:bg-zinc-700'
              }`}
            >
              {em}
            </button>
          ))}
        </div>
        {profile?.emoji && (
          <button
            onClick={() => handleEmojiSelect(null)}
            disabled={saving}
            className="w-full py-3 text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
          >
            기본값으로 되돌리기 ({profile?.gender === 'male' ? '👨' : '👩'})
          </button>
        )}
      </BottomSheet>

      {/* 직장 인증 모달 */}
      <BottomSheet isOpen={editModal === 'workVerify'} onClose={() => setEditModal(null)} title="직장 인증">
        <div className="space-y-4">
          <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
            <p className="text-orange-400 text-sm">✨ 인증 시 매칭 점수 +15점 · 인증 뱃지 표시</p>
          </div>

          {!workCodeSent ? (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">회사 이메일</label>
                <input
                  type="email"
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
                <p className="text-zinc-500 text-xs mt-1">gmail, naver 등 개인 이메일 불가</p>
              </div>
              {workVerifyError && <p className="text-red-500 text-sm">{workVerifyError}</p>}
              <button
                onClick={handleWorkEmailSend}
                disabled={!workEmail || workVerifyLoading}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
              >
                {workVerifyLoading ? '전송 중...' : '인증코드 받기'}
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">인증코드</label>
                <input
                  type="text"
                  value={workVerifyCode}
                  onChange={(e) => setWorkVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className="w-full px-4 py-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-lg text-center tracking-[1em] placeholder:tracking-normal placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  maxLength={4}
                />
                {SHOW_TEST_HINTS && (
                  <p className="text-zinc-500 text-xs mt-2 text-center">테스트용 인증코드: {DUMMY_SMS_CODE}</p>
                )}
              </div>
              {workVerifyError && <p className="text-red-500 text-sm">{workVerifyError}</p>}
              <button
                onClick={handleWorkVerifyCode}
                disabled={workVerifyCode.length < 4 || workVerifyLoading}
                className="w-full py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl disabled:bg-zinc-800 disabled:text-zinc-600 transition-all"
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
              className="block text-center text-orange-500 text-sm hover:text-orange-400 transition-colors"
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
