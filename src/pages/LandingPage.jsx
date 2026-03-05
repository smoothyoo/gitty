import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LandingPage = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      navigate('/home')
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="px-6 py-3 border-b border-zinc-900">
        <div className="max-w-lg mx-auto flex items-center">
          <img src="/Gitty2.png" alt="GITTY" className="h-8 w-auto" />
        </div>
      </header>

      <main className="px-6 pt-12 pb-16 max-w-lg mx-auto">
        {/* Profile cards illustration */}
        <div className="flex items-center justify-center gap-0 mb-10">
          {/* Card 1 - 남성 */}
          <div className="w-40 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2.5 p-4">
            {/* Avatar */}
            <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-3xl">🧑‍💻</span>
            </div>
            {/* Name & info */}
            <div className="text-center">
              <p className="text-white text-sm font-semibold">김** 님</p>
              <p className="text-zinc-500 text-xs mt-0.5">28세 · 남성</p>
            </div>
            {/* Info rows */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1.5">
                <span className="text-xs">📍</span>
                <span className="text-zinc-400 text-xs">서울 강남</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1.5">
                <span className="text-xs">💼</span>
                <span className="text-zinc-400 text-xs">IT/스타트업</span>
              </div>
            </div>
            {/* 직장 인증 */}
            <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
              <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-orange-400 text-xs font-medium">직장 인증됨</span>
            </div>
          </div>

          {/* Heart */}
          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/25 -mx-2 z-10 shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>

          {/* Card 2 - 여성 */}
          <div className="w-40 bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col items-center gap-2.5 p-4">
            {/* Avatar */}
            <div className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center">
              <span className="text-3xl">🧑‍🎨</span>
            </div>
            {/* Name & info */}
            <div className="text-center">
              <p className="text-white text-sm font-semibold">이** 님</p>
              <p className="text-zinc-500 text-xs mt-0.5">26세 · 여성</p>
            </div>
            {/* Info rows */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1.5">
                <span className="text-xs">📍</span>
                <span className="text-zinc-400 text-xs">서울 마포</span>
              </div>
              <div className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1.5">
                <span className="text-xs">💼</span>
                <span className="text-zinc-400 text-xs">금융/은행</span>
              </div>
            </div>
            {/* 직장 인증 */}
            <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1">
              <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span className="text-orange-400 text-xs font-medium">직장 인증됨</span>
            </div>
          </div>
        </div>


        {/* Headline */}
        <h1 className="text-3xl font-bold leading-tight mb-4 text-white">
          직장인들이 요즘
          <br />
          소개팅, 미팅을 하는 방법.
          <br />
          <span className="inline-flex items-center gap-1">
            <img src="/Gitty2.png" alt="GITTY" className="h-8 w-auto inline-block" />에서
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-zinc-500 text-base leading-relaxed mb-4">
          매주 월요일, 검증된 직장인 인연을 찾아드려요.
        </p>

        {/* Marquee */}
        <div className="overflow-hidden -mx-6 mb-8">
          <div className="flex gap-2 animate-marquee-left whitespace-nowrap">
            {['직장인 전용 💼', '매주 월요일 📅', '소개팅 💑', '미팅 🎉', '직장 인증으로 안전하게 ✅', '직장인 전용 💼', '매주 월요일 📅', '소개팅 💑', '미팅 🎉', '직장 인증으로 안전하게 ✅'].map((tag, i) => (
              <span key={i} className="inline-flex items-center bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm px-4 py-2 rounded-full shrink-0">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
          >
            1분만에 가입하기
          </button>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-medium py-4 px-6 rounded-xl transition-colors duration-200"
          >
            이미 계정이 있다면? 로그인하기
          </button>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
