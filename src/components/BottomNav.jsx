import { useNavigate, useLocation } from 'react-router-dom'

const BottomNav = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const isHome = location.pathname === '/home'
  const isProfile = location.pathname === '/profile'

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 z-50">
      <div className="max-w-lg mx-auto px-6 py-3 flex items-center justify-around">
        <button
          onClick={() => navigate('/home')}
          className={`relative flex flex-col items-center gap-1 ${isHome ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {isHome && <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-500 rounded-full" />}
          {isHome ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          )}
          <span className="text-xs font-medium">매칭</span>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className={`relative flex flex-col items-center gap-1 ${isProfile ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          {isProfile && <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-orange-500 rounded-full" />}
          {isProfile ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
          <span className="text-xs font-medium">내 정보</span>
        </button>
      </div>
    </nav>
  )
}

export default BottomNav
