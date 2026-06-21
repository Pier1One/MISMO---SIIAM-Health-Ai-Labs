# Mismo

**Mismo** is a specialized, AI-driven support platform designed to guide parents of children and adolescents (under 18) with Autism Spectrum Disorder (ASD) through their daily lives, clinical journeys, and administrative duties. Navigating the world of neurodivergence is often overwhelming for families, who must deal with fragmented health services, complicated school inclusion procedures, and dense bureaucratic frameworks. Mismo addresses these challenges by consolidating information, maintaining a dynamic record of the child's needs, and providing localized, context-aware assistance.

---

## 🏛️ Project Concept and Core Flow

At its heart, Mismo functions as a central dashboard that bridges the gap between raw clinical/bureaucratic requirements and a parent's actual daily routine. The platform is built around four main pillars, each working together to keep the parent's workspace relevant, up-to-date, and actionable.

### 1. The Dynamic Child Profile
Traditional patient files are static and quickly become outdated. Mismo resolves this by maintaining a **Dynamic Profile** for each child (`profiles/<id>.md`). When a profile is created, it begins with basic metadata and parent notes. However, as the parent interacts with the chat assistant, an asynchronous background pipeline analyzes the conversation. 

If the parent mentions a new preference (such as a passion for trains), a sensory sensitivity (like a fear of hand dryers), or a successful decompression technique, the background AI extracts this behavioral datum and rewrites the profile markdown file. This ensures that future advice, resources, and interactions are always tailored to the child's evolving profile, preventing the parent from having to repeat context.

### 2. Clinical Document Analysis and Synthesis
Autism support generates a substantial paper trail: medical reports, IEP/PEI (Piano Educativo Individualizzato) plans, INPS welfare letters, and therapy invoices. Mismo includes a **Document Analyzer** that handles PDFs, images, and raw text. 

When a parent uploads a file, the Node.js backend uses a Python extraction tool or sends images directly to Google Gemini's multimodal API. Depending on the document's category, the model receives a tailored expert directive:
*   **Medical Reports:** The AI acts as a developmental specialist, extracting diagnoses, support levels, therapy guidelines, and strengths.
*   **School Documentation:** The system focuses on educational accommodations, assigned support hours, and social-relational goals.
*   **Welfare & INPS Certificates:** The model targets legal recognition tiers (such as Law 104/92 classifications), validity ranges, and scheduled review dates.
*   **Invoices:** The analyzer targets transaction dates, costs, therapies, and compatibility with regional funding rules.

Once extracted, these summaries are consolidated into the child's dynamic context file, enabling the chat assistant to cross-reference real clinical findings when answering questions.

### 3. Contextual Dialogue & Specialist Intents
Instead of acting as a general-purpose chatbot, Mismo's assistant adapts its behavior based on the parent's current task. The application uses a set of **Specialist Intents** that modify the core system instructions:
*   *Child Profiling (`about`):* Focuses entirely on listening and profiling. The AI introduces itself and asks open, gentle questions, avoiding premature clinical advice.
*   *ASD Education (`study`):* Delivers structured, step-by-step information regarding autism levels, ABA, TEACCH, and AAC/CAA, quoting reliable institutional guidelines (e.g., the Italian National Institute of Health - ISS).
*   *Timeline & Deadlines (`calendar`):* Connects directly to the user interface to explain upcoming regional bureaucratic and school milestones, directing parents on what to prepare.
*   *Accessible Healthcare (`health`):* Focuses on the DAMA (Disabled Advanced Medical Assistance) and TOBIA pathways in the Lazio region, explaining how to coordinate sensory-friendly medical visits.
*   *Welfare & Schooling (`buro`, `school`):* Assists step-by-step with regional aid applications, GLO meetings, IEP drafting, and classroom therapist integration.

### 4. RAG-Based Local Service Registry
Finding accredited specialists or inclusive leisure activities is simplified through a **Retrieval-Augmented Generation (RAG)** pipeline. When a user asks about services or sports nearby, Mismo triggers a search against a local database of accredited professionals and facilities. 

The server queries the Nominatim OpenStreetMap API to geocode the request (using a local JSON cache to prevent redundant API calls). It then uses the Haversine formula to compute distance from the child's residence or a custom search address, injecting the nearest matches directly into the Gemini prompt. The assistant then renders these recommendations as interactive markdown map links (e.g., `[Center](map:id)`) which, when clicked on the frontend, highlight the resource on the dashboard's map.

---

## 🇮🇹 Lazio Region Welfare Integration

Mismo is configured to help families navigate the specific legal and administrative landscape of the **Lazio Region (Italy)**, including DGR 289/2023 and Regolamento Regionale 1/2019:
*   **Childhood Bracket (0–12 years):** Governed by Regolamento 1/2019, enabling up to € 5,000/year in therapy rimborsi. Domanda forms (Modello A) are submitted by October 15, and expenses (Modello C) are filed by January 31.
*   **Adolescent Bracket (13–17 years):** Governed by DGR 289/2023, expanding the € 5,000/year support to teenagers via Modello A/1 and Modello C/1 forms.
*   **Transitional Therapist Registry Rules (Regolamento 11/2024):** Mismo helps parents claim reimbursement for therapists whose formal register enrollment is pending, detailing how to draft and attach the required self-declarations.
*   **Case Management:** Guides parents through multidimensional evaluations with the ASL (TSMREE) to draft the PAI (Progetto di Assistenza Individuale) and assign a Case Manager.

---

## 🛠️ Technology Stack & Architecture

*   **Runtime:** Node.js (Express) using ES Modules.
*   **AI Engine:** Google Gemini API configured for both text and multimodal processing.
*   **Frontend:** Single-page dashboard built using vanilla HTML5, CSS3, and JavaScript, featuring interactive map triggers.
*   **Data Storage:** File-based databases. Child metadata, markdown profiles, and geocoded search caches are stored locally within the `profiles/` and `RISORSE/` folders to ensure absolute privacy.
*   **Document Extraction:** Python scripting integrated with Node's subprocesses to handle text extraction from complex PDF structures.

---

## 📂 Directory Layout

```text
├── server.js                 # Express application handling routes, AI logic, and search calculations
├── package.json              # Backend script entrypoints and package definitions
├── public/                   # Client SPA files
│   ├── index.html            # Main dashboard interface
│   ├── style.css             # Layout styling, transitions, and responsive sidebars
│   └── app.js                # Frontend API handlers and interactive map logic
├── profiles/                 # Patient database
│   ├── <profileId>.json      # Child metadata (residence, age, etc.)
│   ├── <profileId>.md        # Dynamic Markdown profile (AI-updated)
│   ├── custom-deadlines.json # Custom dates set by the family
│   └── documents/            # Category-sorted documents and their AI analysis files
└── RISORSE/                  # Database lists, conversion tools, and geocoder scripts
    ├── professionisti.json   # Registry of accredited practitioners
    ├── sport_strutture.json  # Database of inclusive sport clubs
    ├── geocoded_cache.json   # Cache of geographic coordinates
    └── pdf_extractor.py      # PDF parsing utility
```

---

## 🚀 Installation & Local Run

### 1. Prerequisites
*   Node.js (v18+)
*   Python 3 (with pdf-parsing packages if compiling raw documents)
*   A valid Google Gemini API Key

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Server
Launch the development server with watch mode:
```bash
npm run dev
```
Or start the production process:
```bash
npm start
```
The application will run locally at `http://localhost:3000`.
