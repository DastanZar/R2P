/**
 * PDF Extractor Module
 * Handles PDF upload, text extraction, and drag-and-drop functionality
 */

// Configure pdf.js worker for client-side PDF extraction
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// ================================================================
// DRAG AND DROP / FILE UPLOAD
// ================================================================

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const dropZoneContent = document.getElementById("dropZoneContent");
const fileSelectedState = document.getElementById("fileSelectedState");
const selectedFileName = document.getElementById("selectedFileName");
const clearFileBtn = document.getElementById("clearFileBtn");
const uploadBtn = document.getElementById("uploadBtn");
const uploadLabel = document.getElementById("uploadLabel");
const uploadSpinner = document.getElementById("uploadSpinner");

let selectedFile = null;

// Initialize drag and drop handlers
function initDragAndDrop() {
  if (!dropZone) return;
  
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInput.click(); }
  });

  ["dragenter", "dragover"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    });
  });

  ["dragleave", "drop"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    });
  });

  dropZone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === "application/pdf") {
      handleFileSelection(files[0]);
    } else {
      showStatus("error", "Please drop a PDF file.");
    }
  });

  fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) {
      handleFileSelection(fileInput.files[0]);
    }
  });

  clearFileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearFileSelection();
  });
}

function handleFileSelection(file) {
  selectedFile = file;
  selectedFileName.textContent = file.name;
  dropZoneContent.classList.add("hidden");
  fileSelectedState.classList.remove("hidden");
  uploadBtn.disabled = false;
  hideStatus();
}

function clearFileSelection() {
  selectedFile = null;
  fileInput.value = "";
  dropZoneContent.classList.remove("hidden");
  fileSelectedState.classList.add("hidden");
  uploadBtn.disabled = true;
}

// ================================================================
// PDF UPLOAD - Simple extraction with editable preview
// ================================================================

const pdfPreviewPanel = document.getElementById("pdfPreviewPanel");
const pdfPreviewText = document.getElementById("pdfPreviewText");
const extractFromPreviewBtn = document.getElementById("extractFromPreviewBtn");
const aiExtractOption = document.getElementById("aiExtractOption");
const useAIExtract = document.getElementById("useAIExtract");
const resumeTextarea = document.getElementById("resumeText");
const apiKeyInput = document.getElementById("apiKey");

function initPDFUpload() {
  if (!uploadBtn) return;
  
  uploadBtn.addEventListener("click", async () => {
    if (!selectedFile) return;

    hideStatus();
    hidePDFPreview();
    setUploadLoading(true);
    uploadLabel.textContent = "Extracting text...";

    try {
      // Simple text extraction - just join all text items with spaces
      const rawText = await extractRawTextFromPDF(selectedFile);
      
      if (!rawText || rawText.length < 50) {
        showStatus("error", "Could not extract text from PDF. It may be a scanned image. Try pasting text manually.");
        setUploadLoading(false);
        uploadLabel.textContent = "Upload & Extract";
        return;
      }

      // Show the preview panel with extracted text
      showPDFPreview(rawText);
      setUploadLoading(false);
      uploadLabel.textContent = "Upload & Extract";

    } catch (err) {
      setUploadLoading(false);
      uploadLabel.textContent = "Upload & Extract";
      showStatus("error", "PDF extraction failed: " + err.message);
    }
  });
}

// ================================================================
// IMPROVED PDF TEXT EXTRACTION (Step 1) - Multi-column Support
// ================================================================
async function extractRawTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Group items by vertical position (y-coordinate)
    const LINE_THRESHOLD = 5; // ~5 units threshold for same line
    const lines = new Map();
    
    for (const item of textContent.items) {
      // Get vertical position (y-coordinate from transform[5])
      const y = item.transform[5];
      
      // Find existing line within threshold
      let matchedLine = null;
      for (const [lineY] of lines) {
        if (Math.abs(y - lineY) <= LINE_THRESHOLD) {
          matchedLine = lineY;
          break;
        }
      }
      
      if (matchedLine !== null) {
        lines.get(matchedLine).push(item);
      } else {
        // Create new line
        lines.set(y, [item]);
      }
    }
    
    // Sort lines top-to-bottom (higher y = lower on page, so sort descending)
    const sortedLines = Array.from(lines.entries())
      .sort((a, b) => b[0] - a[0]); // Descending y = top to bottom
    
    // Build text: sort items within each line by x-position, then join
    const pageText = sortedLines
      .map(([y, items]) => {
        // Sort items by horizontal position (x-coordinate from transform[4])
        return items
          .sort((a, b) => a.transform[4] - b.transform[4])
          .map(item => item.str)
          .join(" ");
      })
      .join("\n");
    
    fullText += pageText + "\n\n";
  }

  return fullText.trim();
}

// ================================================================
// PDF PREVIEW PANEL FUNCTIONS (Step 2)
// ================================================================
function showPDFPreview(text) {
  pdfPreviewText.value = text;
  pdfPreviewPanel.classList.remove("hidden");
  
  // Show AI option if API key is present
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
  if (apiKey) {
    aiExtractOption.classList.remove("hidden");
  } else {
    aiExtractOption.classList.add("hidden");
  }
  
  pdfPreviewPanel.scrollIntoView({ behavior: "smooth" });
}

function hidePDFPreview() {
  pdfPreviewPanel.classList.add("hidden");
  pdfPreviewText.value = "";
}

function setUploadLoading(on) {
  uploadBtn.disabled = on;
  uploadLabel.textContent = on ? "Extracting text..." : "Upload & Extract";
  uploadSpinner.classList.toggle("hidden", !on);
}

// ================================================================
// EXTRACT FROM PREVIEW BUTTON (Step 3)
// ================================================================
function initExtractFromPreview() {
  if (!extractFromPreviewBtn) return;
  
  extractFromPreviewBtn.addEventListener("click", async () => {
    const resumeText = document.getElementById('pdfPreviewText').value.trim();
    if (!resumeText) {
      showStatus("error", "No text to extract");
      return;
    }

    // Copy text to the main textarea so existing handlers work
    resumeTextarea.value = resumeText;
    hidePDFPreview();
    hideStatus();
    setExtractLoading(true);

    try {
      const apiKey = apiKeyInput ? apiKeyInput.value.trim() : "";
      let result;
      let confidenceScore = null;

      if (apiKey) {
        const llmResult = await extractWithLLM(resumeText, apiKey);
        result = llmResult.data;
        confidenceScore = llmResult.confidenceScore;
      } else {
        result = validateResumeJSON(extractWithHeuristics(resumeText));
        // Fallback name detection for heuristic parsing
        if (!result.personal?.name) {
          const fallbackName = extractNameFromHeuristics(resumeText);
          if (fallbackName) {
            result.personal = result.personal || {};
            result.personal.name = fallbackName;
          }
        }

        // Fallback education extraction if needed
        if (needsEducationFallback(result.education)) {
          const sections = segmentResumeSections(normalizeSectionHeaders(cleanResumeText(preprocessResumeText(resumeText))));
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
}

function setExtractLoading(on) {
  const extractBtn = document.getElementById("extractBtn");
  const extractLabel = document.getElementById("extractLabel");
  const extractSpinner = document.getElementById("extractSpinner");
  
  if (extractBtn) {
    extractBtn.disabled = on;
    extractLabel.textContent = on ? "Extracting…" : "Extract JSON";
    extractSpinner.classList.toggle("hidden", !on);
  }
}

// Make functions globally accessible
window.extractRawTextFromPDF = extractRawTextFromPDF;
window.initDragAndDrop = initDragAndDrop;
window.initPDFUpload = initPDFUpload;
window.initExtractFromPreview = initExtractFromPreview;
window.handleFileSelection = handleFileSelection;
window.clearFileSelection = clearFileSelection;
window.showPDFPreview = showPDFPreview;
window.hidePDFPreview = hidePDFPreview;
window.setUploadLoading = setUploadLoading;
