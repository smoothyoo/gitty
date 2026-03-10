import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LandingPage = () => {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const sectionRefs = useRef([])

  useEffect(() => {
    if (!loading && user) {
      navigate('/home')
    }
  }, [user, loading, navigate])

  // Scroll animation: Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.15 }
    )
    sectionRefs.current.forEach((ref) => ref && observer.observe(ref))
    return () => observer.disconnect()
  }, [])

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
              <span className="text-3xl">😎</span>
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
              <span className="text-3xl">🥰</span>
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
          미팅, 소개팅을 하는 방법.
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
            {['직장인 전용 💼', '매주 월요일 📅', '미팅 🎉', '소개팅 💘', '사진 없는 소개팅 미팅 🫣', '직장 인증으로 안전하게 ✅', '직장인 전용 💼', '매주 월요일 📅', '미팅 🎉', '소개팅 💘', '사진 없는 소개팅 미팅 🫣', '직장 인증으로 안전하게 ✅'].map((tag, i) => (
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

        {/* === 특징 소개 섹션 === */}
        <div className="mt-24 space-y-24">

          {/* 섹션 1: 직장 인증 */}
          <section ref={(el) => (sectionRefs.current[0] = el)} className="animate-on-scroll">
            <p className="text-orange-500 text-sm font-semibold mb-2">✅ 직장 인증</p>
            <h2 className="text-2xl font-bold text-white leading-tight mb-2">이상한 사람은<br />없어요.</h2>
            <p className="text-zinc-400 text-sm mb-8">회사 이메일로 인증된 사람만 만날 수 있어요.</p>
            {/* CSS 목업: 프로필 카드 + 인증 뱃지 */}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5 max-w-[260px] mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                  <span className="text-2xl">😄</span>
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">박** 님</p>
                  <p className="text-zinc-500 text-xs">29세 · IT/스타트업</p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                  <span className="text-xs">📍</span>
                  <span className="text-zinc-400 text-xs">서울 강남</span>
                </div>
                <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2">
                  <span className="text-xs">🎯</span>
                  <span className="text-zinc-400 text-xs">MBTI · 취미 · 음주 · 흡연</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-2">
                <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-orange-400 text-sm font-semibold">직장 인증 완료</span>
              </div>
            </div>
          </section>

          {/* 섹션 2: 사진 없는 소개팅 (NEW) */}
          <section ref={(el) => (sectionRefs.current[1] = el)} className="animate-on-scroll">
            <p className="text-orange-500 text-sm font-semibold mb-2">🫣 사진 없는 소개팅 미팅</p>
            <h2 className="text-2xl font-bold text-white leading-tight mb-2">얼굴보다 중요한 게<br />있으니까.</h2>
            <p className="text-zinc-400 text-sm mb-8">사진 없이, 직장·취미·성격으로 통하는 사람을 만나요.</p>
            {/* CSS 목업: 사진 없는 프로필 카드 */}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5 max-w-[260px] mx-auto">
              {/* 이모지 아바타 (사진 대신) */}
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center">
                  <span className="text-3xl">🤓</span>
                </div>
              </div>
              <div className="text-center mb-4">
                <p className="text-white text-sm font-semibold">최** 님 · 28세</p>
                <p className="text-zinc-500 text-xs mt-0.5">IT/스타트업 · 서울 성수</p>
              </div>
              {/* 키워드 태그들 */}
              <div className="flex flex-wrap justify-center gap-1.5 mb-4">
                {['#ENFP', '#독서', '#와인', '#러닝'].map((tag, i) => (
                  <span key={i} className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
              {/* 하단 라벨 */}
              <div className="flex items-center justify-center gap-1.5 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-2">
                <span className="text-sm">✨</span>
                <span className="text-orange-400 text-sm font-semibold">취향으로 통하는 인연</span>
              </div>
            </div>
          </section>

          {/* 섹션 3: 매주 월요일 매칭 */}
          <section ref={(el) => (sectionRefs.current[2] = el)} className="animate-on-scroll">
            <p className="text-orange-500 text-sm font-semibold mb-2">📅 매주 월요일</p>
            <h2 className="text-2xl font-bold text-white leading-tight mb-2">월요일 점심,<br />설레는 알림이 와요.</h2>
            <p className="text-zinc-400 text-sm mb-8">당신의 취향에 딱 맞는 인연을 골라드려요.</p>
            {/* CSS 목업: 매칭 알림 */}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5 max-w-[260px] mx-auto">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white text-sm font-bold">GITTY</span>
                <span className="text-zinc-500 text-xs">월요일 PM 1:00</span>
              </div>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <span className="text-lg">💌</span>
                  </div>
                  <p className="text-white text-sm font-semibold">새로운 인연이 도착했어요!</p>
                </div>
                <p className="text-zinc-400 text-xs">이번 주 매칭 결과를 확인해보세요</p>
              </div>
              <div className="flex items-center gap-3 bg-zinc-800 rounded-xl p-3">
                <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center shrink-0">
                  <span className="text-xl">🥳</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">이** 님 · 27세</p>
                  <p className="text-zinc-500 text-xs">금융 · 서울 마포</p>
                </div>
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </section>

          {/* 섹션 4: 소개팅 & 미팅 */}
          <section ref={(el) => (sectionRefs.current[3] = el)} className="animate-on-scroll">
            <p className="text-orange-500 text-sm font-semibold mb-2">🎉 미팅 & 소개팅</p>
            <h2 className="text-2xl font-bold text-white leading-tight mb-2">둘이서, 또는<br />여럿이서.</h2>
            <p className="text-zinc-400 text-sm mb-8">친구랑 함께하는 미팅도, 1:1 소개팅도 가능해요.</p>
            {/* CSS 목업: 모드 선택 */}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 p-5 max-w-[260px] mx-auto">
              <p className="text-zinc-500 text-xs text-center mb-3">원하는 방식을 선택하세요</p>
              <div className="space-y-3">
                <div className="bg-orange-500/10 border-2 border-orange-500/40 rounded-2xl p-4 text-center">
                  <span className="text-3xl mb-2 block">🎉</span>
                  <p className="text-white font-bold text-sm">그룹 미팅</p>
                  <p className="text-zinc-400 text-xs mt-1">친구와 함께하는 즐거운 만남</p>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-4 text-center">
                  <span className="text-3xl mb-2 block">💘</span>
                  <p className="text-white font-bold text-sm">1:1 소개팅</p>
                  <p className="text-zinc-400 text-xs mt-1">매주 1명의 인연을 소개받아요</p>
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* === 하단 CTA 섹션 === */}
        <div ref={(el) => (sectionRefs.current[4] = el)} className="animate-on-scroll mt-24 pb-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">이번 주 월요일,<br />누구를 만나게 될까요?</h2>
          <p className="text-zinc-500 text-sm mb-8">가입은 1분이면 끝나요.</p>
          <button
            onClick={() => navigate('/signup')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-colors duration-200"
          >
            1분만에 가입하기
          </button>
        </div>
      </main>
    </div>
  )
}

export default LandingPage
