/**
 * Portfolio Generator Module
 * Handles portfolio generation, preview, and download
 */

// DOM refs
const portfolioSection = document.getElementById("portfolioSection");
const openGeneratorBtn = document.getElementById("openGeneratorBtn");
const generatorPanel = document.getElementById("generatorPanel");
const generateWebsiteBtn = document.getElementById("generateWebsiteBtn");
const genLabel = document.getElementById("genLabel");
const genSpinner = document.getElementById("genSpinner");
const previewPanel = document.getElementById("previewPanel");
const portfolioPreview = document.getElementById("portfolioPreview");
const downloadPortfolioBtn = document.getElementById("downloadPortfolioBtn");

let generatedHTML = null;

// ================================================================
// PHASE 2: PORTFOLIO GENERATION
// ================================================================

function initPortfolioGenerator() {
  if (!openGeneratorBtn) return;
  
  openGeneratorBtn.addEventListener("click", () => {
    generatorPanel.classList.remove("hidden");
    openGeneratorBtn.textContent = "↓ Choose a template below";
    openGeneratorBtn.disabled = true;
    openGeneratorBtn.classList.add("opacity-50", "cursor-not-allowed");
  });

  if (generateWebsiteBtn) {
    generateWebsiteBtn.addEventListener("click", () => {
      if (!extractedJSON) return;
      genLabel.textContent = "Generating…";
      genSpinner.classList.remove("hidden");
      generateWebsiteBtn.disabled = true;

      setTimeout(() => {
        try {
          generatedHTML = generateMinimalistPortfolio(extractedJSON);
          portfolioPreview.srcdoc = generatedHTML;
          previewPanel.classList.remove("hidden");
          genLabel.textContent = "✓ Generated!";
          genSpinner.classList.add("hidden");
          previewPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (err) {
          showStatus("error", "Portfolio generation failed: " + err.message);
          genLabel.textContent = "Generate Website";
          genSpinner.classList.add("hidden");
          generateWebsiteBtn.disabled = false;
        }
      }, 100);
    });
  }

  if (downloadPortfolioBtn) {
    downloadPortfolioBtn.addEventListener("click", () => {
      if (!generatedHTML) return;
      const blob = new Blob([generatedHTML], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "portfolio.html";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
}

// ================================================================
// MINIMALIST PORTFOLIO TEMPLATE
// ================================================================
function generateMinimalistPortfolio(data) {
  const p = data.personal || {};
  const name = escHTML(p.name || "Your Name");
  const title = escHTML(p.title || "Professional");
  const email = p.email || "";
  const linkedin = p.linkedin || "";
  const github = p.github || "";
  const location = escHTML(p.location || "");
  const summary = escHTML(data.summary || "");
  const experience = data.experience || [];
  const education = data.education || [];
  const skills = data.skills || [];
  const projects = data.projects || [];

  function makeLink(url) {
    if (!url) return "";
    const href = url.startsWith("http") ? url : "https://" + url;
    return href;
  }

  let socialHTML = "";
  if (email) socialHTML += '<a href="mailto:' + escHTML(email) + '" class="text-gray-400 hover:text-blue-400 transition-colors"><svg class="w-5 h-5 inline" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> <span class="ml-1">' + escHTML(email) + '</span></a>';
  if (linkedin) socialHTML += '<a href="' + makeLink(linkedin) + '" target="_blank" class="text-gray-400 hover:text-blue-400 transition-colors"><svg class="w-5 h-5 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> <span class="ml-1">LinkedIn</span></a>';
  if (github) socialHTML += '<a href="' + makeLink(github) + '" target="_blank" class="text-gray-400 hover:text-blue-400 transition-colors"><svg class="w-5 h-5 inline" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> <span class="ml-1">GitHub</span></a>';

  let expHTML = "";
  experience.forEach(exp => {
    const achievements = (exp.achievements || []).map(a => '<li class="text-gray-400 text-sm leading-relaxed">' + escHTML(a) + '</li>').join("");
    expHTML += '<div class="fade-in relative pl-8 pb-10 border-l-2 border-gray-800 last:pb-0">';
    expHTML += '<div class="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-gray-950"></div>';
    expHTML += '<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-1">';
    expHTML += '<h3 class="text-lg font-semibold text-white">' + escHTML(exp.role || "") + '</h3>';
    expHTML += '<span class="text-sm text-gray-500">' + escHTML(exp.duration || "") + '</span>';
    expHTML += '</div>';
    expHTML += '<p class="text-blue-400 text-sm mb-3">' + escHTML(exp.company || "") + '</p>';
    if (achievements) expHTML += '<ul class="space-y-1.5 list-disc list-inside">' + achievements + '</ul>';
    expHTML += '</div>';
  });

  let projHTML = "";
  projects.forEach(proj => {
    const techs = (proj.technologies || []).map(t => '<span class="px-2 py-1 bg-gray-800 text-blue-400 text-xs rounded-full">' + escHTML(t) + '</span>').join("");
    const linkBtn = proj.link ? '<a href="' + makeLink(proj.link) + '" target="_blank" class="inline-flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 transition-colors mt-3">View Project <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg></a>' : "";
    projHTML += '<div class="fade-in bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">';
    projHTML += '<h3 class="text-lg font-semibold text-white mb-2">' + escHTML(proj.name || "") + '</h3>';
    projHTML += '<p class="text-gray-400 text-sm mb-4">' + escHTML(proj.description || "") + '</p>';
    projHTML += '<div class="flex flex-wrap gap-2">' + techs + '</div>';
    projHTML += linkBtn;
    projHTML += '</div>';
  });

  const skillsHTML = skills.map(s => '<span class="fade-in px-4 py-2 bg-gray-900/50 border border-gray-800 text-gray-300 text-sm rounded-full hover:border-blue-500/50 transition-colors">' + escHTML(s) + '</span>').join("");

  let eduHTML = "";
  education.forEach(edu => {
    eduHTML += '<div class="fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 border-b border-gray-800 last:border-0">';
    eduHTML += '<div>';
    eduHTML += '<h3 class="text-white font-medium">' + escHTML(edu.degree || "") + '</h3>';
    eduHTML += '<p class="text-gray-400 text-sm">' + escHTML(edu.institution || "") + '</p>';
    eduHTML += '</div>';
    eduHTML += '<span class="text-gray-500 text-sm mt-1 sm:mt-0">' + escHTML(edu.year || "") + '</span>';
    eduHTML += '</div>';
  });

  return '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'  <meta charset="UTF-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
'  <title>' + name + ' — Portfolio</title>\n' +
'  <script src="https://cdn.tailwindcss.com"><\\/script>\n' +
'  <link rel="preconnect" href="https://fonts.googleapis.com">\n' +
'  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
'  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">\n' +
'  <style>\n' +
'    * { font-family: \'Inter\', sans-serif; }\n' +
'    html { scroll-behavior: smooth; }\n' +
'    body { background: #0a0a0a; color: #fff; }\n' +
'    .fade-in {\n' +
'      opacity: 0;\n' +
'      transform: translateY(20px);\n' +
'      transition: opacity 0.6s ease-out, transform 0.6s ease-out;\n' +
'    }\n' +
'    .fade-in.visible {\n' +
'      opacity: 1;\n' +
'      transform: translateY(0);\n' +
'    }\n' +
'    ::-webkit-scrollbar { width: 8px; }\n' +
'    ::-webkit-scrollbar-track { background: #0a0a0a; }\n' +
'    ::-webkit-scrollbar-thumb { background: #333; border-radius: 4px; }\n' +
'    ::-webkit-scrollbar-thumb:hover { background: #555; }\n' +
'  </style>\n' +
'</head>\n' +
'<body class="antialiased">\n' +
'\n' +
'  <!-- Navigation -->\n' +
'  <nav class="fixed top-0 w-full bg-[#0a0a0a]/80 backdrop-blur-lg border-b border-gray-800/50 z-50">\n' +
'    <div class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">\n' +
'      <a href="#hero" class="text-lg font-bold text-white">' + name.split(" ")[0] + '<span class="text-blue-500">.</span></a>\n' +
'      <div class="hidden sm:flex items-center gap-8">\n' +
'        ' + (experience.length ? '<a href="#experience" class="text-sm text-gray-400 hover:text-white transition-colors">Experience</a>' : '') + '\n' +
'        ' + (projects.length ? '<a href="#projects" class="text-sm text-gray-400 hover:text-white transition-colors">Projects</a>' : '') + '\n' +
'        ' + (skills.length ? '<a href="#skills" class="text-sm text-gray-400 hover:text-white transition-colors">Skills</a>' : '') + '\n' +
'        ' + (education.length ? '<a href="#education" class="text-sm text-gray-400 hover:text-white transition-colors">Education</a>' : '') + '\n' +
'      </div>\n' +
'    </div>\n' +
'  </nav>\n' +
'\n' +
'  <main class="max-w-5xl mx-auto px-6">\n' +
'\n' +
'    <!-- Hero -->\n' +
'    <section id="hero" class="min-h-screen flex flex-col justify-center py-20 pt-32">\n' +
'      <div class="fade-in">\n' +
'        <p class="text-blue-500 text-sm font-medium tracking-wider uppercase mb-4">Hello, I\'m</p>\n' +
'        <h1 class="text-5xl sm:text-7xl font-extrabold text-white leading-tight mb-4">' + name + '</h1>\n' +
'        <h2 class="text-2xl sm:text-3xl font-light text-gray-400 mb-6">' + title + '</h2>\n' +
'        ' + (summary ? '<p class="text-gray-500 text-lg max-w-2xl leading-relaxed mb-8">' + summary + '</p>' : '') + '\n' +
'        ' + (location ? '<p class="text-gray-600 text-sm mb-6">📍 ' + location + '</p>' : '') + '\n' +
'        <div class="flex flex-wrap items-center gap-6">\n' +
'          ' + socialHTML + '\n' +
'        </div>\n' +
'      </div>\n' +
'    </section>\n' +
'\n' +
'    ' + (experience.length ? '<section id="experience" class="py-20"><h2 class="fade-in text-3xl font-bold text-white mb-12">Experience</h2><div class="space-y-0">' + expHTML + '</div></section>' : '') + '\n' +
'\n' +
'    ' + (projects.length ? '<section id="projects" class="py-20"><h2 class="fade-in text-3xl font-bold text-white mb-12">Projects</h2><div class="grid grid-cols-1 md:grid-cols-2 gap-6">' + projHTML + '</div></section>' : '') + '\n' +
'\n' +
'    ' + (skills.length ? '<section id="skills" class="py-20"><h2 class="fade-in text-3xl font-bold text-white mb-12">Skills</h2><div class="flex flex-wrap gap-3">' + skillsHTML + '</div></section>' : '') + '\n' +
'\n' +
'    ' + (education.length ? '<section id="education" class="py-20"><h2 class="fade-in text-3xl font-bold text-white mb-12">Education</h2><div class="bg-gray-900/30 border border-gray-800 rounded-xl p-6">' + eduHTML + '</div></section>' : '') + '\n' +
'\n' +
'  </main>\n' +
'\n' +
'  <!-- Footer -->\n' +
'  <footer class="border-t border-gray-800/50 py-8 text-center">\n' +
'    <p class="text-gray-600 text-sm">&copy; ' + new Date().getFullYear() + ' ' + name + '. Built with R2P.</p>\n' +
'  </footer>\n' +
'\n' +
'  <script>\n' +
'    // Intersection Observer for fade-in animations\n' +
'    const observer = new IntersectionObserver((entries) => {\n' +
'      entries.forEach(entry => {\n' +
'        if (entry.isIntersecting) {\n' +
'          entry.target.classList.add(\'visible\');\n' +
'        }\n' +
'      });\n' +
'    }, { threshold: 0.1, rootMargin: \'0px 0px -50px 0px\' });\n' +
'\n' +
'    document.querySelectorAll(\'.fade-in\').forEach(el => observer.observe(el));\n' +
'  <\\/script>\n' +
'</body>\n' +
'</html>';
}

// Make functions globally accessible
window.initPortfolioGenerator = initPortfolioGenerator;
window.generateMinimalistPortfolio = generateMinimalistPortfolio;
