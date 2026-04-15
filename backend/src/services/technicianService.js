/**
 * Technician Search Service
 *
 * Priority:
 *  1. Gemini AI + Google Search  — asks the AI to find real local businesses
 *  2. OpenStreetMap Overpass API — free, no key needed, structured OSM data
 *  3. Google Places API (New) v1 — optional (needs valid GOOGLE_PLACES_API_KEY)
 *  4. Demo cards                 — last resort when no location or all APIs fail
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── Issue type labels and OSM / Google Places tag maps ────────────────────────
const ISSUE_LABELS = {
  ac:              'AC air conditioner',
  refrigerator:    'refrigerator fridge',
  wifi:            'WiFi internet router',
  fan:             'ceiling fan',
  washing_machine: 'washing machine',
  water_heater:    'water heater geyser',
  tv:              'TV LED television',
  microwave:       'microwave oven',
  general:         'home appliance',
};

const OSM_TAGS = {
  ac:              [['shop','appliance'],['craft','hvac'],['craft','electronics_repair']],
  refrigerator:    [['shop','appliance'],['craft','electronics_repair']],
  wifi:            [['craft','electronics_repair'],['shop','computer'],['shop','electronics']],
  fan:             [['craft','electrician'],['craft','electronics_repair'],['shop','appliance']],
  washing_machine: [['shop','appliance'],['craft','electronics_repair']],
  water_heater:    [['craft','plumber'],['shop','appliance'],['craft','electronics_repair']],
  tv:              [['craft','electronics_repair'],['shop','electronics']],
  microwave:       [['shop','appliance'],['craft','electronics_repair']],
  general:         [['shop','appliance'],['craft','electronics_repair'],['craft','electrician']],
};

const GPLACES_TYPES = {
  ac:              ['appliance_repair_service','electrician'],
  refrigerator:    ['appliance_repair_service'],
  wifi:            ['electronics_repair_shop','electrician'],
  fan:             ['electrician','appliance_repair_service'],
  washing_machine: ['appliance_repair_service'],
  water_heater:    ['plumber','appliance_repair_service'],
  tv:              ['electronics_repair_shop','appliance_repair_service'],
  microwave:       ['appliance_repair_service'],
  general:         ['appliance_repair_service','electrician'],
};

const MOCK_TECHNICIANS = [
  {
    id: 'demo_001', isMock: true,
    name: 'QuickFix Home Services (Demo)',
    rating: 4.8, reviewCount: 312, distance: 1.2,
    phone: null,
    address: 'Demo only — allow location for real results',
    specializations: ['AC', 'Refrigerator', 'Washing Machine'],
    available: true, responseTime: '30 min', priceRange: '₹299 - ₹999', photo: null,
  },
  {
    id: 'demo_002', isMock: true,
    name: 'City Appliance Repair (Demo)',
    rating: 4.6, reviewCount: 189, distance: 2.1,
    phone: null,
    address: 'Demo only — allow location for real results',
    specializations: ['AC', 'Fan', 'TV', 'Microwave'],
    available: true, responseTime: '45 min', priceRange: '₹199 - ₹799', photo: null,
  },
  {
    id: 'demo_003', isMock: true,
    name: 'Pro Tech Solutions (Demo)',
    rating: 4.9, reviewCount: 521, distance: 2.8,
    phone: null,
    address: 'Demo only — allow location for real results',
    specializations: ['All Appliances', 'AC', 'Refrigerator'],
    available: false, responseTime: '1 hour', priceRange: '₹499 - ₹1499', photo: null,
  },
];

// ── Main entry ────────────────────────────────────────────────────────────────
async function searchNearbyTechnicians(location, issueType, limit = 3) {
  if (!location?.lat || !location?.lng) {
    console.log('[Technicians] No location — returning demo cards');
    return getMockTechnicians(issueType, limit);
  }

  // 1. AI-powered search (Gemini + Google Search)
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = await searchWithAI(location, issueType, limit);
      if (ai.length > 0) {
        console.log(`[Technicians] AI search returned ${ai.length} results`);
        return ai;
      }
      console.log('[Technicians] AI search returned 0 usable results');
    } catch (err) {
      console.error('[Technicians] AI search error:', err.message);
    }
  }

  // 2. OpenStreetMap Overpass (free, no key)
  try {
    const osm = await searchWithOverpass(location, issueType, limit);
    if (osm.length > 0) {
      console.log(`[Technicians] OSM returned ${osm.length} results`);
      return osm;
    }
  } catch (err) {
    console.error('[Technicians] OSM error:', err.message);
  }

  // 3. Google Places API (New) v1 — optional
  const gKey = process.env.GOOGLE_PLACES_API_KEY;
  if (gKey) {
    try {
      const gp = await searchWithGooglePlacesV1(gKey, location, issueType, limit);
      if (gp.length > 0) {
        console.log(`[Technicians] Google Places returned ${gp.length} results`);
        return gp;
      }
    } catch (err) {
      console.error('[Technicians] Google Places error:', err.message);
    }
  }

  console.log('[Technicians] All sources exhausted — using demo data');
  return getMockTechnicians(issueType, limit);
}

// ── 1. Gemini AI + Google Search ──────────────────────────────────────────────
async function searchWithAI(location, issueType, limit) {
  // Reverse-geocode to get a readable city name (Nominatim — free)
  const cityName = await reverseGeocode(location);
  const locationStr = cityName || `coordinates ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
  const issueLabel  = ISSUE_LABELS[issueType] || 'home appliance';

  const prompt = `Use Google Search to find the top ${limit} real, currently operating "${issueLabel} repair service" businesses in ${locationStr}.

Return ONLY a valid JSON array — no markdown fences, no explanation, just the raw JSON:
[
  {
    "name": "Exact business name",
    "phone": "phone number with country code, or null if not found",
    "address": "full street address",
    "rating": 4.5,
    "reviewCount": 150
  }
]

Rules:
- Only include businesses that clearly do ${issueLabel} repair
- phone must be a real callable number, or null
- rating must be a number or null
- reviewCount must be a number or 0`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1024 },
  });

  const result = await model.generateContent(prompt);
  const text   = result.response.text().trim();

  // Strip markdown fences then extract the first JSON array
  const stripped   = text.replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const jsonMatch  = stripped.match(/\[[\s\S]*?\]/);
  if (!jsonMatch) {
    console.log('[Technicians] AI response had no JSON array:', text.substring(0, 200));
    return [];
  }

  const data = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(data) || data.length === 0) return [];

  return data
    .filter((t) => t.name)
    .slice(0, limit)
    .map((t, i) => ({
      id:              `ai_${Date.now()}_${i}`,
      name:            String(t.name),
      rating:          typeof t.rating === 'number' ? Math.round(t.rating * 10) / 10 : null,
      reviewCount:     Number(t.reviewCount) || 0,
      distance:        null,         // AI can't give exact distance
      phone:           t.phone ? String(t.phone).trim() : null,
      address:         t.address ? String(t.address) : locationStr,
      specializations: [issueLabel],
      available:       null,
      responseTime:    'Contact for availability',
      priceRange:      'Contact for quote',
      photo:           null,
      isMock:          false,
      source:          'ai',
    }));
}

async function reverseGeocode(location) {
  try {
    const fetch = (await import('node-fetch')).default;
    const res   = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${location.lat}&lon=${location.lng}&format=json`,
      { headers: { 'User-Agent': 'SmartRepairAssistant/1.0' } }
    );
    const d   = await res.json();
    const a   = d.address || {};
    const city = a.city || a.town || a.village || a.county || '';
    const state = a.state || '';
    return [city, state].filter(Boolean).join(', ');
  } catch {
    return null;
  }
}

// ── 2. OpenStreetMap Overpass API ─────────────────────────────────────────────
async function searchWithOverpass(location, issueType, limit) {
  const { lat, lng } = location;
  const tags = OSM_TAGS[issueType] || OSM_TAGS.general;

  const nodeQueries = tags
    .map(([k, v]) => `node["${k}"="${v}"](around:10000,${lat},${lng});`)
    .join('\n  ');

  const query = `[out:json][timeout:15];\n(\n  ${nodeQueries}\n);\nout body;`;

  const fetch = (await import('node-fetch')).default;
  const res   = await fetch('https://overpass-api.de/api/interpreter', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `data=${encodeURIComponent(query)}`,
  });

  const data = await res.json();
  if (!data.elements?.length) return [];

  const seen = new Set();
  const results = [];

  for (const el of data.elements) {
    const t = el.tags || {};
    const name = t.name || t['name:en'] || t.brand;
    if (!name) continue;
    const key = `${name}|${el.lat?.toFixed(3)}|${el.lon?.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      id:              `osm_${el.id}`,
      name,
      rating:          null,
      reviewCount:     0,
      distance:        calculateDistance(lat, lng, el.lat, el.lon),
      phone:           normalisePhone(t.phone || t['contact:phone'] || t['phone:mobile']),
      address:         buildOsmAddress(t, el.lat, el.lon),
      specializations: [issueType],
      available:       isOpenNow(t),
      responseTime:    'Contact for availability',
      priceRange:      'Contact for quote',
      photo:           null,
      isMock:          false,
      mapsLink:        `https://www.openstreetmap.org/node/${el.id}`,
      source:          'osm',
    });
  }

  return results.sort((a, b) => a.distance - b.distance).slice(0, limit);
}

// ── 3. Google Places API (New) v1 ─────────────────────────────────────────────
async function searchWithGooglePlacesV1(apiKey, location, issueType, limit) {
  const fieldMask = [
    'places.id','places.displayName','places.rating','places.userRatingCount',
    'places.formattedAddress','places.location','places.nationalPhoneNumber',
    'places.internationalPhoneNumber','places.regularOpeningHours',
    'places.photos','places.businessStatus',
  ].join(',');

  const fetch = (await import('node-fetch')).default;
  const res   = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify({
      includedTypes:        GPLACES_TYPES[issueType] || GPLACES_TYPES.general,
      maxResultCount:       Math.min(limit * 2, 20),
      locationRestriction:  {
        circle: { center: { latitude: location.lat, longitude: location.lng }, radius: 10000 },
      },
      rankPreference: 'DISTANCE',
    }),
  });

  const data = await res.json();
  if (data.error) throw new Error(`${data.error.status}: ${data.error.message}`);
  if (!data.places?.length) return [];

  return data.places
    .filter((p) => p.businessStatus !== 'CLOSED_PERMANENTLY')
    .slice(0, limit)
    .map((p) => ({
      id:              p.id,
      name:            p.displayName?.text || 'Unknown',
      rating:          p.rating ?? null,
      reviewCount:     p.userRatingCount ?? 0,
      distance:        calculateDistance(location.lat, location.lng, p.location?.latitude, p.location?.longitude),
      phone:           p.nationalPhoneNumber || p.internationalPhoneNumber || null,
      address:         p.formattedAddress || '',
      specializations: [issueType],
      available:       p.regularOpeningHours?.openNow ?? null,
      responseTime:    'Contact for availability',
      priceRange:      'Contact for quote',
      photo:           p.photos?.[0]?.name
        ? `https://places.googleapis.com/v1/${p.photos[0].name}/media?maxWidthPx=400&key=${apiKey}`
        : null,
      isMock:          false,
      source:          'google',
    }));
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function calculateDistance(lat1, lng1, lat2, lng2) {
  if (lat2 == null || lng2 == null) return 0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function buildOsmAddress(tags, lat, lon) {
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'], tags['addr:city'] || tags['addr:town']].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : `${lat?.toFixed(4)}, ${lon?.toFixed(4)}`;
}

function normalisePhone(raw) {
  if (!raw) return null;
  return raw.split(';')[0].trim();
}

function isOpenNow(tags) {
  if (!tags.opening_hours) return null;
  const oh = tags.opening_hours.toLowerCase();
  if (oh === '24/7' || oh.includes('mo-su')) return true;
  return null;
}

function getMockTechnicians(issueType, limit) {
  const type = (issueType || '').toLowerCase();
  const filtered = MOCK_TECHNICIANS.filter((t) =>
    t.specializations.some((s) => s.toLowerCase() === type || s === 'All Appliances')
  );
  return (filtered.length > 0 ? filtered : MOCK_TECHNICIANS).slice(0, limit);
}

function getTechnicianById(id) {
  return MOCK_TECHNICIANS.find((t) => t.id === id) || null;
}

module.exports = { searchNearbyTechnicians, getTechnicianById };
