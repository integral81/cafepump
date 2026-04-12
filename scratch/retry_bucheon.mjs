const KAKAO_KEY = 'f2ac53a34a1645a26f54d08c7996779f';
const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';

const failedNames = [
  "굴포천(바이크스테이션)", "송내역(바이크스테이션)", "부천북부역(바이크스테이션)",
  "부천시청역(바이크스테이션)", "상동역(상동바이크스테이션)", "춘의동87-6",
  "상동역2번,3번,6번출구", "중동1062-5", "작동 286-1", "상동385-52"
];

async function geocode(q) {
  let cleanQ = q.replace(/\(.*?\)/g, "").replace(/출구.*/g, "").trim();
  const queries = [ `부천 ${cleanQ}`, `부천 ${q}` ];
  const headers = { 
    'Authorization': `KakaoAK ${KAKAO_KEY}`, 
    'KA': 'sdk/1.0.0 os/javascript lang/ko device/pc origin/http://localhost:5188' 
  };

  for (const query of queries) {
    try {
      const res = await fetch(`https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`, { headers });
      const data = await res.json();
      if (data.documents && data.documents.length > 0) {
        return { lat: parseFloat(data.documents[0].y), lng: parseFloat(data.documents[0].x), addr: data.documents[0].address_name };
      }
    } catch(e) {}
    try {
      const resA = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(query)}&size=1`, { headers });
      const dataA = await resA.json();
      if (dataA.documents && dataA.documents.length > 0) {
        return { lat: parseFloat(dataA.documents[0].y), lng: parseFloat(dataA.documents[0].x), addr: dataA.documents[0].address_name };
      }
    } catch(e) {}
  }
  return null;
}

async function run() {
  const finalData = [];
  for (const name of failedNames) {
    const geo = await geocode(name);
    if (geo) {
      console.log(`RETRY OK: ${name}`);
      finalData.push({
        city: '부천', name: name, address: geo.addr,
        lat: geo.lat, lng: geo.lng, source: '부천시청 자전거시설'
      });
    } else {
      console.log(`RETRY FAIL: ${name}`);
    }
  }
  
  if (finalData.length > 0) {
    console.log(`Uploading ${finalData.length} records...`);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/bicycle_pumps`, {
      method: 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(finalData)
    });
    console.log(r.status === 201 || r.status === 204 ? 'Success!' : 'Error');
  }
}
run();
