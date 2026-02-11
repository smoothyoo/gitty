import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true) // 핵심: 초기값 true

  const fetchProfile = async (userId) => {
    if (!userId) return null
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Profile fetch error:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Profile fetch error:', error)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      try {
        // 1. 세션 체크
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (session?.user) {
          setUser(session.user)
          
          // 2. 프로필 가져오기
          const profileData = await fetchProfile(session.user.id)
          
          if (!mounted) return
          
          if (profileData) {
            setProfile(profileData)
          } else {
            // 프로필 없으면 강제 로그아웃
            console.warn('Profile not found, signing out...')
            await supabase.auth.signOut()
            setUser(null)
            setProfile(null)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (error) {
        console.error('Auth init error:', error)
        setUser(null)
        setProfile(null)
      } finally {
        // 3. 로딩 완료 (이게 핵심!)
        if (mounted) {
          setIsAuthLoading(false)
        }
      }
    }

    initAuth()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          return
        }

        if (session?.user) {
          setUser(session.user)
          const profileData = await fetchProfile(session.user.id)
          if (mounted) {
            setProfile(profileData)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const refreshProfile = async (userId) => {
    const profileData = await fetchProfile(userId || user?.id)
    if (profileData) {
      setProfile(profileData)
    }
    return profileData
  }

  const value = {
    user,
    profile,
    isAuthLoading, // 새로 추가
    loading: isAuthLoading, // 기존 호환성 유지
    signOut,
    refreshProfile
  }

  // 로딩 중일 때는 스피너만 보여줌
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
