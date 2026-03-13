import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import BottomSheet from '../components/BottomSheet'

const PACKAGES = [
  {
    id: 'p250',
    points: 250,
    price: 5000,
    priceLabel: '5,000원',
    badge: null,
    originalPrice: null,
  },
  {
    id: 'p500',
    points: 500,
    price: 10000,
    priceLabel: '10,000원',
    badge: '⭐ 인기',
    originalPrice: null,
  },
  {
    id: 'p1000',
    points: 1000,
    price: 19000,
    priceLabel: '19,000원',
    badge: '🔥 특가',
    originalPrice: '20,000원',
  },
]

const ShopPage = () => {
  const navigate = useNavigate()
  const { profile, user, refreshProfile } = useAuth()

  const [selectedPackage, setSelectedPackage] = useState(PACKAGES[1]) // 기본: 500P
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    if (user) fetchTransactions()
  }, [user])

  const fetchTransactions = async () => {
    const { data } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)
    if (data) setTransactions(data)
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handlePurchase = async () => {
    if (!user || !selectedPackage) return
    setLoading(true)

    try {
      // 원자적 처리: 포인트 증가 + 거래 기록 (DB 함수)
      const { data, error } = await supabase.rpc('purchase_points', {
        p_user_id: user.id,
        p_amount: selectedPackage.points,
        p_description: `${selectedPackage.points}P 충전 (${selectedPackage.priceLabel})`,
      })

      if (error) throw error
      if (!data?.success) {
        throw new Error(data?.error || '충전 처리 실패')
      }

      // 프로필 갱신 + 거래 내역 리로드
      await refreshProfile()
      await fetchTransactions()

      setConfirmOpen(false)
      showToast(`💎 ${selectedPackage.points}P 충전 완료!`)
    } catch (err) {
      console.error('충전 오류:', err)
      showToast('충전 중 오류가 발생했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* 헤더 */}
      <header className="sticky top-0 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800 z-50">
        <div className="max-w-lg mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="font-bold text-lg text-white">포인트 충전</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-6 py-6 space-y-6">
        {/* 현재 잔액 카드 */}
        <div className="bg-gradient-to-r from-orange-500/20 to-orange-600/10 border border-orange-500/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
            💎
          </div>
          <div>
            <p className="text-zinc-400 text-sm">현재 잔액</p>
            <p className="text-2xl font-bold text-white">
              {(profile?.points ?? 0).toLocaleString()}
              <span className="text-orange-400 text-lg ml-1">P</span>
            </p>
          </div>
        </div>

        {/* 패키지 선택 */}
        <div>
          <h2 className="text-zinc-400 text-sm font-medium mb-3">패키지 선택</h2>
          <div className="space-y-3">
            {PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => setSelectedPackage(pkg)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                  selectedPackage.id === pkg.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-zinc-800 bg-zinc-800/50 hover:border-zinc-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedPackage.id === pkg.id
                      ? 'border-orange-500 bg-orange-500'
                      : 'border-zinc-600'
                  }`}>
                    {selectedPackage.id === pkg.id && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-lg">
                        {pkg.points.toLocaleString()}P
                      </span>
                      {pkg.badge && (
                        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-medium">
                          {pkg.badge}
                        </span>
                      )}
                    </div>
                    {pkg.originalPrice && (
                      <p className="text-zinc-500 text-xs line-through">{pkg.originalPrice}</p>
                    )}
                  </div>
                </div>
                <span className={`font-bold text-lg ${
                  selectedPackage.id === pkg.id ? 'text-orange-400' : 'text-zinc-300'
                }`}>
                  {pkg.priceLabel}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 충전 버튼 */}
        <button
          onClick={() => setConfirmOpen(true)}
          className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-lg rounded-2xl transition-all"
        >
          지금 충전하기
        </button>

        {/* 안내 문구 */}
        <p className="text-zinc-600 text-xs text-center">
          💎 포인트는 카카오 ID 열람 시 사용돼요 (500P / 1회)
        </p>

        {/* 최근 거래 내역 */}
        {transactions.length > 0 && (
          <div>
            <h2 className="text-zinc-400 text-sm font-medium mb-3">최근 거래 내역</h2>
            <div className="bg-zinc-800/50 rounded-2xl overflow-hidden">
              {transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i < transactions.length - 1 ? 'border-b border-zinc-700/50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{tx.type === 'purchase' ? '💎' : '🔓'}</span>
                    <span className="text-zinc-300 text-sm">{tx.description}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${
                      tx.amount > 0 ? 'text-emerald-400' : 'text-zinc-400'
                    }`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}P
                    </span>
                    <p className="text-zinc-600 text-xs">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 결제 확인 BottomSheet */}
      <BottomSheet isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="충전 확인">
        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">충전 포인트</span>
              <span className="text-white font-bold">{selectedPackage?.points.toLocaleString()}P</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">결제 금액</span>
              <span className="text-white font-bold">{selectedPackage?.priceLabel}</span>
            </div>
            <div className="border-t border-zinc-700 pt-3 flex justify-between text-sm">
              <span className="text-zinc-400">충전 후 잔액</span>
              <span className="text-orange-400 font-bold">
                {((profile?.points ?? 0) + (selectedPackage?.points ?? 0)).toLocaleString()}P
              </span>
            </div>
          </div>

          <div className="bg-zinc-800/60 rounded-xl px-4 py-2.5">
            <p className="text-zinc-500 text-xs text-center">
              🧪 테스트 모드 — 실제 결제가 발생하지 않아요
            </p>
          </div>

          <button
            onClick={handlePurchase}
            disabled={loading}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-lg rounded-2xl transition-all"
          >
            {loading ? '처리 중...' : `${selectedPackage?.priceLabel} 결제하기`}
          </button>
          <button
            onClick={() => setConfirmOpen(false)}
            className="w-full py-3 text-zinc-400 text-sm"
          >
            취소
          </button>
        </div>
      </BottomSheet>

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg z-50 whitespace-nowrap animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}

export default ShopPage
