/**
 * Dashboard Module
 * Handles dashboard rendering, JSON display, and status messages
 */

// DOM refs
const uploadSection = document.getElementById("uploadSection");
const dashboardSection = document.getElementById("dashboardSection");
const dashboardSubtitle = document.getElementById("dashboardSubtitle");
const newUploadBtn = document.getElementById("newUploadBtn");
const jsonToggle = document.getElementById("jsonToggle");
const jsonPanel = document.getElementById("jsonPanel");
const jsonChevron = document.getElementById("jsonChevron");
const jsonOutput = document.getElementById("jsonOutput");
const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");
const statusMsg = document.getElementById("statusMsg");

// Stats
const statExperience = document.getElementById("statExperience");
const statSkills = document.getElementById("statSkills");
const statEducation = document.getElementById("statEducation");
const statProjects = document.getElementById("statProjects");
const statConfidence = document.getElementById("statConfidence");

// Personal card
const personalInitials = document.getElementById("personalInitials");
const personalName = document.getElementById("personalName");
const personalTitle = document.getElementById("personalTitle");
const personalDetails = document.getElementById("personalDetails");
const summaryBlock = document.getElementById("summaryBlock");
const summaryText = document.getElementById("summaryText");

// Lists
const experienceList = document.getElementById("experienceList");
const skillsList = document.getElementById("skillsList");
const educationList = document.getElementById("educationList");
const projectsBlock = document.getElementById("projectsBlock");
const projectsList = document.getElementById("projectsList");

let extractedJSON = null;

// ================================================================
// DASHBOARD VIEW
// ================================================================
function showDashboard() {
  uploadSection.classList.add("hidden");
  dashboardSection.classList.remove("hidden");
  // Reset portfolio generator state
  const generatorPanel = document.getElementById("generatorPanel");
  const previewPanel = document.getElementById("previewPanel");
  const openGeneratorBtn = document.getElementById("openGeneratorBtn");
  
  if (generatorPanel) generatorPanel.classList.add("hidden");
  if (previewPanel) previewPanel.classList.add("hidden");
  if (openGeneratorBtn) {
    openGeneratorBtn.textContent = "Generate Portfolio";
    openGeneratorBtn.disabled = false;
    openGeneratorBtn.classList.remove("opacity-50", "cursor-not-allowed");
  }
}

function showUpload() {
  dashboardSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  if (typeof clearFileSelection === 'function') {
    clearFileSelection();
  }
}

function initDashboard() {
  if (newUploadBtn) {
    newUploadBtn.addEventListener("click", showUpload);
  }

  // JSON toggle
  if (jsonToggle) {
    jsonToggle.addEventListener("click", () => {
      jsonPanel.classList.toggle("hidden");
      jsonChevron.classList.toggle("rotate-180");
    });
  }

  // Copy & Download
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      if (!extractedJSON) return;
      const text = JSON.stringify(extractedJSON, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        const orig = copyBtn.textContent;
        copyBtn.textContent = "✓ Copied!";
        setTimeout(() => { copyBtn.textContent = orig; }, 1500);
      });
    });
  }

  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      if (!extractedJSON) return;
      const text = JSON.stringify(extractedJSON, null, 2);
      const blob = new Blob([text], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

// ================================================================
// RENDER DASHBOARD
// ================================================================
function renderDashboard(data, confidenceScore = null) {
  const p = data.personal || {};
  const exp = data.experience || [];
  const skills = data.skills || [];
  const edu = data.education || [];
  const projects = data.projects || [];

  // Stats
  statExperience.textContent = exp.length;
  statSkills.textContent = skills.length;
  statEducation.textContent = edu.length;
  statProjects.textContent = projects.length;

  // Confidence score
  if (confidenceScore !== null) {
    statConfidence.textContent = confidenceScore + "%";
    // Color coding based on score
    if (confidenceScore >= 80) {
      statConfidence.className = "text-2xl font-bold text-emerald-400";
    } else if (confidenceScore >= 50) {
      statConfidence.className = "text-2xl font-bold text-yellow-400";
    } else {
      statConfidence.className = "text-2xl font-bold text-red-400";
    }
  } else {
    statConfidence.textContent = "—";
    statConfidence.className = "text-2xl font-bold text-white";
  }

  // Personal card
  const name = p.name || "Unknown";
  const initials = name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  personalInitials.textContent = initials;
  personalName.textContent = name;
  personalTitle.textContent = p.title || "Professional";

  // Personal details
  let detailsHTML = "";
  if (p.email) detailsHTML += '<span class="flex items-center gap-1">' + "📧 " + escHTML(p.email) + '</span>';
  if (p.phone) detailsHTML += '<span class="flex items-center gap-1">' + "📱 " + escHTML(p.phone) + '</span>';
  if (p.location) detailsHTML += '<span class="flex items-center gap-1">' + "📍 " + escHTML(p.location) + '</span>';
  if (p.linkedin) detailsHTML += '<a href="' + (p.linkedin.startsWith('http') ? p.linkedin : 'https://' + p.linkedin) + '" target="_blank" class="text-indigo-400 hover:text-indigo-300 transition-colors">LinkedIn ↗</a>';
  if (p.github) detailsHTML += '<a href="' + (p.github.startsWith('http') ? p.github : 'https://' + p.github) + '" target="_blank" class="text-indigo-400 hover:text-indigo-300 transition-colors">GitHub ↗</a>';
  personalDetails.innerHTML = detailsHTML;

  // Summary
  if (data.summary) {
    summaryBlock.classList.remove("hidden");
    summaryText.textContent = data.summary;
  } else {
    summaryBlock.classList.add("hidden");
  }

  // Experience
  if (exp.length) {
    experienceList.innerHTML = exp.map(e => {
      let html = '<div class="bg-gray-900/30 border border-gray-800/50 rounded-xl p-4 card-hover">';
      html += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">';
      html += '<h4 class="font-semibold text-white">' + escHTML(e.role || e.company || "") + '</h4>';
      html += '<span class="text-xs text-gray-500 mt-1 sm:mt-0">' + escHTML(e.duration || "") + '</span>';
      html += '</div>';
      html += '<p class="text-sm text-indigo-400 mb-2">' + escHTML(e.company || "") + '</p>';
      if ((e.achievements || []).length) {
        html += '<ul class="space-y-1">';
        html += e.achievements.map(a => '<li class="text-sm text-gray-400 flex gap-2"><span class="text-gray-600 flex-shrink-0">•</span><span>' + escHTML(a) + '</span></li>').join("");
        html += '</ul>';
      }
      html += '</div>';
      return html;
    }).join("");
  } else {
    experienceList.innerHTML = '<p class="text-sm text-gray-600">No experience data found.</p>';
  }

  // Skills
  if (skills.length) {
    skillsList.innerHTML = skills.map(s => 
      '<span class="px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 text-gray-300 text-xs rounded-full hover:border-indigo-500/50 transition-colors">' + escHTML(s) + '</span>'
    ).join("");
  } else {
    skillsList.innerHTML = '<p class="text-sm text-gray-600">No skills found.</p>';
  }

  // Education
  if (edu.length) {
    educationList.innerHTML = edu.map(e => {
      let html = '<div class="bg-gray-900/30 border border-gray-800/50 rounded-lg p-3">';
      html += '<p class="text-sm font-medium text-white">' + escHTML(e.degree || "") + '</p>';
      html += '<p class="text-xs text-gray-500">' + escHTML(e.institution || "") + '</p>';
      if (e.year) html += '<p class="text-xs text-gray-600 mt-1">' + escHTML(e.year) + '</p>';
      html += '</div>';
      return html;
    }).join("");
  } else {
    educationList.innerHTML = '<p class="text-sm text-gray-600">No education data found.</p>';
  }

  // Projects
  if (projects.length) {
    projectsBlock.classList.remove("hidden");
    projectsList.innerHTML = projects.map(proj => {
      let html = '<div class="bg-gray-900/30 border border-gray-800/50 rounded-xl p-4 card-hover">';
      html += '<h4 class="font-semibold text-white mb-1">' + escHTML(proj.name || "") + '</h4>';
      html += '<p class="text-sm text-gray-400 mb-3">' + escHTML(proj.description || "") + '</p>';
      if ((proj.technologies || []).length) {
        html += '<div class="flex flex-wrap gap-1.5 mb-2">';
        html += proj.technologies.map(t => '<span class="px-2 py-0.5 bg-indigo-600/10 text-indigo-400 text-xs rounded-full">' + escHTML(t) + '</span>').join("");
        html += '</div>';
      }
      if (proj.link) html += '<a href="' + (proj.link.startsWith('http') ? proj.link : 'https://' + proj.link) + '" target="_blank" class="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">View Project ↗</a>';
      html += '</div>';
      return html;
    }).join("");
  } else {
    projectsBlock.classList.add("hidden");
  }
}

// HTML escape helper
function escHTML(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}

// ----- Status helpers -----
function showStatus(type, message) {
  statusMsg.className = "text-sm rounded-xl px-4 py-3 max-w-2xl mx-auto mt-4 " + ({
    success: "bg-green-900/30 border border-green-700/50 text-green-300",
    error:   "bg-red-900/30 border border-red-700/50 text-red-300",
    info:    "bg-blue-900/30 border border-blue-700/50 text-blue-300",
  }[type] || "");
  statusMsg.textContent = message;
  statusMsg.classList.remove("hidden");
}

function hideStatus() {
  statusMsg.classList.add("hidden");
}

// ================================================================
// JSON RENDERING with syntax highlighting
// ================================================================
function renderJSON(obj) {
  const raw = JSON.stringify(obj, null, 2);
  const highlighted = raw
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"([^"]+)"(?=\s*:)/g, '<span class="json-key">"$1"</span>')
    .replace(/:\s*"([^"]*)"/g, ': <span class="json-string">"$1"</span>')
    .replace(/:\s*(\d+)/g, ': <span class="json-number">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
    .replace(/([[\]{}])/g, '<span class="json-bracket">$1</span>');

  jsonOutput.innerHTML = highlighted;
}

// Make functions globally accessible
window.renderDashboard = renderDashboard;
window.renderJSON = renderJSON;
window.escHTML = escHTML;
window.showStatus = showStatus;
window.hideStatus = hideStatus;
window.showDashboard = showDashboard;
window.showUpload = showUpload;
window.initDashboard = initDashboard;
Object.defineProperty(window, 'extractedJSON', {
  get: function() { return extractedJSON; },
  set: function(val) { extractedJSON = val; }
});
