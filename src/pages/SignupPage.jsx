import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { generatePassword, generateEmail } from '../lib/auth'
import {
  WORK_TYPES, MBTI_TYPES,
  SMOKING_OPTIONS, DRINKING_OPTIONS, INTEREST_OPTIONS,
  REGIONS, PERSONAL_EMAIL_DOMAINS,
  WORK_VERIFICATION_FORM_URL,
  AVATAR_EMOJIS,
  DUMMY_SMS_CODE, SHOW_TEST_HINTS,
} from '../lib/constants'

const STEPS = {
  PHONE: 0,
  VERIFY: 1,
  BASIC_INFO: 2,
  REGION: 3,
  LIFESTYLE: 4,
  INTERESTS_PROFILE: 5,
  AGREEMENT: 6,
  WORK_VERIFY: 7,
}

const BIO_GUIDES = [
  {
    label: '성격/가치관',
    icon: '✨',
    placeholder: '저는 긍정적이고 활동적인 성격이에요. 새로운 것에 도전하기를 즐기고 주변 사람들에게 에너지를 주려고 해요. 중요하게 생각하는 가치는...',
  },
  {
    label: '취미/관심사',
    icon: '🎯',
    placeholder: '주말엔 주로 카페 탐방이나 독서를 해요. 최근엔 운동을 시작했는데, 같이 취미를 즐길 수 있는 분이면 더 좋겠어요!',
  },
  {
    label: '외적 특징',
    icon: '👤',
    placeholder: '단정하고 깔끔한 스타일을 좋아해요. 평소에 캐주얼한 편이지만 분위기에 맞게 코디를 즐기기도 해요.',
  },
  {
    label: '인생 영화/음악',
    icon: '🎬',
    placeholder: '인생 영화는 인터스텔라예요. 음악은 재즈나 인디음악을 자주 들어요. 같이 공연 보러 가는 걸 좋아해요.',
  },
  {
    label: '이상형',
    icon: '💕',
    placeholder: '함께 있을 때 편안하고 대화가 잘 통하는 분이 좋아요. 서로 성장할 수 있고, 작은 것에도 감사할 줄 아는 분을 만나고 싶어요.',
  },
]

const SignupPage = () => {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [step, setStep] = useState(STEPS.PHONE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form data
  const [phone, setPhone] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    birthYear: '',
    emoji: '',
    regionCity: '',    // 'seoul' | 'gyeonggi'
    regionDistrict: '', // '강남구' | '성남시' 등
    workType: '',
    mbti: '',
    smoking: '',
    drinking: '',
    interests: [],
    bio: '',
    kakaoId: '',
  })
  const [bioPlaceholder, setBioPlaceholder] = useState('자유롭게 자신을 소개해주세요 😊')
  const [agreements, setAgreements] = useState({
    all: false,
    age: false,
    terms: false,
    privacy: false,
    marketing: false,
  })

  // 직장 인증 상태
  const [workEmail, setWorkEmail] = useState('')
  const [workVerifyCode, setWorkVerifyCode] = useState('')
  const [workCodeSent, setWorkCodeSent] = useState(false)
  const [workVerified, setWorkVerified] = useState(false)
  const [workVerifyError, setWorkVerifyError] = useState('')
  const [workVerifyLoading, setWorkVerifyLoading] = useState(false)
  const [createdUserId, setCreatedUserId] = useState(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // 프로그레스 바 (WORK_VERIFY 제외한 7단계 기준)
  const totalSteps = 7
  const currentProgressStep = Math.min(step + 1, totalSteps)
  const progress = (currentProgressStep / totalSteps) * 100

  // ─── 핸들러 ───────────────────────────────────────────

  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (phone.length < 10) {
      setError('올바른 전화번호를 입력해주세요')
      return
    }
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setStep(STEPS.VERIFY)
    }, 1000)
  }

  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (verifyCode !== DUMMY_SMS_CODE) {
      setError('인증번호가 일치하지 않습니다')
      return
    }
    setStep(STEPS.BASIC_INFO)
  }

  const handleBasicInfoSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!formData.name || !formData.gender || !formData.birthYear) {
      setError('모든 정보를 입력해주세요')
      return
    }
    setStep(STEPS.REGION)
  }

  const handleRegionSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!formData.regionCity || !formData.regionDistrict) {
      setError('거주지역을 선택해주세요')
      return
    }
    setStep(STEPS.LIFESTYLE)
  }

  const handleLifestyleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!formData.mbti || !formData.smoking || !formData.drinking || !formData.workType) {
      setError('모든 항목을 선택해주세요')
      return
    }
    setStep(STEPS.INTERESTS_PROFILE)
  }

  const handleInterestsProfileSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (formData.interests.length < 1) {
      setError('관심사를 최소 1개 이상 선택해주세요')
      return
    }
    if (!formData.kakaoId) {
      setError('카카오톡 ID는 필수입니다')
      return
    }
    setStep(STEPS.AGREEMENT)
  }

  const toggleInterest = (value) => {
    const current = formData.interests
    if (current.includes(value)) {
      setFormData({ ...formData, interests: current.filter(i => i !== value) })
    } else if (current.length < 5) {
      setFormData({ ...formData, interests: [...current, value] })
    }
  }

  const handleAgreementChange = (key) => {
    if (key === 'all') {
      const newValue = !agreements.all
      setAgreements({ all: newValue, age: newValue, terms: newValue, privacy: newValue, marketing: newValue })
    } else {
      const newAgreements = { ...agreements, [key]: !agreements[key] }
      newAgreements.all = newAgreements.age && newAgreements.terms && newAgreements.privacy && newAgreements.marketing
      setAgreements(newAgreements)
    }
  }

  const handleFinalSubmit = async () => {
    setError('')
    if (!agreements.age || !agreements.terms || !agreements.privacy) {
      setError('필수 약관에 동의해주세요')
      return
    }
    setLoading(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: generateEmail(phone),
        password: generatePassword(phone),
      })
      if (authError) throw authError

      const regionValue = `${formData.regionCity}:${formData.regionDistrict}`
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          phone,
          name: formData.name,
          gender: formData.gender,
          birth_year: parseInt(formData.birthYear),
          emoji: formData.emoji || null,
          region: regionValue,
          work_type: formData.workType,
          mbti: formData.mbti,
          smoking: formData.smoking,
          drinking: formData.drinking,
          interests: formData.interests.join(','),
          kakao_id: formData.kakaoId,
          marketing_agreed: agreements.marketing,
        })
      if (profileError) throw profileError

      setCreatedUserId(authData.user.id)
      await refreshProfile(authData.user.id)
      setStep(STEPS.WORK_VERIFY)
    } catch (err) {
      console.error('Signup error:', err)
      if (err.message?.includes('already registered')) {
        setError('이미 가입된 전화번호입니다. 로그인해주세요.')
      } else {
        setError('가입 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  // 직장 이메일 인증
  const isPersonalEmail = (email) => {
    const domain = email.split('@')[1]?.toLowerCase()
    return !domain || PERSONAL_EMAIL_DOMAINS.includes(domain)
  }

  const handleWorkEmailSend = async () => {
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
    try {
      const { data, error } = await supabase.functions.invoke('send-work-verification', {
        body: { email: workEmail, userId: createdUserId },
      })
      if (error || data?.error) {
        setWorkVerifyError(data?.error || '이메일 전송에 실패했어요. 다시 시도해주세요.')
        return
      }
      setWorkCodeSent(true)
      setResendCooldown(60)
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) { clearInterval(timer); return 0 }
          return prev - 1
        })
      }, 1000)
    } catch (err) {
      console.error('Work email send error:', err)
      setWorkVerifyError('이메일 전송 중 오류가 발생했습니다')
    } finally {
      setWorkVerifyLoading(false)
    }
  }

  const handleWorkVerifyCode = async () => {
    setWorkVerifyError('')
    setWorkVerifyLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('verify-work-code', {
        body: { userId: createdUserId, email: workEmail, code: workVerifyCode },
      })
      if (error || data?.error) {
        setWorkVerifyError(data?.error || '인증코드가 일치하지 않습니다')
        return
      }
      setWorkVerified(true)
      await refreshProfile(createdUserId)
      setTimeout(() => navigate('/home'), 1500)
    } catch (err) {
      console.error('Work verify error:', err)
      setWorkVerifyError('인증 중 오류가 발생했습니다')
    } finally {
      setWorkVerifyLoading(false)
    }
  }

  const goBack = () => {
    if (step === STEPS.WORK_VERIFY) return // 뒤로 가기 불가
    if (step > 0) {
      setStep(step - 1)
      setError('')
    } else {
      navigate('/')
    }
  }

  // ─── 렌더 ───────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800 z-50">
        <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-between">
          {step !== STEPS.WORK_VERIFY ? (
            <button onClick={goBack} className="p-2 -ml-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          ) : <div className="w-10" />}
          <img src="/Gitty2.png" alt="GITTY" className="h-8 w-auto" />
          {step !== STEPS.WORK_VERIFY ? (
            <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-zinc-300 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : <div className="w-10" />}
        </div>
        {step !== STEPS.WORK_VERIFY && (
          <div className="h-1 bg-zinc-800">
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">

        {/* ── STEP 1: 전화번호 ── */}
        {step === STEPS.PHONE && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">전화번호를 입력해주세요</h1>
              <p className="text-zinc-500">본인 인증을 위해 사용됩니다</p>
            </div>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="01012345678"
              className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-lg placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              maxLength={11}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              {loading ? '전송 중...' : '인증번호 받기'}
            </button>
          </form>
        )}

        {/* ── STEP 2: 인증번호 ── */}
        {step === STEPS.VERIFY && (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">인증번호를 입력해주세요</h1>
              <p className="text-zinc-500">{phone}로 전송된 인증번호 4자리</p>
            </div>
            <div>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1234"
                className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-lg text-center tracking-[1em] placeholder:tracking-normal placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                maxLength={4}
              />
              {SHOW_TEST_HINTS && (
                <p className="text-orange-400 text-xs mt-2 text-center">테스트용 인증번호: {DUMMY_SMS_CODE}</p>
              )}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={verifyCode.length < 4}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              확인
            </button>
          </form>
        )}

        {/* ── STEP 3: 기본 정보 ── */}
        {step === STEPS.BASIC_INFO && (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">기본 정보를 알려주세요</h1>
              <p className="text-zinc-500">매칭을 위해 필요한 정보예요</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">이름</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="실명을 입력해주세요"
                  className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">성별</label>
                <div className="grid grid-cols-2 gap-3">
                  {[{ value: 'male', label: '남성', icon: '👨' }, { value: 'female', label: '여성', icon: '👩' }].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: opt.value })}
                      className={`py-4 px-4 rounded-xl border-2 font-medium transition-all ${
                        formData.gender === opt.value
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">출생연도</label>
                <input
                  type="number"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                  placeholder="1995"
                  min="1960"
                  max="2006"
                  className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  프로필 아바타 선택 <span className="text-zinc-600 font-normal">(선택)</span>
                </label>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_EMOJIS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji: em })}
                      className={`aspect-square flex items-center justify-center text-2xl rounded-xl transition-all ${
                        formData.emoji === em
                          ? 'bg-orange-500/20 ring-2 ring-orange-500 scale-110'
                          : 'bg-zinc-900 hover:bg-zinc-800 border border-zinc-800'
                      }`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
                {formData.emoji && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-2xl">{formData.emoji}</span>
                    <span className="text-zinc-400 text-sm">선택됨</span>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, emoji: '' })}
                      className="text-zinc-600 text-xs hover:text-zinc-400 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300">
              다음으로
            </button>
          </form>
        )}

        {/* ── STEP 4: 거주지역 (2단 선택) ── */}
        {step === STEPS.REGION && (
          <form onSubmit={handleRegionSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">거주 지역을 선택해주세요</h1>
              <p className="text-zinc-500">가까운 곳에 사는 분과 매칭될 확률이 높아요</p>
            </div>

            {/* 1단계: 서울 / 경기 */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">시/도</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(REGIONS).map(([key, region]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormData({ ...formData, regionCity: key, regionDistrict: '' })}
                    className={`py-5 px-4 rounded-xl border-2 font-semibold text-lg transition-all ${
                      formData.regionCity === key
                        ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    {region.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2단계: 구/시 선택 */}
            {formData.regionCity && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">
                  구/시 선택
                </label>
                <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto py-1">
                  {REGIONS[formData.regionCity].districts.map((district) => (
                    <button
                      key={district}
                      type="button"
                      onClick={() => setFormData({ ...formData, regionDistrict: district })}
                      className={`py-2 px-4 rounded-full border-2 text-sm font-medium transition-all ${
                        formData.regionDistrict === district
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {district}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.regionCity && formData.regionDistrict && (
              <div className="p-3 bg-orange-500/10 rounded-xl text-center">
                <p className="text-orange-400 font-medium">
                  📍 {REGIONS[formData.regionCity].label} {formData.regionDistrict}
                </p>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={!formData.regionCity || !formData.regionDistrict}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              다음으로
            </button>
          </form>
        )}

        {/* ── STEP 5: 라이프스타일 (MBTI + 흡연 + 음주 + 직장유형) ── */}
        {step === STEPS.LIFESTYLE && (
          <form onSubmit={handleLifestyleSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">라이프스타일을 알려주세요</h1>
              <p className="text-zinc-500">나와 맞는 사람을 찾는 데 도움이 돼요</p>
            </div>
            <div className="space-y-6">
              {/* MBTI */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">MBTI</label>
                <div className="grid grid-cols-4 gap-2">
                  {MBTI_TYPES.map((mbti) => (
                    <button
                      key={mbti}
                      type="button"
                      onClick={() => setFormData({ ...formData, mbti })}
                      className={`py-3 px-2 rounded-xl border-2 font-medium text-sm transition-all ${
                        formData.mbti === mbti
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      {mbti}
                    </button>
                  ))}
                </div>
              </div>

              {/* 흡연 */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">흡연 여부</label>
                <div className="grid grid-cols-3 gap-3">
                  {SMOKING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, smoking: opt.value })}
                      className={`py-4 px-3 rounded-xl border-2 font-medium transition-all ${
                        formData.smoking === opt.value
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{opt.icon}</span>
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 음주 */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">음주 여부</label>
                <div className="grid grid-cols-3 gap-3">
                  {DRINKING_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, drinking: opt.value })}
                      className={`py-4 px-3 rounded-xl border-2 font-medium transition-all ${
                        formData.drinking === opt.value
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{opt.icon}</span>
                      <span className="text-sm">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 직장 유형 */}
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-3">직장 유형</label>
                <div className="grid grid-cols-2 gap-3">
                  {WORK_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, workType: type.value })}
                      className={`py-4 px-4 rounded-xl border-2 font-medium transition-all text-left ${
                        formData.workType === type.value
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{type.icon}</span>
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300">
              다음으로
            </button>
          </form>
        )}

        {/* ── STEP 6: 관심사 + 카카오ID ── */}
        {step === STEPS.INTERESTS_PROFILE && (
          <form onSubmit={handleInterestsProfileSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">나를 소개해주세요</h1>
              <p className="text-zinc-500">관심사와 카카오톡 ID를 입력해주세요</p>
            </div>

            {/* 관심사 */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-3">
                관심사 <span className="text-zinc-600 font-normal">(최소 1개, 최대 5개)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map((interest) => {
                  const isSelected = formData.interests.includes(interest.value)
                  const isDisabled = !isSelected && formData.interests.length >= 5
                  return (
                    <button
                      key={interest.value}
                      type="button"
                      onClick={() => !isDisabled && toggleInterest(interest.value)}
                      disabled={isDisabled}
                      className={`py-2 px-4 rounded-full border-2 font-medium transition-all flex items-center gap-1.5 text-sm ${
                        isSelected
                          ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                          : isDisabled
                          ? 'border-zinc-800 bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                          : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600'
                      }`}
                    >
                      <span>{interest.icon}</span>
                      <span>{interest.label}</span>
                    </button>
                  )
                })}
              </div>
              <p className="text-zinc-600 text-xs mt-2 text-right">{formData.interests.length}/5 선택됨</p>
            </div>

            {/* 카카오톡 ID */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">
                카카오톡 ID <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                value={formData.kakaoId}
                onChange={(e) => setFormData({ ...formData, kakaoId: e.target.value })}
                placeholder="카카오톡 ID를 입력해주세요"
                className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
              <p className="text-zinc-600 text-xs mt-2">서로 매칭이 성사되면 카카오톡 ID가 공개됩니다</p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={formData.interests.length < 1 || !formData.kakaoId}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              다음으로
            </button>
          </form>
        )}

        {/* ── STEP 7: 약관 ── */}
        {step === STEPS.AGREEMENT && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">약관에 동의해주세요</h1>
              <p className="text-zinc-500">서비스 이용을 위해 필요해요</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleAgreementChange('all')}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  agreements.all ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700 bg-zinc-900'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${agreements.all ? 'bg-orange-500' : 'bg-zinc-700'}`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className={`font-semibold ${agreements.all ? 'text-orange-400' : 'text-zinc-300'}`}>
                  모두 동의합니다
                </span>
              </button>
              <div className="border-t border-zinc-800 my-4" />
              {[
                { key: 'age', label: '(필수) 만 18세 이상입니다' },
                { key: 'terms', label: '(필수) 서비스 이용약관 동의', link: '#' },
                { key: 'privacy', label: '(필수) 개인정보 수집 및 이용 동의', link: '#' },
                { key: 'marketing', label: '(선택) 마케팅 정보 수신 동의' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleAgreementChange(item.key)}
                  className="w-full p-4 rounded-xl flex items-center gap-3 hover:bg-zinc-800 transition-all"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${agreements[item.key] ? 'bg-orange-500' : 'bg-zinc-700'}`}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className={`text-sm flex-1 text-left ${agreements[item.key] ? 'text-white' : 'text-zinc-500'}`}>
                    {item.label}
                  </span>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-zinc-500 text-xs underline hover:text-zinc-300 shrink-0 transition-colors"
                    >
                      보기
                    </a>
                  )}
                </button>
              ))}
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleFinalSubmit}
              disabled={loading || !agreements.age || !agreements.terms || !agreements.privacy}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '가입 완료'}
            </button>
          </div>
        )}

        {/* ── STEP 8: 직장 인증 (선택) ── */}
        {step === STEPS.WORK_VERIFY && (
          <div className="space-y-6">
            {workVerified ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-green-500/15 rounded-full flex items-center justify-center">
                  <span className="text-4xl">✅</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">직장 인증 완료!</h2>
                <p className="text-zinc-400 text-sm">매칭 확률이 높아졌어요 🎉</p>
                <p className="text-zinc-600 text-xs mt-2">잠시 후 홈으로 이동합니다...</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-orange-500/15 rounded-2xl flex items-center justify-center">
                    <span className="text-3xl">🏢</span>
                  </div>
                  <h1 className="text-2xl font-bold text-white mb-2">직장 인증하기</h1>
                  <p className="text-zinc-400 text-sm">
                    인증하면 매칭 확률이 올라가고<br />
                    인증 뱃지가 프로필에 표시돼요
                  </p>
                </div>

                <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✨</span>
                    <div>
                      <p className="text-orange-400 font-medium text-sm">인증 혜택</p>
                      <p className="text-orange-400/70 text-xs mt-1">매칭 알고리즘 가산점 +15점 · 인증 뱃지 표시</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {!workCodeSent ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">회사 이메일</label>
                        <input
                          type="email"
                          value={workEmail}
                          onChange={(e) => setWorkEmail(e.target.value)}
                          placeholder="name@company.com"
                          className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        />
                        <p className="text-zinc-600 text-xs mt-1">gmail, naver 등 개인 이메일은 사용 불가</p>
                      </div>
                      {workVerifyError && <p className="text-red-500 text-sm">{workVerifyError}</p>}
                      <button
                        onClick={handleWorkEmailSend}
                        disabled={!workEmail || workVerifyLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                      >
                        {workVerifyLoading ? '전송 중...' : '인증코드 받기'}
                      </button>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">
                          인증코드 <span className="text-zinc-600 font-normal">({workEmail})</span>
                        </label>
                        <input
                          type="text"
                          value={workVerifyCode}
                          onChange={(e) => setWorkVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="123456"
                          className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-lg text-center tracking-[1em] placeholder:tracking-normal placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          maxLength={6}
                        />
                      </div>
                      {workVerifyError && <p className="text-red-500 text-sm">{workVerifyError}</p>}
                      <button
                        onClick={handleWorkVerifyCode}
                        disabled={workVerifyCode.length < 6 || workVerifyLoading}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
                      >
                        {workVerifyLoading ? '인증 중...' : '인증 완료'}
                      </button>
                      <button
                        onClick={() => { setWorkCodeSent(false); setWorkVerifyCode(''); setWorkVerifyError('') }}
                        disabled={resendCooldown > 0}
                        className="w-full py-3 text-zinc-400 text-sm disabled:text-zinc-600 transition-all"
                      >
                        {resendCooldown > 0 ? `재발송 (${resendCooldown}초 후 가능)` : '다른 이메일로 재발송'}
                      </button>
                    </>
                  )}
                </div>

                <div className="flex flex-col items-center gap-3 pt-2">
                  <button
                    onClick={() => navigate('/home')}
                    className="text-zinc-500 text-sm hover:text-zinc-300 underline transition-colors"
                  >
                    나중에 인증할게요 (건너뛰기)
                  </button>
                  {WORK_VERIFICATION_FORM_URL && (
                    <a
                      href={WORK_VERIFICATION_FORM_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-500 text-sm hover:text-orange-400 transition-colors"
                    >
                      회사 이메일이 없으신가요? → 서류 제출하기
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default SignupPage
