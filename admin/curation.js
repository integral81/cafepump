import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const GOOGLE_API_KEY = 'AIzaSyATHTCLIMTTCRWB_6FNyL7ATGz-Ql_xnNY';

// 로컬 서버 대신 Supabase 직접 연동
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let cafes = [];
let selectedCafe = null;
let currentPhotos = [];

// 요소 캐싱
const cafeListEl = document.getElementById('cafe-list');
const currentCafeNameEl = document.getElementById('current-cafe-name');
const searchQueryEl = document.getElementById('search-query');
const searchBtn = document.getElementById('search-btn');
const photoGridEl = document.getElementById('photo-grid');
const googleWebBtn = document.getElementById('google-web-btn');
const manualUrlEl = document.getElementById('manual-url');
const addManualBtn = document.getElementById('add-manual-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');

// 모바일 업로드 요소
const cameraBtn = document.getElementById('camera-btn');
const cameraInput = document.getElementById('camera-input');

// --- 1. 초기화 및 리스트 로드 ---
async function init() {
    const { data, error } = await supabase
        .from('cafes')
        .select('*')
        .order('name');
    
    if (error) {
        alert('카페 로드 실패: ' + error.message);
        return;
    }

    // 강남/서초/덕소 지역 카페만 관리자 목록에 노출 (사용자 요청)
    cafes = data.filter(cafe => 
        cafe.address?.includes('강남') || cafe.address?.includes('서초') || 
        cafe.address?.includes('역삼') || cafe.address?.includes('덕소') ||
        cafe.address?.includes('와부')
    );
    renderCafeList();
}

function renderCafeList() {
    if (!cafeListEl) return;
    cafeListEl.innerHTML = cafes.map(cafe => `
        <div class="cafe-item ${selectedCafe?.id === cafe.id ? 'active' : ''}" onclick="selectCafe('${cafe.id}')">
            ${cafe.name}
            <span class="status-badge ${cafe.image_urls?.length > 0 ? 'has-photos' : ''}">
                ${cafe.image_urls?.length || 0}
            </span>
        </div>
    `).join('');
}

window.selectCafe = (id) => {
    selectedCafe = cafes.find(c => c.id === id);
    currentCafeNameEl.textContent = selectedCafe.name;
    searchQueryEl.value = `${selectedCafe.name} ${selectedCafe.address || ''}`.trim();
    deleteAllBtn.style.display = selectedCafe.image_urls?.length > 0 ? 'inline-block' : 'none';
    renderCafeList();
    loadCurrentPhotos();
};

function loadCurrentPhotos() {
    if (!selectedCafe) return;
    deleteAllBtn.style.display = selectedCafe.image_urls?.length > 0 ? 'inline-block' : 'none';
    
    photoGridEl.innerHTML = (selectedCafe.image_urls || []).map((url, i) => `
        <div class="photo-card" style="position: relative;">
            <img src="${url}">
            <div class="badge">현재 등록됨</div>
            <button class="delete-btn" onclick="removePhoto(${i})" 
                style="position: absolute; top: 5px; left: 5px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-weight: bold; z-index: 10;">
                ✕
            </button>
        </div>
    `).join('');
}

// --- 2. 사진 관리 (추가/삭제) - Supabase Storage 직접 연동 ---

// 모바일 업로드 이벤트
cameraBtn.onclick = () => cameraInput.click();

cameraInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedCafe) return;

    cameraBtn.disabled = true;
    cameraBtn.textContent = '업로드 중...';

    const fileName = `cafe_${selectedCafe.id.substring(0,8)}_${Date.now()}.jpg`;
    const filePath = `photos/${fileName}`;

    try {
        // 1) Storage 업로드
        const { data, error: uploadError } = await supabase.storage
            .from('cafe-photos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // 2) 공용 URL 획득
        const { data: { publicUrl } } = supabase.storage
            .from('cafe-photos')
            .getPublicUrl(filePath);

        // 3) DB 업데이트
        const newUrls = [...(selectedCafe.image_urls || []), publicUrl];
        await updateCafeImages(selectedCafe.id, newUrls);

        alert('사진이 업로드되었습니다!');
        selectedCafe.image_urls = newUrls;
        loadCurrentPhotos();
        renderCafeList();
    } catch (err) {
        alert('업로드 실패: ' + err.message);
    } finally {
        cameraBtn.disabled = false;
        cameraBtn.textContent = '📸 휴대폰 사진 촬영/업로드';
        cameraInput.value = '';
    }
};

async function updateCafeImages(cafeId, imageUrls) {
    const { error } = await supabase
        .from('cafes')
        .update({ image_urls: imageUrls })
        .eq('id', cafeId);
    if (error) throw error;
}

window.removePhoto = async (index) => {
    if (!confirm('이 사진을 삭제하시겠습니까?')) return;

    const targetUrl = selectedCafe.image_urls[index];
    const newUrls = selectedCafe.image_urls.filter((_, i) => i !== index);

    try {
        // 1) DB 업데이트
        await updateCafeImages(selectedCafe.id, newUrls);

        // 2) 클라우드 파일 삭제 (URL에서 파일 경로 추출 필요)
        if (targetUrl.includes('cafe-photos')) {
            const filePath = targetUrl.split('cafe-photos/').pop();
            await supabase.storage.from('cafe-photos').remove([filePath]);
        }

        alert('사진이 삭제되었습니다.');
        selectedCafe.image_urls = newUrls;
        loadCurrentPhotos();
        renderCafeList();
    } catch (err) {
        alert('삭제 실패: ' + err.message);
    }
};

deleteAllBtn.onclick = async () => {
    if (!selectedCafe || !selectedCafe.image_urls?.length) return;
    if (!confirm('경고: 모든 사진을 삭제하시겠습니까?')) return;

    const urlsToDelete = [...selectedCafe.image_urls];

    try {
        await updateCafeImages(selectedCafe.id, []);

        for (const url of urlsToDelete) {
            if (url.includes('cafe-photos')) {
                const filePath = url.split('cafe-photos/').pop();
                await supabase.storage.from('cafe-photos').remove([filePath]);
            }
        }

        alert('모든 사진이 삭제되었습니다.');
        selectedCafe.image_urls = [];
        loadCurrentPhotos();
        renderCafeList();
    } catch (err) {
        alert('삭제 실패: ' + err.message);
    }
};

// --- 3. 구글 검색 및 수동 입력 (배포 환경 지원) ---

searchBtn.onclick = async () => {
    // 배포 환경에서 구글 사진 직접 저장은 CORS 제약이 있을 수 있으므로 알림 추가
    alert('배포 환경에서는 구글 사진을 직접 서버에 저장할 수 없습니다.\n휴대폰으로 직접 촬영하거나 사진기 아이콘을 이용해 업로드해주세요!');
};

googleWebBtn.onclick = () => {
    if (!selectedCafe) return;
    const webQuery = `${selectedCafe.name} ${selectedCafe.address || ''}`.trim();
    window.open(`https://www.google.com/search?q=${encodeURIComponent(webQuery)}&tbm=isch`, '_blank');
};

addManualBtn.onclick = async () => {
    const url = manualUrlEl.value.trim();
    if (!url || !selectedCafe) return;
    
    // URL 직접 등록 (이미 온라인 상에 있는 주소 그대로 사용)
    const newUrls = [...(selectedCafe.image_urls || []), url];
    try {
        await updateCafeImages(selectedCafe.id, newUrls);
        alert('URL 등록 완료!');
        selectedCafe.image_urls = newUrls;
        loadCurrentPhotos();
        renderCafeList();
        manualUrlEl.value = '';
    } catch (err) {
        alert('등록 실패: ' + err.message);
    }
};

init();
