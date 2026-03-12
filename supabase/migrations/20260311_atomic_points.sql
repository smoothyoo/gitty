-- ============================================
-- 포인트 원자성 처리를 위한 RPC 함수
-- Supabase SQL Editor에서 실행해주세요
-- ============================================

-- 1. 카카오 ID 열람 (포인트 차감 + 거래 기록 + 매칭 열람 플래그)
--    모든 작업이 하나의 트랜잭션으로 처리됨
CREATE OR REPLACE FUNCTION unlock_kakao(
  p_user_id UUID,
  p_match_id UUID,
  p_cost INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points INTEGER;
BEGIN
  -- 1. 현재 포인트 조회 + 행 잠금 (동시 차감 방지)
  SELECT points INTO v_current_points
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  -- 유저가 없는 경우
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- 2. 잔액 부족 확인
  IF v_current_points < p_cost THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_points');
  END IF;

  -- 3. 포인트 차감 (직접 연산으로 race condition 방지)
  UPDATE users
  SET points = points - p_cost
  WHERE id = p_user_id;

  -- 4. 거래 내역 기록
  INSERT INTO point_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'use', -p_cost, '카카오 ID 열람');

  -- 5. 매칭 열람 플래그 업데이트 (양쪽 모두 공개)
  UPDATE matches
  SET kakao_unlocked_a = true, kakao_unlocked_b = true
  WHERE id = p_match_id;

  RETURN json_build_object('success', true, 'remaining_points', v_current_points - p_cost);
END;
$$;

-- 2. 포인트 충전 (포인트 증가 + 거래 기록)
CREATE OR REPLACE FUNCTION purchase_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_points INTEGER;
BEGIN
  -- 1. 포인트 증가 + 행 잠금
  UPDATE users
  SET points = points + p_amount
  WHERE id = p_user_id
  RETURNING points INTO v_new_points;

  -- 유저가 없는 경우
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'user_not_found');
  END IF;

  -- 2. 거래 내역 기록
  INSERT INTO point_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'purchase', p_amount, p_description);

  RETURN json_build_object('success', true, 'new_points', v_new_points);
END;
$$;
