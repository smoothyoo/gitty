// 직장 유형
export const WORK_TYPES = [
  { value: 'large', label: '대기업', icon: '🏢' },
  { value: 'mid', label: '중견기업', icon: '🏬' },
  { value: 'startup', label: '스타트업', icon: '🚀' },
  { value: 'small', label: '중소기업', icon: '🏠' },
  { value: 'entrepreneur', label: '창업/자영업', icon: '💼' },
]

export const WORK_TYPE_LABELS = Object.fromEntries(
  WORK_TYPES.map(t => [t.value, t.label])
)

// MBTI
export const MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
]

// 흡연
export const SMOKING_OPTIONS = [
  { value: 'no', label: '비흡연', icon: '🚭' },
  { value: 'sometimes', label: '가끔', icon: '🚬' },
  { value: 'yes', label: '흡연', icon: '🚬' },
]

export const SMOKING_LABELS = Object.fromEntries(
  SMOKING_OPTIONS.map(o => [o.value, o.label])
)

// 음주
export const DRINKING_OPTIONS = [
  { value: 'no', label: '안 마셔요', icon: '🚫' },
  { value: 'sometimes', label: '가끔 마셔요', icon: '🍺' },
  { value: 'often', label: '자주 마셔요', icon: '🍻' },
]

export const DRINKING_LABELS = Object.fromEntries(
  DRINKING_OPTIONS.map(o => [o.value, o.label])
)

// 관심사
export const INTEREST_OPTIONS = [
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

export const INTEREST_LABELS = Object.fromEntries(
  INTEREST_OPTIONS.map(o => [o.value, `${o.icon} ${o.label}`])
)

// 유틸리티: 관심사 문자열 -> 배열 변환
export const parseInterests = (interestsStr) => {
  if (!interestsStr) return []
  return interestsStr.split(',').filter(Boolean)
}

// 인증 관련 환경변수
export const DUMMY_SMS_CODE = import.meta.env.VITE_DUMMY_SMS_CODE || '1234'
export const SHOW_TEST_HINTS = import.meta.env.VITE_SHOW_TEST_HINTS === 'true'
