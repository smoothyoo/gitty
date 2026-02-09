import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

const STEPS = {
  PHONE: 0,
  VERIFY: 1,
  BASIC_INFO: 2,
  WORK_INFO: 3,
  LIFESTYLE: 4,    // NEW: MBTI, 흡연, 음주
  INTERESTS: 5,    // NEW: 관심사
  PROFILE: 6,      // 자기소개 + 카톡
  AGREEMENT: 7,
}

const WORK_TYPES = [
  { value: 'large', label: '대기업', icon: '🏢' },
  { value: 'mid', label: '중견기업', icon: '🏬' },
  { value: 'startup', label: '스타트업', icon: '🚀' },
  { value: 'small', label: '중소기업', icon: '🏠' },
  { value: 'entrepreneur', label: '창업/자영업', icon: '💼' },
]

const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

const SMOKING_OPTIONS = [
  { value: 'no', label: '비흡연', icon: '🚭' },
  { value: 'sometimes', label: '가끔', icon: '🚬' },
  { value: 'yes', label: '흡연', icon: '🚬' },
]

const DRINKING_OPTIONS = [
  { value: 'no', label: '안 마셔요', icon: '🚫' },
  { value: 'sometimes', label: '가끔 마셔요', icon: '🍺' },
  { value: 'often', label: '자주 마셔요', icon: '🍻' },
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

const SignupPage = () => {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()  // 이 줄 추가!
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
    region: '',
    workLocation: '',
    workType: '',
    // 라이프스타일
    mbti: '',
    smoking: '',
    drinking: '',
    // 관심사 (배열)
    interests: [],
    // 프로필
    bio: '',
    kakaoId: '',
  })
  const [agreements, setAgreements] = useState({
    all: false,
    age: false,
    terms: false,
    privacy: false,
    marketing: false,
  })

  const progress = ((step + 1) / 8) * 100

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
    
    if (verifyCode !== '1234') {
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
    
    setStep(STEPS.WORK_INFO)
  }

  const handleWorkInfoSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.region || !formData.workLocation || !formData.workType) {
      setError('모든 정보를 입력해주세요')
      return
    }
    
    setStep(STEPS.LIFESTYLE)
  }

  // NEW: 라이프스타일 제출
  const handleLifestyleSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.mbti || !formData.smoking || !formData.drinking) {
      setError('모든 항목을 선택해주세요')
      return
    }
    
    setStep(STEPS.INTERESTS)
  }

  // NEW: 관심사 제출
  const handleInterestsSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (formData.interests.length < 1) {
      setError('최소 1개 이상 선택해주세요')
      return
    }
    
    setStep(STEPS.PROFILE)
  }

  // 관심사 토글
  const toggleInterest = (value) => {
    const current = formData.interests
    if (current.includes(value)) {
      setFormData({ ...formData, interests: current.filter(i => i !== value) })
    } else if (current.length < 5) {
      setFormData({ ...formData, interests: [...current, value] })
    }
  }

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    if (!formData.bio || formData.bio.length < 10) {
      setError('자기소개를 최소 10글자 이상 입력해주세요')
      return
    }
    
    if (!formData.kakaoId) {
      setError('카카오톡 ID는 필수입니다')
      return
    }
    
    setStep(STEPS.AGREEMENT)
  }

  const handleAgreementChange = (key) => {
    if (key === 'all') {
      const newValue = !agreements.all
      setAgreements({
        all: newValue,
        age: newValue,
        terms: newValue,
        privacy: newValue,
        marketing: newValue,
      })
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
      const fakeEmail = `${phone}@gitty.app`
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: phone + '_gitty_2024',
      })
      
      if (authError) throw authError
      
      // users 테이블에 프로필 저장
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          phone: phone,
          name: formData.name,
          gender: formData.gender,
          birth_year: parseInt(formData.birthYear),
          region: formData.region,
          work_location: formData.workLocation,
          work_type: formData.workType,
          // 라이프스타일
          mbti: formData.mbti,
          smoking: formData.smoking,
          drinking: formData.drinking,
          // 관심사 (배열을 문자열로)
          interests: formData.interests.join(','),
          // 프로필
          bio: formData.bio,
          kakao_id: formData.kakaoId,
          marketing_agreed: agreements.marketing,
        })
      
      if (profileError) throw profileError
      
      await refreshProfile(authData.user.id)
      navigate('/home')
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

  const goBack = () => {
    if (step > 0) {
      setStep(step - 1)
      setError('')
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="sticky top-0 bg-surface-50/80 backdrop-blur-lg border-b border-surface-200 z-50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={goBack} className="p-2 -ml-2 hover:bg-surface-100 rounded-lg transition-colors">
            <svg className="w-6 h-6 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => navigate('/')} className="text-surface-500 hover:text-surface-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-surface-200">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-6 py-8">
        {/* Step 1: Phone */}
        {step === STEPS.PHONE && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                전화번호를 입력해주세요
              </h1>
              <p className="text-surface-500">
                본인 인증을 위해 사용됩니다
              </p>
            </div>

            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="01012345678"
                className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 text-lg placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                maxLength={11}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || phone.length < 10}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              {loading ? '전송 중...' : '인증번호 받기'}
            </button>
          </form>
        )}

        {/* Step 2: Verify */}
        {step === STEPS.VERIFY && (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                인증번호를 입력해주세요
              </h1>
              <p className="text-surface-500">
                {phone}로 전송된 인증번호 4자리
              </p>
            </div>

            <div>
              <input
                type="text"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1234"
                className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 text-lg text-center tracking-[1em] placeholder:tracking-normal placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                maxLength={4}
              />
              <p className="text-surface-400 text-xs mt-2 text-center">
                테스트용 인증번호: 1234
              </p>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={verifyCode.length < 4}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              확인
            </button>
          </form>
        )}

        {/* Step 3: Basic Info */}
        {step === STEPS.BASIC_INFO && (
          <form onSubmit={handleBasicInfoSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                기본 정보를 알려주세요
              </h1>
              <p className="text-surface-500">
                매칭을 위해 필요한 정보예요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="실명을 입력해주세요"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  성별
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'male', label: '남성', icon: '👨' },
                    { value: 'female', label: '여성', icon: '👩' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: option.value })}
                      className={`py-4 px-4 rounded-xl border-2 font-medium transition-all ${
                        formData.gender === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      <span className="text-2xl mb-1 block">{option.icon}</span>
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  출생연도
                </label>
                <input
                  type="number"
                  value={formData.birthYear}
                  onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                  placeholder="1995"
                  min="1960"
                  max="2006"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
            >
              다음으로
            </button>
          </form>
        )}

        {/* Step 4: Work Info */}
        {step === STEPS.WORK_INFO && (
          <form onSubmit={handleWorkInfoSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                직장 정보를 알려주세요
              </h1>
              <p className="text-surface-500">
                회사명은 공개되지 않아요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  거주 지역
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="서울 강남구"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  직장 위치
                </label>
                <input
                  type="text"
                  value={formData.workLocation}
                  onChange={(e) => setFormData({ ...formData, workLocation: e.target.value })}
                  placeholder="판교"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  직장 유형
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {WORK_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, workType: type.value })}
                      className={`py-4 px-4 rounded-xl border-2 font-medium transition-all text-left ${
                        formData.workType === type.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{type.icon}</span>
                      <span className="text-sm">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
            >
              다음으로
            </button>
          </form>
        )}

        {/* Step 5: Lifestyle (MBTI, 흡연, 음주) */}
        {step === STEPS.LIFESTYLE && (
          <form onSubmit={handleLifestyleSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                라이프스타일을 알려주세요
              </h1>
              <p className="text-surface-500">
                나와 맞는 사람을 찾는 데 도움이 돼요
              </p>
            </div>

            <div className="space-y-6">
              {/* MBTI */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-3">
                  MBTI
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {MBTI_TYPES.map((mbti) => (
                    <button
                      key={mbti}
                      type="button"
                      onClick={() => setFormData({ ...formData, mbti })}
                      className={`py-3 px-2 rounded-xl border-2 font-medium text-sm transition-all ${
                        formData.mbti === mbti
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      {mbti}
                    </button>
                  ))}
                </div>
              </div>

              {/* 흡연 */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-3">
                  흡연 여부
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SMOKING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, smoking: option.value })}
                      className={`py-4 px-3 rounded-xl border-2 font-medium transition-all ${
                        formData.smoking === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{option.icon}</span>
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 음주 */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-3">
                  음주 여부
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {DRINKING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, drinking: option.value })}
                      className={`py-4 px-3 rounded-xl border-2 font-medium transition-all ${
                        formData.drinking === option.value
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                      }`}
                    >
                      <span className="text-xl mb-1 block">{option.icon}</span>
                      <span className="text-sm">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300"
            >
              다음으로
            </button>
          </form>
        )}

        {/* Step 6: Interests */}
        {step === STEPS.INTERESTS && (
          <form onSubmit={handleInterestsSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                관심사를 선택해주세요
              </h1>
              <p className="text-surface-500">
                최소 1개, 최대 5개까지 선택 가능해요
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {INTEREST_OPTIONS.map((interest) => {
                const isSelected = formData.interests.includes(interest.value)
                const isDisabled = !isSelected && formData.interests.length >= 5
                return (
                  <button
                    key={interest.value}
                    type="button"
                    onClick={() => !isDisabled && toggleInterest(interest.value)}
                    disabled={isDisabled}
                    className={`py-3 px-4 rounded-full border-2 font-medium transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : isDisabled
                        ? 'border-surface-200 bg-surface-100 text-surface-400 cursor-not-allowed'
                        : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                    }`}
                  >
                    <span>{interest.icon}</span>
                    <span className="text-sm">{interest.label}</span>
                  </button>
                )
              })}
            </div>

            <p className="text-surface-500 text-sm text-center">
              {formData.interests.length}/5 선택됨
            </p>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={formData.interests.length < 1}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              다음으로
            </button>
          </form>
        )}

        {/* Step 7: Profile (자기소개 + 카톡) */}
        {step === STEPS.PROFILE && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* 거의 완료 메시지 */}
            <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">✨</div>
              <h2 className="text-xl font-bold text-surface-900 mb-1">
                회원가입이 거의 다 됐어요!
              </h2>
              <p className="text-surface-600 text-sm">
                마지막으로 자신을 소개해주세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  자기소개 <span className="text-primary-500">*</span>
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="자기소개를 작성해주세요.

💡 이상형도 간단히 적어주시면 매칭에 도움이 됩니다!
예: 활발하고 유머러스한 분, 독서 좋아하시는 분 등"
                  rows={6}
                  maxLength={300}
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                />
                <p className={`text-right text-xs mt-1 ${formData.bio.length < 10 ? 'text-red-500' : 'text-surface-400'}`}>
                  {formData.bio.length}/300 (최소 10글자)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  카카오톡 ID <span className="text-primary-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.kakaoId}
                  onChange={(e) => setFormData({ ...formData, kakaoId: e.target.value })}
                  placeholder="카카오톡 ID를 입력해주세요"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <p className="text-surface-400 text-xs mt-2">
                  💡 서로 매칭이 성사되면 카카오톡 ID가 공개됩니다
                </p>
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={!formData.kakaoId || formData.bio.length < 10}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              다음으로
            </button>
          </form>
        )}

        {/* Step 8: Agreement */}
        {step === STEPS.AGREEMENT && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                약관에 동의해주세요
              </h1>
              <p className="text-surface-500">
                서비스 이용을 위해 필요해요
              </p>
            </div>

            <div className="space-y-3">
              {/* All agree */}
              <button
                onClick={() => handleAgreementChange('all')}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-all ${
                  agreements.all
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-surface-200 bg-surface-50'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  agreements.all ? 'bg-primary-500' : 'bg-surface-300'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className={`font-semibold ${agreements.all ? 'text-primary-700' : 'text-surface-700'}`}>
                  모두 동의합니다
                </span>
              </button>

              <div className="border-t border-surface-200 my-4" />

              {/* Individual agreements */}
              {[
                { key: 'age', label: '(필수) 만 18세 이상입니다', required: true },
                { key: 'terms', label: '(필수) 서비스 이용약관 동의', required: true },
                { key: 'privacy', label: '(필수) 개인정보 수집 및 이용 동의', required: true },
                { key: 'marketing', label: '(선택) 마케팅 정보 수신 동의', required: false },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleAgreementChange(item.key)}
                  className="w-full p-4 rounded-xl flex items-center gap-3 hover:bg-surface-100 transition-all"
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    agreements[item.key] ? 'bg-primary-500' : 'bg-surface-300'
                  }`}>
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className={`text-sm ${agreements[item.key] ? 'text-surface-900' : 'text-surface-600'}`}>
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              onClick={handleFinalSubmit}
              disabled={loading || !agreements.age || !agreements.terms || !agreements.privacy}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '가입 완료'}
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default SignupPage
