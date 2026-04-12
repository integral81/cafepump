import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://aqapiwyfjrvdfilcodah.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable__SMHCGx0UebCTEj5qLKYjA_AZpD2O7K';
const CSV_PATH = './seoul_pumps_utf8.csv';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dphi = (lat2 - lat1) * Math.PI / 180;
    const dlambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dphi/2)**2 + Math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
}
// Wait, 'math' should be Math
function getDistanceFixed(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const dphi = (lat2 - lat1) * Math.PI / 180;
    const dlambda = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dphi/2)**2 + Math.cos(phi1)*Math.cos(phi2)*Math.sin(dlambda/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

async function main() {
    console.log("Fetching existing data from Supabase...");
    const { data: existingPumps, error } = await supabase.from('bicycle_pumps').select('*');
    if (error) {
        console.error("Error fetching pumps:", error);
        return;
    }
    console.log(`Total existing pumps: ${existingPumps.length}`);

    console.log("Reading CSV data...");
    // Using binary read then decoding to handle CP949 or UTF-8
    const rawBuffer = fs.readFileSync(CSV_PATH);
    // Rough way to split CSV and handle encoding (simplified for speed)
    // Actually, I'll use iconv-lite if needed, but let's try reading as string first
    const content = rawBuffer.toString('utf8'); 
    // If it's CP949, it might be garbled, but let's see. 
    // Actually, the previous 'head' worked with CP949 in some ways.
    
    // Better way: use a simple line parser
    const lines = content.split('\r\n');
    if (lines.length < 2) content.split('\n');
    
    const headers = lines[0].split(',');
    console.log(`Pumps found in CSV: ${lines.length - 1}`);

    const newPumps = [];
    const conflicts = [];

    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;
        
        // Simple CSV split (not robust for quotes, but let's hope data is clean)
        const cols = line.split(',');
        if (cols.length < 15) continue;

        // Theme check: cols[14] should contain 자전거
        // Name check: cols[2] should contain 공기주입기
        if (!cols[14].includes('자전거') || !cols[2].includes('공기주입기')) continue;

        const name = cols[2];
        const lng = parseFloat(cols[5]);
        const lat = parseFloat(cols[6]);
        const address = cols[10] || cols[11] || "";

        let isExactMatch = false;
        let isNearMatch = false;
        let nearMatchDetail = null;

        for (const ep of existingPumps) {
            const dist = getDistanceFixed(lat, lng, ep.lat, ep.lng);
            
            if (dist < 1.0) {
                isExactMatch = true;
                break;
            }
            
            const cleanAddrNew = address.replace(/\s/g, '');
            const cleanAddrExisting = (ep.address || "").replace(/\s/g, '');

            if ((cleanAddrNew && cleanAddrExisting && cleanAddrNew === cleanAddrExisting) || dist < 15.0) {
                isNearMatch = true;
                nearMatchDetail = {
                    existing: ep,
                    new: { name, address, lat, lng, distance: dist }
                };
            }
        }

        if (isExactMatch) continue;

        if (isNearMatch) {
            conflicts.push(nearMatchDetail);
        } else {
            newPumps.push({
                city: "서울",
                name: name,
                address: address,
                lat: lat,
                lng: lng,
                source: "스마트서울맵"
            });
        }
    }

    console.log(`Clearly new pumps: ${newPumps.length}`);
    console.log(`Conflicting pumps: ${conflicts.length}`);

    fs.writeFileSync('new_pumps.json', JSON.stringify(newPumps, null, 2));
    fs.writeFileSync('conflicts.json', JSON.stringify(conflicts, null, 2));

    console.log("Analysis complete. Results saved to new_pumps.json and conflicts.json");
}

main();
