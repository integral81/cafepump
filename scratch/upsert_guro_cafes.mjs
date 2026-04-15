/**
 * 구로구 궁동 (오리로17길 70) 주변 카페 5곳 Upsert 스크립트 (V2)
 * - 실제 DB 스키마에 맞춰 컬럼 수정 (category 제거, killing_comment 등 추가)
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const NEW_CAFES = [
    {
        name: '카페동네 궁동점',
        address: '서울 구로구 궁동 278-6',
        lat: 37.4977343030165,
        lng: 126.828977537493,
        outlet_density: 4,
        noise_level: 2,
        eyesight_pressure: 1,
        killing_comment: '우드 톤의 차분한 인테리어와 넓은 테이블이 작업하기 매우 좋습니다.'
    },
    {
        name: '까페봉주르마담',
        address: '서울 구로구 궁동 279',
        lat: 37.4988304713765,
        lng: 126.829355012326,
        outlet_density: 3,
        noise_level: 3,
        eyesight_pressure: 2,
        killing_comment: '세종과학고 앞 햇살 맛집. 고등학생과 대학생이 많아 열공 분위기입니다.'
    },
    {
        name: '카페마닐',
        address: '서울 구로구 궁동 98-3',
        lat: 37.498654307502,
        lng: 126.828410002037,
        outlet_density: 3,
        noise_level: 2,
        eyesight_pressure: 2,
        killing_comment: '조용하고 아담한 공간에서 집중 유지가 잘 되는 곳입니다.'
    },
    {
        name: '메가MGC커피 서울세종과학고점',
        address: '서울 구로구 궁동 279',
        lat: 37.49883033411258,
        lng: 126.82926001894954,
        outlet_density: 3,
        noise_level: 4,
        eyesight_pressure: 1,
        killing_comment: '가성비 최고의 카공 장소. 콘센트 자리가 명당입니다.'
    },
    {
        name: '컴포즈커피 구로궁동점',
        address: '서울 구로구 궁동 189-42',
        lat: 37.4944985497438,
        lng: 126.833219807003,
        outlet_density: 4,
        noise_level: 3,
        eyesight_pressure: 1,
        killing_comment: '와이파이가 빵빵하고 좌석 배치가 효율적입니다.'
    }
];

async function main() {
    console.log('🚀 구로구 궁동 카페 데이터 업로드 시작...');

    for (const cafe of NEW_CAFES) {
        // 기존 이름 기반 유무 확인
        const { data: existing } = await supabase
            .from('cafes')
            .select('id')
            .eq('name', cafe.name)
            .maybeSingle();

        if (existing) {
            const { error } = await supabase
                .from('cafes')
                .update(cafe)
                .eq('id', existing.id);
            if (error) console.error(`❌ ${cafe.name} 업데이트 실패:`, error.message);
            else console.log(`🔄 ${cafe.name} 업데이트 완료`);
        } else {
            const { error } = await supabase
                .from('cafes')
                .insert(cafe);
            if (error) console.error(`❌ ${cafe.name} 등록 실패:`, error.message);
            else console.log(`✅ ${cafe.name} 등록 완료`);
        }
    }

    console.log('\n🏁 모든 작업이 완료되었습니다!');
}

main();
