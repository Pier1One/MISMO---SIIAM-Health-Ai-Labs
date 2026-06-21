import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const geocodedPath = path.join(__dirname, "professionisti_geocoded.json");
const cachePath = path.join(__dirname, "geocoded_cache.json");

let cache = {};
if (fs.existsSync(cachePath)) {
  try {
    cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
  } catch (err) {
    console.error("Failed to load cache:", err);
  }
}

let professionals = JSON.parse(fs.readFileSync(geocodedPath, "utf-8"));

function cleanAddress(addr) {
  let cleaned = addr;
  
  // 1. If multiple addresses separated by semicolon, take the first non-generic one
  if (cleaned.includes(";")) {
    const parts = cleaned.split(";");
    const nonGeneric = parts.find(p => !/domicilio|utente|scuola|terapie|pazienti/i.test(p));
    cleaned = nonGeneric || parts[0];
  }
  
  // 2. Fix specific typos & abbreviations
  cleaned = cleaned.replace(/\bAnguillara S\.?\b/gi, "Anguillara Sabazia");
  cleaned = cleaned.replace(/\bAnguillarea\b/gi, "Anguillara Sabazia");
  cleaned = cleaned.replace(/\bVitacini\b/gi, "Vitalini");
  cleaned = cleaned.replace(/(\d+)Piedimonte/gi, "$1 Piedimonte");
  cleaned = cleaned.replace(/\bDottor A\.\b/gi, "Dottor Aristide");
  
  // 3. Remove "snc" or "s.n.c." or similar variations
  cleaned = cleaned.replace(/\b(snc|s\.n\.c\.|senza numero civico|domicilio|domiciliare|domiciliari|presso il|presso|terapie|terapia|pazienti|paziente|utente|scuola|libera professionista|libero professionista|studio privato|onlus|aps)\b/gi, "");
  
  // 4. Remove content inside parentheses
  cleaned = cleaned.replace(/\([^)]*\)/g, "");
  
  // 5. Handle number ranges, e.g. "276 - 282" -> "276"
  cleaned = cleaned.replace(/(\d+)\s*-\s*\d+/g, "$1");
  
  // 6. If double dashes or weird separators, take the first part
  if (cleaned.includes(" - ")) {
    cleaned = cleaned.split(" - ")[0];
  }
  
  // 7. Clean up multiple spaces and trim
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

// Extract city/province from address or other fields to use as fallback
function extractCity(addr, area) {
  // Try matching "[Word] (PROVINCE)" or "[Word] ([RM|LT|FR|RI|VT|RM])"
  const match = addr.match(/([a-zA-Z\s]+)\s*\((RM|LT|FR|RI|VT|RM)\)/i);
  if (match) {
    return match[1].trim();
  }
  
  let text = (addr + " " + (area || "")).toLowerCase();
  
  const cities = ["roma", "latina", "viterbo", "rieti", "frosinone", "pomezia", "guidonia", "tivoli", "civitavecchia", "velletri", "anzio", "nettuno", "aricia", "albano", "frascati", "marino", "ciampino", "subiaco", "mentana", "monterotondo", "formia", "gaeta", "terracina", "sezze", "sora", "cassino", "alatri", "tarquinia", "cerveteri", "ladispoli", "fiumicino", "aprilia", "sabaudia", "ferentino", "roccasecca"];
  for (const c of cities) {
    if (text.includes(c)) {
      return c.charAt(0).toUpperCase() + c.slice(1);
    }
  }
  return null;
}

async function geocodeNominatim(queryAddress) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryAddress)}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (err) {
    console.error(`Error querying Nominatim for: '${queryAddress}':`, err.message);
  }
  return null;
}

const unmapped = professionals.filter(p => p.lat === null && p.indirizzo.trim() !== "");
console.log(`Found ${unmapped.length} unmapped professionals.`);

async function run() {
  let successCount = 0;
  for (let i = 0; i < unmapped.length; i++) {
    const p = unmapped[i];
    const rawAddr = p.indirizzo.trim();
    
    // Check if in cache first (in case another entry has the same address)
    if (cache[rawAddr]) {
      p.lat = cache[rawAddr].lat;
      p.lng = cache[rawAddr].lng;
      continue;
    }
    
    console.log(`\n[${i + 1}/${unmapped.length}] Geocoding: ${p.nominativo} - '${rawAddr}'`);
    
    // Step 1: Clean Address
    const cleaned = cleanAddress(rawAddr);
    console.log(`Cleaned address: '${cleaned}'`);
    
    let coords = null;
    if (cleaned.length >= 5) {
      const queryAddr = `${cleaned}, Lazio, Italia`;
      // Query 1: Cleaned Address
      coords = await geocodeNominatim(queryAddr);
      await new Promise(r => setTimeout(r, 1200)); // Respect Nominatim rate limit
      
      if (!coords) {
        // Query 2: Fallback 1 - remove house number if it exists
        const withoutNumber = cleaned.replace(/\s+\d+\b/g, "");
        if (withoutNumber !== cleaned && withoutNumber.length >= 5) {
          const queryAddr2 = `${withoutNumber}, Lazio, Italia`;
          console.log(`Trying fallback without number: '${queryAddr2}'`);
          coords = await geocodeNominatim(queryAddr2);
          await new Promise(r => setTimeout(r, 1200));
        }
      }
      
      if (!coords && cleaned.includes(",")) {
        // Query 2.5: Fallback 1.5 - split by comma (multiple streets/crossroads)
        const commaParts = cleaned.split(",");
        for (const part of commaParts) {
          if (part.trim().length >= 5) {
            console.log(`Trying comma part fallback: '${part.trim()}'`);
            coords = await geocodeNominatim(`${part.trim()}, Lazio, Italia`);
            await new Promise(r => setTimeout(r, 1200));
            if (coords) break;
          }
        }
      }
    }
    
    if (!coords) {
      // Query 3: Fallback 2 - just the city
      const city = extractCity(rawAddr, p.area_territoriale);
      if (city) {
        const queryAddr3 = `${city}, Lazio, Italia`;
        console.log(`Trying city fallback: '${queryAddr3}'`);
        coords = await geocodeNominatim(queryAddr3);
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    
    if (coords) {
      console.log(`-> Success: ${coords.lat}, ${coords.lng}`);
      cache[rawAddr] = coords;
      p.lat = coords.lat;
      p.lng = coords.lng;
      successCount++;
    } else {
      console.log(`-> Failed to geocode`);
      cache[rawAddr] = null; // Mark as failed in cache so we don't query again
    }
    
    // Save cache and progress incrementally every 10 steps
    if (i % 10 === 0 || i === unmapped.length - 1) {
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
      
      // Update professionals array with the new coordinates
      professionals.forEach(orig => {
        if (orig.indirizzo.trim() === rawAddr && cache[rawAddr]) {
          orig.lat = cache[rawAddr].lat;
          orig.lng = cache[rawAddr].lng;
        }
      });
      fs.writeFileSync(geocodedPath, JSON.stringify(professionals, null, 2), "utf-8");
      console.log(`Saved progress: cached ${Object.keys(cache).length} entries, successfully geocoded ${successCount} entries in this run.`);
    }
  }
  
  // Re-save entire array at the end to make sure everything matches
  professionals.forEach(orig => {
    const raw = orig.indirizzo.trim();
    if (cache[raw]) {
      orig.lat = cache[raw].lat;
      orig.lng = cache[raw].lng;
    }
  });
  fs.writeFileSync(geocodedPath, JSON.stringify(professionals, null, 2), "utf-8");
  
  console.log(`\nFinished! Successfully geocoded ${successCount} professionals.`);
}

run().catch(console.error);
