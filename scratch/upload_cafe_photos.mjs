/**
 * Google Places API → 로컬 public/ 폴더 카페 실사진 자동 다운로드 및 DB 업데이트 스크립트
 * 
 * 플로우:
 * 1. Google Places Text Search로 카페 검색
 * 2. photo_reference로 실사진 다운로드
 * 3. 프로젝트의 public/cafe_photos/ 폴더에 저장
 * 4. cafes 테이블의 image_urls 컬럼을 로컬 경로로 업데이트
 */
import { createClient } from '@supabase/supabase-js';
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const GOOGLE_API_KEY = 'AIzaSyATHTCLIMTTCRWB_6FNyL7ATGz-Ql_xnNY';
const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 로컬 저장 경로 설정
const PUBLIC_DIR = 'c:/Users/이승민/002. 로또 Project/1002. 카공_MBTI_맵/public/cafe_photos';
const BASE_URL_PATH = '/cafepump/cafe_photos'; // Vite base path 반영

const TARGET_CAFES = [
    { dbName: '스타벅스 춘의역DT점', slug: 'starbucks_chunui', searchQuery: '스타벅스 춘의역DT점 부천' },
    { dbName: '카페포나인', slug: 'cafe_fornine', searchQuery: '카페포나인 부천시 춘의동' },
    { dbName: '스윗비', slug: 'sweetb', searchQuery: '스윗비 카페 부천 춘의테크노파크' },
    { dbName: '메가MGC커피 부천춘의점', slug: 'mega_chunui', searchQuery: '메가커피 부천춘의점' },
    { dbName: '소호202', slug: 'soho202', searchQuery: '소호202 부천 춘의' },
];

// --- 유틸리티 함수 ---

function downloadBuffer(url, maxRedirects = 5) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, { timeout: 15000 }, (res) => {
            if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
                if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
                return downloadBuffer(res.headers.location, maxRedirects - 1).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
}

async function searchPlace(query) {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ko&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 'OK' || !data.results?.length) return null;
    return data.results[0];
}

async function getPlacePhotos(placeId) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&language=ko&key=${GOOGLE_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.result?.photos || [];
}

function getPhotoUrl(photoReference, maxWidth = 800) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// --- 메인 실행 ---
async function main() {
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║  Google Places → Local Public 폴더 사진 실시간 다운로드  ║');
    console.log('╚══════════════════════════════════════════════╝\n');

    // 폴더 생성 확인
    if (!fs.existsSync(PUBLIC_DIR)) {
        fs.mkdirSync(PUBLIC_DIR, { recursive: true });
    }

    for (const cafe of TARGET_CAFES) {
        console.log(`\n🔍 [${cafe.dbName}] 검색 중...`);

        const place = await searchPlace(cafe.searchQuery);
        if (!place) {
            console.log(`  ❌ 검색 결과 없음. 스킵.`);
            continue;
        }

        let photos = place.photos || [];
        if (place.place_id) {
            const detailPhotos = await getPlacePhotos(place.place_id);
            if (detailPhotos.length > photos.length) photos = detailPhotos;
        }

        if (!photos.length) {
            console.log(`  ⚠️ 사진 없음. 스킵.`);
            continue;
        }

        const targetPhotos = photos.slice(0, 4);
        console.log(`  📷 사진 ${targetPhotos.length}장 로컬 저장 시작...`);

        const localPaths = [];

        for (let i = 0; i < targetPhotos.length; i++) {
            const photoRef = targetPhotos[i].photo_reference;
            const photoUrl = getPhotoUrl(photoRef, 800);

            try {
                const buffer = await downloadBuffer(photoUrl);
                const fileName = `${cafe.slug}_${i + 1}.jpg`;
                const fullPath = path.join(PUBLIC_DIR, fileName);
                
                fs.writeFileSync(fullPath, buffer);
                
                const publicUrl = `${BASE_URL_PATH}/${fileName}`;
                localPaths.push(publicUrl);
                console.log(`    ✅ [${i + 1}/${targetPhotos.length}] 저장 완료: ${fileName}`);

            } catch (err) {
                console.error(`    ❌ 다운로드 실패:`, err.message);
            }
        }

        // DB 업데이트 (anon key로 update 권한이 있어야 함 - 카페 테이블은 일반적으로 가능하도록 설정되어 있음)
        if (localPaths.length > 0) {
            const { error: updateErr } = await supabase
                .from('cafes')
                .update({ image_urls: localPaths })
                .eq('name', cafe.dbName);

            if (updateErr) {
                console.error(`  ❌ DB 업데이트 실패:`, updateErr.message);
            } else {
                console.log(`  🎉 DB 업데이트 완료! (${localPaths.length}장 경로 등록)`);
            }
        }
    }

    console.log('\n🏁 전체 작업 완료!');
}

main().catch(console.error);
