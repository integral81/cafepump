/**
 * 남양주시 덕소역 인근 카공 카페 10곳 Upsert 스크립트
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEOKSO_CAFES = [
    { name: '커피에리어 (COFFEE AREA)', address: '경기 남양주시 와부읍 덕소로 96', lat: 37.5828, lng: 127.2085, outlet_density: 4, noise_level: 2, eyesight_pressure: 1, killing_comment: '조용하고 깔끔한 분위기. 집중해서 작업하기 최고입니다.' },
    { name: '투썸플레이스 남양주덕소점', address: '경기 남양주시 와부읍 월문천로 115', lat: 37.5872, lng: 127.2052, outlet_density: 4, noise_level: 3, eyesight_pressure: 1, killing_comment: '넓은 매장과 다양한 테이블. 장시간 작업 시 추천.' },
    { name: '이디야커피 덕소역점', address: '경기 남양주시 와부읍 덕소로 80', lat: 37.5822, lng: 127.2075, outlet_density: 3, noise_level: 3, eyesight_pressure: 2, killing_comment: '덕소역 바로 앞. 가성비 좋게 잠깐 작업하기 좋습니다.' },
    { name: '스타벅스 남양주삼패점', address: '경기 남양주시 경강로 384', lat: 37.5805, lng: 127.2005, outlet_density: 4, noise_level: 3, eyesight_pressure: 1, killing_comment: '한강 전망을 즐기며 카공하기 최고의 장소. 남양주삼패점입니다.' },
    { name: '메가MGC커피 덕소점', address: '경기 남양주시 와부읍 덕소로 97', lat: 37.5825, lng: 127.2088, outlet_density: 2, noise_level: 4, eyesight_pressure: 3, killing_comment: '가성비 위주. 짧고 굵게 집중할 때 추천.' },
    { name: 'LOFT317', address: '경기 남양주시 와부읍 덕소로 317', lat: 37.5872, lng: 127.2185, outlet_density: 3, noise_level: 2, eyesight_pressure: 2, killing_comment: '세련된 인테리어와 여유로운 공간. 창의적인 고민에 제격.' },
    { name: '버디 (Birdie)', address: '경기 남양주시 와부읍 덕소로 282', lat: 37.5862, lng: 127.2182, outlet_density: 3, noise_level: 2, eyesight_pressure: 2, killing_comment: '한적한 위치에서 조용히 책 보거나 노트북 하기 좋습니다.' },
    { name: '단아커피', address: '경기 남양주시 와부읍 덕소로116번길 20', lat: 37.5841, lng: 127.2095, outlet_density: 3, noise_level: 2, eyesight_pressure: 2, killing_comment: '동네 아지트 같은 편안함. 아늑한 분위기에서 작업 가능.' },
    { name: '카페 아지트', address: '경기 남양주시 와부읍 덕소로 200', lat: 37.5845, lng: 127.2125, outlet_density: 3, noise_level: 3, eyesight_pressure: 2, killing_comment: '편안한 좌석과 적당한 백색소음이 있는 곳.' },
    { name: '컴포즈커피 남양주덕소점', address: '경기 남양주시 와부읍 덕소로 212', lat: 37.5848, lng: 127.2135, outlet_density: 2, noise_level: 4, eyesight_pressure: 3, killing_comment: '가벼운 마음으로 들러 공부하기 좋은 가성비 카페.' }
];

async function main() {
    console.log('🚀 덕소역 인근 카페 데이터 업로드 시작...');

    for (const cafe of DEOKSO_CAFES) {
        const { data: existing } = await supabase.from('cafes').select('id').eq('name', cafe.name).maybeSingle();
        if (existing) {
            await supabase.from('cafes').update(cafe).eq('id', existing.id);
            console.log(`🔄 ${cafe.name} 업데이트`);
        } else {
            await supabase.from('cafes').insert(cafe);
            console.log(`✅ ${cafe.name} 신규 등록`);
        }
    }
    console.log('\n🏁 덕소역 10선 등록 완료!');
}

main();
