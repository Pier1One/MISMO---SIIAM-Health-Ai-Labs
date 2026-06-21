import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { exec } from "child_process";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Ensure the profiles folder exists
const PROFILES_DIR = path.join(__dirname, "profiles");
if (!fs.existsSync(PROFILES_DIR)) {
  fs.mkdirSync(PROFILES_DIR, { recursive: true });
}

if (!GEMINI_API_KEY) {
  console.error("WARNING: GEMINI_API_KEY is not defined in the environment variables (.env file).");
}

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

// --- PROFILE ENDPOINTS ---

// 1. GET /api/profiles - List all profiles
app.get("/api/profiles", (req, res) => {
  try {
    const files = fs.readdirSync(PROFILES_DIR);
    const jsonFiles = files.filter(f => f.endsWith(".json"));
    const profiles = jsonFiles.map(f => {
      const content = fs.readFileSync(path.join(PROFILES_DIR, f), "utf8");
      return JSON.parse(content);
    });
    res.json(profiles);
  } catch (error) {
    console.error("Error reading profiles:", error);
    res.status(500).json({ error: "Errore nel caricamento dei profili dei bambini." });
  }
});

// 2. POST /api/profiles - Create a new profile
app.post("/api/profiles", (req, res) => {
  const { name, usePseudonym, age, notes, region, province, city } = req.body;

  if (!name || !age) {
    return res.status(400).json({ error: "Nome/Pseudonimo ed Età sono campi obbligatori." });
  }

  // Generate safe profile ID based on name and timestamp
  const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const profileId = `${safeName}-${Date.now()}`.substring(0, 32);

  const profileMetadata = {
    id: profileId,
    name: name.trim(),
    usePseudonym: !!usePseudonym,
    age: parseInt(age, 10),
    region: region || "Lazio",
    province: province || "Roma",
    city: city || "Roma",
    createdAt: new Date().toISOString()
  };

  // Initial context.md template
  const initialContextMarkdown = `# Profilo Dinamico: ${name.trim()} (${age} anni)

## Informazioni Generali
- **Nome/Pseudonimo**: ${name.trim()} ${usePseudonym ? "(Pseudonimo)" : ""}
- **Età**: ${age} anni
- **Residenza**: ${city || "Roma"} (${province || "Roma"}, ${region || "Lazio"})

## Sensibilità e Preferenze Iniziali
${notes ? notes.trim() : "Nessuna nota iniziale fornita."}

## Note Comportamentali ed Evolutive Rilevate dall'AI
*(Questo profilo si aggiornerà automaticamente in background man mano che parli con Mismo delle vostre esperienze quotidiane)*
`;

  try {
    // Save metadata
    fs.writeFileSync(
      path.join(PROFILES_DIR, `${profileId}.json`),
      JSON.stringify(profileMetadata, null, 2),
      "utf8"
    );
    // Save context markdown
    fs.writeFileSync(
      path.join(PROFILES_DIR, `${profileId}.md`),
      initialContextMarkdown,
      "utf8"
    );

    res.status(201).json({ success: true, profile: profileMetadata });
  } catch (error) {
    console.error("Error creating profile:", error);
    res.status(500).json({ error: "Errore nel salvataggio del profilo." });
  }
});

// 2b. DELETE /api/profiles/:id - Delete a profile
app.delete("/api/profiles/:id", (req, res) => {
  const profileId = req.params.id;
  const jsonPath = path.join(PROFILES_DIR, `${profileId}.json`);
  const mdPath = path.join(PROFILES_DIR, `${profileId}.md`);

  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ error: "Profilo non trovato." });
  }

  try {
    if (fs.existsSync(jsonPath)) fs.unlinkSync(jsonPath);
    if (fs.existsSync(mdPath)) fs.unlinkSync(mdPath);
    res.json({ success: true, message: "Profilo eliminato con successo." });
  } catch (error) {
    console.error("Error deleting profile:", error);
    res.status(500).json({ error: "Errore durante l'eliminazione del profilo." });
  }
});

// 3. GET /api/profiles/:id/context - Get dynamic context file content
app.get("/api/profiles/:id/context", (req, res) => {
  const profileId = req.params.id;
  const mdPath = path.join(PROFILES_DIR, `${profileId}.md`);

  if (!fs.existsSync(mdPath)) {
    return res.status(404).json({ error: "File di contesto non trovato per questo profilo." });
  }

  try {
    const contextMarkdown = fs.readFileSync(mdPath, "utf8");
    res.json({ context: contextMarkdown });
  } catch (error) {
    console.error("Error reading profile context:", error);
    res.status(500).json({ error: "Errore nella lettura del file di contesto." });
  }
});


// --- STRUCTURES ENDPOINTS ---
const MOCK_STRUCTURES = [
  {
    id: "aba-roma",
    name: "Centro ABA - Il Mosaico",
    type: "Terapia ABA & Sostegno Comportamentale",
    address: "Via dei Gracchi 42, Roma",
    phone: "+39 06 1234567",
    lat: 41.9062,
    lng: 12.4608,
    province: "Roma"
  },
  {
    id: "sensory-latina",
    name: "Spazio Sensoriale & Logopedia",
    type: "Integrazione Sensoriale e Logopedia",
    address: "Corso della Repubblica 110, Latina",
    phone: "+39 0773 987654",
    lat: 41.4676,
    lng: 12.9036,
    province: "Latina"
  },
  {
    id: "neuro-viterbo",
    name: "Centro Evolutivo Viterbo",
    type: "Neuropsichiatria Infantile & Psicomotricità",
    address: "Via Garibaldi 15, Viterbo",
    phone: "+39 0761 345678",
    lat: 42.4173,
    lng: 12.1047,
    province: "Viterbo"
  },
  {
    id: "rehab-rieti",
    name: "Centro Riabilitativo Sabina",
    type: "Terapia Occupazionale & Logopedia",
    address: "Viale de Juliis 8, Rieti",
    phone: "+39 0746 456789",
    lat: 42.4013,
    lng: 12.8622,
    province: "Rieti"
  },
  {
    id: "parent-frosinone",
    name: "Associazione Orizzonti - Parent Training",
    type: "Supporto Genitori e Terapia ABA",
    address: "Via Aldo Moro 89, Frosinone",
    phone: "+39 0775 234567",
    lat: 41.6397,
    lng: 13.3411,
    province: "Frosinone"
  }
];

app.get("/api/structures", (req, res) => {
  let structures = [...MOCK_STRUCTURES];
  const sportsPath = path.join(__dirname, "RISORSE", "sport_strutture_geocoded.json");
  if (fs.existsSync(sportsPath)) {
    try {
      const sportsData = JSON.parse(fs.readFileSync(sportsPath, "utf8"));
      structures = [...structures, ...sportsData];
    } catch (err) {
      console.error("Error reading sports structures:", err);
    }
  }
  res.json(structures);
});

// --- ACCREDITED PROFESSIONALS ENDPOINT ---
app.get("/api/professionals", (req, res) => {
  const geocodedPath = path.join(__dirname, "RISORSE", "professionisti_geocoded.json");
  if (!fs.existsSync(geocodedPath)) {
    const rawPath = path.join(__dirname, "RISORSE", "professionisti.json");
    if (fs.existsSync(rawPath)) {
      try {
        const rawData = JSON.parse(fs.readFileSync(rawPath, "utf8"));
        const professionals = rawData.map(p => ({ ...p, lat: null, lng: null }));
        return res.json(professionals);
      } catch (err) {
        return res.status(500).json({ error: "Errore nel caricamento dei professionisti." });
      }
    }
    return res.status(404).json({ error: "Elenco professionisti non trovato." });
  }

  try {
    const data = JSON.parse(fs.readFileSync(geocodedPath, "utf8"));
    res.json(data);
  } catch (error) {
    console.error("Error reading geocoded professionals:", error);
    res.status(500).json({ error: "Errore nella lettura dei professionisti." });
  }
});

// --- DOCUMENTS DYNAMIC MANAGEMENT ---

function getDocumentsDir(profileId) {
  const dir = path.join(PROFILES_DIR, "documents", profileId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function rebuildChildContext(profileId) {
  const jsonPath = path.join(PROFILES_DIR, `${profileId}.json`);
  const mdPath = path.join(PROFILES_DIR, `${profileId}.md`);
  if (!fs.existsSync(jsonPath)) return;

  const profile = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const docDir = getDocumentsDir(profileId);
  
  let markdown = `# Profilo Dinamico: ${profile.name} (${profile.age} anni)

## Informazioni Generali
- **Nome/Pseudonimo**: ${profile.name} ${profile.usePseudonym ? "(Pseudonimo)" : ""}
- **Età**: ${profile.age} anni
- **Residenza**: ${profile.city} (${profile.province}, ${profile.region})

## Sensibilità e Preferenze Iniziali
${profile.notes || "Nessuna nota iniziale fornita."}

## Documenti Clinici e Referti Analizzati
`;

  const categoryTitles = {
    medical: "Referti di Visite Mediche",
    invoice: "Fatture delle Terapie/Visite",
    school: "Documenti per la Scuola (PEI)",
    inps: "Certificazioni INPS"
  };

  const categories = ["medical", "invoice", "school", "inps"];
  let totalDocs = 0;

  try {
    categories.forEach(category => {
      const catDir = path.join(docDir, category);
      let files = [];
      if (fs.existsSync(catDir)) {
        files = fs.readdirSync(catDir).filter(f => !f.endsWith(".analysis.json"));
      }
      
      // Legacy root documents matching this category type (fallback legacy files go to medical)
      if (category === "medical") {
        const rootFiles = fs.readdirSync(docDir).filter(f => {
          const fullPath = path.join(docDir, f);
          return !f.endsWith(".analysis.json") && !fs.statSync(fullPath).isDirectory();
        });
        files = files.concat(rootFiles);
      }

      if (files.length > 0) {
        markdown += `\n### ${categoryTitles[category]}\n`;
        files.forEach(filename => {
          totalDocs++;
          // Check cat folder first, fallback to root folder
          let analysisPath = path.join(catDir, `${filename}.analysis.json`);
          if (!fs.existsSync(analysisPath)) {
            analysisPath = path.join(docDir, `${filename}.analysis.json`);
          }
          
          if (fs.existsSync(analysisPath)) {
            const analysis = JSON.parse(fs.readFileSync(analysisPath, "utf8"));
            markdown += `- **File**: ${filename} (analizzato il ${new Date(analysis.analyzedAt).toLocaleDateString("it-IT")})\n`;
            markdown += `  *Sintesi AI*: ${analysis.summary.replace(/\n/g, "\n  ")}\n`;
          } else {
            markdown += `- **File**: ${filename}\n  *(In attesa di analisi o non leggibile)*\n`;
          }
        });
      }
    });

    if (totalDocs === 0) {
      markdown += "*(Nessun documento clinico o referto caricato)*\n";
    }
  } catch (error) {
    console.error("Error rebuilding documents markdown:", error);
    markdown += "*(Errore nel caricamento della lista dei documenti)*\n";
  }

  // Preserve existing AI behavioral notes if possible
  let behavioralNotes = "*(Questo profilo si aggiornerà automaticamente in background man mano che parli con Mismo delle vostre esperienze quotidiane)*";
  if (fs.existsSync(mdPath)) {
    const oldMarkdown = fs.readFileSync(mdPath, "utf8");
    const notesIndex = oldMarkdown.indexOf("## Note Comportamentali ed Evolutive Rilevate dall'AI");
    if (notesIndex !== -1) {
      behavioralNotes = oldMarkdown.substring(notesIndex + "## Note Comportamentali ed Evolutive Rilevate dall'AI".length).trim();
      if (!behavioralNotes) {
        behavioralNotes = "*(Questo profilo si aggiornerà automaticamente in background man mano che parli con Mismo delle vostre esperienze quotidiane)*";
      }
    }
  }

  markdown += `
## Note Comportamentali ed Evolutive Rilevate dall'AI
${behavioralNotes}
`;

  fs.writeFileSync(mdPath, markdown, "utf8");
}

function extractPdfText(pdfPath) {
  return new Promise((resolve, reject) => {
    const escapedPath = pdfPath.replace(/"/g, '\\"');
    exec(`python3 "/Users/enricoarmiento/Desktop/AUT/RISORSE/pdf_extractor.py" "${escapedPath}"`, (err, stdout, stderr) => {
      if (err) {
        console.error("PDF extractor error:", stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

// 1. GET /api/profiles/:id/documents - List files for profile categorized
app.get("/api/profiles/:id/documents", (req, res) => {
  const profileId = req.params.id;
  const docDir = getDocumentsDir(profileId);
  try {
    const categories = ["medical", "invoice", "school", "inps"];
    let docs = [];
    
    // Read category folders
    categories.forEach(category => {
      const catDir = path.join(docDir, category);
      if (fs.existsSync(catDir)) {
        const files = fs.readdirSync(catDir);
        files.filter(f => !f.endsWith(".analysis.json")).forEach(filename => {
          const stat = fs.statSync(path.join(catDir, filename));
          docs.push({
            filename: filename,
            size: stat.size,
            uploadedAt: stat.mtime.toISOString(),
            category: category
          });
        });
      }
    });

    // Read root folder for legacy documents if any (default to medical)
    const rootFiles = fs.readdirSync(docDir);
    rootFiles.filter(f => !f.endsWith(".analysis.json") && !fs.statSync(path.join(docDir, f)).isDirectory()).forEach(filename => {
      const stat = fs.statSync(path.join(docDir, filename));
      docs.push({
        filename: filename,
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
        category: "medical"
      });
    });

    res.json(docs);
  } catch (error) {
    console.error("Error reading documents:", error);
    res.status(500).json({ error: "Errore nel recupero dei documenti del profilo." });
  }
});

// 2. POST /api/profiles/:id/documents - Upload and analyze document (base64) by category
app.post("/api/profiles/:id/documents", async (req, res) => {
  const profileId = req.params.id;
  const { filename, mimeType, base64Data, category = "medical" } = req.body;

  if (!filename || !mimeType || !base64Data) {
    return res.status(400).json({ error: "Dati del documento incompleti." });
  }

  const docDir = getDocumentsDir(profileId);
  const catDir = path.join(docDir, category);
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
  }
  const filePath = path.join(catDir, filename);

  try {
    const buffer = Buffer.from(base64Data, "base64");
    fs.writeFileSync(filePath, buffer);
    console.log(`Document saved: ${filePath}`);

    // Customize the prompt based on category
    let promptText = "";
    if (category === "invoice") {
      promptText = "Sei un analista amministrativo ed esperto di welfare. Analizza questa fattura di terapia o visita medica ed estrai in italiano in modo molto sintetico ed estremamente strutturato: 1) Data della fattura; 2) Importo totale; 3) Tipo di terapia/visita o trattamento erogato (es. logopedia, psicomotricità, ABA, supervisione); 4) Nominativo del professionista o struttura erogante; 5) Note amministrative (es. se è indicato il rispetto del Regolamento regionale per i rimborsi). Non essere prolisso.";
    } else if (category === "school") {
      promptText = "Sei un pedagogista ed esperto di inclusione scolastica. Analizza questo documento scolastico (PEI, PDP, o comunicazioni scolastiche) ed estrai in italiano in modo molto sintetico ed estremamente strutturato: 1) Tipo di documento e anno scolastico; 2) Ore di sostegno e ore di assistenza specialistica assegnate; 3) Obiettivi didattici, comportamentali o relazionali principali; 4) Misure dispensative o strumenti compensativi concordati; 5) Riferimenti a viaggi d'istruzione o continuità casa-scuola. Non essere prolisso.";
    } else if (category === "inps") {
      promptText = "Sei un esperto di welfare e legislazione sulla disabilità infantile. Analizza questo verbale o certificato INPS ed estrai in italiano in modo molto sintetico ed estremamente strutturato: 1) Tipo di verbale (es. Legge 104/92, Indennità di Frequenza, Indennità di Accompagnamento); 2) Data di decorrenza e data dell'eventuale revisione programmata; 3) Riconoscimento della gravità (es. art. 3 comma 3 o comma 1); 4) Diagnosi ICD-9/ICD-10 o deficit funzionali principali. Non essere prolisso.";
    } else {
      promptText = "Sei un medico e specialista educativo esperto in autismo. Analizza questo documento medico (visita, referto, valutazione o certificato) ed estrai in italiano in modo molto sintetico ed estremamente strutturato: 1) Tipo di documento e data; 2) Diagnosi/Livello di supporto; 3) Terapie consigliate o in corso (es. logopedia, psicomotricità, ABA); 4) Punti di forza, interessi e peculiarità del bambino; 5) Ipersensibilità o sfide segnalate. Non essere prolisso.";
    }

    let analysisResult = "";

    if (mimeType.startsWith("image/")) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        analysisResult = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Errore dall'API Gemini (multimodale): " + JSON.stringify(data));
      }
    } else {
      let textToAnalyze = "";

      if (mimeType === "application/pdf") {
        textToAnalyze = await extractPdfText(filePath);
      } else if (mimeType.startsWith("text/")) {
        textToAnalyze = buffer.toString("utf8");
      } else {
        throw new Error("Formato file non supportato per l'estrazione del testo: " + mimeType);
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText + "\n\nTESTO DOCUMENTO:\n" + textToAnalyze }
            ]
          }]
        })
      });

      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        analysisResult = data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Errore dall'API Gemini (testo): " + JSON.stringify(data));
      }
    }

    const analysisPath = path.join(catDir, `${filename}.analysis.json`);
    const analysisData = {
      filename: filename,
      summary: analysisResult,
      analyzedAt: new Date().toISOString()
    };
    fs.writeFileSync(analysisPath, JSON.stringify(analysisData, null, 2), "utf8");

    rebuildChildContext(profileId);

    res.json({ success: true, analysis: analysisData });
  } catch (error) {
    console.error("Error processing document:", error);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    res.status(500).json({ error: "Errore nell'elaborazione del documento: " + error.message });
  }
});

// 3. DELETE /api/profiles/:id/documents/:category/:filename - Remove document and update context
app.delete("/api/profiles/:id/documents/:category/:filename", (req, res) => {
  const profileId = req.params.id;
  const category = req.params.category;
  const filename = req.params.filename;
  
  const docDir = getDocumentsDir(profileId);
  const catDir = path.join(docDir, category);
  const filePath = path.join(catDir, filename);
  const analysisPath = path.join(catDir, `${filename}.analysis.json`);

  let targetFile = filePath;
  let targetAnalysis = analysisPath;

  if (!fs.existsSync(filePath)) {
    // Fallback to legacy path
    const rootPath = path.join(docDir, filename);
    const rootAnalysis = path.join(docDir, `${filename}.analysis.json`);
    if (fs.existsSync(rootPath)) {
      targetFile = rootPath;
      targetAnalysis = rootAnalysis;
    } else {
      return res.status(404).json({ error: "Documento non trovato." });
    }
  }

  try {
    if (fs.existsSync(targetFile)) fs.unlinkSync(targetFile);
    if (fs.existsSync(targetAnalysis)) fs.unlinkSync(targetAnalysis);
    
    rebuildChildContext(profileId);

    res.json({ success: true, message: "Documento eliminato con successo." });
  } catch (error) {
    console.error("Error deleting document:", error);
    res.status(500).json({ error: "Errore durante l'eliminazione del documento." });
  }
});

// Local cache for geocoded queries
const queryCachePath = path.join(__dirname, "RISORSE", "query_geocoded_cache.json");
let queryCache = {};
if (fs.existsSync(queryCachePath)) {
  try {
    queryCache = JSON.parse(fs.readFileSync(queryCachePath, "utf8"));
  } catch (err) {
    console.error("Error reading query cache:", err);
  }
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MismoSupportoGenitori/1.0 (contact@mismo.it; educational project)'
      }
    });
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (error) {
    console.error("Geocoding query error:", error);
  }
  return null;
}

async function geocodeAddressCached(address) {
  const normAddress = address.toLowerCase().trim();
  if (queryCache[normAddress]) {
    return queryCache[normAddress];
  }
  const coords = await geocodeAddress(address);
  if (coords) {
    queryCache[normAddress] = coords;
    try {
      fs.writeFileSync(queryCachePath, JSON.stringify(queryCache, null, 2), "utf8");
    } catch (err) {
      console.error("Error writing query cache:", err);
    }
  }
  return coords;
}

function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  const d = R * c; // Distance in km
  return d;
}

async function findRelevantResources(queryText, childProvince, childCity, contextText) {
  const geocodedPath = path.join(__dirname, "RISORSE", "professionisti_geocoded.json");
  if (!fs.existsSync(geocodedPath)) return [];

  try {
    const professionals = JSON.parse(fs.readFileSync(geocodedPath, "utf8"));
    const lowerQuery = queryText.toLowerCase();
    // Specialty can be mentioned in an earlier turn (e.g. "logopedista") and refined later
    // with a location ("uno vicino via X?"). Detect specialty over the recent conversation.
    const specialtyText = (contextText || queryText).toLowerCase();

    // 1. Identify specialty requested
    let targetSpecialties = [];
    if (specialtyText.includes("logoped")) {
      targetSpecialties.push("LOGOPED");
    }
    if (specialtyText.includes("aba") || specialtyText.includes("rbt") || specialtyText.includes("comportament")) {
      targetSpecialties.push("ABA");
      targetSpecialties.push("COMPORTAMENT");
    }
    if (specialtyText.includes("psicomotr") || specialtyText.includes("tnpee")) {
      targetSpecialties.push("PSICOMOTR");
      targetSpecialties.push("TNPEE");
    }
    if (specialtyText.includes("caa") || specialtyText.includes("aumentativa")) {
      targetSpecialties.push("CAA");
      targetSpecialties.push("AUMENTATIVA");
    }
    if (specialtyText.includes("teacch")) {
      targetSpecialties.push("TEACCH");
    }

    // 2. Identify location keywords
    const words = lowerQuery.split(/[\s,.'";:?!\-\(\)]+/).filter(w => w.length > 2);
    const stopwords = ["abito", "vicino", "trova", "trovare", "cerca", "cercare", "centro", "centri", "struttura", "strutture", "convenzionato", "convenzionati", "servizi", "territorio", "bambino", "figlio", "mismo", "ciao", "aiuto", "consiglio", "consigli", "dove", "quali", "sono", "con", "per", "del", "della", "delle", "agli", "agli", "alla", "alle", "nei", "nella", "nelle", "nelle", "una", "uno", "dei", "dal", "dai", "nel", "nei", "sul", "sui", "tra", "fra", "che", "chi", "cui", "col", "coi", "non", "piu", "più", "mia", "mio", "tua", "tuo", "sua", "suo", "dall", "dell", "nell", "sull", "all", "miei", "mie", "suoi", "sue", "tuoi", "tue", "nostro", "nostra", "nostri", "nostre", "vostro", "vostra", "vostri", "vostre", "loro", "questo", "questa", "questi", "queste", "quello", "quella", "quelli", "quelle", "come", "cosa", "qual", "quale", "quali"];
    const locationKeywords = words.filter(w => !stopwords.includes(w) && !["logopedista", "logopedia", "psicomotricista", "psicomotricità", "terapia", "terapista", "terapisti", "trattamento", "trattamenti"].some(s => s.includes(w)));

    // Detect a full street phrase in the raw query and keep it intact (connectors + house number).
    // Rebuilding from length-filtered tokens drops words like "di" and "10", which breaks geocoding
    // (e.g. "via di santa maria mediatrice 10" -> "via santa maria mediatrice" = no result).
    const streetMatch = queryText.match(/\b(via|viale|piazza|p\.?zza|largo|corso|vicolo|lungotevere|strada|borgo|circonvallazione)\b[^?.;\n!]*/i);
    const addressPhrase = streetMatch ? streetMatch[0].trim().replace(/\s+/g, " ") : null;

    // Geocode the proximity anchor.
    // Priority: full street address in the query > location keywords > child's city of residence > province capital.
    let searchCoords = null;
    const provinceQuery = childProvince || "Roma";
    if (addressPhrase) {
      // The phrase often already contains the city; appending province/region helps disambiguation.
      searchCoords = await geocodeAddressCached(`${addressPhrase}, ${provinceQuery}, Lazio, Italia`);
      if (!searchCoords) {
        searchCoords = await geocodeAddressCached(`${addressPhrase}, Lazio, Italia`);
      }
    }
    if (!searchCoords && locationKeywords.length > 0) {
      const fullSearchAddress = `${locationKeywords.join(" ")}, ${provinceQuery}, Lazio, Italia`;
      searchCoords = await geocodeAddressCached(fullSearchAddress);
    }
    // Fallback: anchor on the child's actual city of residence (not just the province capital)
    if (!searchCoords && childCity) {
      const cityAddress = `${childCity}, ${provinceQuery}, Lazio, Italia`;
      searchCoords = await geocodeAddressCached(cityAddress);
    }

    let matches = [];

    if (searchCoords) {
      const { lat: searchLat, lng: searchLng } = searchCoords;

      // 1. Process professionals with coordinates
      professionals.forEach(p => {
        if (p.lat === null || p.lng === null) return;

        // Check if candidate matches specialty (if targetSpecialties is specified)
        let specialtyMatched = true;
        if (targetSpecialties.length > 0) {
          const lowerStudy = (p.titolo_studio || "").toLowerCase();
          const lowerSpec = (p.specializzazione || "").toLowerCase();
          const lowerTratt = (p.trattamenti || "").toLowerCase();

          specialtyMatched = targetSpecialties.some(spec => {
            const specUpper = spec.toUpperCase();
            return (
              lowerStudy.toUpperCase().includes(specUpper) ||
              lowerSpec.toUpperCase().includes(specUpper) ||
              lowerTratt.toUpperCase().includes(specUpper)
            );
          });
        }

        if (specialtyMatched) {
          const dist = getHaversineDistance(searchLat, searchLng, p.lat, p.lng);
          matches.push({
            professional: p,
            distance: dist,
            score: 100 - dist
          });
        }
      });

      // 2. Process structures with coordinates
      MOCK_STRUCTURES.forEach(s => {
        if (s.lat === null || s.lng === null) return;

        let specialtyMatched = true;
        if (targetSpecialties.length > 0) {
          const lowerType = s.type.toLowerCase();
          const lowerName = s.name.toLowerCase();

          specialtyMatched = targetSpecialties.some(spec => {
            const specUpper = spec.toUpperCase();
            return lowerType.toUpperCase().includes(specUpper) || lowerName.toUpperCase().includes(specUpper);
          });
        }

        if (specialtyMatched) {
          const dist = getHaversineDistance(searchLat, searchLng, s.lat, s.lng);
          matches.push({
            structure: s,
            distance: dist,
            score: 100 - dist
          });
        }
      });

      // Sort by distance (ascending)
      matches.sort((a, b) => a.distance - b.distance);

    } else {
      // Fallback: original score-based text matching
      if (locationKeywords.length === 0 && childProvince) {
        locationKeywords.push(childProvince.toLowerCase());
      }

      professionals.forEach(p => {
        if (p.lat === null || p.lng === null) return;

        let score = 0;
        const lowerAddress = (p.indirizzo || "").toLowerCase();
        const lowerArea = (p.area_territoriale || "").toLowerCase();
        const lowerStudy = (p.titolo_studio || "").toLowerCase();
        const lowerSpec = (p.specializzazione || "").toLowerCase();
        const lowerTratt = (p.trattamenti || "").toLowerCase();

        // Location match
        let locationMatched = false;
        locationKeywords.forEach(loc => {
          if (lowerAddress.includes(loc) || lowerArea.includes(loc)) {
            score += 10;
            locationMatched = true;
          }
        });

        // Specialty match
        let specialtyMatched = false;
        targetSpecialties.forEach(spec => {
          const specUpper = spec.toUpperCase();
          if (
            lowerStudy.toUpperCase().includes(specUpper) ||
            lowerSpec.toUpperCase().includes(specUpper) ||
            lowerTratt.toUpperCase().includes(specUpper)
          ) {
            score += 5;
            specialtyMatched = true;
          }
        });

        if (locationMatched && specialtyMatched) {
          score += 20;
        }

        if (score > 0) {
          matches.push({
            professional: p,
            score: score
          });
        }
      });

      MOCK_STRUCTURES.forEach(s => {
        let score = 0;
        const lowerAddress = s.address.toLowerCase();
        const lowerType = s.type.toLowerCase();
        const lowerName = s.name.toLowerCase();

        // Location match
        let locationMatched = false;
        locationKeywords.forEach(loc => {
          if (lowerAddress.includes(loc) || s.province.toLowerCase().includes(loc)) {
            score += 10;
            locationMatched = true;
          }
        });

        // Specialty match
        let specialtyMatched = false;
        targetSpecialties.forEach(spec => {
          const specUpper = spec.toUpperCase();
          if (lowerType.toUpperCase().includes(specUpper) || lowerName.toUpperCase().includes(specUpper)) {
            score += 5;
            specialtyMatched = true;
          }
        });

        if (locationMatched && specialtyMatched) {
          score += 20;
        }

        if (score > 0) {
          matches.push({
            structure: s,
            score: score
          });
        }
      });

      // Sort by score (descending)
      matches.sort((a, b) => b.score - a.score);
    }

    return matches.slice(0, 5).map(m => {
      if (m.professional) {
        const p = m.professional;
        const specs = [p.specializzazione, p.trattamenti].filter(Boolean).join("; ");
        return {
          id: `prof-${p.num}-${p.area_professionale === "SANITARIA" ? "san" : "soc"}`,
          name: p.nominativo,
          type: p.ruolo + (p.titolo_studio ? ` (${p.titolo_studio})` : ""),
          address: p.indirizzo,
          phone: p.telefono,
          email: p.email,
          province: p.area_territoriale || "Roma",
          specialtyInfo: specs,
          isStructure: false,
          distance: m.distance || null
        };
      } else {
        const s = m.structure;
        return {
          id: s.id,
          name: s.name,
          type: s.type,
          address: s.address,
          phone: s.phone,
          email: "",
          province: s.province,
          specialtyInfo: s.type,
          isStructure: true,
          distance: m.distance || null
        };
      }
    });
  } catch (error) {
    console.error("Error searching resources:", error);
    return [];
  }
}

// --- PER-FUNCTION (INTENT) FOCUS MODULES ---
// Each card opens a specific "function". We keep the rich base knowledge but append a
// focused directive (and, where the base prompt lacked it, real domain knowledge) so the
// assistant behaves optimally for that exact function instead of answering generically.
const MAP_INTENTS = new Set(["territory", "sport"]);

const INTENT_FOCUS = {
  about: `\n\n### MODALITÀ ATTIVA: "Conoscere il bambino"
Il genitore vuole presentarti suo figlio. Presentati in 1-2 frasi, poi poni domande aperte e gentili su carattere, passioni, routine quotidiane e sensibilità, UNA o due per volta. In questa fase NON dare consigli burocratici o clinici: ascolta, rispecchia e raccogli informazioni utili che resteranno nel profilo. Chiudi ogni risposta con una sola domanda mirata per continuare a conoscerlo.`,

  study: `\n\n### MODALITÀ ATTIVA: "Studio dello Spettro Autistico"
Funzione formativa, non operativa. Proponi PRIMA un percorso strutturato a tappe e mostralo come indice, ad esempio:
1. Che cos'è lo spettro autistico (criteri, neurodiversità, livelli di supporto)
2. Comunicazione e linguaggio (incl. CAA)
3. Comportamento e approcci evidence-based (ABA, TEACCH, ESDM, DTT)
4. Profilo sensoriale e regolazione
5. Autonomie, gioco e relazioni
6. Risorse, linee guida e letture
Poi chiedi da quale tappa partire e approfondisci UNA tappa per volta, con linguaggio chiaro ed evidence-based. Cita riferimenti istituzionali affidabili (es. Istituto Superiore di Sanità, Linea Guida sul trattamento dei disturbi dello spettro autistico) senza inventare titoli o autori specifici di cui non sei certo.`,

  calendar: `\n\n### MODALITÀ ATTIVA: "Calendario e scadenze"
Accanto a questa chat il genitore vede GIÀ una timeline interattiva con le scadenze reali e datate (Modello A/C o A/1-C/1, GLO, PEI, PDP). Il tuo compito NON è rielencare tutte le date, ma spiegare la singola scadenza che interessa: cosa preparare, dove presentare, come muoversi in anticipo. Fai riferimento alle date mostrate nella timeline e chiedi su quale scadenza vuole concentrarsi.`,

  health: `\n\n### MODALITÀ ATTIVA: "Sanità accessibile – Percorso TOBIA / modello DAMA"
Conoscenza di riferimento (Regione Lazio):
- Il modello DAMA (Disabled Advanced Medical Assistance) e i percorsi dedicati di tipo "TOBIA" offrono assistenza sanitaria facilitata a persone con disabilità intellettiva e disturbi dello spettro autistico che difficilmente collaborano a visite ed esami in setting ordinari.
- Prevedono tipicamente: accesso programmato e dedicato (evitando lunghe attese in sala d'attesa), personale e ambienti preparati, presenza del caregiver, mediazione e desensibilizzazione, e — quando indispensabile — esami/cure in sedazione cosciente.
- Sono utili per visite specialistiche, esami diagnostici, cure odontoiatriche e gestione delle urgenze in Pronto Soccorso.
Spiega cos'è, a chi è rivolto e come attivarlo (contatto con la ASL o l'ospedale di riferimento aderente e prenotazione del percorso dedicato). Invita SEMPRE a verificare gli ospedali aderenti e le modalità aggiornate con la propria ASL, perché l'organizzazione è territoriale e può variare.`,

  market: `\n\n### MODALITÀ ATTIVA: "Mercatino e scambio materiali CAA"
Funzione di creazione e scambio di materiali per la Comunicazione Aumentativa Alternativa. Aiuta il genitore a:
- capire cos'è la CAA (simboli, tabelle a tema, libri modificati "IN-book", strisce/sequenze delle attività, timer e agende visive);
- crearli con strumenti gratuiti (es. il portale di simboli ARASAAC) partendo dagli interessi del bambino riportati nel profilo;
- adattarli al livello del bambino;
- scambiarli con altre famiglie (gruppi di genitori, associazioni autismo locali, biblioteche con sezione IN-book).
Proponi 2-3 materiali concreti e personalizzati, poi chiedi quale vuole creare per primo.`,

  babysitting: `\n\n### MODALITÀ ATTIVA: "Baby-sitting / supporto domiciliare specializzato"
Aiuta a trovare e valutare figure formate (educatore professionale, tecnico ABA/RBT sotto supervisione, tutor, OSS con esperienza nello spettro). Spiega in modo pratico:
- DOVE cercare: cooperative sociali, associazioni autismo del territorio, centri che erogano ABA, segnalazioni di ASL/scuola, passaparola tra famiglie;
- COSA chiedere: formazione, esperienza specifica con l'autismo, eventuale supervisione di un analista del comportamento, referenze;
- COME impostare i primi incontri: gradualità, condivisione del profilo e delle strategie che funzionano, ambiente prevedibile;
- COPERTURE possibili: PAI/ASL, fondi regionali, misure "Dopo di Noi", contributi caregiver.
Non promettere nominativi: orienta e poni le domande giuste sui bisogni della famiglia.`,

  sport: `\n\n### MODALITÀ ATTIVA: "Tempo libero e Sport inclusivi"
La mappa accanto mostra già le strutture sportive (filtro "Sport" attivo). PRIMA di consigliare, chiedi quali sport/attività piacciono al bambino e quali sono le sue sensibilità (folla, rumore, contatto fisico, acqua). POI indirizza verso strutture pertinenti usando i link nel formato [Nome](map:id) e dai indicazioni pratiche per un primo approccio sereno (prova conoscitiva, anticipazione, figura di riferimento).`,

  territory: `\n\n### MODALITÀ ATTIVA: "Servizi del territorio"
La mappa interattiva è già aperta. Rispetta la regola di orientamento: PRIMA chiedi quale specializzazione/terapia si cerca e in quale zona è comodo spostarsi, POI consiglia risorse con i link [Nome](map:id). Dai priorità assoluta alle risorse iniettate nella sezione "RISULTATI DELLA RICERCA DI RISORSE SUL TERRITORIO".`,

  buro: `\n\n### MODALITÀ ATTIVA: "Supporto burocratico"
Concentrati su contributi economici, agevolazioni e modulistica del Lazio. Procedi a fasi: prima capisci a che punto è la famiglia (certificazione L.104 ottenuta? domanda al Comune presentata? valutazione ASL attivata?), poi guida solo il passo successivo con le date e i modelli pertinenti.`,

  school: `\n\n### MODALITÀ ATTIVA: "Supporto scolastico"
Concentrati sull'inclusione scolastica (PEI, PDP, insegnante di sostegno vs educatore, GLO). Procedi a fasi: capisci a che punto è la famiglia e cosa è già stato consegnato alla scuola, poi guida il passo successivo.`,

  general: ``
};

function intentFocusFor(intent) {
  return INTENT_FOCUS[intent] || "";
}

// Keywords that justify running the (geocoding-heavy) resource search for free-typed messages.
const RESOURCE_KEYWORDS = ["mappa", "servizi del territorio", "centro convenzionato", "centri convenzionati", "professionist", "terapist", "struttur", "logoped", "psicomotric", "neuropsichiatr", "aba", "rbt", "teacch", "caa", "sport", "nuoto", "calcio", "basket", "vicino", "in zona"];

function shouldSearchResources(intent, message) {
  if (MAP_INTENTS.has(intent)) return true;
  const lower = (message || "").toLowerCase();
  return RESOURCE_KEYWORDS.some(k => lower.includes(k));
}

// --- DEADLINES (CALENDAR FUNCTION) ---
// Real, dated bureaucratic & school deadlines computed against the current date.
function nextOccurrence(month, day, fromDate) {
  const y = fromDate.getFullYear();
  let d = new Date(y, month - 1, day, 23, 59, 59, 0);
  if (d.getTime() < fromDate.getTime()) {
    d = new Date(y + 1, month - 1, day, 23, 59, 59, 0);
  }
  return d;
}

function buildDeadlines(age) {
  const now = new Date();
  const band = age == null ? "all" : (age <= 12 ? "0-12" : "13-17");
  const isYoung = band === "0-12";
  const isOlder = band === "13-17";

  const modelloA = band === "all" ? "Modello A / A1" : (isYoung ? "Modello A" : "Modello A/1");
  const modelloC = band === "all" ? "Modello C / C1" : (isYoung ? "Modello C" : "Modello C/1");

  const defs = [
    {
      id: "modello-a", category: "buro", month: 10, day: 15,
      title: `Domanda contributi terapie (${modelloA})`,
      description: "Domanda iniziale per il contributo regionale sulle terapie (fino a € 5.000/anno). Si presenta al Municipio o Distretto Sociosanitario di residenza.",
      ref: "Reg. Regionale 1/2019 · DGR 289/2023"
    },
    {
      id: "modello-c", category: "buro", month: 1, day: 31,
      title: `Rendicontazione spese (${modelloC})`,
      description: "Rendicontazione delle spese sostenute per le terapie, da presentare al Comune di residenza per ottenere la liquidazione del rimborso.",
      ref: "Reg. Regionale 1/2019 · Reg. 11/2024"
    },
    {
      id: "glo-pei", category: "school", month: 10, day: 30,
      title: "GLO di approvazione del PEI",
      description: "Riunione del Gruppo di Lavoro Operativo per approvare il Piano Educativo Individualizzato dell'anno scolastico in corso (di norma entro fine ottobre).",
      ref: "PEI · D.Lgs 66/2017"
    },
    {
      id: "pdp", category: "school", month: 11, day: 30,
      title: "Redazione/aggiornamento PDP (DSA-BES)",
      description: "Per Disturbi Specifici dell'Apprendimento o altri BES, il Piano Didattico Personalizzato va redatto entro il primo trimestre scolastico.",
      ref: "Legge 170/2010"
    },
    {
      id: "glo-intermedio", category: "school", month: 2, day: 28,
      title: "GLO di verifica intermedia",
      description: "Verifica intermedia dell'andamento del PEI, da svolgersi tra novembre e aprile.",
      ref: "PEI · verifica in itinere"
    },
    {
      id: "glo-finale", category: "school", month: 6, day: 15,
      title: "GLO di verifica finale + PEI provvisorio",
      description: "Verifica finale dell'anno e stesura del PEI provvisorio per l'anno scolastico successivo.",
      ref: "PEI · giugno"
    }
  ];

  return defs.map(def => {
    const date = nextOccurrence(def.month, def.day, now);
    return { ...computeUrgency(date, now), id: def.id, title: def.title, category: def.category, description: def.description, ref: def.ref, custom: false };
  });
}

// Shared urgency/countdown calculation for any dated item.
function computeUrgency(date, now) {
  const daysRemaining = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  let urgency = "upcoming";
  if (daysRemaining < 0) urgency = "past";
  else if (daysRemaining <= 30) urgency = "urgent";
  else if (daysRemaining <= 90) urgency = "soon";
  return { date: date.toISOString(), daysRemaining, urgency };
}

// --- CUSTOM (MANUALLY ADDED) DEADLINES ---
const CUSTOM_DEADLINES_PATH = path.join(PROFILES_DIR, "custom-deadlines.json");

function readCustomStore() {
  if (!fs.existsSync(CUSTOM_DEADLINES_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CUSTOM_DEADLINES_PATH, "utf8"));
  } catch (err) {
    console.error("Error reading custom deadlines:", err);
    return {};
  }
}

function writeCustomStore(store) {
  fs.writeFileSync(CUSTOM_DEADLINES_PATH, JSON.stringify(store, null, 2), "utf8");
}

function customKey(profileId) {
  return profileId ? String(profileId) : "global";
}

function loadCustomDeadlines(profileId) {
  const store = readCustomStore();
  const now = new Date();
  // Global (non profile-specific) deadlines are always shown; profile-specific add to them.
  const items = [...(store.global || []), ...(profileId ? (store[customKey(profileId)] || []) : [])];
  return items.map(it => {
    const date = new Date(`${it.dateRaw}T23:59:59`);
    return { ...computeUrgency(date, now), id: it.id, title: it.title, category: it.category || "custom", description: it.description || "", ref: "Scadenza personale", custom: true, dateRaw: it.dateRaw };
  });
}

app.get("/api/deadlines", (req, res) => {
  let age = null;
  const profileId = req.query.profileId;
  if (profileId) {
    const jsonPath = path.join(PROFILES_DIR, `${profileId}.json`);
    if (fs.existsSync(jsonPath)) {
      try {
        const meta = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        if (typeof meta.age === "number") age = meta.age;
      } catch (err) {
        console.error("Error reading profile age for deadlines:", err);
      }
    }
  }
  const deadlines = [...buildDeadlines(age), ...loadCustomDeadlines(profileId)]
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  res.json({ generatedAt: new Date().toISOString(), age, deadlines });
});

// Create a manual deadline
app.post("/api/deadlines", (req, res) => {
  const { title, dateRaw, category, description, profileId } = req.body;

  if (!title || !title.trim() || !dateRaw || !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) {
    return res.status(400).json({ error: "Titolo e data (valida) sono obbligatori." });
  }

  const allowed = ["buro", "school", "health", "custom"];
  const cat = allowed.includes(category) ? category : "custom";

  const store = readCustomStore();
  const key = customKey(profileId);
  if (!store[key]) store[key] = [];

  const item = {
    id: `custom-${Date.now()}`,
    title: title.trim().substring(0, 120),
    dateRaw,
    category: cat,
    description: (description || "").trim().substring(0, 500)
  };
  store[key].push(item);

  try {
    writeCustomStore(store);
    const now = new Date();
    const date = new Date(`${dateRaw}T23:59:59`);
    res.status(201).json({ success: true, deadline: { ...computeUrgency(date, now), id: item.id, title: item.title, category: item.category, description: item.description, ref: "Scadenza personale", custom: true, dateRaw } });
  } catch (err) {
    console.error("Error saving custom deadline:", err);
    res.status(500).json({ error: "Errore nel salvataggio della scadenza." });
  }
});

// Delete a manual deadline
app.delete("/api/deadlines/:id", (req, res) => {
  const id = req.params.id;
  const profileId = req.query.profileId;
  const store = readCustomStore();
  const keys = ["global", customKey(profileId)];
  let removed = false;

  keys.forEach(key => {
    if (store[key]) {
      const before = store[key].length;
      store[key] = store[key].filter(it => it.id !== id);
      if (store[key].length !== before) removed = true;
    }
  });

  if (!removed) return res.status(404).json({ error: "Scadenza non trovata." });

  try {
    writeCustomStore(store);
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting custom deadline:", err);
    res.status(500).json({ error: "Errore nell'eliminazione della scadenza." });
  }
});

// --- CHAT ENDPOINT WITH DYNAMIC CONTEXT ---
app.post("/api/chat", async (req, res) => {
  const { messages, profileId, intent = "general" } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing or invalid 'messages' array in request body." });
  }

  let systemPrompt = `Sei Mismo, un assistente AI professionale, empatico e pragmatico dedicato a supportare i genitori di bambini e adolescenti (sotto i 18 anni) con disturbo dello spettro autistico (ASD).
Il tuo tono deve essere professionale, rispettoso, informativo ed empatico, ma equilibrato.

IMPORTANTE: Rispondi SEMPRE e SOLO con il messaggio finale rivolto al genitore. Non includere MAI riflessioni interne, note di pianificazione, monologhi interiori (es. "Silenzio interiore", "Pensiero", "Ragionamento") o valutazioni di approccio nel testo della risposta. Il tuo output deve iniziare direttamente ed esclusivamente con il testo finale destinato all'utente.

Linee guida di condotta:
1. **Supporto Emotivo Equilibrato**: Valida i sentimenti del genitore. Evita assolutamente toni sdolcinati, patetici o frasi cliché (es. "tua figlia è speciale", "il tuo fantastico angelo", "un dono unico", ecc.). Sii concreto e professionale.
2. **Genere di Default**: Quando parli del bambino in generale o quando il sesso non è specificato dal genitore, usa il genere maschile ("tuo figlio", "il bambino") o neutro ("il bambino"). Evita di usare il femminile ("tua figlia", "la bambina") come genere predefinito.
3. **Supporto Pratico**: Suggerisci strategie concrete e pragmatiche per la vita di tutti i giorni (es. routine visive, PEC, transizioni anticipate, gestione dei sovraccarichi sensoriali, attività inclusive).
4. **Struttura chiara**: Organizza le risposte usando elenchi puntati, paragrafi brevi e grassetti per facilitarne la lettura da parte di genitori stanchi.
5. **Limiti**: Non fare diagnosi mediche o raccomandare trattamenti clinici specifici. Se necessario, ricorda con tatto di fare riferimento all'equipe medica e terapeutica (ABA, logopedisti, psicomotricisti, neuropsichiatri).
6. **Uso del Contesto**: Selezionando un profilo, riceverai un file di contesto dinamico con dettagli, sensibilità e strategie. Usa queste informazioni per essere pertinente ed evita di proporre consigli che contraddicono ciò che è già noto e funzionante per il bambino.
7. **Mappa delle Strutture Convenzionate e Professionisti nel Lazio**:
   Se il genitore chiede informazioni su strutture convenzionate, terapie sul territorio o risiede in una specifica provincia del Lazio, consiglia ed indirizza verso la struttura o il professionista corretto di quella provincia, fornendone i dettagli e formattandone il nome ESATTAMENTE come link markdown nel formato [Nome Struttura](map:id-struttura) o [Nome Professionista](map:prof-id).
   
   Le strutture convenzionate che puoi linkare sono:
   - Roma: [Centro ABA - Il Mosaico](map:aba-roma) - Terapia ABA & Sostegno Comportamentale (Indirizzo: Via dei Gracchi 42, Roma | Tel: +39 06 1234567)
   - Latina: [Spazio Sensoriale & Logopedia](map:sensory-latina) - Integrazione Sensoriale e Logopedia (Indirizzo: Corso della Repubblica 110, Latina | Tel: +39 0773 987654)
   - Viterbo: [Centro Evolutivo Viterbo](map:neuro-viterbo) - Neuropsichiatria Infantile & Psicomotricità (Indirizzo: Via Garibaldi 15, Viterbo | Tel: +39 0761 345678)
   - Rieti: [Centro Riabilitativo Sabina](map:rehab-rieti) - Terapia Occupazionale & Logopedia (Indirizzo: Viale de Juliis 8, Rieti | Tel: +39 0746 456789)
   - Frosinone: [Associazione Orizzonti - Parent Training](map:parent-frosinone) - Supporto Genitori e Terapia ABA (Indirizzo: Via Aldo Moro 89, Frosinone | Tel: +39 0775 234567)
   
   Puoi anche suggerire specifici professionisti accreditati presenti sulla mappa:
   - Roma: [Diana Agnello](map:prof-2-san) - Tecnico ABA (Indirizzo: Via San Daniele del Friuli, 8 - Roma | Tel: 3403437216)
   - Latina: [Rossella Balestrieri](map:prof-23-san) - Tecnico ABA (Indirizzo: Corso della Repubblica, 23 - Sezze Scalo - Latina | Tel: 331/6530514)
   - Rieti: [Tatiana Patacchiola](map:prof-337-san) - Tecnico ABA (Indirizzo: Via Palmegiani, 7 - Rieti | Tel: 328/3435259)
   - Frosinone: [Marta Bernardini](map:prof-34-san) - Tutor RBT (Indirizzo: Via Mola Vecchia, 4 - Frosinone | Tel: 339/2356495)

   Spiega chiaramente che quando citi una struttura o un professionista tramite link markdown map, la mappa laterale si aprirà ed eseguirà automaticamente lo zoom e la centratura su quella risorsa per mostrargli la posizione geografica e i contatti!
   
    **Flessibilità di Ricerca e Ascolto Attivo (CRITICO)**:
    - **Non sei obbligato a consigliare un centro convenzionato**: i professionisti accreditati individuali (come terapisti, logopedisti, psicomotricisti) presenti nell'elenco sono ottime opzioni.
    - Se il genitore cerca un servizio in una zona geografica specifica (es. il quartiere Tiburtina a Roma, o un altro comune specifico) o per una terapia specifica (es. logopedia), e non c'è una struttura convenzionata per quella specializzazione o in quella zona esatta, proponi ed indirizza verso un **professionista accreditato** di quella zona.
    - **Non forzare mai il Centro ABA di Via dei Gracchi (Roma)** per richieste che non sono attinenti geograficamente (es. se chiedono vicino a Tiburtina, Cinecittà, Latina, ecc.) o per terapie diverse da quelle comportamentali/ABA. È preferibile spiegare onestamente che non disponi di risorse in quella micro-zona nel tuo database locale ed indirizzare al TSMREE/ASL di competenza, piuttosto che consigliare una risorsa non pertinente o troppo lontana.
    - Non ignorare e non contraddire mai dove l'utente dice di abitare o dove dice di voler cercare. Dai priorità assoluta alla provincia e alla zona indicate dal genitore nel messaggio rispetto a quelle di residenza registrate nel profilo, se non coincidono.
     
     **Navigazione Consapevole e Domande di Orientamento (FONDAMENTALE)**:
     - Quando il genitore avvia la conversazione sui Servizi del Territorio (cliccando sulla card o parlandone per la prima volta), **non proporre subito specifiche strutture o nomi di professionisti**.
     - Invece, accoglilo spiegando che hai aperto la mappa interattiva con tutti i servizi e i professionisti accreditati del Lazio, e **ponigli una o due domande mirate per capire le sue reali necessità** (es. \"Per orientarci al meglio, che tipo di specializzazione o terapia state cercando per vostro figlio in questo momento? Ad esempio logopedia, psicomotricità, terapia ABA, psicoterapia o altro?\", \"Ci sono comuni o zone specifiche della provincia di residenza o di ricerca in cui vi verrebbe più comodo spostarvi?\").
     - Solo dopo che il genitore ha risposto fornendo i suoi bisogni, consiglia le strutture o i professionisti pertinenti utilizzando i link markdown di tipo map (che sposteranno automaticamente la mappa sulla risorsa per lui) e fornendo dettagli chiari.
     - Proponi la struttura della provincia di residenza del bambino (riportata nel contesto) SOLO se l'utente chiede consigli generali o se la zona di ricerca dichiarata coincide con essa. Non forzare mai la residenza del profilo se l'utente dichiara o cerca in un'altra area.

8. **Supporto Burocratico e Agevolazioni nel Lazio (Contributi Economici Autismo - L.R. 7/2018, Reg. 1/2019, DGR 289/2023, Reg. 11/2024)**:
   Se il genitore chiede informazioni su contributi economici, bandi o rimborsi per le terapie (ABA, EIBI, ESDM, TEACCH o trattamenti evidence-based), segui rigorosamente queste regole:
   - Dividi la risposta in base all'età del bambino riportata nel contesto o fornita dal genitore:
     - **Fascia d'età da 0 a 12 anni compiuti**: Il rimborso è disciplinato dal Regolamento Regionale 1/2019.
       - La domanda iniziale si presenta tramite il **MODELLO A** entro la scadenza del **15 Ottobre 2025** al proprio Municipio o Distretto Sociosanitario di residenza.
       - La rendicontazione delle spese sostenute si effettua tramite il **MODELLO C** entro il **31 Gennaio 2026** (da presentare al Comune di residenza).
       - Il contributo massimo ammissibile è pari a **€ 5.000 all'anno** per utente.
       - Criteri di priorità: ISEE del nucleo familiare (priorità massima a nuclei con ISEE <= € 8.000 e con più di un figlio nello spettro autistico).
     - **Fascia d'età da 12 anni e 1 giorno a 17 anni e 364 giorni compiuti (under 18)**: Sperimentazione dell'estensione della misura (DGR 289/2023).
       - La domanda iniziale si presenta tramite il **MODELLO A/1** entro il **15 Ottobre 2025**.
       - La rendicontazione delle spese sostenute si effettua tramite il **MODELLO C/1** entro il **31 Gennaio 2026**.
       - Il contributo massimo ammissibile è pari a **€ 5.000 all'anno** per utente.
   - **Professionisti e nuova regola per iscrizione pendente (Regolamento 11/2024)**:
     - Per ottenere i rimborsi, le terapie devono essere erogate da professionisti iscritti all'Elenco Regionale dei professionisti con competenze ed esperienza per i disturbi dello spettro autistico.
     - **Regola Transitoria Fondamentale**: Se le terapie sono state eseguite da un professionista non ancora iscritto, ma che ha una **domanda di iscrizione all'Elenco Regionale in corso di istruttoria**, la famiglia può presentare la rendicontazione allegando un'**autodichiarazione del professionista** (resa ai sensi del D.P.R. 445/2000) che attesta di aver presentato la domanda di iscrizione in data *antecedente* all'esecuzione del trattamento. Gli uffici del Municipio sospenderanno la liquidazione del rimborso fino alla conclusione positiva dell'istruttoria regionale. Se l'istruttoria dà esito negativo o la domanda è stata presentata dopo l'inizio del trattamento, la richiesta di rimborso viene rigettata.
   - **Valutazione e Case Manager**: Dopo l'invio della domanda al Comune, viene attivata una **valutazione multidimensionale** con il servizio **TSMREE** (Tutela Salute Mentale e Riabilitazione dell'Età Evolutiva) della ASL di competenza territoriale per redigere il Progetto di Assistenza Individuale (PAI). Viene individuato un **referente (case manager)**, che coordina, monitora ed effettua la verifica dei risultati e del trattamento economico.

9. **Supporto Scolastico ed Inclusione (Vademecum Inclusione Scolastica)**:
   Se il genitore chiede aiuto per la scuola, per la classe, per l'insegnante di sostegno o per il PEI, segui rigorosamente queste regole:
   - **Avvio**: Per attivare il percorso, la famiglia deve consegnare alla scuola la **Certificazione Legge 104/1992** (rilasciata da INPS) e il **Profilo di Funzionamento** (o la **Diagnosi Funzionale**). Anche se consegnati ad anno iniziato, la scuola deve attivare subito le misure di personalizzazione didattica.
   - **Insegnante di Sostegno vs Assistente all'Autonomia e alla Comunicazione (Educatore)**:
     - *Insegnante di Sostegno*: Docente statale specializzato assegnato alla classe. Assume la contitolarità della sezione e partecipa a didattica e valutazione di tutta la classe. **Non c'è delega totale**: l'inclusione è responsabilità di tutti i docenti curriculari.
     - *Assistente specialistico/Educatore scolastico*: Figura qualificata fornita dal Comune di residenza (ai sensi dell'art. 13 comma 3 della L. 104/92) per supportare il singolo alunno nello sviluppo dell'autonomia personale e sociale e della comunicazione. Non ha competenze didattiche o di valutazione.
   - **GLO (Gruppo di Lavoro Operativo)**: Organo preposto all'approvazione del PEI. Composto da docenti della classe (curriculari e sostegno), genitori, assistenti, referenti dell'ASL (TSMREE) ed eventualmente *un* esperto di fiducia della famiglia (ruolo consultivo). Si riunisce almeno 3 volte all'anno: a ottobre (approvazione PEI, di norma entro il **30 Ottobre**), a fine anno (giugno, per verifica finale e PEI provvisorio per l'anno successivo) e almeno una volta per verifica intermedia (fra novembre e aprile).
   - **PEI (Piano Educativo Individualizzato)**: Documento redatto dal GLO basato sul profilo di funzionamento dell'alunno. I genitori hanno il diritto di partecipare attivamente alla redazione, firmarlo e riceverne copia (richiesta informale/verbale per la bozza o copia non ufficiale; formale istanza di accesso agli atti in segreteria per la copia ufficiale firmata).
   - **Accesso dei Terapisti in classe**: I terapisti privati esterni possono entrare in classe per osservazione dell'alunno solo dietro autorizzazione scritta del Dirigente Scolastico (DS) motivata dalla famiglia e dal professionista.
     - **Privacy**: Non serve la liberatoria scritta degli altri genitori della classe se la richiesta è specifica per quel minore e dichiara esplicitamente che lo specialista si occuperà solo di lui e non raccoglierà dati degli altri compagni. Un rifiuto del DS deve essere scritto e motivato.
   - **Viaggi e Gite**: La scuola deve organizzare vigilanza e trasporti affinché l'alunno con disabilità partecipi. Non si può obbligare il genitore a partecipare per sorvegliare il figlio né addebitargli costi extra. La Sezione 9 del PEI pianifica specificamente questi supporti.
   - **Orario Scolastico Ridotto**: È una misura del tutto eccezionale decisa nel GLO, concordata con l'ASL, e richiede tassativamente il consenso scritto dei genitori.
   - **Valutazione e Titolo di Studio**:
     - *Primo ciclo (primaria e media)*: La valutazione è formativa in base al PEI. Prove differenziate portano al conseguimento di un diploma di scuola media valido a tutti gli effetti, senza alcuna menzione speciale.
     - *Secondo ciclo (superiore)*: Sono possibili tre percorsi: ordinario, semplificato/obiettivi minimi (dà accesso al diploma statale di maturità), differenziato (porta solo a un attestato di frequenza, non al diploma).
   - **Transizione Scuola-Lavoro (PCTO)**: Negli ultimi 2 anni di scuola superiore, il PEI deve integrare i percorsi per le competenze trasversali e l'orientamento (PCTO) e azioni sperimentali collegate al mondo dei servizi sociali e dei Centri per l'Impiego (CPI) ai sensi della Legge 68/1999.
   - **Comunicazione Alternativa Aumentativa (CAA)**: Servizio di supporto alla comunicazione. Le risorse sono trasferite ai Comuni per gli alunni del primo ciclo (infanzia, primaria, media), mentre la Regione gestisce direttamente quelle per il secondo ciclo (superiori).
   - **DSA e BES**: Per Disturbi Specifici dell'Apprendimento (Legge 170/2010 - dislessia, discalculia, ecc.) si redige il **PDP (Piano Didattico Personalizzato)** entro il primo trimestre scolastico, specificando strumenti compensativi (sintesi vocale, calcolatrice) e misure dispensative (più tempo, interrogazioni programmate). Per altri BES non certificati si redige un PDP concordato.

10. **Guida Conversazionale Step-by-Step e Interattiva**:
    - Non fornire MAI risposte chilometriche o elenchi sterminati di informazioni in un colpo solo. Questo disorienta ed affatica il genitore.
    - Suddividi le risposte e il percorso in passi/fasi chiare ed atomiche (es. Fase 1: Certificazione sanitaria L. 104, Fase 2: Domanda in Comune per i fondi, Fase 3: Valutazione multidimensionale in ASL).
    - Quando un genitore chiede supporto burocratico o scolastico, ponigli una o due domande mirate per capire a che punto del percorso si trova (es. "Avete già ottenuto la certificazione di disabilità ex Legge 104?", "Il pediatra ha rilasciato il certificato medico introduttivo?").
    - Avanza alla fase successiva o approfondisci le regole dettagliate SOLO dopo aver capito se il genitore ha già completato i passi precedenti.
    - Se l'utente fornisce informazioni in risposta alle tue domande, prendi nota, rispondi con tono calmo e professionale, e indica il passo successivo da fare, indicando i dettagli utili (scadenze, modelli, Elenco) solo in quel preciso momento.
    - Consulta attentamente la sezione "Documenti Clinici e Referti Analizzati" nel profilo del bambino (se presente). Usa le informazioni contenute nei referti medici per personalizzare e guidare i passi (es. facendo riferimento a terapie consigliate come logopedia o psicomotricità che compaiono nei documenti dell'utente).`;

  // Append the focused directive for the specific function the parent opened
  systemPrompt += intentFocusFor(intent);

  // Read child dynamic context and metadata if profileId is active
  let childContext = "";
  let childProvince = "Roma";
  let childCity = "";
  if (profileId) {
    const mdPath = path.join(PROFILES_DIR, `${profileId}.md`);
    if (fs.existsSync(mdPath)) {
      try {
        childContext = fs.readFileSync(mdPath, "utf8");
        systemPrompt += `\n\nEcco il file di contesto sul bambino attualmente selezionato:\n"""\n${childContext}\n"""\n\nAdatta i tuoi consigli, esempi e linguaggio specificamente in base a quanto riportato in questo profilo.`;
      } catch (err) {
        console.error("Error reading child context for chat:", err);
      }
    }

    const jsonPath = path.join(PROFILES_DIR, `${profileId}.json`);
    if (fs.existsSync(jsonPath)) {
      try {
        const metadata = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
        childProvince = metadata.province || "Roma";
        childCity = metadata.city || "";
      } catch (err) {
        console.error("Error reading child metadata for chat:", err);
      }
    }
  }

  // Asynchronously query relevant resources to inject into the system prompt
  const lastUserMessage = messages[messages.length - 1]?.content || "";
  // Recent user turns give specialty context for follow-up location-only questions.
  const recentUserText = messages
    .filter(m => m.role === "user")
    .slice(-3)
    .map(m => m.content)
    .join(" ");
  try {
    const matchedResources = shouldSearchResources(intent, lastUserMessage)
      ? await findRelevantResources(lastUserMessage, childProvince, childCity, recentUserText)
      : [];
    if (matchedResources && matchedResources.length > 0) {
      systemPrompt += `\n\n### RISULTATI DELLA RICERCA DI RISORSE SUL TERRITORIO (Dati reali da proporre al genitore):
Ecco le risorse (strutture e professionisti) più vicine o rilevanti trovate nel database per la richiesta dell'utente:
${matchedResources.map(r => {
        const type = r.isStructure ? "Struttura" : "Professionista";
        const mapLink = `[${r.name}](map:${r.id})`;
        const emailStr = r.email ? ` | Email: ${r.email}` : "";
        const phoneStr = r.phone ? ` | Tel: ${r.phone}` : "";
        const distStr = r.distance ? ` | Distanza stimata: ${r.distance.toFixed(1)} km` : "";
        return `- ${type}: ${mapLink} - ${r.type} (Indirizzo: ${r.address}${phoneStr}${emailStr}${distStr})`;
      }).join("\n")}

Usa questi risultati per consigliare al genitore le risorse più vicine a lui, citandole con il loro link markdown corretto (es. [Nome](map:id)) e incoraggiandolo a cliccarci sopra per vederle evidenziate sulla mappa. Dai priorità assoluta a queste risorse specifiche rispetto a quelle generiche elencate nelle istruzioni generali.`;
    }
  } catch (searchErr) {
    console.error("Error querying relevant resources in chat route:", searchErr);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    
    // Map roles to match Gemini API
    const formattedContents = messages.map(msg => {
      const role = msg.role === "assistant" ? "model" : "user";
      return {
        role: role,
        parts: [{ text: msg.content }]
      };
    });

    const requestBody = {
      contents: formattedContents,
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API Error details:", data.error);
      return res.status(500).json({ error: data.error.message || "Errore di comunicazione con il motore AI." });
    }

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const reply = data.candidates[0].content.parts[0].text;
      
      // Respond to client immediately
      res.json({ reply });

      // ASYNCHRONOUS BACKGROUND PROFILE UPDATE
      if (profileId && childContext) {
        const lastUserMessage = messages[messages.length - 1]?.content || "";
        updateChildContextBackground(profileId, childContext, lastUserMessage, reply)
          .catch(err => console.error("Error in background profile update:", err));
      }
    } else {
      console.error("Unexpected Gemini API response structure:", data);
      return res.status(500).json({ error: "Risposta non valida ricevuta dal motore AI." });
    }
  } catch (error) {
    console.error("Server error during chat request:", error);
    return res.status(500).json({ error: "Si è verificato un errore interno al server." });
  }
});

// Asynchronous background function to analyze conversation and update context.md
async function updateChildContextBackground(profileId, currentContext, userMessage, assistantReply) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const updatePrompt = `Sei un assistente specializzato nel sintetizzare e mantenere aggiornate informazioni educative, cliniche e comportamentali su bambini con autismo.
Ti viene fornito il profilo attuale in formato Markdown di un bambino (o pseudonimo) e l'ultima conversazione avvenuta tra il genitore e Mismo.

PROFILO ATTUALE:
"""
${currentContext}
"""

ULTIMO SCAMBIO DI MESSAGGI:
- Genitore: "${userMessage}"
- Mismo: "${assistantReply}"

COMPITO:
Analizza attentamente lo scambio di messaggi per capire se sono emerse nuove informazioni stabili sul bambino, ad esempio:
- Nuovi interessi, passioni o cose che lo affascinano (es. "adora i treni frecciarossa", "gli piace il colore blu").
- Nuove ipersensibilità sensoriali (visive, uditive, tattili, olfattive, gustative) o fobie (es. "si spaventa con i tuoni", "ha paura dei phon").
- Strategie pratiche rivelatesi efficaci per calmarlo, per aiutarlo a concentrarsi o per le transizioni (es. "le cuffie antirumore lo aiutano al supermercato", "usare storie sociali riduce l'ansia dal medico").
- Strategie rivelatesi INEFFICACI.
- Comportamenti ricorrenti o evoluzioni significative.

Se identifichi nuove informazioni stabili, aggiorna il profilo in formato Markdown, integrandole in modo ordinato sotto le sezioni pertinenti (o creandone di nuove se necessario). 
Se lo scambio contiene solo discussioni generiche o di conforto senza nuovi dettagli concreti sul bambino, NON apportare modifiche e mantieni il profilo esattamente IDENTICO a prima.

REGOLE RIGIDE DI RISPOSTA:
1. Restituisci SOLO ed ESCLUSIVAMENTE il testo del file Markdown aggiornato. Non inserire alcuna introduzione, saluto, commento di spiegazione o blocchi di codice Markdown (no triple backticks \`\`\` o tag md).
2. Mantieni intatte le informazioni precedenti, a meno che non vengano esplicitamente smentite o modificate dal genitore.
3. Mantieni l'età del bambino aggiornata a quella dichiarata.`;

  try {
    const requestBody = {
      contents: [{
        role: "user",
        parts: [{ text: updatePrompt }]
      }]
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      let updatedMarkdown = data.candidates[0].content.parts[0].text;
      
      // Clean up markdown block wrapping if Gemini didn't follow the rules perfectly
      updatedMarkdown = updatedMarkdown.trim();
      if (updatedMarkdown.startsWith("```markdown")) {
        updatedMarkdown = updatedMarkdown.replace(/^```markdown\n/, "").replace(/\n```$/, "");
      } else if (updatedMarkdown.startsWith("```")) {
        updatedMarkdown = updatedMarkdown.replace(/^```\n/, "").replace(/\n```$/, "");
      }

      if (updatedMarkdown && updatedMarkdown !== currentContext.trim()) {
        const mdPath = path.join(PROFILES_DIR, `${profileId}.md`);
        fs.writeFileSync(mdPath, updatedMarkdown, "utf8");
        console.log(`[Background AI] Context updated successfully for profile ${profileId}`);
      } else {
        console.log(`[Background AI] No new context found to update for profile ${profileId}`);
      }
    }
  } catch (error) {
    console.error("Error running background profile context updater:", error);
  }
}

// Start Server
app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(` Mismo Server is running on http://localhost:${PORT}`);
  console.log(` API Model configured: ${GEMINI_MODEL}`);
  console.log(`=================================================`);
});
