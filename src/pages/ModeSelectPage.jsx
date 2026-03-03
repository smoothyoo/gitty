import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const BIO_GUIDES = [
  { label: '성격/가치관', icon: '✨', placeholder: '저는 긍정적이고 활동적인 성격이에요. 새로운 것에 도전하기를 즐기고 주변 사람들에게 에너지를 주려고 해요.' },
  { label: '취미/관심사', icon: '🎯', placeholder: '주말엔 주로 카페 탐방이나 독서를 해요. 최근엔 운동을 시작했는데, 같이 취미를 즐길 수 있는 분이면 더 좋겠어요!' },
  { label: '외적 특징', icon: '👤', placeholder: '단정하고 깔끔한 스타일을 좋아해요. 평소에 캐주얼한 편이지만 분위기에 맞게 코디를 즐기기도 해요.' },
  { label: '이상형', icon: '💕', placeholder: '함께 있을 때 편안하고 대화가 잘 통하는 분이 좋아요. 서로 성장할 수 있고, 작은 것에도 감사할 줄 아는 분을 만나고 싶어요.' },
  { label: '인생 영화/음악', icon: '🎬', placeholder: '인생 영화는 인터스텔라예요. 음악은 재즈나 인디음악을 자주 들어요. 같이 공연 보러 가는 걸 좋아해요.' },
]

const MODES = {
  SELECT: 'select',
  BIO_DATING: 'bio_dating',
  BIO_MEETING: 'bio_meeting',
  DONE: 'done',
}

const ModeSelectPage = () => {
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()

  const [step, setStep] = useState(MODES.SELECT)
  const [selectedMode, setSelectedMode] = useState(null) // 'dating' | 'meeting' | 'both'
  const [bioDating, setBioDating] = useState('')
  const [bioMeeting, setBioMeeting] = useState('')
  const [bioPlaceholder, setBioPlaceholder] = useState('자유롭게 자신을 소개해주세요 😊')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleModeSelect = (mode) => {
    setSelectedMode(mode)
    setBioPlaceholder('자유롭게 자신을 소개해주세요 😊')
    if (mode === 'dating' || mode === 'both') {
      setStep(MODES.BIO_DATING)
    } else {
      setStep(MODES.BIO_MEETING)
    }
  }

  const handleBioDatingNext = () => {
    setError('')
    if (bioDating.length < 10) {
      setError('자기소개를 최소 10글자 이상 입력해주세요')
      return
    }
    if (selectedMode === 'both') {
      setBioPlaceholder('자유롭게 자신을 소개해주세요 😊')
      setStep(MODES.BIO_MEETING)
    } else {
      handleSave()
    }
  }

  const handleBioMeetingNext = () => {
    setError('')
    if (bioMeeting.length < 10) {
      setError('자기소개를 최소 10글자 이상 입력해주세요')
      return
    }
    handleSave()
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')
    try {
      const updateData = {
        mode_dating: selectedMode === 'dating' || selectedMode === 'both',
        mode_meeting: selectedMode === 'meeting' || selectedMode === 'both',
      }
      if (updateData.mode_dating) updateData.bio_dating = bioDating
      if (updateData.mode_meeting) updateData.bio_meeting = bioMeeting

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)

      if (updateError) throw updateError

      await refreshProfile(user.id)
      navigate('/home')
    } catch (err) {
      console.error('Mode save error:', err)
      setError('저장 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const progress = step === MODES.SELECT ? 33
    : step === MODES.BIO_DATING && selectedMode !== 'both' ? 80
    : step === MODES.BIO_DATING ? 55
    : step === MODES.BIO_MEETING && selectedMode !== 'both' ? 80
    : 90

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 bg-zinc-950/80 backdrop-blur-lg border-b border-zinc-800 z-50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/Gitty2.png" alt="GITTY" className="h-8 w-auto" />
          <span className="text-zinc-600 text-sm">
            {step === MODES.BIO_MEETING && selectedMode === 'both' ? '미팅 자기소개' : step === MODES.BIO_DATING ? '소개팅 자기소개' : '매칭 방식 선택'}
          </span>
        </div>
        <div className="h-1 bg-zinc-800">
          <div className="h-full bg-orange-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-8">

        {/* ── 모드 선택 ── */}
        {step === MODES.SELECT && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">어떻게 만나고 싶으세요?</h1>
              <p className="text-zinc-500">원하는 방식을 선택해주세요. 나중에 변경할 수 있어요.</p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => handleModeSelect('dating')}
                className="w-full p-5 rounded-2xl border-2 border-zinc-700 bg-zinc-900 hover:border-orange-500 hover:bg-orange-500/5 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500/15 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-orange-500/20 transition-all">
                    💑
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">1:1 소개팅</p>
                    <p className="text-zinc-500 text-sm mt-0.5">한 명과 집중적으로 연결돼요</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleModeSelect('meeting')}
                className="w-full p-5 rounded-2xl border-2 border-zinc-700 bg-zinc-900 hover:border-orange-500 hover:bg-orange-500/5 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500/15 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-orange-500/20 transition-all">
                    🎉
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">미팅</p>
                    <p className="text-zinc-500 text-sm mt-0.5">여럿이서 함께 만나요</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleModeSelect('both')}
                className="w-full p-5 rounded-2xl border-2 border-zinc-700 bg-zinc-900 hover:border-orange-500 hover:bg-orange-500/5 transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-orange-500/15 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-orange-500/20 transition-all">
                    ✨
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">둘 다</p>
                    <p className="text-zinc-500 text-sm mt-0.5">소개팅과 미팅 모두 참여해요</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── 소개팅 자기소개 ── */}
        {step === MODES.BIO_DATING && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 mb-3">
                <span className="text-orange-400 text-xs font-medium">💑 소개팅 자기소개</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">1:1 소개팅 자기소개</h1>
              <p className="text-zinc-500 text-sm">매칭 상대에게 보여질 자기소개예요</p>
            </div>

            <div>
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
                value={bioDating}
                onChange={(e) => setBioDating(e.target.value)}
                placeholder={bioPlaceholder}
                rows={6}
                maxLength={300}
                className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
              />
              <p className={`text-right text-xs mt-1 ${bioDating.length < 10 ? 'text-zinc-600' : 'text-orange-400'}`}>
                {bioDating.length}/300
              </p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleBioDatingNext}
              disabled={loading || bioDating.length < 10}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : selectedMode === 'both' ? '다음 — 미팅 자기소개' : '완료'}
            </button>
          </div>
        )}

        {/* ── 미팅 자기소개 ── */}
        {step === MODES.BIO_MEETING && (
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-3 py-1 mb-3">
                <span className="text-orange-400 text-xs font-medium">🎉 미팅 자기소개</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">미팅 자기소개</h1>
              <p className="text-zinc-500 text-sm">미팅 매칭 상대에게 보여질 자기소개예요</p>
            </div>

            <div>
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
                value={bioMeeting}
                onChange={(e) => setBioMeeting(e.target.value)}
                placeholder={bioPlaceholder}
                rows={6}
                maxLength={300}
                className="w-full px-4 py-4 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
              />
              <p className={`text-right text-xs mt-1 ${bioMeeting.length < 10 ? 'text-zinc-600' : 'text-orange-400'}`}>
                {bioMeeting.length}/300
              </p>
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              onClick={handleBioMeetingNext}
              disabled={loading || bioMeeting.length < 10}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-semibold py-4 px-6 rounded-xl transition-all disabled:cursor-not-allowed"
            >
              {loading ? '저장 중...' : '완료'}
            </button>

            {selectedMode === 'both' && (
              <button
                onClick={() => setStep(MODES.BIO_DATING)}
                className="w-full text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
              >
                ← 소개팅 자기소개 수정
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  )
}

export default ModeSelectPage
