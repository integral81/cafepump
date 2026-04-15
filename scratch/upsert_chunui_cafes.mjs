/**
 * 춘의역 근처 카공 카페 5곳 Upsert 스크립트
 * - 카카오 API 좌표 기반 (실제 조회 결과)
 * - Supabase cafes + seats 테이블에 삽입
 * 
 * DB 컬럼: id, name, address, lat, lng, outlet_density(1~5), noise_level(1~5),
 *          eyesight_pressure(1~5), wifi_ssid, wifi_pw, location, image_urls,
 *          killing_comment, created_at
 * Seats: id, cafe_id, seat_type, has_outlet, privacy_score, description
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ═══ 춘의역 근처 카공 인기 카페 5곳 (리뷰 多 기준) ═══
const cafes = [
    {
        name: '스타벅스 춘의역DT점',
        address: '경기도 부천시 길주로 386 (춘의동)',
        lat: 37.5030801269842,
        lng: 126.785460306503,
        outlet_density: 4,       // 콘센트 많음
        noise_level: 3,          // 보통 (프랜차이즈 특성상)
        eyesight_pressure: 1,    // 눈치 안줌 (카공 성지)
        wifi_ssid: 'KT_starbucks',
        wifi_pw: '자동접속 (KT Wi-Fi 제휴)',
        location: '춘의역 1번 출구 앞',
        image_urls: [],
        killing_comment: '서렌디 한 잔과 함께 넓은 테이블에서 마감 없는 집중타임을 즐기세요.',
        seats: [
            { seat_type: '2층 창가 롱테이블 (INTJ/ISTJ 추천)', has_outlet: true, privacy_score: 3, description: '콘센트 완비된 넓은 롱테이블. 노트북 작업에 최적화된 카공 명당.' },
            { seat_type: '1층 안쪽 소파석 (INFP/ISFP 추천)', has_outlet: false, privacy_score: 2, description: '편안한 소파에서 여유롭게. 다만 콘센트가 멀 수 있음.' },
            { seat_type: 'DT 건물 외곽 창가석 (ENTP/ENFP 추천)', has_outlet: true, privacy_score: 4, description: '탁 트인 뷰와 함께하는 독립 공간. 영감이 필요할 때.' }
        ]
    },
    {
        name: '카페포나인',
        address: '경기도 부천시 춘의동 214-4',
        lat: 37.501411461980254,
        lng: 126.78496182365048,
        outlet_density: 4,       // 콘센트 잘 배치
        noise_level: 1,          // 매우 조용 (개인카페)
        eyesight_pressure: 1,    // 눈치 전혀 안줌
        wifi_ssid: '카페포나인_5G',
        wifi_pw: '영수증 하단 기재',
        location: '춘의역 도보 5분',
        image_urls: [],
        killing_comment: '아늑하고 깔끔한 공간에서 당신만의 리듬으로 몰입해보세요.',
        seats: [
            { seat_type: '안쪽 벽면 1인석 (INFJ/INTJ 추천)', has_outlet: true, privacy_score: 5, description: '사장님 시야 밖 완벽한 사각지대. 눈치 제로 카공의 정석.' },
            { seat_type: '창가 2인 테이블 (ISFJ/INFP 추천)', has_outlet: true, privacy_score: 3, description: '자연광이 은은하게 드는 집중 명당. 차분한 분위기.' }
        ]
    },
    {
        name: '스윗비',
        address: '경기도 부천시 부천로198번길 36, 춘의테크노파크 102동 110호',
        lat: 37.50197348286034,
        lng: 126.78934819670745,
        outlet_density: 3,       // 적당
        noise_level: 1,          // 매우 조용
        eyesight_pressure: 1,    // 눈치 전혀 안줌
        wifi_ssid: 'SweetB_WiFi',
        wifi_pw: '매장 내 안내판 확인',
        location: '춘의테크노파크 1층',
        image_urls: [],
        killing_comment: '창밖 풍경이 예쁜 아늑한 공간, 기분 전환과 집중을 동시에.',
        seats: [
            { seat_type: '통창 뷰 창가석 (INFP/ENFP 추천)', has_outlet: true, privacy_score: 4, description: '예쁜 창문 뷰가 일품. 감성 충전과 카공을 동시에.' },
            { seat_type: '벽 쪽 코너 1인석 (ISTP/INTP 추천)', has_outlet: true, privacy_score: 5, description: '완전한 프라이빗 공간. 딥워크 모드에 돌입하기 최적.' }
        ]
    },
    {
        name: '메가MGC커피 부천춘의점',
        address: '경기도 부천시 춘의동 165-1',
        lat: 37.5024653970828,
        lng: 126.788321059921,
        outlet_density: 3,       // 보통
        noise_level: 3,          // 보통
        eyesight_pressure: 2,    // 약간 눈치
        wifi_ssid: 'MEGA_FREE',
        wifi_pw: '자동접속',
        location: '춘의역 3번 출구 도보 2분',
        image_urls: [],
        killing_comment: '가성비 아메리카노 한 잔으로 시작하는 효율적인 하루.',
        seats: [
            { seat_type: '벽면 바 테이블 (ESTJ/ENTJ 추천)', has_outlet: true, privacy_score: 2, description: '콘센트 바로 옆 효율적인 좌석. 빠르게 시작, 빠르게 몰입.' },
            { seat_type: '안쪽 파티션 부스 (ISTJ/ISFJ 추천)', has_outlet: true, privacy_score: 3, description: '파티션으로 독립감 확보. 적당한 소음 속 집중력 UP.' }
        ]
    },
    {
        name: '소호202',
        address: '경기도 부천시 춘의동 202',
        lat: 37.501452315972664,
        lng: 126.7876227519794,
        outlet_density: 4,       // 콘센트 많음
        noise_level: 1,          // 조용
        eyesight_pressure: 1,    // 눈치 안줌
        wifi_ssid: 'SOHO202',
        wifi_pw: '영수증 하단 기재',
        location: '춘의역 도보 3분',
        image_urls: [],
        killing_comment: '감성 인테리어 속 깊은 몰입, 오늘도 당신의 작업이 빛나길.',
        seats: [
            { seat_type: '감성 코너 1인석 (INFJ/INFP 추천)', has_outlet: true, privacy_score: 4, description: '감성적인 인테리어 사이 숨겨진 코너 명당. 몰입도 최상.' },
            { seat_type: '중앙 넓은 테이블 (ENFJ/ESFJ 추천)', has_outlet: true, privacy_score: 2, description: '그룹 스터디에도 적합한 넓은 공간. 함께 공부하기 좋은 자리.' }
        ]
    }
];

async function upsertCafes() {
    console.log('=== 춘의역 카페 5곳 Upsert 시작 ===\n');

    for (const cafe of cafes) {
        const { seats, ...cafeData } = cafe;

        // 1. 기존 동일 이름 카페가 있는지 확인
        const { data: existing } = await supabase
            .from('cafes')
            .select('id')
            .eq('name', cafeData.name)
            .maybeSingle();

        let cafeId;

        if (existing) {
            // UPDATE
            const { error } = await supabase
                .from('cafes')
                .update(cafeData)
                .eq('id', existing.id);
            
            if (error) {
                console.error(`❌ [UPDATE 실패] ${cafeData.name}:`, error.message);
                continue;
            }
            cafeId = existing.id;
            console.log(`🔄 [UPDATE] ${cafeData.name}`);
        } else {
            // INSERT
            const { data, error } = await supabase
                .from('cafes')
                .insert(cafeData)
                .select('id')
                .single();
            
            if (error) {
                console.error(`❌ [INSERT 실패] ${cafeData.name}:`, error.message);
                continue;
            }
            cafeId = data.id;
            console.log(`✅ [INSERT] ${cafeData.name} (id: ${cafeId})`);
        }

        // 2. 기존 좌석 정보 제거 후 재삽입
        await supabase.from('seats').delete().eq('cafe_id', cafeId);

        const seatRows = seats.map(s => ({
            cafe_id: cafeId,
            seat_type: s.seat_type,
            has_outlet: s.has_outlet,
            privacy_score: s.privacy_score,
            description: s.description
        }));

        const { error: seatError } = await supabase.from('seats').insert(seatRows);
        if (seatError) {
            console.error(`  ⚠️ 좌석 삽입 실패:`, seatError.message);
        } else {
            console.log(`  📍 좌석 ${seatRows.length}건 등록 완료`);
        }
    }

    console.log('\n=== 완료! ===');
}

upsertCafes();
