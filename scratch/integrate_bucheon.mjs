import fs from 'fs';
import path from 'path';

const KAKAO_KEY = 'f2ac53a34a1645a26f54d08c7996779f';
const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';

const files = [
  "C:\\Users\\이승민\\.gemini\\antigravity\\brain\\b56cedae-a7f5-47eb-8710-1b80ad88897e\\.system_generated\\steps\\520\\content.md",
  "C:\\Users\\이승민\\.gemini\\antigravity\\brain\\b56cedae-a7f5-47eb-8710-1b80ad88897e\\.system_generated\\steps\\605\\content.md",
  "C:\\Users\\이승민\\.gemini\\antigravity\\brain\\b56cedae-a7f5-47eb-8710-1b80ad88897e\\.system_generated\\steps\\610\\content.md",
  "C:\\Users\\이승민\\.gemini\\antigravity\\brain\\b56cedae-a7f5-47eb-8710-1b80ad88897e\\.system_generated\\steps\\613\\content.md"
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocode(q) {
  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent('부천시 ' + q)}&size=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `KakaoAK ${KAKAO_KEY}`,
        'KA': 'sdk/1.0.0 os/javascript lang/ko device/pc origin/http://localhost:5188'
      }
    });
    const data = await res.json();
    if (data.documents && data.documents.length > 0) {
      return {
        lat: parseFloat(data.documents[0].y),
        lng: parseFloat(data.documents[0].x),
        address: data.documents[0].address_name
      };
    }
  } catch (e) {
    console.error(`Geocode Error for ${q}: ${e.message}`);
  }
  return null;
}

async function run() {
  let names = [];
  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.log(`File not found: ${f}`);
      continue;
    }
    const content = fs.readFileSync(f, 'utf8');
    const matches = content.matchAll(/\[(.*?)\]\(https:\/\/bike\.bucheon\.go\.kr\/site\/program\/board\/basicboard\/view\?currentpage=/g);
    for (const match of matches) {
      names.push(match[1]);
    }
  }
  
  names = [...new Set(names)];
  console.log(`Processing ${names.length} names...`);
  
  const finalData = [];
  for (const name of names) {
    const geo = await geocode(name);
    if (geo) {
      console.log(`OK: ${name}`);
      finalData.push({
        city: '부천',
        name: name,
        address: geo.address,
        lat: geo.lat,
        lng: geo.lng,
        source: '부천시청 자전거시설'
      });
    } else {
      console.log(`FAIL: ${name}`);
    }
    await sleep(200);
  }
  
  if (finalData.length > 0) {
    console.log(`Uploading ${finalData.length} records...`);
    try {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/bicycle_pumps`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalData)
      });
      console.log(r.status === 201 || r.status === 204 ? 'Success!' : `Error: ${r.status}`);
    } catch (e) {
      console.error(`Upload Error: ${e.message}`);
    }
  } else {
    console.log("No data found to integrate.");
  }
}

run();
