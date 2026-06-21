import json
import re
import os
import urllib.request
import urllib.parse
import time

# Paths
base_dir = "/Users/enricoarmiento/Desktop/AUT/RISORSE"
text_path = os.path.join(base_dir, "sport_text.txt")
cache_path = os.path.join(base_dir, "geocoded_cache.json")
output_path = os.path.join(base_dir, "sport_strutture_geocoded.json")

# Load existing geocoding cache
cache = {}
if os.path.exists(cache_path):
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            cache = json.load(f)
    except Exception as e:
        print(f"Error loading cache: {e}")

street_keywords = ["VIA ", "VIALE ", "PIAZZA ", "LUNGOTEVERE ", "LUNGOMARE ", "CORSO ", "PIAZZALE ", "LARGO "]

# Approximate center coordinates for Rome Municipios
MUNICIPIO_COORDS = {
    "MUNICIPIO I": (41.8992, 12.4839),
    "MUNICIPIO II": (41.9272, 12.5186),
    "MUNICIPIO III": (41.9472, 12.5358),
    "MUNICIPIO IV": (41.9256, 12.5739),
    "MUNICIPIO V": (41.8894, 12.5625),
    "MUNICIPIO VI": (41.8686, 12.6375),
    "MUNICIPIO VII": (41.8592, 12.5592),
    "MUNICIPIO VIII": (41.8597, 12.4939),
    "MUNICIPIO IX": (41.8153, 12.4481),
    "MUNICIPIO X": (41.7325, 12.2797),
    "MUNICIPIO XI": (41.8419, 12.4336),
    "MUNICIPIO XII": (41.8703, 12.4286),
    "MUNICIPIO XIII": (41.9025, 12.4047),
    "MUNICIPIO XIV": (41.9367, 12.4086),
    "MUNICIPIO XV": (41.9683, 12.4556)
}

# Flag to switch to fallback mode permanently if 429 is encountered
nominatim_blocked = False

def parse_line(line):
    line = line.strip()
    if not line:
        return None
        
    if "ELENCO A" in line or "STRUTTURA SPORTIVA INDIRIZZO" in line or "Pagina" in line:
        return None
        
    street_idx = -1
    street_kw = ""
    for kw in street_keywords:
        idx = line.upper().find(kw)
        if idx != -1:
            if street_idx == -1 or idx < street_idx:
                street_idx = idx
                street_kw = kw
                
    if street_idx == -1:
        return None
        
    name = line[:street_idx].strip()
    rest = line[street_idx:]
    
    mun_match = re.search(r'\bMUNICIPIO\s+([IVX0-9]+)\b', rest, re.IGNORECASE)
    if not mun_match:
        return None
        
    mun_start = mun_match.start()
    mun_end = mun_match.end()
    municipio = rest[mun_start:mun_end].strip().upper()
    
    address = rest[:mun_start].strip()
    activities = rest[mun_end:].strip()
    
    return {
        "name": name,
        "address": address,
        "municipio": municipio,
        "activities": activities
    }

# Process file line by line
structures = {}
with open(text_path, "r", encoding="utf-8") as f:
    lines = f.readlines()
    
for i, line in enumerate(lines):
    parsed = parse_line(line)
    if not parsed:
        continue
        
    key = (parsed["name"].upper(), parsed["address"].upper())
    if key not in structures:
        structures[key] = {
            "name": parsed["name"],
            "address": parsed["address"],
            "municipio": parsed["municipio"],
            "activities": set()
        }
    if parsed["activities"]:
        act = parsed["activities"].strip("- ").strip()
        act = re.sub(r'\s*-\s*\d+$', '', act)
        # Remove zip codes or trailing digits
        act = re.sub(r'\s+\d+$', '', act)
        if act:
            structures[key]["activities"].add(act)

structures_list = []
for key, data in structures.items():
    acts = list(data["activities"])
    acts_str = ", ".join(acts) if acts else "Attività motoria adattata"
    
    structures_list.append({
        "name": data["name"],
        "address": data["address"],
        "municipio": data["municipio"],
        "activities": acts_str
    })

print(f"Found {len(structures_list)} unique sports facilities.")

def geocode_address(addr, municipio):
    global nominatim_blocked
    
    # Check cache first
    if addr in cache and cache[addr]:
        return cache[addr]["lat"], cache[addr]["lng"]
        
    # If Nominatim is already blocked, don't even try, use fallback coords directly
    if nominatim_blocked:
        return MUNICIPIO_COORDS.get(municipio, (41.9028, 12.4964))
        
    query = f"{addr}, Roma, Lazio, Italia"
    print(f"Geocoding online: {query}")
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1"
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MismoSportsGeocode/2.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            res_data = json.loads(response.read().decode())
            if res_data:
                lat = float(res_data[0]["lat"])
                lng = float(res_data[0]["lon"])
                cache[addr] = {"lat": lat, "lng": lng}
                return lat, lng
    except urllib.error.HTTPError as e:
        if e.code == 429:
            print("Received HTTP 429 (Too Many Requests). Switching to local fallback mode permanently.")
            nominatim_blocked = True
        else:
            print(f"HTTP Error {e.code} for address {addr}")
    except Exception as e:
        print(f"Error geocoding {addr}: {e}")
        
    # Try fallback without civic number
    cleaned_addr = re.sub(r'\s+\d+\b', '', addr).strip()
    if cleaned_addr != addr and not nominatim_blocked:
        print(f"Trying fallback online: {cleaned_addr}")
        try:
            url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(cleaned_addr + ', Roma, Lazio, Italia')}&format=json&limit=1"
            req = urllib.request.Request(
                url, 
                headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MismoSportsGeocode/2.0'}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                res_data = json.loads(response.read().decode())
                if res_data:
                    lat = float(res_data[0]["lat"])
                    lng = float(res_data[0]["lon"])
                    cache[addr] = {"lat": lat, "lng": lng}
                    return lat, lng
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print("Received HTTP 429 (Too Many Requests) on fallback. Switching to local fallback mode permanently.")
                nominatim_blocked = True
        except Exception as e:
            print(f"Error geocoding fallback {cleaned_addr}: {e}")
            
    # Return Municipio center fallback
    return MUNICIPIO_COORDS.get(municipio, (41.9028, 12.4964))

geocoded_structures = []
for idx, s in enumerate(structures_list):
    lat, lng = geocode_address(s["address"], s["municipio"])
    
    geocoded_structures.append({
        "id": f"sport-{idx}",
        "name": s["name"],
        "type": "Sport Inclusivo",
        "address": f"{s['address']}, Roma ({s['municipio']})",
        "phone": "",
        "lat": lat,
        "lng": lng,
        "province": "Roma",
        "activities": s["activities"],
        "municipio": s["municipio"]
    })
    
    # Save cache incrementally if we queried online and succeeded
    if idx % 10 == 0 or idx == len(structures_list) - 1:
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
            
    # Sleep to respect rate limits if we did query online
    if s["address"] not in cache and not nominatim_blocked:
        time.sleep(1.2)

# Save result list to JSON
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(geocoded_structures, f, ensure_ascii=False, indent=2)

print(f"Done! Geocoded {len(geocoded_structures)} structures. Saved to {output_path}")
