import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const WORK_TYPE_LABELS = {
  large: '대기업',
  mid: '중견기업',
  startup: '스타트업',
  small: '중소기업',
  entrepreneur: '창업/자영업',
}

const ProfilePage = () => {
  const navigate = useNavigate()
  const { profile, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
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
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">휴대폰</span>
              <span className="text-surface-900 font-medium">{profile?.phone || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">거주 지역</span>
              <span className="text-surface-900 font-medium">{profile?.region || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-surface-100">
              <span className="text-surface-500">직장 위치</span>
              <span className="text-surface-900 font-medium">{profile?.work_location || '-'}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-surface-500">직장 유형</span>
              <span className="text-surface-900 font-medium">{WORK_TYPE_LABELS[profile?.work_type] || '-'}</span>
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
    </div>
  )
}

export default ProfilePage
