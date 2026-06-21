import json
import os
import time
import urllib.request
import urllib.parse

json_path = "/Users/enricoarmiento/Desktop/AUT/RISORSE/professionisti.json"
cache_path = "/Users/enricoarmiento/Desktop/AUT/RISORSE/geocoded_cache.json"
output_path = "/Users/enricoarmiento/Desktop/AUT/RISORSE/professionisti_geocoded.json"

# Load current cache if exists
cache = {}
if os.path.exists(cache_path):
    try:
        with open(cache_path, 'r', encoding='utf-8') as f:
            cache = json.load(f)
        print(f"Loaded {len(cache)} geocoded addresses from cache.")
    except Exception as e:
        print("Failed to load cache:", e)

# Load professionals
with open(json_path, 'r', encoding='utf-8') as f:
    professionals = json.load(f)

# Helper function to geocode address
def geocode_nominatim(address):
    # Skip generic addresses
    addr_upper = address.upper()
    skip_keywords = ["DOMICILIO", "DOMICILIARI", "UTENTE", "SCUOLA", "NON SPECIFICATO", "ONLUS", "TUTTO IL TERRITORIO", "AMBITO", "REGIONALI", "DA DEFINIRE"]
    if any(k in addr_upper for k in skip_keywords) or len(address) < 5:
        return None
        
    # Append Lazio, Italia if not present to increase accuracy
    query_address = address
    if "LAZIO" not in addr_upper and "ITALIA" not in addr_upper:
        query_address += ", Lazio, Italia"
        
    url = "https://nominatim.openstreetmap.org/search?q=" + urllib.parse.quote(query_address) + "&format=json&limit=1"
    req = urllib.request.Request(
        url, 
        headers={
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    )
    
    try:
        print(f"Querying Nominatim for: '{query_address}'...")
        with urllib.request.urlopen(req, timeout=8) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data:
                lat = float(data[0]['lat'])
                lng = float(data[0]['lon'])
                print(f"-> Found: {lat}, {lng}")
                return {"lat": lat, "lng": lng}
            else:
                print("-> Address not found.")
                return None
    except Exception as e:
        print(f"-> Geocoding error: {e}")
        return "ERROR" # Special token to retry later or handle error

# Extract unique addresses
unique_addresses = list(set(p["indirizzo"].strip() for p in professionals if p["indirizzo"].strip()))
print(f"Found {len(unique_addresses)} unique addresses to geocode.")

# Geocode each unique address
updated_count = 0
errors_count = 0

for i, addr in enumerate(unique_addresses, start=1):
    # Skip if already in cache (and it's a valid coordinate dictionary or None)
    if addr in cache:
        continue
        
    # Respect rate limits (1 second per request)
    time.sleep(1.1)
    
    result = geocode_nominatim(addr)
    
    if result == "ERROR":
        # Do not save error to cache, let it retry next run
        errors_count += 1
        # Stop if there are consecutive network errors
        if errors_count > 5:
            print("Too many consecutive geocoding network errors. Pausing script.")
            break
        continue
    
    # Save result to cache (even if None, so we don't query invalid addresses again)
    cache[addr] = result
    updated_count += 1
    errors_count = 0 # reset error streak
    
    # Helper to generate output
    def save_output():
        geocoded_professionals = []
        mapped_count = 0
        for p in professionals:
            addr = p["indirizzo"].strip()
            p_copy = p.copy()
            if addr in cache and cache[addr] is not None:
                p_copy["lat"] = cache[addr]["lat"]
                p_copy["lng"] = cache[addr]["lng"]
                mapped_count += 1
            else:
                p_copy["lat"] = None
                p_copy["lng"] = None
            geocoded_professionals.append(p_copy)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(geocoded_professionals, f, ensure_ascii=False, indent=2)
        print(f"Saved progress to: {output_path} ({mapped_count} professionals mapped)")

    # Save cache incrementally every 5 successful steps
    if updated_count % 5 == 0:
        with open(cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
        save_output()
        print(f"Progress: ({i}/{len(unique_addresses)})")

# Save final cache
with open(cache_path, 'w', encoding='utf-8') as f:
    json.dump(cache, f, ensure_ascii=False, indent=2)

# Generate final geocoded professionals file
geocoded_professionals = []
mapped_count = 0

for p in professionals:
    addr = p["indirizzo"].strip()
    p_copy = p.copy()
    
    if addr in cache and cache[addr] is not None:
        p_copy["lat"] = cache[addr]["lat"]
        p_copy["lng"] = cache[addr]["lng"]
        mapped_count += 1
    else:
        p_copy["lat"] = None
        p_copy["lng"] = None
        
    geocoded_professionals.append(p_copy)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(geocoded_professionals, f, ensure_ascii=False, indent=2)

print(f"\nFinished! Geocoded {mapped_count} out of {len(professionals)} professionals.")
print(f"Output saved to: {output_path}")
