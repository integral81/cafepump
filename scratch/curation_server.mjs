/**
 * 카공 명당 큐레이션 로컬 서버 (v1.0)
 * 
 * 역할:
 * 1. 클라이언트(브라우저)에서 요청한 구글 이미지를 로컬 public/cafe_photos 폴더에 저장
 * 2. Supabase DB 업데이트 (카페 이미지 목록 및 좌석 이미지)
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { createClient } from '@supabase/supabase-js';

const PORT = 5189;
const PUBLIC_DIR = path.resolve('public/cafe_photos');
const BASE_URL_PATH = '/cafepump/cafe_photos';

const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 폴더 생성
if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

const server = http.createServer(async (req, res) => {
    // CORS 헤더 설정 (Vite dev server에서 접근 가능하게)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url === '/api/save-photo') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { googleUrl, slug, index } = JSON.parse(body);
                const fileName = `${slug}_curated_${index}_${Date.now()}.jpg`;
                const filePath = path.join(PUBLIC_DIR, fileName);

                let buffer;
                if (googleUrl.startsWith('data:')) {
                    // Base64 데이터 처리
                    const base64Data = googleUrl.split(';base64,').pop();
                    buffer = Buffer.from(base64Data, 'base64');
                } else {
                    // 일반 URL 다운로드
                    buffer = await downloadImage(googleUrl);
                }
                
                fs.writeFileSync(filePath, buffer);

                const publicUrl = `${BASE_URL_PATH}/${fileName}`;
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, url: publicUrl }));
            } catch (error) {
                console.error('Save error:', error);
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } 
    else if (req.method === 'POST' && req.url === '/api/search-place') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { query } = JSON.parse(body);
                const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ko&key=${GOOGLE_API_KEY}`;
                const gRes = await fetch(url);
                const data = await gRes.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
    else if (req.method === 'POST' && req.url === '/api/get-photos') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { placeId } = JSON.parse(body);
                const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&language=ko&key=${GOOGLE_API_KEY}`;
                const gRes = await fetch(url);
                const data = await gRes.json();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(data));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }    else if (req.method === 'POST' && req.url === '/api/delete-photo') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { url } = JSON.parse(body);
                const fileName = path.basename(url);
                const filePath = path.join(PUBLIC_DIR, fileName);

                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`🗑️ File Deleted: ${fileName}`);
                }
                
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
    else if (req.method === 'POST' && req.url === '/api/delete-photos') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { urls } = JSON.parse(body);
                urls.forEach(url => {
                    const fileName = path.basename(url);
                    const filePath = path.join(PUBLIC_DIR, fileName);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                });
                console.log(`🗑️ Batch Deleted ${urls.length} files`);
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
    else if (req.method === 'POST' && req.url === '/api/update-cafe-photos') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { cafeId, imageUrls } = JSON.parse(body);
                const { error } = await supabase
                    .from('cafes')
                    .update({ image_urls: imageUrls })
                    .eq('id', cafeId);
                
                if (error) throw error;
                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                res.writeHead(500);
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    }
    else {
        res.writeHead(404);
        res.end();
    }
});

function downloadImage(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImage(res.headers.location).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`Failed to download: ${res.statusCode}`));
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
    });
}

server.listen(PORT, () => {
    console.log(`🚀 Curation Server running at http://localhost:${PORT}`);
    console.log(`📁 Saving photos to: ${PUBLIC_DIR}`);
});
