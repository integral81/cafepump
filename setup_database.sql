-- 1002. 카공_MBTI_맵 Supabase Schema

-- 1. 카페 기본 정보 테이블
CREATE TABLE cafes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    outlet_density INTEGER DEFAULT 1, -- 1(거의 없음) ~ 5(매우 많음)
    noise_level INTEGER DEFAULT 1,    -- 1(도서관형) ~ 5(시장통)
    eyesight_pressure INTEGER DEFAULT 1, -- 1(눈치 전혀 안줌) ~ 5(사장님과 아이스 컨택 필수)
    category TEXT, -- 대형 프랜차이즈, 개인 카페, 스터디 카페 등
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 좌석 상세 정보 테이블 (MBTI 매칭)
CREATE TABLE seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
    seat_type TEXT NOT NULL, -- 'Corner', 'Window', 'Large Table', 'Sofa', 'Booth'
    mbti_recommendation TEXT[], -- ['I', 'N', 'J'] 등의 배열
    has_outlet BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 카페 방문 리뷰 및 태그 테이블
CREATE TABLE cafe_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
    user_mbti TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    tags TEXT[], -- ['조용해요', '커피가맛있어요', '자리가넓어요']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 샘플 데이터 (신촌/대학가 가상 데이터)
INSERT INTO cafes (name, address, lat, lng, outlet_density, noise_level, eyesight_pressure, category)
VALUES 
('몰입 카페 신촌점', '서울 서대문구 신촌로 100', 37.5593, 126.9360, 5, 1, 1, '스터디 카페'),
('활력 커피', '서울 서대문구 이화여대길 50', 37.5583, 126.9460, 3, 4, 3, '개인 카페'),
('오픈 테이블 창가점', '서울 서대문구 연세로 12', 37.5573, 126.9370, 4, 3, 2, '대형 프랜차이즈');

-- 샘플 좌석 매칭
INSERT INTO seats (cafe_id, seat_type, mbti_recommendation, has_outlet, description)
SELECT id, 'Corner', ARRAY['I', 'J'], TRUE, '완전 구석탱이 명당. 사장님 시야 밖.' FROM cafes WHERE name = '몰입 카페 신촌점';
INSERT INTO seats (cafe_id, seat_type, mbti_recommendation, has_outlet, description)
SELECT id, 'Window', ARRAY['N', 'P'], TRUE, '뷰가 탁 트여서 영감이 샘솟음.' FROM cafes WHERE name = '오픈 테이블 창가점';
INSERT INTO seats (cafe_id, seat_type, mbti_recommendation, has_outlet, description)
SELECT id, 'Large Table', ARRAY['E', 'S'], TRUE, '활기찬 분위기에서 작업 가능.' FROM cafes WHERE name = '활력 커피';
-- [추가] 5. 자전거 공기주입기 통합 정보 테이블
CREATE TABLE bicycle_pumps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city TEXT NOT NULL,          -- 서울, 인천, 수원, 전국
    name TEXT NOT NULL,          -- 장소명
    address TEXT,                -- 주소
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    source TEXT,                 -- 데이터 출처
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- [추가] 6. 전기자전거 급속충전소 정보 테이블
CREATE TABLE electric_chargers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    description TEXT,
    source TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 공간 쿼리 최적화 인덱스
CREATE INDEX idx_chargers_lat_lng ON electric_chargers (lat, lng);

-- 공간 쿼리 최적화를 위한 인덱스 (선택 사항)
CREATE INDEX idx_pumps_lat_lng ON bicycle_pumps (lat, lng);
