/**
 * Main Module
 * Handles DOM element initialization, settings, tab switching, and application startup
 */

(function () {
  "use strict";

  // ----- DOM refs -----
  const apiKeyInput = document.getElementById("apiKey");
  const toggleKeyBtn = document.getElementById("toggleKey");
  const modeIndicator = document.getElementById("modeIndicator");
  const settingsToggle = document.getElementById("settingsToggle");
  const settingsPanel = document.getElementById("settingsPanel");
  const resumeTextarea = document.getElementById("resumeText");
  const extractBtn = document.getElementById("extractBtn");
  const extractLabel = document.getElementById("extractLabel");
  const extractSpinner = document.getElementById("extractSpinner");

  // Tab DOM refs
  const tabPdf = document.getElementById("tabPdf");
  const tabText = document.getElementById("tabText");
  const pdfPanel = document.getElementById("pdfPanel");
  const textPanel = document.getElementById("textPanel");

  // Processing overlay
  const processingOverlay = document.getElementById("processingOverlay");
  const processingTitle = document.getElementById("processingTitle");
  const processingSubtitle = document.getElementById("processingSubtitle");
  const processingBar = document.getElementById("processingBar");

  // ================================================================
  // SETTINGS TOGGLE
  // ================================================================
  settingsToggle.addEventListener("click", () => {
    settingsPanel.classList.toggle("hidden");
  });

  // ----- API key persistence (sessionStorage) -----
  const STORAGE_KEY = "r2p_openai_key";
  const savedKey = sessionStorage.getItem(STORAGE_KEY);
  if (savedKey) {
    apiKeyInput.value = savedKey;
    updateModeIndicator();
  }

  apiKeyInput.addEventListener("input", () => {
    const key = apiKeyInput.value.trim();
    if (key) sessionStorage.setItem(STORAGE_KEY, key);
    else sessionStorage.removeItem(STORAGE_KEY);
    updateModeIndicator();
  });

  function updateModeIndicator() {
    const hasKey = apiKeyInput.value.trim().length > 0;
    modeIndicator.innerHTML = hasKey
      ? 'Mode: <span class="text-green-400 font-medium">AI Extraction (Groq Llama 3)</span>'
      : 'Mode: <span class="text-amber-400/80 font-medium">Regex / heuristic parsing</span>';
  }

  // ----- Toggle key visibility -----
  toggleKeyBtn.addEventListener("click", () => {
    const isPassword = apiKeyInput.type === "password";
    apiKeyInput.type = isPassword ? "text" : "password";
    toggleKeyBtn.textContent = isPassword ? "Hide" : "Show";
  });

  // ================================================================
  // TAB SWITCHING
  // ================================================================
  tabPdf.addEventListener("click", () => {
    tabPdf.classList.add("active");
    tabText.classList.remove("active");
    pdfPanel.classList.remove("hidden");
    textPanel.classList.add("hidden");
  });

  tabText.addEventListener("click", () => {
    tabText.classList.add("active");
    tabPdf.classList.remove("active");
    textPanel.classList.remove("hidden");
    pdfPanel.classList.add("hidden");
  });

  // ================================================================
  // PROCESSING OVERLAY
  // ================================================================
  function showProcessing(title, subtitle) {
    processingTitle.textContent = title;
    processingSubtitle.textContent = subtitle;
    processingBar.style.width = "10%";
    processingOverlay.classList.remove("hidden");
  }

  function updateProcessingBar(pct) {
    processingBar.style.width = pct + "%";
  }

  function updateProcessingText(title, subtitle) {
    processingTitle.textContent = title;
    processingSubtitle.textContent = subtitle;
  }

  function hideProcessing() {
    processingOverlay.classList.add("hidden");
  }

  // ================================================================
  // TEXT EXTRACT BUTTON
  // ================================================================
  extractBtn.addEventListener("click", async () => {
    const text = resumeTextarea.value.trim();
    if (!text) {
      showStatus("error", "Please paste your resume text first.");
      return;
    }

    hideStatus();
    setExtractLoading(true);

    try {
      const apiKey = apiKeyInput.value.trim();
      let result;
      let confidenceScore = null;

      if (apiKey) {
        const llmResult = await extractWithLLM(text, apiKey);
        result = llmResult.data;
        confidenceScore = llmResult.confidenceScore;
      } else {
        result = validateResumeJSON(extractWithHeuristics(text));
        
        // Fallback name detection for heuristic parsing
        if (!result.personal?.name) {
          const fallbackName = extractNameFromHeuristics(text);
          if (fallbackName) {
            result.personal = result.personal || {};
            result.personal.name = fallbackName;
          }
        }

        // Fallback education extraction if needed
        if (needsEducationFallback(result.education)) {
          const sections = segmentResumeSections(normalizeSectionHeaders(cleanResumeText(preprocessResumeText(text))));
          const extractedEducation = extractEducationFromText(sections.education);
          if (extractedEducation.length > 0) {
            result.education = extractedEducation;
          }
        }

        confidenceScore = computeConfidenceScore(result);
      }

      extractedJSON = result;
      renderDashboard(result, confidenceScore);
      renderJSON(result);
      showDashboard();
      showStatus("success", apiKey
        ? "✓ Extracted via Groq Llama-3.1-8b-instant"
        : "✓ Extracted via regex/heuristic parsing (best-effort)");
    } catch (err) {
      showStatus("error", "Extraction failed: " + err.message);
    } finally {
      setExtractLoading(false);
    }
  });

  function setExtractLoading(on) {
    extractBtn.disabled = on;
    extractLabel.textContent = on ? "Extracting…" : "Extract JSON";
    extractSpinner.classList.toggle("hidden", !on);
  }

  // ================================================================
  // INITIALIZE ALL MODULES
  // ================================================================
  
  // Initialize PDF extractor
  if (typeof initDragAndDrop === 'function') initDragAndDrop();
  if (typeof initPDFUpload === 'function') initPDFUpload();
  if (typeof initExtractFromPreview === 'function') initExtractFromPreview();
  
  // Initialize dashboard
  if (typeof initDashboard === 'function') initDashboard();
  
  // Initialize portfolio generator
  if (typeof initPortfolioGenerator === 'function') initPortfolioGenerator();

})();
