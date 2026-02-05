import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STEPS = {
  PHONE: 0,
  VERIFY: 1,
  BASIC_INFO: 2,
  WORK_INFO: 3,
  APPEARANCE: 4, // NEW!
  PROFILE: 5,
  AGREEMENT: 6,
}

const WORK_TYPES = [
  { value: 'large', label: '대기업', icon: '🏢' },
  { value: 'mid', label: '중견기업', icon: '🏬' },
  { value: 'startup', label: '스타트업', icon: '🚀' },
  { value: 'small', label: '중소기업', icon: '🏠' },
  { value: 'entrepreneur', label: '창업/자영업', icon: '💼' },
]

const BODY_TYPES = [
  { value: 'slim', label: '마름', icon: '🌿' },
  { value: 'average', label: '보통', icon: '✨' },
  { value: 'chubby', label: '통통', icon: '🌟' },
  { value: 'none', label: '선택안함', icon: '➖' },
]

const SignupPage = () => {
  const navigate = useNavigate()
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
    // NEW: 외적 정보
    height: '',
    bodyType: '',
    faceFeatures: '',
    fashionStyle: '',
    // 프로필
    interests: '',
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

  const progress = ((step + 1) / 7) * 100

  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (phone.length < 10) {
      setError('올바른 전화번호를 입력해주세요')
      return
    }
    
    setLoading(true)
    // MVP: 더미 인증 (실제로는 Supabase Phone Auth 사용)
    setTimeout(() => {
      setLoading(false)
      setStep(STEPS.VERIFY)
    }, 1000)
  }

  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    // MVP: 더미 인증 코드 1234
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
    
    setStep(STEPS.APPEARANCE)
  }

  // NEW: 외적 정보 제출
  const handleAppearanceSubmit = (e) => {
    e.preventDefault()
    setError('')
    
    // 외적 정보는 선택사항이므로 바로 다음으로
    setStep(STEPS.PROFILE)
  }

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    setError('')
    
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
      // Supabase에 유저 생성 (MVP에서는 phone을 이메일처럼 사용)
      const fakeEmail = `${phone}@gitty.app`
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: fakeEmail,
        password: phone + '_gitty_2024', // MVP용 임시 비밀번호
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
          // NEW: 외적 정보
          height: formData.height ? parseInt(formData.height) : null,
          body_type: formData.bodyType || null,
          face_features: formData.faceFeatures || null,
          fashion_style: formData.fashionStyle || null,
          // 프로필
          interests: formData.interests || null,
          bio: formData.bio,
          kakao_id: formData.kakaoId,
          marketing_agreed: agreements.marketing,
        })
      
      if (profileError) throw profileError
      
      // 성공 - 메인 페이지로 이동
      navigate('/home')
    } catch (err) {
      console.error('Signup error:', err)
      setError('가입 중 오류가 발생했습니다. 다시 시도해주세요.')
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
          <button onClick={goBack} className="p-2 -ml-2 text-surface-600 hover:text-surface-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={() => navigate('/')} className="p-2 -mr-2 text-surface-600 hover:text-surface-900">
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
                휴대폰 번호를 입력해주세요
              </h1>
              <p className="text-surface-500">
                본인 확인을 위해 필요해요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  휴대폰 번호
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="01012345678"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  maxLength={11}
                />
              </div>
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
                {phone}로 전송된 4자리 숫자
              </p>
              <p className="text-accent-500 text-sm mt-2">
                테스트용 인증번호: 1234
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  인증번호
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="1234"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 text-center text-2xl tracking-[0.5em] placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  maxLength={4}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={verifyCode.length < 4}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              다음으로
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
                  placeholder="본명을 입력해주세요"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  성별
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={`py-4 px-4 rounded-xl border-2 font-medium transition-all ${
                      formData.gender === 'male'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                    }`}
                  >
                    <span className="text-xl mb-1 block">👨</span>
                    <span className="text-sm">남성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={`py-4 px-4 rounded-xl border-2 font-medium transition-all ${
                      formData.gender === 'female'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-surface-200 bg-surface-50 text-surface-600 hover:border-surface-300'
                    }`}
                  >
                    <span className="text-xl mb-1 block">👩</span>
                    <span className="text-sm">여성</span>
                  </button>
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
                  min="1950"
                  max={new Date().getFullYear() - 18}
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              type="submit"
              disabled={!formData.name || !formData.gender || !formData.birthYear}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
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
                  placeholder="예: 서울 강남구, 경기 성남시"
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
                  placeholder="예: 판교, 여의도, 강남"
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
              disabled={!formData.region || !formData.workLocation || !formData.workType}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              다음으로
            </button>
          </form>
        )}

        {/* Step 5: Appearance (NEW!) */}
        {step === STEPS.APPEARANCE && (
          <form onSubmit={handleAppearanceSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                외적 정보를 알려주세요
              </h1>
              <p className="text-surface-500">
                선택사항이지만 매칭에 도움이 돼요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  키 (cm)
                </label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                  placeholder="170"
                  min="140"
                  max="220"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  체형
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {BODY_TYPES.map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, bodyType: type.value })}
                      className={`py-4 px-4 rounded-xl border-2 font-medium transition-all ${
                        formData.bodyType === type.value
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

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  얼굴 특징
                </label>
                <input
                  type="text"
                  value={formData.faceFeatures}
                  onChange={(e) => setFormData({ ...formData, faceFeatures: e.target.value })}
                  placeholder="예: 쌍거풀 있음, 동그란 얼굴"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  패션 스타일
                </label>
                <input
                  type="text"
                  value={formData.fashionStyle}
                  onChange={(e) => setFormData({ ...formData, fashionStyle: e.target.value })}
                  placeholder="예: 캐주얼, 미니멀, 스트릿"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  maxLength={50}
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

        {/* Step 6: Profile (자기소개 & 카카오톡) - IMPROVED! */}
        {step === STEPS.PROFILE && (
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* NEW: 거의 완료 메시지 */}
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
              {/* NEW: 관심사 */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  관심사
                </label>
                <p className="text-xs text-surface-500 mb-2">
                  예: 운동, 영화, 독서, 맛집탐방 (쉼표로 구분)
                </p>
                <input
                  type="text"
                  value={formData.interests}
                  onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                  placeholder="운동, 영화, 요리"
                  className="w-full px-4 py-4 bg-surface-100 border border-surface-200 rounded-xl text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  maxLength={100}
                />
              </div>

              {/* IMPROVED: 자기소개 with 이상형 가이드 */}
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-2">
                  자기소개
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
                <p className="text-right text-surface-400 text-xs mt-1">
                  {formData.bio.length}/300
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
              disabled={!formData.kakaoId}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              다음으로
            </button>
          </form>
        )}

        {/* Step 7: Agreement */}
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
