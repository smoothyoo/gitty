import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { generatePassword, generateEmail } from '../lib/auth'
import { DUMMY_SMS_CODE, SHOW_TEST_HINTS } from '../lib/constants'

const LoginPage = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState('phone')
  const [phone, setPhone] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      setStep('verify')
    }, 1000)
  }

  const handleVerifySubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (verifyCode !== DUMMY_SMS_CODE) {
      setError('인증번호가 일치하지 않습니다')
      return
    }

    setLoading(true)

    try {
      await supabase.auth.signOut()
      await new Promise(resolve => setTimeout(resolve, 500))

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: generateEmail(phone),
        password: generatePassword(phone),
      })

      if (authError) {
        console.error('Auth error:', authError)
        if (authError.message.includes('Invalid login')) {
          setError('가입되지 않은 번호이거나 비밀번호가 틀렸습니다.')
        } else {
          setError('로그인 중 오류가 발생했습니다: ' + authError.message)
        }
        setLoading(false)
        return
      }

      navigate('/home')
    } catch (err) {
      console.error('Login error:', err)
      setError('로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="sticky top-0 bg-surface-50/80 backdrop-blur-lg border-b border-surface-200 z-50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => step === 'verify' ? setStep('phone') : navigate('/')} className="p-2 -ml-2 text-surface-600 hover:text-surface-900">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm font-[Outfit]">G</span>
            </div>
            <span className="font-bold text-lg font-[Outfit]">GITTY</span>
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-lg mx-auto px-6 py-8">
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                다시 만나서 반가워요!
              </h1>
              <p className="text-surface-500">
                가입하신 휴대폰 번호로 로그인해주세요
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

            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-surface-500 text-sm hover:text-primary-500 transition-colors"
              >
                아직 계정이 없으신가요? <span className="text-primary-500 font-medium">가입하기</span>
              </button>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-surface-900 mb-2">
                인증번호를 입력해주세요
              </h1>
              <p className="text-surface-500">
                {phone}로 전송된 4자리 숫자
              </p>
              {SHOW_TEST_HINTS && (
                <p className="text-accent-500 text-sm mt-2">
                  테스트용 인증번호: {DUMMY_SMS_CODE}
                </p>
              )}
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
              disabled={loading || verifyCode.length < 4}
              className="w-full bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 disabled:from-surface-300 disabled:to-surface-300 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}

export default LoginPage
