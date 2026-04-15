import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';

let supabase = null;
if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// --- APP STATE ---
const state = {
    userMbti: localStorage.getItem('user_mbti') || '',
    cafes: [],
    map: null,
    selectedCafe: null,
    markers: [],
    overlays: [],
    pumps: [], // [추가] 자전거 공기주입기 데이터
    pumpMarkers: [], // [추가] 자전거 마커 객체
    showPumps: false, // [추가] 표시 여부 상태
    chargers: [], // [추가] 전기 충전소 데이터
    chargerMarkers: [], // [추가] 충전소 마커 객체
    showChargers: false, // [추가] 충전소 표시 상태
    userLat: null, // [추가] 내 위치 정보 저장을 위한 상태
    userLng: null,
    killingComments: {
        'ISTJ': '오차 없는 집중력을 위해, 주변 소음이 완벽하게 차단된 자리입니다.',
        'ISFJ': '눈치 제로! 당신의 온전한 휴식을 위해 가장 구석진 명당을 잡았어요.',
        'INFJ': '복잡한 생각은 잠시 접어두고, 영감을 깨우는 아늑한 창가로 가보세요.',
        'INTJ': '치밀한 계획을 세우기에 완벽한 사각지대, 바로 여기입니다.',
        'ISTP': '불필요한 대화는 끝, 오직 당신과 노트북만 존재하는 무풍지대예요.',
        'ISFP': '포근한 감성과 편안한 좌석, 예술적 영감이 샘솟는 공간입니다.',
        'INFP': '당신만의 세상에 빠져들 수 있는, 비밀 기지 같은 아늑한 코너석입니다.',
        'INTP': '지적 호기심을 방해받지 않을, 누구의 시선도 닿지 않는 최고의 집중석.',
        'ESTP': '지루함은 사절! 활기찬 에너지 속에서 최고의 효율을 경험하세요.',
        'ESFP': '함께하는 즐거움과 트인 시야, 오늘 당신의 에너지를 채워줄 명당입니다.',
        'ENFP': '갑갑한 벽은 잊으세요. 탁 트인 뷰가 당신의 창의력을 깨울 거예요!',
        'ENTP': '새로운 아이디어가 번뜩일 활기찬 분위기, 당신의 주무대가 되어줄 겁니다.',
        'ESTJ': '시간 낭비 없는 완벽한 동선과 콘센트, 성공을 위한 최적의 전초기지.',
        'ESFJ': '따뜻한 배려가 느껴지는 공간에서 기분 좋게 작업을 시작해 보세요.',
        'ENFJ': '모두를 이끄는 당신의 리더십, 넓고 쾌적한 테이블이 기다리고 있습니다.',
        'ENTJ': '압도적인 성과를 위해, 열정 가득한 백색소음이 있는 중심석을 추천해요.'
    },
    // [추가] 제보 시스템 상태
    isPickingLocation: false,
    tempMarker: null,
    userReports: [],
    reportForm: {
        category: '',
        lat: null,
        lng: null,
        address: '',
        file: null
    }
};

// --- ELEMENTS ---
const screens = {
    onboarding: document.getElementById('onboarding'),
    map: document.getElementById('map-screen')
};

const btnStart = document.getElementById('btn-start');
const btnReMbti = document.getElementById('btn-re-mbti');
const detailSheet = document.getElementById('cafe-detail-sheet');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    // 4글자 정식 MBTI가 아니거나 정보가 없으면 선택 화면으로 강제 이동
    if (state.userMbti && state.userMbti.length === 4) {
        showScreen('map');
        initMap();
        updateMbtiBadge();
    } else {
        localStorage.removeItem('user_mbti'); // 잘못된 정보 삭제
        state.userMbti = '';
        renderMbtiGrid();
        showScreen('onboarding');
    }

    setupEventListeners();
}

function renderMbtiGrid() {
    const grid = document.querySelector('.mbti-grid-full');
    const types = [
        'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
        'ISTP', 'ISFP', 'INFP', 'INTP',
        'ESTP', 'ESFP', 'ENFP', 'ENTP',
        'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ'
    ];
    
    grid.innerHTML = types.map(type => `
        <button class="mbti-pill ${state.userMbti === type ? 'active' : ''}" data-mbti="${type}">
            ${type}
        </button>
    `).join('');

    // Re-bind click events
    document.querySelectorAll('.mbti-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.mbti-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            state.userMbti = pill.dataset.mbti;
            btnStart.disabled = false;
        });
    });
}

function setupEventListeners() {
    // Start Button
    btnStart.addEventListener('click', () => {
        localStorage.setItem('user_mbti', state.userMbti);
        showScreen('map');
        initMap();
        updateMbtiBadge();
        fetchCafes(); // Re-fetch for new MBTI score
    });

    // Re-select MBTI (Header Badge)
    btnReMbti.addEventListener('click', () => {
        renderMbtiGrid();
        showScreen('onboarding');
    });

    // Sheet Gestures
    setupSheetGestures();

    // My Location FAB
    document.getElementById('btn-my-location').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                state.userLat = position.coords.latitude;
                state.userLng = position.coords.longitude;
                const moveLatLon = new kakao.maps.LatLng(state.userLat, state.userLng);
                state.map.panTo(moveLatLon);
            });
        }
    });

    // 제보 메인 버튼 (Submenu 토글)
    const btnReportMain = document.getElementById('btn-report-main');
    const fabSubmenu = document.getElementById('fab-submenu');
    btnReportMain.addEventListener('click', (e) => {
        e.stopPropagation();
        fabSubmenu.classList.toggle('hidden');
        btnReportMain.querySelector('i').classList.toggle('fa-plus');
        btnReportMain.querySelector('i').classList.toggle('fa-xmark');
    });

    // 서브메뉴 아이템 클릭 (제보 시작)
    document.querySelectorAll('.submenu-item').forEach(item => {
        item.addEventListener('click', () => {
            const type = item.dataset.type;
            state.reportForm.category = type;
            fabSubmenu.classList.add('hidden');
            btnReportMain.querySelector('i').classList.add('fa-plus');
            btnReportMain.querySelector('i').classList.remove('fa-xmark');
            
            // 모달 초기화 및 노출
            resetReportForm();
            document.getElementById('report-modal').classList.remove('hidden');
        });
    });

    // 제보 모달 닫기
    document.getElementById('btn-close-report').addEventListener('click', () => {
        document.getElementById('report-modal').classList.add('hidden');
    });

    // 지도에서 위치 선택 버튼
    document.getElementById('btn-open-picker').addEventListener('click', () => {
        document.getElementById('report-modal').classList.add('hidden');
        startPickerMode();
    });

    // 위치 확정 버튼
    document.getElementById('btn-picker-done').addEventListener('click', () => {
        stopPickerMode(true);
    });

    // 파일 선택 및 미리보기
    const fileInput = document.getElementById('report-file');
    const dropZone = document.getElementById('drop-zone');
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFileSelect(file);
    });

    // 제보 최종 제출
    document.getElementById('btn-submit-report').addEventListener('click', submitReport);

    // Bottom Nav Tab Switching
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // For now, most tabs are placeholders
            const tabName = item.querySelector('span').textContent;
            if (tabName !== '지도') {
                alert(`${tabName} 기능은 현재 준비 중입니다.`);
            }
        });
    });

    // [추가] 자전거 공기주입기 토글 이벤트
    const btnTogglePumps = document.getElementById('toggle-pumps');
    btnTogglePumps.addEventListener('click', () => {
        state.showPumps = !state.showPumps;
        btnTogglePumps.classList.toggle('active', state.showPumps);
        
        if (state.showPumps) {
            if (state.pumps.length === 0) {
                fetchPumps();
            } else {
                renderPumpMarkers();
            }
        } else {
            // 마커 숨기기
            state.pumpMarkers.forEach(m => m.setMap(null));
        }
    });

    // [추가] 전기 충전소 토글 이벤트
    const btnToggleChargers = document.getElementById('toggle-chargers');
    btnToggleChargers.addEventListener('click', () => {
        state.showChargers = !state.showChargers;
        btnToggleChargers.classList.toggle('active', state.showChargers);
        
        if (state.showChargers) {
            if (state.chargers.length === 0) {
                fetchChargers();
            } else {
                renderChargerMarkers();
            }
        } else {
            state.chargerMarkers.forEach(m => m.setMap(null));
        }
    });
}

// --- UI LOGIC ---
function showScreen(screenId) {
    Object.keys(screens).forEach(id => {
        screens[id].classList.add('hidden');
    });
    screens[screenId].classList.remove('hidden');
}

function updateMbtiBadge() {
    const badge = document.getElementById('header-mbti-badge');
    const button = document.getElementById('btn-re-mbti');
    if (badge) badge.textContent = state.userMbti;
    if (button) button.textContent = '재선택'; // 버튼 글자가 MBTI로 바뀌는 버그 방지
}

// --- MAP LOGIC ---
function initMap() {
    if (state.map) return; // Prevent double init

    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(37.5593, 126.9360), // Shinchon area default
        level: 3
    };

    state.map = new kakao.maps.Map(container, options);

    // [추가] 지도 렌더링 보정 (화면 전환 시 흰 배경 방지)
    setTimeout(() => {
        state.map.relayout();
    }, 300);

    // [추가] 지도 빈 공간 클릭 시 바텀 시트 닫기 및 Picker 위치 지정
    kakao.maps.event.addListener(state.map, 'click', (e) => {
        if (state.isPickingLocation) {
            updatePickerLocation(e.latLng);
            return;
        }

        const detailSheet = document.getElementById('cafe-detail-sheet');
        if (detailSheet.classList.contains('active')) {
            detailSheet.classList.remove('active');
            detailSheet.classList.add('hidden'); // 다시 숨김 처리 (투명도 등)
            detailSheet.style.transform = '';
        }
        
        // FAB 서브메뉴가 열려있다면 닫기
        document.getElementById('fab-submenu').classList.add('hidden');
        const btnPlus = document.getElementById('btn-report-main').querySelector('i');
        btnPlus.classList.add('fa-plus');
        btnPlus.classList.remove('fa-xmark');
    });

    // Get current location if possible
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const locPosition = new kakao.maps.LatLng(lat, lng);
            state.map.setCenter(locPosition);
        });
    }

    fetchCafes();
}

// --- UTILS ---
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; 
    return d * 1000; // 미터 단위로 반환
}

async function fetchCafes() {
    if (!supabase) return;

    // 1. 성향별 선호도 정보 가져오기 (mbti_preferences)
    const { data: preferences } = await supabase.from('mbti_preferences').select('*');
    state.mbtiPreferences = preferences;

    // 2. 카페 및 좌석 정보 가져오기
    const { data: cafes, error } = await supabase
        .from('cafes')
        .select(`
            *,
            seats (
                seat_type,
                has_outlet,
                privacy_score
            )
        `);

    if (error) {
        console.error('Error fetching cafes:', error);
        return;
    }

    state.cafes = cafes.map(cafe => {
        const matchScore = calculateMatchScore(cafe, state.userMbti);
        return { ...cafe, match: matchScore };
    });

    renderMarkers();

    // [추가] GPS 기반 초기 설정 - 고정밀 모드 활성화
    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            state.userLat = position.coords.latitude;
            state.userLng = position.coords.longitude;
            const userLat = state.userLat;
            const userLon = state.userLng;
            
            // 각 카페와의 거리 계산
            state.cafes.forEach(cafe => {
                cafe.distance = calculateDistance(userLat, userLon, cafe.lat, cafe.lng);
            });
            
            // 거리순으로 정렬하여 가장 가까운 카페 찾기
            const sortedByDist = [...state.cafes].sort((a, b) => a.distance - b.distance);
            const closestCafe = sortedByDist[0];
            
            if (closestCafe) {
                const moveLatLon = new kakao.maps.LatLng(closestCafe.lat, closestCafe.lng);
                state.map.panTo(moveLatLon);
                showCafeInfo(closestCafe);
            }
        }, (error) => {
            console.warn('GPS 수신 실패:', error.message);
            // GPS 실패 시: 매칭 점수가 가장 높은 곳으로 이동
            const bestMatch = [...state.cafes].sort((a, b) => b.match - a.match)[0];
            if (bestMatch) {
                const moveLatLon = new kakao.maps.LatLng(bestMatch.lat, bestMatch.lng);
                state.map.setCenter(moveLatLon);
                showCafeInfo(bestMatch);
            }
        }, geoOptions);
    }
}

function calculateMatchScore(cafe, userMbti) {
    if (!userMbti || !state.mbtiPreferences) return 70;

    // 사용자의 MBTI 선호도 찾기
    const userPref = state.mbtiPreferences.find(p => p.mbti_type === userMbti);
    if (!userPref) return 65;

    let score = 50;

    // 1. 좌석 타입 매칭 (사용자가 선호하는 좌석이 있는가?)
    const hasPreferredSeat = cafe.seats.some(s => s.seat_type === userPref.pref_seat_type);
    if (hasPreferredSeat) score += 30;

    // 2. 프라이버시(Privacy) 점수 비교
    const avgPrivacy = cafe.seats.reduce((acc, s) => acc + (s.privacy_score || 0), 0) / (cafe.seats.length || 1);
    if (avgPrivacy >= userPref.min_privacy) score += 15;

    // 3. 소음도 가중치 (noise_level: 1=도서관형, 5=시장통)
    if (cafe.noise_level <= 2) score += 5;

    return Math.min(score, 100);
}

function renderMarkers() {
    if (!state.map) return;

    // 기존 마커 및 오버레이 제거
    state.markers.forEach(m => m.setMap(null));
    state.overlays.forEach(o => o.setMap(null));
    state.markers = [];
    state.overlays = [];

    state.cafes.forEach(cafe => {
        if (!cafe.lat || !cafe.lng) return;

        const markerPosition = new kakao.maps.LatLng(cafe.lat, cafe.lng);
        const matchColor = cafe.match >= 85 ? '#6366f1' : '#94a3b8';
        
        // 커스텀 오버레이 배경 이미지 구성
        const content = document.createElement('div');
        content.className = 'custom-marker';
        content.style.cssText = `
            background: ${matchColor}; 
            border: 3px solid white; 
            border-radius: 50%; 
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 800; font-size: 11px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            cursor: pointer;
            z-index: 100;
        `;
        content.innerHTML = `${cafe.match}%`;

        // 오버레이 클릭 이벤트 직접 할당
        content.addEventListener('click', (e) => {
            if (e.stopPropagation) e.stopPropagation();
            if (e.preventDefault) e.preventDefault();
            showCafeInfo(cafe);
        });

        const customOverlay = new kakao.maps.CustomOverlay({
            position: markerPosition,
            content: content,
            yAnchor: 1.2
        });

        const marker = new kakao.maps.Marker({
            position: markerPosition,
            opacity: 0
        });

        marker.setMap(state.map);
        customOverlay.setMap(state.map);

        kakao.maps.event.addListener(marker, 'click', (e) => {
            showCafeInfo(cafe);
        });

        state.markers.push(marker);
        state.overlays.push(customOverlay);
    });
}

function showCafeInfo(cafe) {
    state.selectedCafe = cafe;
    
    document.getElementById('sheet-cafe-name').textContent = cafe.name;
    document.getElementById('sheet-cafe-addr').textContent = cafe.address || '주소 정보 없음';
    
    // 거리 표시 업데이트
    const distText = cafe.distance 
        ? (cafe.distance > 1000 ? `${(cafe.distance/1000).toFixed(1)}km` : `${Math.round(cafe.distance)}m`)
        : '--m';
    document.getElementById('sheet-cafe-dist').textContent = `내 위치에서 ${distText}`;
    
    document.querySelector('.category').textContent = cafe.location || '카페'; // location 정보를 카테고리 자리에 표시
    
    const safetyBar = document.querySelector('.bar.safety');
    const batteryBar = document.querySelector('.bar.battery');
    
    // 정숙도 게이지 (noise_level: 1=도서관형(100%) ~ 5=시장통(20%))
    const safetyPercent = Math.max(20, 100 - (cafe.noise_level - 1) * 20);
    
    // 와이파이 정보 업데이트
    document.getElementById('sheet-wifi-ssid').textContent = cafe.wifi_ssid || '와이파이 정보 준비 중';
    
    // 보안을 위해 실제 비밀번호 대신 안내 문구 출력
    const wifiHint = cafe.wifi_pw && cafe.wifi_pw.includes('기재') ? cafe.wifi_pw : '영수증 하단 기재';
    document.getElementById('sheet-wifi-pw').textContent = wifiHint;

    // 콘센트 유무 확인 (첫 번째 좌석 기준)
    const hasOutlet = cafe.seats && cafe.seats[0] ? cafe.seats[0].has_outlet : false;
    const batteryPercent = hasOutlet ? 100 : 20;

    safetyBar.style.width = `${safetyPercent}%`;
    batteryBar.style.width = `${batteryPercent}%`;
    document.querySelector('.meter-item:first-child label').textContent = '정숙도';
    document.querySelector('.meter-item:last-child label').textContent = '콘센트';
    
    document.querySelector('.match-score').textContent = `${cafe.match}%`;
    document.getElementById('sheet-mbti-type').textContent = state.userMbti;

    // 킬링 멘트 업데이트 (DB 카페별 멘트 우선, 없으면 MBTI 기반 폴백)
    const killingComment = cafe.killing_comment || state.killingComments[state.userMbti] || '당신의 성향에 딱 맞는 명당입니다.';
    document.getElementById('killing-comment').textContent = killingComment;

    // 이미지 갤러리 업데이트
    const gallery = document.getElementById('cafe-gallery');
    gallery.innerHTML = ''; // 기존 이미지 삭제
    
    if (cafe.image_urls && cafe.image_urls.length > 0) {
        cafe.image_urls.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            img.alt = cafe.name;
            // [Fix] 깨진 이미지(엑박) 발생 시 부드럽게 숨김 처리
            img.onerror = () => { img.style.display = 'none'; };
            gallery.appendChild(img);
        });
    } else {
        // 실제 사진이 없을 경우 보여줄 고퀄리티 무드 이미지 (임시)
        const placeholders = [
            'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=300&q=80',
            'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=300&q=80',
            'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80'
        ];
        placeholders.forEach(url => {
            const img = document.createElement('img');
            img.src = url;
            gallery.appendChild(img);
        });
    }
    
    // 상세 좌석 정보 (Seats가 비어있을 경우 예외 처리)
    const bestSeat = cafe.seats && cafe.seats.length > 0 ? cafe.seats[0] : null;
    if (bestSeat) {
        document.querySelector('.seat-info strong').textContent = bestSeat.seat_type;
        document.querySelector('.seat-info p').textContent = `프라이버시 지수: ${bestSeat.privacy_score}/5`;
    } else {
        document.querySelector('.seat-info strong').textContent = '상세 정보 준비 중';
        document.querySelector('.seat-info p').textContent = '이 카페는 아직 세부 좌석 데이터가 없습니다.';
    }

    detailSheet.classList.remove('hidden'); // 투명도 및 클릭 방지 해제
    detailSheet.classList.add('active');
    detailSheet.style.transform = ''; // 이전 드래그 상태 초기화
}

// --- GESTURE LOGIC ---
function setupSheetGestures() {
    const sheet = document.getElementById('cafe-detail-sheet');
    const handle = sheet.querySelector('.handle');
    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const onStart = (e) => {
        startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        isDragging = true;
        sheet.classList.add('dragging');
    };

    const onMove = (e) => {
        if (!isDragging) return;
        currentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const deltaY = currentY - startY;
        
        if (deltaY > 0) { // 아래로만 드래그 허용
            sheet.style.transform = `translateY(${deltaY}px)`;
        }
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        sheet.classList.remove('dragging');
        
        const deltaY = currentY - startY;
        if (deltaY > 150) { // 150px 이상 내리면 닫기
            sheet.classList.remove('active');
            sheet.classList.add('hidden'); // 숨김 처리 추가
            sheet.style.transform = '';
        } else {
            sheet.style.transform = ''; // 다시 올라옴
        }
        startY = 0;
        currentY = 0;
    };

    handle.addEventListener('touchstart', onStart);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    
    // 마우스 지원 (PC 테스트용)
    handle.addEventListener('mousedown', onStart);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
}

// --- BICYCLE PUMP LOGIC ---
async function fetchPumps() {
    if (!supabase) return;

    try {
        showToast('자전기 정보를 불러오는 중...');
        let allPumps = [];
        let from = 0;
        let step = 1000;

        while (true) {
            const { data, error } = await supabase
                .from('bicycle_pumps')
                .select('*')
                .range(from, from + step - 1);
            
            if (error) throw error;
            if (!data || data.length === 0) break;
            allPumps = allPumps.concat(data);
            if (data.length < step) break;
            from += step;
        }

        const { data: userReports } = await supabase
            .from('user_reports')
            .select('*')
            .eq('category', 'bicycle_pump');

        const combinedPumps = [
            ...allPumps.map(p => ({ ...p, isUserReport: false })),
            ...(userReports || []).map(p => ({ ...p, isUserReport: true, city: '사용자 제보' }))
        ];

        state.pumps = combinedPumps;
        renderPumpMarkers();
    } catch (error) {
        console.error('Error fetching pumps:', error);
        showToast('데이터를 불러오지 못했습니다.');
    }
}

function renderPumpMarkers() {
    if (!state.map || !state.showPumps) return;

    // 기존 펌프 마커 제거
    state.pumpMarkers.forEach(m => m.setMap(null));
    state.pumpMarkers = [];

    state.pumps.forEach(pump => {
        const position = new kakao.maps.LatLng(pump.lat, pump.lng);
        
        const content = document.createElement('div');
        content.className = 'pump-marker';
        content.innerHTML = '<i class="fa-solid fa-bicycle"></i>';
        
        // 사용자 제보인 경우 표시 추가
        if (pump.isUserReport) {
            const badge = document.createElement('div');
            badge.className = 'user-contribution-badge';
            content.appendChild(badge);
        }

        content.addEventListener('click', (e) => {
            if (e.stopPropagation) e.stopPropagation();
            showPumpInfo(pump);
        });

        const overlay = new kakao.maps.CustomOverlay({
            position: position,
            content: content,
            yAnchor: 1.2
        });

        overlay.setMap(state.map);
        state.pumpMarkers.push(overlay);
    });
}

function showPumpInfo(pump) {
    // 기존 카페 상세 시트 재활용
    const sheet = document.getElementById('cafe-detail-sheet');
    
    document.getElementById('sheet-cafe-name').textContent = pump.name;
    document.getElementById('sheet-cafe-addr').textContent = pump.address || '주소 정보 없음';
    document.getElementById('sheet-cafe-dist').textContent = pump.isUserReport ? `제보자: ${pump.nickname}님` : `${pump.city} 공공데이터 제공`;
    document.querySelector('.category').textContent = '자전거 공기주입기';
    
    // UI 요소 숨기기/조정 (카페 전용 정보)
    document.querySelector('.mbti-match').style.display = 'none';
    document.getElementById('killing-comment-container').style.display = 'none';
    
    // 사진이 있는 경우 갤러리 활성화
    const galleryContainer = document.querySelector('.gallery-container');
    const gallery = document.getElementById('cafe-gallery');
    if (pump.image_url) {
        galleryContainer.style.display = 'block';
        gallery.innerHTML = `<img src="${pump.image_url}" alt="${pump.name}" onerror="this.style.display='none'">`;
    } else {
        galleryContainer.style.display = 'none';
    }

    document.querySelector('.wifi-info-section').style.display = 'none';
    document.querySelector('.safety-meters').style.display = 'none';
    document.querySelector('.seat-recommendation').style.display = 'none';

    sheet.classList.add('compact'); // [추가] 높이 축소 모드 적용
    sheet.classList.remove('hidden');
    sheet.classList.add('active');
    sheet.style.transform = '';

    // [추가] 카카오맵 길찾기 버튼 업데이트 (내 위치 정보 반영)
    const btnNav = document.getElementById('btn-kakao-nav');
    if (btnNav) {
        btnNav.onclick = () => {
            const url = `https://map.kakao.com/link/to/${encodeURIComponent(pump.name)},${pump.lat},${pump.lng}`;
            window.open(url, '_blank');
        };
    }
}

// [수정] showCafeInfo에서 다시 요소를 보이게 설정해야 함
const originalShowCafeInfo = showCafeInfo;
showCafeInfo = function(cafe) {
    const sheet = document.getElementById('cafe-detail-sheet');
    sheet.classList.remove('compact'); // [추가] 일반 높이로 복구
    
    document.querySelector('.mbti-match').style.display = 'block';
    document.getElementById('killing-comment-container').style.display = 'flex';
    document.querySelector('.gallery-container').style.display = 'block';
    document.querySelector('.wifi-info-section').style.display = 'flex';
    document.querySelector('.safety-meters').style.display = 'grid';
    document.querySelector('.seat-recommendation').style.display = 'block';
    
    // [추가] 카카오맵 길찾기 버튼 업데이트
    const btnNav = document.getElementById('btn-kakao-nav');
    if (btnNav) {
        btnNav.onclick = () => {
            const url = `https://map.kakao.com/link/to/${encodeURIComponent(cafe.name)},${cafe.lat},${cafe.lng}`;
            window.open(url, '_blank');
        };
    }

    originalShowCafeInfo(cafe);
};

// --- ELECTRIC CHARGER LOGIC ---
async function fetchChargers() {
    if (!supabase) return;

    try {
        let allChargers = [];
        let from = 0;
        let step = 1000;

        while (true) {
            const { data, error } = await supabase
                .from('electric_chargers')
                .select('*')
                .range(from, from + step - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;
            allChargers = allChargers.concat(data);
            if (data.length < step) break;
            from += step;
        }

        const { data: userReports } = await supabase
            .from('user_reports')
            .select('*')
            .eq('category', 'electric_charger');

        const combinedChargers = [
            ...allChargers.map(c => ({ ...c, isUserReport: false })),
            ...(userReports || []).map(c => ({ ...c, isUserReport: true, description: '사용자 제보' }))
        ];

        state.chargers = combinedChargers;
        renderChargerMarkers();
    } catch (error) {
        console.error('Error fetching chargers:', error);
    }
}

function renderChargerMarkers() {
    if (!state.map || !state.showChargers) return;

    state.chargerMarkers.forEach(m => m.setMap(null));
    state.chargerMarkers = [];

    state.chargers.forEach(charger => {
        const position = new kakao.maps.LatLng(charger.lat, charger.lng);
        
        const content = document.createElement('div');
        content.className = 'charger-marker';
        content.innerHTML = '<i class="fa-solid fa-bolt"></i>';
        
        content.addEventListener('click', (e) => {
            if (e.stopPropagation) e.stopPropagation();
            showChargerInfo(charger);
        });

        const overlay = new kakao.maps.CustomOverlay({
            position: position,
            content: content,
            yAnchor: 1.2
        });

        overlay.setMap(state.map);
        state.chargerMarkers.push(overlay);
    });
}

function showChargerInfo(charger) {
    const sheet = document.getElementById('cafe-detail-sheet');
    
    document.getElementById('sheet-cafe-name').textContent = charger.name;
    document.getElementById('sheet-cafe-addr').textContent = charger.address || '주소 정보 없음';
    document.getElementById('sheet-cafe-dist').textContent = charger.isUserReport ? `제보자: ${charger.nickname}님` : (charger.description || '전동보장구 충전소');
    document.querySelector('.category').textContent = '전기자전거 급속충전';
    
    document.querySelector('.mbti-match').style.display = 'none';
    document.getElementById('killing-comment-container').style.display = 'none';
    
    const galleryContainer = document.querySelector('.gallery-container');
    const gallery = document.getElementById('cafe-gallery');
    if (charger.image_url) {
        galleryContainer.style.display = 'block';
        gallery.innerHTML = `<img src="${charger.image_url}" alt="${charger.name}" onerror="this.style.display='none'">`;
    } else {
        galleryContainer.style.display = 'none';
    }

    document.querySelector('.wifi-info-section').style.display = 'none';
    document.querySelector('.safety-meters').style.display = 'none';
    document.querySelector('.seat-recommendation').style.display = 'none';

    sheet.classList.add('compact');
    sheet.classList.remove('hidden');
    sheet.classList.add('active');
    sheet.style.transform = '';

    // [추가] 카카오맵 길찾기 버튼 업데이트 (내 위치 정보 반영)
    const btnNav = document.getElementById('btn-kakao-nav');
    if (btnNav) {
        btnNav.onclick = () => {
            const url = `https://map.kakao.com/link/to/${encodeURIComponent(charger.name)},${charger.lat},${charger.lng}`;
            window.open(url, '_blank');
        };
    }
}

// --- CONTRIBUTION LOGIC ---

function resetReportForm() {
    state.reportForm = { category: state.reportForm.category, lat: null, lng: null, address: '', file: null };
    document.getElementById('report-nickname').value = '';
    document.getElementById('report-name').value = '';
    document.getElementById('report-address').value = '';
    document.getElementById('report-file').value = '';
    document.getElementById('preview-container').innerHTML = '<i class="fa-solid fa-camera"></i><span>사진을 추가해주세요</span>';
}

function startPickerMode() {
    state.isPickingLocation = true;
    document.getElementById('picker-bar').classList.remove('hidden');
    showToast('지도를 클릭하여 위치를 선택해주세요');
}

function updatePickerLocation(latLng) {
    if (!state.tempMarker) {
        state.tempMarker = new kakao.maps.Marker({ position: latLng, map: state.map });
    } else {
        state.tempMarker.setPosition(latLng);
    }
    
    state.reportForm.lat = latLng.getLat();
    state.reportForm.lng = latLng.getLng();

    // 주소 변환
    const geocoder = new kakao.maps.services.Geocoder();
    geocoder.coord2Address(latLng.getLng(), latLng.getLat(), (result, status) => {
        if (status === kakao.maps.services.Status.OK) {
            state.reportForm.address = result[0].address.address_name;
            document.getElementById('picker-address').textContent = state.reportForm.address;
        }
    });
}

function stopPickerMode(confirmed) {
    state.isPickingLocation = false;
    document.getElementById('picker-bar').classList.add('hidden');
    if (state.tempMarker) {
        state.tempMarker.setMap(null);
        state.tempMarker = null;
    }

    if (confirmed) {
        document.getElementById('report-address').value = state.reportForm.address;
        document.getElementById('report-modal').classList.remove('hidden');
    }
}

function handleFileSelect(file) {
    state.reportForm.file = file;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-container').innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
    };
    reader.readAsDataURL(file);
}

async function submitReport() {
    const nickname = document.getElementById('report-nickname').value.trim();
    const name = document.getElementById('report-name').value.trim();
    
    if (!nickname || !name || !state.reportForm.lat) {
        alert('모든 정보를 입력해주세요.');
        return;
    }

    const btn = document.getElementById('btn-submit-report');
    btn.disabled = true;
    btn.textContent = '제보 중...';

    try {
        let imageUrl = '';
        if (state.reportForm.file) {
            const file = state.reportForm.file;
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const { data, error: uploadError } = await supabase.storage
                .from('utility_images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;
            
            // 공용 URL 획득
            const { data: { publicUrl } } = supabase.storage
                .from('utility_images')
                .getPublicUrl(fileName);
            imageUrl = publicUrl;
        }

        const { error: dbError } = await supabase.from('user_reports').insert([{
            category: state.reportForm.category,
            name: name,
            nickname: nickname,
            lat: state.reportForm.lat,
            lng: state.reportForm.lng,
            address: state.reportForm.address,
            image_url: imageUrl
        }]);

        if (dbError) throw dbError;

        showToast('제보가 완료되었습니다! 즉시 지도에 반영됩니다.');
        document.getElementById('report-modal').classList.add('hidden');
        
        // 데이터 갱신
        if (state.reportForm.category === 'bicycle_pump') fetchPumps();
        else if (state.reportForm.category === 'electric_charger') fetchChargers();
        // 카페 제보 기능이 확장된다면 fetchCafes() 추가 예정

    } catch (err) {
        console.error(err);
        alert('제보 중 오류가 발생했습니다.');
    } finally {
        btn.disabled = false;
        btn.textContent = '제보 완료하기';
    }
}

function showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
