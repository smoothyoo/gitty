# GITTY - 직장인 소개팅 플랫폼

직장인을 위한 프리미엄 소개팅 서비스입니다. 사진 없이, 직장 정보 기반으로 매일 1명의 인연을 소개받습니다.

## 🚀 주요 기능

- **휴대폰 번호 인증** (MVP에서는 1234 더미 코드)
- **프로필 등록** (이름, 성별, 나이, 거주지, 직장위치, 직장유형)
- **매일 1명 매칭** (관리자가 수동 매칭)
- **수락/거절** 기능
- **매칭 히스토리** 조회

## 🛠 기술 스택

- React + Vite
- Tailwind CSS
- Supabase (인증 + 데이터베이스)
- React Router

## 📦 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## ⚙️ 환경 설정

### 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. Project Settings > API 에서 URL과 anon key 복사

### 2. 환경변수 설정

`.env` 파일을 생성하고 아래 내용 입력:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3. 데이터베이스 테이블 생성

Supabase 대시보드 > SQL Editor에서 `supabase-schema.sql` 파일 내용 실행

## 📊 데이터베이스 구조

### users 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 유저 ID (auth.users 연결) |
| phone | VARCHAR | 휴대폰 번호 |
| name | VARCHAR | 이름 |
| gender | VARCHAR | 성별 (male/female) |
| birth_year | INTEGER | 출생연도 |
| region | VARCHAR | 거주 지역 |
| work_location | VARCHAR | 직장 위치 |
| work_type | VARCHAR | 직장 유형 |

### matches 테이블
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | UUID | 매칭 ID |
| user_a | UUID | 유저 A |
| user_b | UUID | 유저 B |
| status_a | VARCHAR | A의 응답 (pending/accepted/rejected) |
| status_b | VARCHAR | B의 응답 |
| match_date | DATE | 매칭 날짜 |

## 🎮 관리자 매칭 방법

1. Supabase 대시보드 > Table Editor > matches
2. "Insert row" 클릭
3. user_a, user_b에 매칭할 유저 ID 입력
4. match_date에 오늘 날짜 입력
5. Save

## 🔒 테스트 계정

- 인증번호: `1234` (모든 번호에 동일)

## 📱 화면 구성

1. **랜딩 페이지** (`/`) - 서비스 소개
2. **회원가입** (`/signup`) - 5단계 가입 플로우
3. **로그인** (`/login`) - 휴대폰 인증
4. **홈** (`/home`) - 오늘의 매칭 카드
5. **프로필** (`/profile`) - 내 정보 확인

---

Made with ❤️ for 직장인
