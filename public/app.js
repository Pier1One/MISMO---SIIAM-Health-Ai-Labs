// Mismo - Client-Side Logic

document.addEventListener("DOMContentLoaded", () => {
  // --- STATE ---
  let messages = [];
  let profiles = [];
  let activeProfileId = "";
  let map = null;
  let mapMarkers = {};
  let structures = [];
  // Tracks which "function" the conversation is in, so the backend can use a focused prompt.
  let currentIntent = "general";

  // Maps each starter card to its backend intent (function).
  const CARD_INTENT = {
    "card-about": "about",
    "card-buro": "buro",
    "card-study": "study",
    "card-school": "school",
    "card-territory": "territory",
    "card-sport": "sport",
    "card-calendar": "calendar",
    "card-health": "health",
    "card-market": "market",
    "card-babysitting": "babysitting"
  };

  // --- DOM ELEMENTS ---
  const body = document.body;
  const sidebar = document.getElementById("app-sidebar");
  const menuToggleBtn = document.getElementById("menu-toggle");
  
  // Navigation & Chat Areas
  const chatMessages = document.getElementById("chat-messages");
  const welcomeScreen = document.getElementById("welcome-screen");
  const chatForm = document.getElementById("chat-form");
  const userInput = document.getElementById("user-input");
  const typingIndicator = document.getElementById("typing-indicator");
  const clearChatBtn = document.getElementById("clear-chat-btn");
  const showDashboardBtn = document.getElementById("show-dashboard-btn");
  const closeDashboardBtn = document.getElementById("close-dashboard-btn");
  const chatInputContainer = document.querySelector(".chat-input-container");

  // Map elements
  const showMapBtn = document.getElementById("show-map-btn");
  const closeMapBtn = document.getElementById("close-map-btn");
  const mapOverlay = document.getElementById("map-overlay");

  // Panel toggles
  const activeProfilePanel = document.getElementById("active-profile-panel");
  const registrationPanel = document.getElementById("registration-panel");
  const btnRegisterTrigger = document.getElementById("btn-register-trigger");
  
  // Active Profile elements
  const profileSelect = document.getElementById("profile-select");
  const btnDeleteProfile = document.getElementById("btn-delete-profile");
  const activeProfileIdKey = "mismo-active-profile-id";
  
  // Workspace tabs
  const workspaceTabs = document.getElementById("workspace-tabs");
  const tabChat = document.getElementById("tab-chat");
  const tabProfile = document.getElementById("tab-profile");

  // Profile Page elements
  const profilePageContainer = document.getElementById("profile-page-container");
  const profilePageTitle = document.getElementById("profile-page-title");
  const profilePageAge = document.getElementById("profile-page-age");
  const profilePageResidence = document.getElementById("profile-page-residence");
  const profileAvatarInitials = document.getElementById("profile-avatar-initials");
  const profileBtnChatShortcut = document.getElementById("profile-btn-chat-shortcut");
  const profileContextContent = document.getElementById("profile-context-content");
  const docCategories = ["medical", "invoice", "school", "inps"];
  const fileInputs = {
    medical: document.getElementById("file-input-medical"),
    invoice: document.getElementById("file-input-invoice"),
    school: document.getElementById("file-input-school"),
    inps: document.getElementById("file-input-inps")
  };
  const uploadLoaders = {
    medical: document.getElementById("upload-loader-medical"),
    invoice: document.getElementById("upload-loader-invoice"),
    school: document.getElementById("upload-loader-school"),
    inps: document.getElementById("upload-loader-inps")
  };
  const docsLists = {
    medical: document.getElementById("docs-list-medical"),
    invoice: document.getElementById("docs-list-invoice"),
    school: document.getElementById("docs-list-school"),
    inps: document.getElementById("docs-list-inps")
  };
  const dropzones = {
    medical: document.getElementById("dropzone-medical"),
    invoice: document.getElementById("dropzone-invoice"),
    school: document.getElementById("dropzone-school"),
    inps: document.getElementById("dropzone-inps")
  };
  const liveUpdateStatus = document.getElementById("live-update-status");

  // Deadlines (Calendar function) elements
  const deadlinesContainer = document.getElementById("deadlines-container");
  const deadlinesTimeline = document.getElementById("deadlines-timeline");
  const deadlinesCalendar = document.getElementById("deadlines-calendar");
  const deadlinesSubtitle = document.getElementById("deadlines-subtitle");
  const deadlinesBackBtn = document.getElementById("deadlines-back-btn");
  const viewListBtn = document.getElementById("view-list-btn");
  const viewCalendarBtn = document.getElementById("view-calendar-btn");
  const deadlineAddBtn = document.getElementById("deadline-add-btn");
  const deadlineForm = document.getElementById("deadline-form");
  const deadlineTitle = document.getElementById("deadline-title");
  const deadlineDate = document.getElementById("deadline-date");
  const deadlineCategory = document.getElementById("deadline-category");
  const deadlineDescription = document.getElementById("deadline-description");
  const deadlineFormError = document.getElementById("deadline-form-error");
  const deadlineCancelBtn = document.getElementById("deadline-cancel-btn");

  // Deadlines view state
  let deadlinesData = [];
  let deadlinesView = "list";
  let calendarMonth = new Date();
  const DEADLINE_MONTHS = ["Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno", "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"];
  const DEADLINE_WEEKDAYS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];

  // Registration elements
  const regChildName = document.getElementById("reg-child-name");
  const regChildAge = document.getElementById("reg-child-age");
  const regUsePseudonym = document.getElementById("reg-use-pseudonym");
  const regChildRegion = document.getElementById("reg-child-region");
  const regChildProvince = document.getElementById("reg-child-province");
  const regChildCity = document.getElementById("reg-child-city");
  const regChildNotes = document.getElementById("reg-child-notes");
  const regSaveBtn = document.getElementById("reg-save-btn");
  const regCancelBtn = document.getElementById("reg-cancel-btn");
  
  // Registration inline validation elements
  const regNameError = document.getElementById("reg-name-error");
  const regAgeError = document.getElementById("reg-age-error");

  // City list per province in Lazio
  const LAZIO_CITIES = {
    Roma: ["Roma", "Civitavecchia", "Fiumicino", "Guidonia Montecelio", "Tivoli", "Anzio", "Nettuno", "Ardea", "Marino", "Albano Laziale", "Monterotondo", "Ciampino", "Cerveteri", "Pomezia", "Frascati", "Velletri", "Genzano di Roma", "Bracciano", "Anguillara Sabazia", "Colleferro", "Zagarolo", "Palestrina", "Rignano Flaminio", "Mentana", "Fonte Nuova", "Ladispoli"],
    Frosinone: ["Frosinone", "Cassino", "Alatri", "Sora", "Ceccano", "Anagni", "Ferentino", "Veroli", "Pontecorvo", "Monte San Giovanni Campano", "Isola del Liri", "Fiuggi", "Boville Ernica", "Ceprano", "Arpino"],
    Latina: ["Latina", "Aprilia", "Terracina", "Formia", "Fondi", "Cisterna di Latina", "Sezze", "Gaeta", "Minturno", "Sabaudia", "Priverno", "Pontinia", "Cori", "Itri", "San Felice Circeo"],
    Rieti: ["Rieti", "Fara in Sabina", "Cittaducale", "Poggio Mirteto", "Borgorose", "Contigliano", "Tarano", "Magliano Sabina", "Antrodoco", "Leonessa", "Amatrice"],
    Viterbo: ["Viterbo", "Civita Castellana", "Tarquinia", "Vetralla", "Montefiascone", "Orte", "Montalto di Castro", "Ronciglione", "Tuscania", "Fabrica di Roma", "Soriano nel Cimino", "Acquapendente", "Sutri", "Capranica", "Bagnoregio"]
  };

  // --- MUTABLE UI STATE (declared before init to avoid TDZ) ---
  let overlay = null;
  let isDashboardActive = false;

  // --- INITIALIZATION ---
  loadThemeSettings();
  fetchProfiles();
  setupTextareaAutoGrow();
  setupMapTriggers();
  setupRegistrationValidation();
  setupWorkspaceTabs();
  setupUploadHandlers();
  setupDashboardTriggers();

  function showDashboard() {
    if (deadlinesContainer) deadlinesContainer.classList.add("hidden");
    const split = document.querySelector(".workspace-split");
    if (split) split.classList.remove("hidden");
    welcomeScreen.style.display = "flex";
    chatMessages.style.display = "none";
    if (chatInputContainer) chatInputContainer.style.display = "none";
    
    // Manage close button visibility
    if (messages.length > 0) {
      closeDashboardBtn.style.display = "block";
    } else {
      closeDashboardBtn.style.display = "none";
    }
    
    showDashboardBtn.classList.add("active-nav-btn");
    isDashboardActive = true;
  }

  function hideDashboard() {
    welcomeScreen.style.display = "none";
    chatMessages.style.display = "flex";
    if (chatInputContainer) chatInputContainer.style.display = "block";
    
    showDashboardBtn.classList.remove("active-nav-btn");
    isDashboardActive = false;
  }

  function toggleDashboard() {
    if (messages.length === 0) {
      showDashboard();
      return;
    }
    
    if (isDashboardActive) {
      hideDashboard();
    } else {
      showDashboard();
    }
  }

  function setupDashboardTriggers() {
    showDashboardBtn.addEventListener("click", () => {
      toggleDashboard();
    });
    
    closeDashboardBtn.addEventListener("click", () => {
      hideDashboard();
    });
    
    initDashboard();
  }

  function initDashboard() {
    if (messages.length === 0) {
      showDashboard();
    } else {
      hideDashboard();
    }
  }

  // --- TABS NAVIGATION ---
  function switchTab(tabId) {
    if (deadlinesContainer) deadlinesContainer.classList.add("hidden");
    if (tabId === "chat") {
      tabChat.classList.add("active");
      tabProfile.classList.remove("active");
      document.querySelector(".workspace-split").classList.remove("hidden");
      profilePageContainer.classList.add("hidden");
      userInput.focus();
    } else if (tabId === "profile") {
      tabProfile.classList.add("active");
      tabChat.classList.remove("active");
      document.querySelector(".workspace-split").classList.add("hidden");
      profilePageContainer.classList.remove("hidden");
    }
  }

  function setupWorkspaceTabs() {
    tabChat.addEventListener("click", () => switchTab("chat"));
    tabProfile.addEventListener("click", () => switchTab("profile"));
    profileBtnChatShortcut.addEventListener("click", () => switchTab("chat"));
  }

  // --- THEME ---
  function loadThemeSettings() {
    body.className = "light-theme";
  }

  // --- API CALLS: PROFILES ---

  // 1. Fetch profiles and populate dropdown
  async function fetchProfiles(selectNewId = null) {
    try {
      const response = await fetch("/api/profiles");
      if (!response.ok) throw new Error("Errore nel caricamento dei profili");
      
      profiles = await response.json();
      
      // Populate select
      profileSelect.innerHTML = `<option value="">Nessuno (Profilo Generico)</option>`;
      profiles.forEach(p => {
        const option = document.createElement("option");
        option.value = p.id;
        option.textContent = `${p.name} (${p.age} anni)${p.usePseudonym ? " - Pseudonimo" : ""}`;
        profileSelect.appendChild(option);
      });

      // Restore active profile
      const savedActiveId = selectNewId || localStorage.getItem("mismo-active-profile-id") || "";
      const profileExists = profiles.some(p => p.id === savedActiveId);
      
      if (savedActiveId && profileExists) {
        profileSelect.value = savedActiveId;
        activeProfileId = savedActiveId;
        loadProfileContext(savedActiveId);
        const activeChild = profiles.find(p => p.id === savedActiveId);
        updateStartersCardsText(activeChild ? activeChild.name : null);
        btnDeleteProfile.style.display = "block"; // Show delete button
        
        // Populate profile page headers
        profileAvatarInitials.textContent = activeChild.name.charAt(0).toUpperCase();
        profilePageTitle.textContent = activeChild.name;
        profilePageAge.textContent = activeChild.age;
        profilePageResidence.textContent = `${activeChild.city} (${activeChild.province}, ${activeChild.region})`;
        
        // Show tabs and documents
        workspaceTabs.classList.remove("hidden");
        fetchChildDocuments(savedActiveId);
      } else {
        profileSelect.value = "";
        activeProfileId = "";
        workspaceTabs.classList.add("hidden");
        profilePageContainer.classList.add("hidden");
        switchTab("chat");
        updateStartersCardsText(null);
        btnDeleteProfile.style.display = "none"; // Hide delete button
      }
    } catch (err) {
      console.error("Error loading profiles:", err);
    }
  }

  // 2. Fetch context.md for active child and render it
  async function loadProfileContext(profileId) {
    if (!profileId) {
      return;
    }

    // Visual pulse effect during loading
    liveUpdateStatus.classList.add("loading-pulse");
    
    try {
      const response = await fetch(`/api/profiles/${profileId}/context`);
      if (!response.ok) throw new Error("Errore nel caricamento del file di contesto");
      
      const data = await response.json();
      
      // Render dynamic Markdown context.md
      if (typeof marked !== "undefined") {
        profileContextContent.innerHTML = marked.parse(data.context);
      } else {
        profileContextContent.textContent = data.context;
      }
    } catch (err) {
      console.error("Error loading child context:", err);
      profileContextContent.innerHTML = `<p class="error-msg">⚠️ Errore nel caricamento del contesto.</p>`;
    } finally {
      setTimeout(() => {
        liveUpdateStatus.classList.remove("loading-pulse");
      }, 500);
    }
  }

  // 3. Register a child profile
  async function registerChild() {
    const name = regChildName.value.trim();
    const age = regChildAge.value.trim();
    const usePseudonym = regUsePseudonym.checked;
    const region = regChildRegion.value;
    const province = regChildProvince.value;
    const city = regChildCity.value;
    const notes = regChildNotes.value.trim();

    // Reset error visuals
    let hasError = false;
    regChildName.style.borderColor = "";
    regNameError.style.display = "none";
    regChildAge.style.borderColor = "";
    regAgeError.style.display = "none";

    // Validate Name (minimum 2 chars)
    if (!name || name.length < 2) {
      regChildName.style.borderColor = "#dc2626";
      regNameError.style.display = "block";
      hasError = true;
    }

    // Validate Age (1 to 17)
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum < 1 || ageNum > 17) {
      regChildAge.style.borderColor = "#dc2626";
      regAgeError.style.display = "block";
      hasError = true;
    }

    if (hasError) {
      // Highlight the first invalid field
      if (!name || name.length < 2) {
        regChildName.focus();
      } else {
        regChildAge.focus();
      }
      return;
    }

    try {
      regSaveBtn.disabled = true;
      const buttonText = regSaveBtn.querySelector("span");
      buttonText.textContent = "Registrazione in corso...";

      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, age: ageNum, usePseudonym, notes, region, province, city })
      });

      const data = await response.json();

      if (response.ok && data.profile) {
        // Switch back to profile view panel and select newly created profile
        togglePanels(false);
        clearRegistrationForm();
        await fetchProfiles(data.profile.id);
        
        // Notify chat reset to make a fresh start with child context
        if (messages.length > 0) {
          if (confirm(`Profilo di "${name}" registrato! Vuoi avviare una nuova conversazione con questo contesto?`)) {
            clearChat();
          }
        }
      } else {
        alert(data.error || "Impossibile registrare il bambino in questo momento.");
      }
    } catch (err) {
      console.error("Error registering child profile:", err);
      alert("Si è verificato un errore durante la connessione con il server.");
    } finally {
      regSaveBtn.disabled = false;
      regSaveBtn.querySelector("span").textContent = "Registra";
    }
  }

  // --- UI TOGGLES & HELPERS ---

  // Toggle between Active Profile selection and Registration form panels
  function togglePanels(showRegistration) {
    if (showRegistration) {
      activeProfilePanel.classList.add("hidden");
      registrationPanel.classList.remove("hidden");
      regChildName.focus();
    } else {
      registrationPanel.classList.add("hidden");
      activeProfilePanel.classList.remove("hidden");
    }
  }

  function updateCitiesDropdown() {
    const selectedProvince = regChildProvince.value;
    const cities = LAZIO_CITIES[selectedProvince] || [];
    regChildCity.innerHTML = "";
    cities.forEach(city => {
      const option = document.createElement("option");
      option.value = city;
      option.textContent = city;
      regChildCity.appendChild(option);
    });
  }

  function setupRegistrationValidation() {
    // Dynamic city list population listener
    regChildProvince.addEventListener("change", updateCitiesDropdown);
    
    // Live validation cleanups when typing
    regChildName.addEventListener("input", () => {
      if (regChildName.value.trim().length >= 2) {
        regChildName.style.borderColor = "";
        regNameError.style.display = "none";
      }
    });

    regChildAge.addEventListener("input", () => {
      const ageNum = parseInt(regChildAge.value, 10);
      if (regChildAge.value && !isNaN(ageNum) && ageNum >= 1 && ageNum <= 17) {
        regChildAge.style.borderColor = "";
        regAgeError.style.display = "none";
      }
    });

    // Populate cities for default province
    updateCitiesDropdown();
  }

  function clearRegistrationForm() {
    regChildName.value = "";
    regChildAge.value = "";
    regUsePseudonym.checked = false;
    regChildProvince.value = "Roma";
    updateCitiesDropdown();
    regChildNotes.value = "";
    
    // Clear validation borders and error labels
    regChildName.style.borderColor = "";
    regNameError.style.display = "none";
    regChildAge.style.borderColor = "";
    regAgeError.style.display = "none";
  }

  btnRegisterTrigger.addEventListener("click", () => togglePanels(true));
  regCancelBtn.addEventListener("click", () => {
    togglePanels(false);
    clearRegistrationForm();
  });
  regSaveBtn.addEventListener("click", registerChild);

  // Profile select change listener
  profileSelect.addEventListener("change", (e) => {
    const selectedId = e.target.value;
    activeProfileId = selectedId;
    localStorage.setItem("mismo-active-profile-id", selectedId);
    
    const activeChild = profiles.find(p => p.id === selectedId);
    updateStartersCardsText(activeChild ? activeChild.name : null);

    if (selectedId && activeChild) {
      loadProfileContext(selectedId);
      btnDeleteProfile.style.display = "block"; // Show delete button
      
      // Populate profile page headers
      profileAvatarInitials.textContent = activeChild.name.charAt(0).toUpperCase();
      profilePageTitle.textContent = activeChild.name;
      profilePageAge.textContent = activeChild.age;
      profilePageResidence.textContent = `${activeChild.city} (${activeChild.province}, ${activeChild.region})`;
      
      // Show tabs and documents
      workspaceTabs.classList.remove("hidden");
      fetchChildDocuments(selectedId);
      
      // Restart chat with selected profile context if active
      if (messages.length > 0) {
        if (confirm("Hai selezionato un bambino. Vuoi avviare una nuova conversazione con questo contesto?")) {
          clearChat();
        }
      }
    } else {
      workspaceTabs.classList.add("hidden");
      profilePageContainer.classList.add("hidden");
      switchTab("chat");
      btnDeleteProfile.style.display = "none"; // Hide delete button
    }
  });

  // Profile delete click handler (with inline double-click confirmation state)
  let deleteConfirmState = false;
  let deleteConfirmTimeout = null;

  function resetDeleteButtonState() {
    deleteConfirmState = false;
    btnDeleteProfile.classList.remove("btn-danger-confirm");
    btnDeleteProfile.style.borderColor = "#fca5a5";
    btnDeleteProfile.style.color = "#dc2626";
    btnDeleteProfile.style.backgroundColor = "transparent";
    btnDeleteProfile.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      Rimuovi Bambino Selezionato
    `;
  }

  btnDeleteProfile.addEventListener("click", async () => {
    if (!activeProfileId) return;
    
    const activeChild = profiles.find(p => p.id === activeProfileId);
    if (!activeChild) return;

    if (!deleteConfirmState) {
      // First click: transition to confirm state
      deleteConfirmState = true;
      btnDeleteProfile.classList.add("btn-danger-confirm");
      btnDeleteProfile.style.borderColor = "#dc2626";
      btnDeleteProfile.style.color = "#ffffff";
      btnDeleteProfile.style.backgroundColor = "#dc2626";
      btnDeleteProfile.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Sicuro? Clicca di nuovo per eliminare
      `;
      
      // Auto reset after 3 seconds of inactivity
      if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
      deleteConfirmTimeout = setTimeout(() => {
        resetDeleteButtonState();
      }, 3000);
      return;
    }

    // Second click: proceed with deletion
    if (deleteConfirmTimeout) clearTimeout(deleteConfirmTimeout);
    
    try {
      btnDeleteProfile.disabled = true;
      btnDeleteProfile.textContent = "Eliminazione...";

      const response = await fetch(`/api/profiles/${activeProfileId}`, {
        method: "DELETE"
      });

      if (response.ok) {
        // Reset active child state
        localStorage.removeItem("mismo-active-profile-id");
        activeProfileId = "";
        btnDeleteProfile.style.display = "none";
        
        resetDeleteButtonState();
        await fetchProfiles();
        clearChat();
      } else {
        const data = await response.json();
        alert(data.error || "Impossibile eliminare il profilo.");
        resetDeleteButtonState();
      }
    } catch (err) {
      console.error("Error deleting profile:", err);
      alert("Si è verificato un errore durante la connessione con il server.");
      resetDeleteButtonState();
    } finally {
      btnDeleteProfile.disabled = false;
    }
  });

  function updateStartersCardsText(name) {
    const cardAboutTitle = document.getElementById("card-about-title");
    const cardAboutDesc = document.getElementById("card-about-desc");
    const cardAbout = document.getElementById("card-about");
    
    const cardBuroTitle = document.getElementById("card-buro-title");
    const cardBuroDesc = document.getElementById("card-buro-desc");
    const cardBuro = document.getElementById("card-buro");
    
    const cardSchoolTitle = document.getElementById("card-school-title");
    const cardSchoolDesc = document.getElementById("card-school-desc");
    const cardSchool = document.getElementById("card-school");

    const cardTerritoryTitle = document.getElementById("card-territory-title");
    const cardTerritoryDesc = document.getElementById("card-territory-desc");
    const cardTerritory = document.getElementById("card-territory");

    const cardSportTitle = document.getElementById("card-sport-title");
    const cardSportDesc = document.getElementById("card-sport-desc");
    const cardSport = document.getElementById("card-sport");

    const cardCalendarTitle = document.getElementById("card-calendar-title");
    const cardCalendarDesc = document.getElementById("card-calendar-desc");
    const cardCalendar = document.getElementById("card-calendar");

    const cardHealthTitle = document.getElementById("card-health-title");
    const cardHealthDesc = document.getElementById("card-health-desc");
    const cardHealth = document.getElementById("card-health");

    const cardMarketTitle = document.getElementById("card-market-title");
    const cardMarketDesc = document.getElementById("card-market-desc");
    const cardMarket = document.getElementById("card-market");

    const cardBabysittingTitle = document.getElementById("card-babysitting-title");
    const cardBabysittingDesc = document.getElementById("card-babysitting-desc");
    const cardBabysitting = document.getElementById("card-babysitting");
    
    const targetName = name || "tuo figlio";
    
    if (cardAboutTitle) cardAboutTitle.textContent = `Raccontami di ${targetName}`;
    if (cardAboutDesc) {
      cardAboutDesc.textContent = `Condividi i dettagli sul carattere, sulle passioni e sulle abitudini di ${targetName} per consentirmi di conoscerlo e supportarvi al meglio.`;
    }
    if (cardAbout) {
      cardAbout.setAttribute("data-prompt", `Vorrei raccontarti qualcosa su ${targetName} per aiutarti a conoscerlo meglio: farti un'idea del suo carattere, delle sue peculiarità e cosa lo rende speciale. Raccontami!`);
    }
    
    if (cardBuroTitle) cardBuroTitle.textContent = `Supporto burocratico`;
    if (cardBuroDesc) {
      cardBuroDesc.textContent = `Esplora i contributi economici regionali, le agevolazioni (come la Legge 104) e la modulistica del Lazio per rimborsi e tutele di ${targetName}.`;
    }
    if (cardBuro) {
      const activeChild = profiles.find(p => p.id === activeProfileId);
      const provinceInfo = activeChild ? `nella provincia di ${activeChild.province} nel Lazio` : "nel Lazio";
      cardBuro.setAttribute("data-prompt", `Ho bisogno di aiuto per organizzare l'assistenza burocratica per ${targetName} residente ${provinceInfo}. Quali sono le procedure principali, le agevolazioni regionali (come la Legge 104, l'indennità di frequenza) e le linee guida utili?`);
    }
    
    if (cardSchoolTitle) cardSchoolTitle.textContent = `Supporto scolastico`;
    if (cardSchoolDesc) {
      cardSchoolDesc.textContent = `Organizza l'inclusione scolastica per ${targetName}: tutele, supporto curriculare, differenze tra sostegno ed educatore e redazione del PEI.`;
    }
    if (cardSchool) {
      cardSchool.setAttribute("data-prompt", `Ho bisogno di supporto per organizzare la scuola per ${targetName}. Quali sono i passaggi burocratici (PEI, PDP, richiesta dell'insegnante di sostegno) e i consigli pratici-concettuali per facilitare l'inserimento scolastico?`);
    }

    if (cardTerritoryTitle) cardTerritoryTitle.textContent = `Servizi del territorio`;
    if (cardTerritoryDesc) {
      cardTerritoryDesc.textContent = `Trova centri convenzionati, terapisti e associazioni nel Lazio per ${targetName}. La mappa si aprirà per esplorare.`;
    }
    if (cardTerritory) {
      const activeChild = profiles.find(p => p.id === activeProfileId);
      const provinceInfo = activeChild ? `nella provincia di ${activeChild.province} nel Lazio` : "nel Lazio";
      cardTerritory.setAttribute("data-prompt", `Ho bisogno di trovare servizi del territorio per ${targetName} residente ${provinceInfo}. Quali centri convenzionati o professionisti ci sono in zona?`);
    }

    if (cardSportTitle) cardSportTitle.textContent = `Tempo libero e Sport inclusivi`;
    if (cardSportDesc) {
      cardSportDesc.textContent = `Trova attività sportive, laboratori artistici e tempo libero inclusivi per ${targetName} nel Lazio.`;
    }
    if (cardSport) {
      cardSport.setAttribute("data-prompt", `Vorrei informazioni su sport inclusivi, laboratori e attività per il tempo libero adatti a ${targetName} nel Lazio. Quali associazioni o progetti ci sono?`);
    }

    if (cardCalendarTitle) cardCalendarTitle.textContent = `Calendario e scadenze`;
    if (cardCalendarDesc) {
      cardCalendarDesc.textContent = `Tieni traccia delle scadenze burocratiche per ${targetName}, delle date dei GLO e dei rimborsi.`;
    }
    if (cardCalendar) {
      cardCalendar.setAttribute("data-prompt", `Quali sono le scadenze burocratiche più importanti da ricordare quest'anno per la scuola di ${targetName} (GLO, PEI) e per i contributi economici regionali (Modello A, Modello C) nel Lazio?`);
    }

    if (cardHealthTitle) cardHealthTitle.textContent = `Sanità accessibile - Servizio Tobia`;
    if (cardHealthDesc) {
      cardHealthDesc.textContent = `Scopri il percorso assistenziale TOBIA per visite mediche senza barriere e urgenze di ${targetName} nel Lazio.`;
    }
    if (cardHealth) {
      cardHealth.setAttribute("data-prompt", `Cos'è il Servizio TOBIA (DAMA) nel Lazio e come funziona per facilitare le visite mediche e l'accesso alle cure ospedaliere o al pronto soccorso per ${targetName}?`);
    }

    if (cardMarketTitle) cardMarketTitle.textContent = `Mercatino e scambio materiali CAA`;
    if (cardMarketDesc) {
      cardMarketDesc.textContent = `Condividi e scambia libri modificati, tabelle di Comunicazione Aumentativa Alternativa (CAA) e supporti visivi per ${targetName}.`;
    }
    if (cardMarket) {
      cardMarket.setAttribute("data-prompt", `Vorrei saperne di più sul mercatino e lo scambio di materiali per la CAA (Comunicazione Aumentativa Alternativa), libri modificati e tabelle di comunicazione per ${targetName}. Come posso scambiare o creare supporti visivi?`);
    }

    if (cardBabysittingTitle) cardBabysittingTitle.textContent = `Baby-sitting specializzato`;
    if (cardBabysittingDesc) {
      cardBabysittingDesc.textContent = `Trova figure formate come educatori, tutor RBT o baby-sitter con esperienza per il supporto domiciliare di ${targetName}.`;
    }
    if (cardBabysitting) {
      cardBabysitting.setAttribute("data-prompt", `Come posso trovare un servizio di baby-sitting specializzato o supporto domiciliare con educatori o tutor formati per la gestione di ${targetName}?`);
    }
  }

  // --- DOCUMENTS DYNAMIC MANAGEMENT FRONTEND ---

  async function fetchChildDocuments(profileId) {
    if (!profileId) return;
    
    try {
      const response = await fetch(`/api/profiles/${profileId}/documents`);
      if (!response.ok) throw new Error("Errore nel recupero dei documenti");
      
      const docs = await response.json();
      renderDocumentsList(docs);
    } catch (err) {
      console.error("Error fetching documents:", err);
      docCategories.forEach(cat => {
        if (docsLists[cat]) {
          docsLists[cat].innerHTML = `<li style="font-size: 11px; color: #dc2626; padding: 4px;">⚠️ Errore.</li>`;
        }
      });
    }
  }

  function renderDocumentsList(docs) {
    // Clear all lists first
    docCategories.forEach(cat => {
      if (docsLists[cat]) docsLists[cat].innerHTML = "";
    });
    
    // Group documents by category
    const grouped = {
      medical: [],
      invoice: [],
      school: [],
      inps: []
    };
    
    docs.forEach(doc => {
      const cat = doc.category || "medical";
      if (grouped[cat]) {
        grouped[cat].push(doc);
      }
    });
    
    // Render each category
    docCategories.forEach(cat => {
      const listEl = docsLists[cat];
      if (!listEl) return;
      
      const catDocs = grouped[cat];
      if (catDocs.length === 0) {
        listEl.innerHTML = `<li style="font-size: 11px; color: var(--text-tertiary); text-align: center; padding: 8px 0;">Nessun documento.</li>`;
        return;
      }
      
      catDocs.forEach(doc => {
        const li = document.createElement("li");
        li.className = "category-doc-item";
        
        let iconSvg = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        `;
        if (doc.filename.toLowerCase().endsWith(".pdf")) {
          iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color: #dc2626;">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="9" y1="15" x2="15" y2="15"></line>
              <line x1="9" y1="11" x2="15" y2="11"></line>
            </svg>
          `;
        } else if (/\.(png|jpe?g|webp)$/i.test(doc.filename)) {
          iconSvg = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color: #10b981;">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          `;
        }
        
        const sizeKB = (doc.size / 1024).toFixed(1);
        
        li.innerHTML = `
          <div class="category-doc-info">
            ${iconSvg}
            <span class="category-doc-name" title="${doc.filename}">${doc.filename}</span>
            <span class="category-doc-size">${sizeKB} KB</span>
          </div>
          <button class="btn-delete-cat-doc" data-filename="${doc.filename}" data-category="${cat}" title="Elimina documento">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        `;
        
        li.querySelector(".btn-delete-cat-doc").addEventListener("click", async (e) => {
          e.stopPropagation();
          const filename = e.currentTarget.getAttribute("data-filename");
          const category = e.currentTarget.getAttribute("data-category");
          if (confirm(`Sei sicuro di voler eliminare il documento "${filename}"? Il contesto del bambino verrà aggiornato.`)) {
            await deleteChildDocument(category, filename);
          }
        });
        
        listEl.appendChild(li);
      });
    });
  }

  async function deleteChildDocument(category, filename) {
    if (!activeProfileId) return;
    
    try {
      const response = await fetch(`/api/profiles/${activeProfileId}/documents/${encodeURIComponent(category)}/${encodeURIComponent(filename)}`, {
        method: "DELETE"
      });
      
      if (!response.ok) throw new Error("Errore nella rimozione del file");
      
      // Reload both document list and child context md
      await fetchChildDocuments(activeProfileId);
      await loadProfileContext(activeProfileId);
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Impossibile eliminare il documento.");
    }
  }

  // Set up upload handler for each category input file and dropzone
  function setupUploadHandlers() {
    docCategories.forEach(category => {
      const inputEl = fileInputs[category];
      const loaderEl = uploadLoaders[category];
      const dropzoneEl = dropzones[category];
      
      if (!inputEl) return;
      
      inputEl.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file || !activeProfileId) return;
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert("La dimensione del file supera il limite massimo di 5MB.");
          inputEl.value = "";
          return;
        }
        
        if (loaderEl) loaderEl.classList.remove("hidden");
        
        const reader = new FileReader();
        reader.onload = async function(evt) {
          const base64Data = evt.target.result.split(",")[1];
          const mimeType = file.type;
          const filename = file.name;
          
          try {
            const response = await fetch(`/api/profiles/${activeProfileId}/documents`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ filename, mimeType, base64Data, category })
            });
            
            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || "Errore nel caricamento del file");
            }
            
            // Success
            inputEl.value = "";
            await fetchChildDocuments(activeProfileId);
            await loadProfileContext(activeProfileId);
          } catch (err) {
            console.error("Error uploading file:", err);
            alert(`Errore nell'elaborazione del file: ${err.message}`);
          } finally {
            if (loaderEl) loaderEl.classList.add("hidden");
          }
        };
        
        reader.onerror = function() {
          alert("Errore nella lettura del file.");
          if (loaderEl) loaderEl.classList.add("hidden");
        };
        
        reader.readAsDataURL(file);
      });
      
      // Drag and drop for the category box
      if (dropzoneEl) {
        ["dragenter", "dragover"].forEach(eventName => {
          dropzoneEl.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl.style.borderColor = "var(--accent-color)";
            dropzoneEl.style.backgroundColor = "var(--accent-soft)";
          }, false);
        });

        ["dragleave", "drop"].forEach(eventName => {
          dropzoneEl.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzoneEl.style.borderColor = "";
            dropzoneEl.style.backgroundColor = "";
          }, false);
        });

        dropzoneEl.addEventListener("drop", (e) => {
          const dt = e.dataTransfer;
          const files = dt.files;
          if (files.length > 0 && activeProfileId) {
            inputEl.files = files;
            // Trigger change handler
            const event = new Event("change");
            inputEl.dispatchEvent(event);
          }
        }, false);
      }
    });
  }

  // --- DEADLINES (CALENDAR FUNCTION) ---
  function openDeadlines() {
    const split = document.querySelector(".workspace-split");
    if (split) split.classList.add("hidden");
    profilePageContainer.classList.add("hidden");
    deadlinesContainer.classList.remove("hidden");
    showDashboardBtn.classList.remove("active-nav-btn");
    isDashboardActive = false;
    if (workspaceTabs && !workspaceTabs.classList.contains("hidden")) {
      tabChat.classList.remove("active");
      tabProfile.classList.remove("active");
    }
    closeSidebarOnMobile();
    loadDeadlines();
  }

  function closeDeadlines() {
    deadlinesContainer.classList.add("hidden");
    const split = document.querySelector(".workspace-split");
    if (split) split.classList.remove("hidden");
    if (workspaceTabs && !workspaceTabs.classList.contains("hidden")) {
      tabChat.classList.add("active");
    }
    if (messages.length > 0) {
      hideDashboard();
    } else {
      showDashboard();
    }
  }

  async function loadDeadlines() {
    deadlinesTimeline.innerHTML = `<p class="deadlines-loading">Caricamento scadenze...</p>`;
    try {
      const qs = activeProfileId ? `?profileId=${encodeURIComponent(activeProfileId)}` : "";
      const response = await fetch(`/api/deadlines${qs}`);
      if (!response.ok) throw new Error("Errore nel caricamento delle scadenze");
      const data = await response.json();
      deadlinesData = data.deadlines || [];

      if (deadlinesSubtitle) {
        const ageNote = data.age != null ? ` Personalizzate per un bambino di ${data.age} anni.` : " Seleziona un bambino per personalizzarle in base all'età.";
        deadlinesSubtitle.textContent = `Scadenze del Lazio + le tue scadenze personali, calcolate sulla data odierna.${ageNote}`;
      }

      renderDeadlinesView();
    } catch (err) {
      console.error("Error loading deadlines:", err);
      deadlinesTimeline.innerHTML = `<p class="deadlines-loading">⚠️ Impossibile caricare le scadenze.</p>`;
    }
  }

  function renderDeadlinesView() {
    if (deadlinesView === "calendar") {
      deadlinesTimeline.classList.add("hidden");
      deadlinesCalendar.classList.remove("hidden");
      renderCalendar();
    } else {
      deadlinesCalendar.classList.add("hidden");
      deadlinesTimeline.classList.remove("hidden");
      renderList();
    }
  }

  function formatDeadlineDate(iso) {
    return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
  }

  function daysRemainingLabel(days) {
    if (days < 0) return `${Math.abs(days)} giorni fa`;
    if (days === 0) return "Oggi";
    if (days === 1) return "Domani";
    if (days < 30) return `Tra ${days} giorni`;
    if (days < 60) return "Tra circa 1 mese";
    const months = Math.round(days / 30);
    return `Tra circa ${months} mesi`;
  }

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function renderList() {
    if (deadlinesData.length === 0) {
      deadlinesTimeline.innerHTML = `<p class="deadlines-loading">Nessuna scadenza. Aggiungine una con "Aggiungi scadenza".</p>`;
      return;
    }

    deadlinesTimeline.innerHTML = "";
    deadlinesData.forEach(d => {
      const card = document.createElement("div");
      card.className = `deadline-card urgency-${d.urgency} cat-${d.category}`;
      const deleteBtn = d.custom
        ? `<button class="deadline-delete-btn" data-id="${d.id}" title="Elimina scadenza">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
           </button>`
        : "";
      card.innerHTML = `
        <div class="deadline-date">
          <span class="deadline-day">${new Date(d.date).getDate()}</span>
          <span class="deadline-month">${new Date(d.date).toLocaleDateString("it-IT", { month: "short" })}</span>
        </div>
        <div class="deadline-body">
          <div class="deadline-top">
            <h3>${escapeAttr(d.title)}</h3>
            <span class="deadline-countdown">${daysRemainingLabel(d.daysRemaining)}</span>
          </div>
          ${d.description ? `<p class="deadline-desc">${escapeAttr(d.description)}</p>` : ""}
          <div class="deadline-meta">
            <span class="deadline-ref">${escapeAttr(d.ref)}</span>
            <span class="deadline-full-date">${formatDeadlineDate(d.date)}</span>
          </div>
          <div class="deadline-actions">
            <button class="deadline-ask-btn" data-title="${escapeAttr(d.title)}">Chiedi a Mismo come prepararti</button>
            ${deleteBtn}
          </div>
        </div>
      `;
      card.querySelector(".deadline-ask-btn").addEventListener("click", (e) => {
        askAboutDeadline(e.currentTarget.getAttribute("data-title"));
      });
      const del = card.querySelector(".deadline-delete-btn");
      if (del) {
        del.addEventListener("click", () => deleteCustomDeadline(del.getAttribute("data-id")));
      }
      deadlinesTimeline.appendChild(card);
    });
  }

  function renderCalendar() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Group deadlines by yyyy-mm-dd of the displayed month
    const byDay = {};
    deadlinesData.forEach(d => {
      const dt = new Date(d.date);
      if (dt.getFullYear() === year && dt.getMonth() === month) {
        const day = dt.getDate();
        (byDay[day] = byDay[day] || []).push(d);
      }
    });

    // Monday-first offset
    const firstDay = new Date(year, month, 1);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset < 0) startOffset = 6;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let cells = "";
    for (let i = 0; i < startOffset; i++) {
      cells += `<div class="cal-cell cal-empty"></div>`;
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const items = byDay[day] || [];
      const cellDate = new Date(year, month, day);
      cellDate.setHours(0, 0, 0, 0);
      const isToday = cellDate.getTime() === today.getTime();
      const dots = items.slice(0, 4).map(it => `<span class="cal-dot cat-${it.category}"></span>`).join("");
      const hasItems = items.length > 0 ? "has-items" : "";
      cells += `
        <div class="cal-cell ${isToday ? "cal-today" : ""} ${hasItems}" data-day="${day}">
          <span class="cal-day-num">${day}</span>
          <div class="cal-dots">${dots}</div>
        </div>
      `;
    }

    deadlinesCalendar.innerHTML = `
      <div class="cal-header">
        <button class="cal-nav" id="cal-prev" aria-label="Mese precedente">‹</button>
        <h3 class="cal-title">${DEADLINE_MONTHS[month]} ${year}</h3>
        <button class="cal-nav" id="cal-next" aria-label="Mese successivo">›</button>
      </div>
      <div class="cal-grid cal-weekdays">
        ${DEADLINE_WEEKDAYS.map(w => `<div class="cal-weekday">${w}</div>`).join("")}
      </div>
      <div class="cal-grid cal-days">${cells}</div>
      <div class="cal-detail" id="cal-detail"></div>
    `;

    deadlinesCalendar.querySelector("#cal-prev").addEventListener("click", () => {
      calendarMonth = new Date(year, month - 1, 1);
      renderCalendar();
    });
    deadlinesCalendar.querySelector("#cal-next").addEventListener("click", () => {
      calendarMonth = new Date(year, month + 1, 1);
      renderCalendar();
    });
    deadlinesCalendar.querySelectorAll(".cal-cell.has-items").forEach(cell => {
      cell.addEventListener("click", () => showCalendarDay(parseInt(cell.getAttribute("data-day"), 10), byDay));
    });

    // Auto-show today's or first populated day's detail
    const detailDay = byDay[today.getDate()] && today.getFullYear() === year && today.getMonth() === month
      ? today.getDate()
      : Object.keys(byDay).map(Number).sort((a, b) => a - b)[0];
    if (detailDay) showCalendarDay(detailDay, byDay);
  }

  function showCalendarDay(day, byDay) {
    const detail = document.getElementById("cal-detail");
    if (!detail) return;
    const items = byDay[day] || [];
    deadlinesCalendar.querySelectorAll(".cal-cell").forEach(c => c.classList.remove("cal-selected"));
    const cell = deadlinesCalendar.querySelector(`.cal-cell[data-day="${day}"]`);
    if (cell) cell.classList.add("cal-selected");

    if (items.length === 0) {
      detail.innerHTML = "";
      return;
    }
    detail.innerHTML = items.map(d => `
      <div class="cal-detail-item cat-${d.category} urgency-${d.urgency}">
        <div class="cal-detail-head">
          <strong>${escapeAttr(d.title)}</strong>
          <span class="deadline-countdown">${daysRemainingLabel(d.daysRemaining)}</span>
        </div>
        ${d.description ? `<p>${escapeAttr(d.description)}</p>` : ""}
        <div class="cal-detail-actions">
          <span class="deadline-ref">${escapeAttr(d.ref)} · ${formatDeadlineDate(d.date)}</span>
          <button class="deadline-ask-btn" data-title="${escapeAttr(d.title)}">Chiedi a Mismo</button>
          ${d.custom ? `<button class="deadline-delete-btn" data-id="${d.id}" title="Elimina"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path></svg></button>` : ""}
        </div>
      </div>
    `).join("");
    detail.querySelectorAll(".deadline-ask-btn").forEach(b => b.addEventListener("click", () => askAboutDeadline(b.getAttribute("data-title"))));
    detail.querySelectorAll(".deadline-delete-btn").forEach(b => b.addEventListener("click", () => deleteCustomDeadline(b.getAttribute("data-id"))));
  }

  async function deleteCustomDeadline(id) {
    if (!id || !confirm("Eliminare questa scadenza personale?")) return;
    try {
      const qs = activeProfileId ? `?profileId=${encodeURIComponent(activeProfileId)}` : "";
      const response = await fetch(`/api/deadlines/${encodeURIComponent(id)}${qs}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Errore eliminazione");
      await loadDeadlines();
    } catch (err) {
      console.error("Error deleting deadline:", err);
      alert("Impossibile eliminare la scadenza.");
    }
  }

  function toggleDeadlineForm(show) {
    if (show) {
      deadlineForm.classList.remove("hidden");
      deadlineFormError.style.display = "none";
      if (!deadlineDate.value) {
        deadlineDate.value = new Date().toISOString().slice(0, 10);
      }
      deadlineTitle.focus();
    } else {
      deadlineForm.classList.add("hidden");
      deadlineTitle.value = "";
      deadlineDescription.value = "";
      deadlineDate.value = "";
      deadlineCategory.value = "custom";
      deadlineFormError.style.display = "none";
    }
  }

  async function saveCustomDeadline(e) {
    e.preventDefault();
    const title = deadlineTitle.value.trim();
    const dateRaw = deadlineDate.value;
    if (!title || !dateRaw) {
      deadlineFormError.style.display = "block";
      return;
    }
    try {
      const response = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          dateRaw,
          category: deadlineCategory.value,
          description: deadlineDescription.value.trim(),
          profileId: activeProfileId || null
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Errore nel salvataggio");
      }
      toggleDeadlineForm(false);
      // Jump the calendar to the month of the new deadline so it's visible
      const d = new Date(`${dateRaw}T00:00:00`);
      calendarMonth = new Date(d.getFullYear(), d.getMonth(), 1);
      await loadDeadlines();
    } catch (err) {
      console.error("Error saving deadline:", err);
      deadlineFormError.textContent = err.message;
      deadlineFormError.style.display = "block";
    }
  }

  function setDeadlinesView(view) {
    deadlinesView = view;
    viewListBtn.classList.toggle("active", view === "list");
    viewListBtn.setAttribute("aria-selected", view === "list");
    viewCalendarBtn.classList.toggle("active", view === "calendar");
    viewCalendarBtn.setAttribute("aria-selected", view === "calendar");
    renderDeadlinesView();
  }

  function askAboutDeadline(title) {
    currentIntent = "calendar";
    closeDeadlines();
    sendMessage(`Riguardo alla scadenza "${title}": come mi devo preparare, cosa serve e dove la presento?`);
  }

  if (deadlinesBackBtn) deadlinesBackBtn.addEventListener("click", closeDeadlines);
  if (viewListBtn) viewListBtn.addEventListener("click", () => setDeadlinesView("list"));
  if (viewCalendarBtn) viewCalendarBtn.addEventListener("click", () => setDeadlinesView("calendar"));
  if (deadlineAddBtn) deadlineAddBtn.addEventListener("click", () => toggleDeadlineForm(deadlineForm.classList.contains("hidden")));
  if (deadlineCancelBtn) deadlineCancelBtn.addEventListener("click", () => toggleDeadlineForm(false));
  if (deadlineForm) deadlineForm.addEventListener("submit", saveCustomDeadline);

  // --- MAP TRIGGERS & MAP LOADER ---
  let markerClusterGroup = null;
  let allMapItems = [];

  function setupMapTriggers() {
    showMapBtn.addEventListener("click", () => {
      openMap();
    });

    closeMapBtn.addEventListener("click", () => {
      mapOverlay.classList.add("hidden");
    });
  }

  async function openMap(focusId = null) {
    mapOverlay.classList.remove("hidden");
    
    if (!map) {
      map = L.map('mismo-map').setView([41.9028, 12.4964], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      
      markerClusterGroup = L.markerClusterGroup({
        maxClusterRadius: 40,
        showCoverageOnHover: false
      });
      map.addLayer(markerClusterGroup);
      
      setupFilterListeners();
      await loadMapData();
    }
    
    if (focusId) {
      const filterSpecialty = document.getElementById("filter-specialty");
      const filterRole = document.getElementById("filter-role");
      if (filterSpecialty) filterSpecialty.value = "all";
      if (filterRole) filterRole.value = "all";
      renderFilteredMarkers();
    }
    
    setTimeout(() => {
      map.invalidateSize();
      if (focusId && mapMarkers[focusId]) {
        const item = mapMarkers[focusId];
        map.setView([item.lat, item.lng], 15);
        
        if (markerClusterGroup) {
          const marker = item.marker;
          if (markerClusterGroup.hasLayer(marker)) {
            markerClusterGroup.zoomToShowLayer(marker, () => {
              marker.openPopup();
            });
          } else {
            marker.openPopup();
          }
        } else {
          item.marker.openPopup();
        }
      }
    }, 250);
  }

  async function loadMapData() {
    try {
      const [resStructures, resProfessionals] = await Promise.all([
        fetch("/api/structures").then(r => r.json()),
        fetch("/api/professionals").then(r => r.json())
      ]);
      
      allMapItems = [];
      
      resStructures.forEach(item => {
        allMapItems.push({
          id: item.id,
          name: item.name || "Struttura Sportiva",
          lat: item.lat,
          lng: item.lng,
          type: item.type,
          address: item.address,
          phone: item.phone || "",
          email: "",
          province: item.province,
          role: "",
          specializzazione: item.type,
          trattamenti: item.type,
          isStructure: true,
          activities: item.activities || ""
        });
      });
      
      resProfessionals.forEach(item => {
        if (item.lat && item.lng) {
          allMapItems.push({
            id: `prof-${item.num}-${item.area_professionale === "SANITARIA" ? "san" : "soc"}`,
            name: item.nominativo,
            lat: item.lat,
            lng: item.lng,
            type: item.area_professionale,
            address: item.indirizzo,
            phone: item.telefono,
            email: item.email,
            province: item.area_territoriale,
            role: item.ruolo,
            specializzazione: item.specializzazione,
            trattamenti: item.trattamenti,
            titolo_studio: item.titolo_studio,
            isStructure: false
          });
        }
      });
      
      renderFilteredMarkers();
    } catch (err) {
      console.error("Error loading map data:", err);
    }
  }

  function renderFilteredMarkers() {
    if (!markerClusterGroup) return;
    
    markerClusterGroup.clearLayers();
    mapMarkers = {};
    
    const selectedSpecialty = document.getElementById("filter-specialty").value;
    const selectedRole = document.getElementById("filter-role").value;
    
    allMapItems.forEach(item => {
      if (!matchesSpecialty(item, selectedSpecialty)) return;
      if (!matchesRole(item, selectedRole)) return;
      
      const marker = L.marker([item.lat, item.lng]);
      
      let popupHTML = "";
      if (item.isStructure) {
        const activitiesHTML = item.activities ? `<p><strong>Attività Sportive:</strong> ${item.activities}</p>` : "";
        const phoneHTML = item.phone ? `<p><strong>Telefono:</strong> ${item.phone}</p>` : "";
        popupHTML = `
          <h4>${item.name}</h4>
          <p><strong>Tipo:</strong> ${item.type}</p>
          <p><strong>Indirizzo:</strong> ${item.address}</p>
          ${activitiesHTML}
          ${phoneHTML}
          <p><strong>Provincia:</strong> ${item.province}</p>
        `;
      } else {
        const specs = [item.specializzazione, item.trattamenti].filter(Boolean).join("; ");
        popupHTML = `
          <h4>${item.name}</h4>
          <p><strong>Ruolo:</strong> ${item.role}</p>
          ${item.titolo_studio ? `<p><strong>Qualifica:</strong> ${item.titolo_studio}</p>` : ""}
          ${specs ? `<p><strong>Competenze:</strong> ${specs}</p>` : ""}
          <p><strong>Indirizzo:</strong> ${item.address}</p>
          ${item.phone ? `<p><strong>Telefono:</strong> ${item.phone}</p>` : ""}
          ${item.email ? `<p><strong>Email:</strong> <a href="mailto:${item.email}" style="color: var(--accent-color);">${item.email}</a></p>` : ""}
        `;
      }
      
      marker.bindPopup(popupHTML);
      markerClusterGroup.addLayer(marker);
      
      mapMarkers[item.id] = { marker, lat: item.lat, lng: item.lng };
    });
  }

  function setupFilterListeners() {
    const filterSpecialty = document.getElementById("filter-specialty");
    const filterRole = document.getElementById("filter-role");
    
    if (filterSpecialty) {
      filterSpecialty.addEventListener("change", renderFilteredMarkers);
    }
    if (filterRole) {
      filterRole.addEventListener("change", renderFilteredMarkers);
    }
  }

  function matchesSpecialty(item, specialty) {
    if (specialty === "all") return true;
    
    const textToSearch = [
      item.specializzazione || "",
      item.trattamenti || "",
      item.type || "",
      item.titolo_studio || ""
    ].join(" ").toUpperCase();
    
    if (specialty === "ABA") {
      return textToSearch.includes("ABA") || textToSearch.includes("COMPORTAMENTO");
    }
    if (specialty === "Logopedista") {
      return textToSearch.includes("LOGOPED");
    }
    if (specialty === "CAA") {
      return textToSearch.includes("CAA") || textToSearch.includes("AUMENTATIVA");
    }
    if (specialty === "TEACCH") {
      return textToSearch.includes("TEACCH");
    }
    if (specialty === "Sport") {
      return textToSearch.includes("SPORT") || textToSearch.includes("ATTIVITÀ SPORTIVE");
    }
    return false;
  }

  function matchesRole(item, role) {
    if (role === "all") return true;
    if (item.isStructure) return true;
    
    const itemRole = (item.role || "").toUpperCase();
    if (role === "Supervisore") {
      return itemRole.includes("SUPERVISORE");
    }
    if (role === "Tecnico") {
      return itemRole.includes("TECNICO") || itemRole.includes("RBT");
    }
    if (role === "Tutor") {
      return itemRole.includes("TUTOR");
    }
    return false;
  }

  // --- MOBILE NAVIGATION ---
  menuToggleBtn.addEventListener("click", () => {
    sidebar.classList.add("open");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "sidebar-overlay";
      document.body.appendChild(overlay);
      overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.remove();
        overlay = null;
      });
    }
  });

  function closeSidebarOnMobile() {
    if (window.innerWidth <= 900) {
      sidebar.classList.remove("open");
      if (overlay) {
        overlay.remove();
        overlay = null;
      }
    }
  }

  // --- TEXTAREA AUTO-GROW ---
  function setupTextareaAutoGrow() {
    userInput.addEventListener("input", function() {
      this.style.height = "auto";
      this.style.height = (this.scrollHeight - 4) + "px";
    });

    userInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.dispatchEvent(new Event("submit"));
      }
    });
  }

  // --- CHAT ACTIONS ---

  function clearChat() {
    messages = [];
    currentIntent = "general";
    chatMessages.innerHTML = "";
    if (deadlinesContainer) deadlinesContainer.classList.add("hidden");
    showDashboard();
    userInput.value = "";
    userInput.style.height = "auto";
    closeSidebarOnMobile();
  }

  clearChatBtn.addEventListener("click", clearChat);

  // Setup prompt starters click triggers
  document.querySelectorAll(".starter-card").forEach(card => {
    card.addEventListener("click", () => {
      sendIntroMessage(card.id);
    });
  });

  async function sendIntroMessage(cardId) {
    // Set the active function so the backend uses the focused prompt for follow-ups too.
    currentIntent = CARD_INTENT[cardId] || "general";

    // Calendar is a real functional view, not a chat intro.
    if (cardId === "card-calendar") {
      openDeadlines();
      return;
    }

    hideDashboard();

    const activeChild = profiles.find(p => p.id === activeProfileId);
    const targetName = activeChild ? activeChild.name : "mio figlio";

    let text = "";
    if (cardId === "card-about") {
      text = `Ciao Mismo! Vorrei raccontarti qualcosa su ${targetName} per aiutarti a conoscerlo meglio: farti un'idea del suo carattere, delle sue peculiarità e cosa lo rende speciale. Presentati brevemente ed introduci questo tema con un messaggio accogliente e professionale.`;
    } else if (cardId === "card-buro") {
      const provinceInfo = activeChild ? `nella provincia di ${activeChild.province} nel Lazio` : "nel Lazio";
      text = `Ciao Mismo! Ho bisogno di aiuto per organizzare l'assistenza burocratica per ${targetName} residente ${provinceInfo}. Presentati brevemente ed introduci questo tema spiegando come puoi aiutarmi per l'assistenza nel Lazio.`;
    } else if (cardId === "card-study") {
      text = `Ciao Mismo! Vorrei approfondire e saperne di più sul Disturbo dello Spettro Autistico (DSA). Presentati brevemente ed introduci questo tema spiegando come possiamo esplorarlo insieme.`;
    } else if (cardId === "card-school") {
      text = `Ciao Mismo! Ho bisogno di supporto per organizzare la scuola per ${targetName} dal punto di vista burocratico e pratico (PEI, PDP, sostegno). Presentati brevemente ed introduci questo tema.`;
    } else if (cardId === "card-territory") {
      openMap(); // Open the map immediately
      const provinceInfo = activeChild ? `nella provincia di ${activeChild.province} nel Lazio` : "nel Lazio";
      text = `Ciao Mismo! Ho bisogno di trovare servizi del territorio per ${targetName} residente ${provinceInfo}. Ho aperto la mappa laterale con tutte le risorse caricate. Introduci brevemente come puoi supportarmi in questa ricerca e chiedimi prima di cosa ho bisogno per aiutarmi ad orientarmi consapevolmente (senza consigliarmi subito specifiche strutture finché non ti rispondo).`;
    } else if (cardId === "card-sport") {
      openMap(); // Open the map immediately
      // Set the specialty filter to "Sport" automatically!
      const filterSpecialty = document.getElementById("filter-specialty");
      if (filterSpecialty) {
        filterSpecialty.value = "Sport";
        renderFilteredMarkers();
      }
      text = `Ciao Mismo! Vorrei informazioni su sport inclusivi, laboratori artistici e attività per il tempo libero adatti a ${targetName} nel Lazio. Ho aperto la mappa laterale con tutte le strutture sportive caricate. Spiegami brevemente come puoi aiutarmi in questo e chiedimi quali sono gli interessi o gli sport preferiti di mio figlio per consigliarmi al meglio.`;
    } else if (cardId === "card-calendar") {
      text = `Ciao Mismo! Quali sono le scadenze burocratiche e scolastiche più importanti da ricordare quest'anno per la scuola di ${targetName} (GLO, PEI) e per i contributi economici regionali (Modello A, Modello C) nel Lazio? Spiegami in modo chiaro e strutturato le date importanti.`;
    } else if (cardId === "card-health") {
      text = `Ciao Mismo! Ho bisogno di informazioni sulla sanità accessibile e la gestione delle urgenze, in particolare sul Servizio Tobia (DAMA) della Regione Lazio per visite e cure mediche senza barriere per ${targetName}. Spiegami cos'è, a chi è rivolto e come funziona.`;
    } else if (cardId === "card-market") {
      text = `Ciao Mismo! Vorrei saperne di più sul mercatino e lo scambio di materiali per la CAA (Comunicazione Aumentativa Alternativa), libri modificati e tabelle di comunicazione per ${targetName}. Spiegami come posso scambiare o creare supporti visivi e come funziona questa risorsa.`;
    } else if (cardId === "card-babysitting") {
      text = `Ciao Mismo! Ho bisogno di supporto per trovare un servizio di baby-sitting specializzato o supporto domiciliare con educatori o tutor formati per la gestione di ${targetName}. Spiegami come posso muovermi e quali tutele/riferimenti considerare.`;
    } else {
      text = `Ciao! Presentati ed introduci il portale Mismo per supportarmi con mio figlio.`;
    }

    // Add hidden user message to state, but do not render it in UI
    const userMessage = { role: "user", content: text };
    messages.push(userMessage);

    userInput.value = "";
    userInput.style.height = "auto";
    scrollToBottom();
    closeSidebarOnMobile();

    // Show typing
    typingIndicator.classList.remove("hidden");
    scrollToBottom();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages,
          profileId: activeProfileId,
          intent: currentIntent
        })
      });

      const data = await response.json();
      typingIndicator.classList.add("hidden");

      if (response.ok && data.reply) {
        const aiMessage = { role: "assistant", content: data.reply };
        messages.push(aiMessage);

        // Auto-pan map if reply contains map location link
        const mapMatch = data.reply.match(/map:([a-zA-Z0-9\-]+)/);
        if (mapMatch) {
          openMap(mapMatch[1]);
        }

        // Render response with typewriter effect
        await appendMessageHTMLWithTypewriter("assistant", data.reply);

        if (activeProfileId) {
          setTimeout(() => {
            loadProfileContext(activeProfileId);
          }, 1500);
        }
      } else {
        const errorMessage = data.error || "Impossibile caricare la risposta in questo momento.";
        appendMessageHTML("assistantError", `⚠️ **Errore:** ${errorMessage}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      typingIndicator.classList.add("hidden");
      appendMessageHTML("assistantError", "⚠️ **Errore di rete:** Assicurati che il server in localhost sia avviato.");
    }
    
    scrollToBottom();
  }

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;
    sendMessage(text);
  });

  // Send Message Logic
  async function sendMessage(text) {
    // Auto-open map if user message is about territory services, map, or sports structures
    const lowerText = text.toLowerCase();
    const mapKeywords = ["mappa", "servizi del territorio", "servizi territoriali", "centro convenzionato", "centri convenzionati", "professionisti", "terapisti", "strutture", "trovare servizi", "cerca servizi", "mappa delle strutture", "mappa strutture", "clinica", "cliniche", "logopedista", "psicomotricista", "terapia aba", "neuropsichiatra", "sport", "sport inclusivi", "attività sportive", "nuoto", "calcio", "basket"];
    const containsMapKeyword = mapKeywords.some(keyword => lowerText.includes(keyword));
    if (containsMapKeyword) {
      const isSportsQuery = ["sport", "attività sportive", "nuoto", "calcio", "basket"].some(k => lowerText.includes(k));
      openMap();
      if (isSportsQuery) {
        const filterSpecialty = document.getElementById("filter-specialty");
        if (filterSpecialty) {
          filterSpecialty.value = "Sport";
          renderFilteredMarkers();
        }
      }
    }

    hideDashboard();

    const userMessage = { role: "user", content: text };
    messages.push(userMessage);
    appendMessageHTML("user", text);

    userInput.value = "";
    userInput.style.height = "auto";
    scrollToBottom();
    closeSidebarOnMobile();

    // Show typing
    typingIndicator.classList.remove("hidden");
    scrollToBottom();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages,
          profileId: activeProfileId, // Send selected profile context ID
          intent: currentIntent
        })
      });

      const data = await response.json();
      typingIndicator.classList.add("hidden");

      if (response.ok && data.reply) {
        const aiMessage = { role: "assistant", content: data.reply };
        messages.push(aiMessage);
        
        // Auto-pan map if reply contains map location link
        const mapMatch = data.reply.match(/map:([a-zA-Z0-9\-]+)/);
        if (mapMatch) {
          openMap(mapMatch[1]);
        }
        
        // Render response with typewriter effect
        await appendMessageHTMLWithTypewriter("assistant", data.reply);

        // REFRESH CONTEXT.MD VISUALS
        // Wait a small delay after rendering, then fetch the updated context
        // that Gemini updated asynchronously in the background.
        if (activeProfileId) {
          setTimeout(() => {
            loadProfileContext(activeProfileId);
          }, 1500); // 1.5 seconds delay allows background call to finish
        }
      } else {
        const errorMessage = data.error || "Impossibile caricare la risposta in questo momento.";
        appendMessageHTML("assistantError", `⚠️ **Errore:** ${errorMessage}`);
      }
    } catch (err) {
      console.error("Fetch error:", err);
      typingIndicator.classList.add("hidden");
      appendMessageHTML("assistantError", "⚠️ **Errore di rete:** Assicurati che il server in localhost sia avviato.");
    }
    
    scrollToBottom();
  }

  function appendMessageHTML(sender, text) {
    const messageWrapper = document.createElement("div");
    messageWrapper.className = `message-wrapper ${sender === "user" ? "user-msg" : "ai-msg"}`;

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (sender === "user") {
      bubble.textContent = text;
    } else {
      bubble.innerHTML = typeof marked !== "undefined" ? marked.parse(text) : text;
    }

    messageWrapper.appendChild(bubble);
    chatMessages.appendChild(messageWrapper);
    scrollToBottom();
  }

  function appendMessageHTMLWithTypewriter(sender, text) {
    return new Promise((resolve) => {
      const messageWrapper = document.createElement("div");
      messageWrapper.className = "message-wrapper ai-msg";

      const bubble = document.createElement("div");
      bubble.className = "message-bubble";
      messageWrapper.appendChild(bubble);
      chatMessages.appendChild(messageWrapper);

      const words = text.split(" ");
      let currentWordIndex = 0;
      let typedText = "";

      const timer = setInterval(() => {
        if (currentWordIndex < words.length) {
          typedText += (currentWordIndex === 0 ? "" : " ") + words[currentWordIndex];
          
          if (typeof marked !== "undefined") {
            bubble.innerHTML = marked.parse(typedText);
          } else {
            bubble.textContent = typedText;
          }
          
          currentWordIndex++;
          scrollToBottom();
        } else {
          clearInterval(timer);
          resolve();
        }
      }, 15);
    });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Chat click delegation for map: links
  chatMessages.addEventListener("click", (e) => {
    const anchor = e.target.closest("a");
    if (anchor && anchor.getAttribute("href") && anchor.getAttribute("href").startsWith("map:")) {
      e.preventDefault();
      const structureId = anchor.getAttribute("href").split(":")[1];
      openMap(structureId);
    }
  });
});
