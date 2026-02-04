-- GITTY 데이터베이스 스키마
-- Supabase SQL Editor에서 실행해주세요

-- 1. Users 테이블 (유저 프로필)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
  birth_year INTEGER NOT NULL,
  region VARCHAR(100), -- 거주 지역
  work_location VARCHAR(100), -- 직장 위치
  work_type VARCHAR(20) CHECK (work_type IN ('large', 'mid', 'startup', 'small', 'entrepreneur')),
  bio TEXT, -- 자기소개
  kakao_id VARCHAR(50), -- 카카오톡 ID (매칭 성공 시 공개)
  marketing_agreed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Matches 테이블 (매칭 기록)
-- 매칭 사이클: Day1 오후1시 프로필공개 → Day1 밤10시 마감 → Day2 오후5시 결과발표
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- 각 유저의 응답 (null: 미응답, true: 매칭할래요, false: 안할래요)
  response_a BOOLEAN DEFAULT NULL,
  response_b BOOLEAN DEFAULT NULL,
  
  -- 매칭 최종 상태: waiting(응답대기), matched(성사), rejected(거절/시간초과)
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'rejected')),
  
  -- 사이클 관리
  cycle_start DATE NOT NULL, -- Day 1 (프로필 공개일)
  response_deadline TIMESTAMP WITH TIME ZONE, -- Day 1 밤 10시
  result_date TIMESTAMP WITH TIME ZONE, -- Day 2 오후 5시
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 같은 사이클에 같은 유저 조합 중복 방지
  UNIQUE(user_a, user_b, cycle_start)
);

-- 3. RLS (Row Level Security) 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Users: 본인 데이터만 조회/수정 가능, 매칭된 상대방 정보는 조회 가능
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 매칭된 상대방 프로필 조회 허용
CREATE POLICY "Users can view matched users" ON users
  FOR SELECT USING (
    id IN (
      SELECT user_a FROM matches WHERE user_b = auth.uid()
      UNION
      SELECT user_b FROM matches WHERE user_a = auth.uid()
    )
  );

-- Matches: 본인이 포함된 매칭만 조회/수정 가능
CREATE POLICY "Users can view own matches" ON matches
  FOR SELECT USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can update own match status" ON matches
  FOR UPDATE USING (auth.uid() = user_a OR auth.uid() = user_b);

-- 관리자가 매칭 생성할 수 있도록 (Supabase 대시보드에서)
-- Service Role Key 사용 시 RLS 우회됨

-- 4. 인덱스 생성 (성능 최적화)
CREATE INDEX idx_matches_user_a ON matches(user_a);
CREATE INDEX idx_matches_user_b ON matches(user_b);
CREATE INDEX idx_matches_cycle ON matches(cycle_start);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_users_gender ON users(gender);
CREATE INDEX idx_users_work_type ON users(work_type);
