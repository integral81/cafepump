/**
 * 강남대로 362 (강남역/양재역) 주변 카페 10곳 Upsert 스크립트
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const GANGNAM_CAFES = [
    { name: '사운즈커피 프리미어 강남', address: '서울 강남구 강남대로 358 103호', lat: 37.4950386, lng: 127.0297037, outlet_density: 4, noise_level: 2, eyesight_pressure: 1, killing_comment: '높은 층고와 호텔급 인테리어로 최고의 몰입감을 선사합니다.' },
    { name: '리퍼크 (reperk)', address: '서울 강남구 강남대로 382 메리츠타워 1F', lat: 37.4969474, lng: 127.0285793, outlet_density: 3, noise_level: 2, eyesight_pressure: 2, killing_comment: '세련된 오피스 라운지 느낌. 비즈니스 미팅과 카공에 최적.' },
    { name: 'Upper and Under', address: '서울 강남구 강남대로102길 28', lat: 37.502699, lng: 127.0277076, outlet_density: 4, noise_level: 3, eyesight_pressure: 1, killing_comment: '지하와 지상을 아우르는 넓은 공간. 콘센트석이 잘 구비되어 있습니다.' },
    { name: '셀렉티드닉스 강남역점', address: '서울 강남구 테헤란로4길 37', lat: 37.4961927, lng: 127.0308697, outlet_density: 5, noise_level: 2, eyesight_pressure: 1, killing_comment: '워크숍/대관도 잦은 만큼 작업 환경이 프로페셔널합니다.' },
    { name: '알베르 (Alver)', address: '서울 강남구 강남대로102길 34', lat: 37.503075, lng: 127.0281117, outlet_density: 3, noise_level: 3, eyesight_pressure: 1, killing_comment: '강남역 최대 규모 카페 중 하나. 지하 공간은 독서실 같은 차분함을 자랑합니다.' },
    { name: '트리오드 (Triode)', address: '서울 강남구 강남대로94길 28', lat: 37.4996832, lng: 127.0295395, outlet_density: 4, noise_level: 2, eyesight_pressure: 2, killing_comment: '케이크 맛집이자 카공 명당. 조명이 아늑해서 눈이 편안합니다.' },
    { name: 'AB Cafe', address: '서울 강남구 강남대로102길 32', lat: 37.5029149, lng: 127.0278837, outlet_density: 3, noise_level: 3, eyesight_pressure: 1, killing_comment: '휴양지 느낌의 인테리어 덕분에 기분 좋게 창의적인 작업이 가능합니다.' },
    { name: '가배도 신농현', address: '서울 강남구 강남대로110길 13 2층', lat: 37.5040964, lng: 127.0258517, outlet_density: 3, noise_level: 2, eyesight_pressure: 2, killing_comment: '오래된 건물의 고즈넉함 속에서 깊은 생각에 잠기기 좋습니다.' },
    { name: '브라운홀릭', address: '서울 강남구 역삼로 620-15', lat: 37.5010626, lng: 127.0285995, outlet_density: 4, noise_level: 2, eyesight_pressure: 1, killing_comment: '커피 향이 가득한 넓은 매장. 작업 속도가 저절로 붙는 곳.' },
    { name: 'Something About Coffee', address: '서울 강남구 강남대로102길 30', lat: 37.5028303, lng: 127.0278341, outlet_density: 3, noise_level: 3, eyesight_pressure: 1, killing_comment: '화사한 분위기 속에서 즐기는 여유 있는 카공 타임.' }
];

async function main() {
    console.log('🚀 강남역/양재역 카페 데이터 업로드 시작...');

    for (const cafe of GANGNAM_CAFES) {
        const { data: existing } = await supabase.from('cafes').select('id').eq('name', cafe.name).maybeSingle();
        if (existing) {
            await supabase.from('cafes').update(cafe).eq('id', existing.id);
            console.log(`🔄 ${cafe.name} 업데이트`);
        } else {
            await supabase.from('cafes').insert(cafe);
            console.log(`✅ ${cafe.name} 신규 등록`);
        }
    }
    console.log('\n🏁 강남 10선 등록 완료!');
}

main();
