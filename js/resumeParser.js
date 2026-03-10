/**
 * Resume Parser Module
 * Handles heuristic/regex-based resume parsing
 */

// ================================================================
// HEURISTIC / REGEX EXTRACTION (fallback) - REVAMPED
// ================================================================
function extractWithHeuristics(text) {
  const lines = text.split(/\n/);
  const trimmedLines = lines.map(l => l.trim()).filter(Boolean);

  // Helper: Find first match
  const findFirst = (regex) => {
    for (const line of trimmedLines) {
      const m = line.match(regex);
      if (m) return m;
    }
    return null;
  };

  // ENHANCED SECTION HEADERS - More comprehensive
  const sectionHeaders = /^(summary|objective|profile|about|professional summary|experience|work experience|employment|career|education|academic|qualifications|skills|technical skills|core competencies|expertise|technologies|projects|personal projects|key projects|certifications|awards|honors|publications|languages|interests|references)/i;

  function getSectionContent(sectionRegex) {
    const content = [];
    let capturing = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        if (capturing) content.push("");
        continue;
      }
      if (sectionRegex.test(trimmed)) {
        capturing = true;
        continue;
      }
      if (capturing && sectionHeaders.test(trimmed)) {
        break;
      }
      if (capturing) content.push(trimmed);
    }
    return content;
  }

  // ---- ENHANCED PERSONAL INFO ----
  const emailMatch = findFirst(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = findFirst(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
  const linkedinMatch = findFirst(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|profile)\/[a-zA-Z0-9_-]+\/?/i);
  const githubMatch = findFirst(/(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+\/?/i);

  // SIMPLIFIED name detection - more lenient patterns
  let name = "";
  let title = "";
  
  for (let i = 0; i < Math.min(15, trimmedLines.length); i++) {
    const line = trimmedLines[i];
    
    // Skip obvious non-name lines
    if (line.includes('@')) continue; // Email
    if (line.includes('http')) continue; // URLs
    if (line.includes('linkedin.com') || line.includes('github.com')) continue;
    if (/^\d{3}-\d{3}-\d{4}$/.test(line)) continue; // Phone
    if (sectionHeaders.test(line)) break;
    
    // Check if line looks like a name (2-4 words, each capitalized)
    const words = line.split(/\s+/).filter(w => w.length > 0);
    const allWordsCapitalized = words.every(w => /^[A-Z][a-zA-Z]*$/.test(w));
    
    // Name pattern: 2-4 capitalized words, 5-40 chars total
    if (words.length >= 2 && words.length <= 4 && allWordsCapitalized && line.length >= 5 && line.length <= 40) {
      // Additional check: not all caps (like a header)
      if (!/^[A-Z\s]+$/.test(line)) {
        name = line;
        break; // Stop after finding first potential name
      }
    }
  }

  // If still no name, try first non-contact line
  if (!name) {
    for (const line of trimmedLines) {
      if (line.includes('@') || line.includes('http') || /^\d/.test(line)) continue;
      if (sectionHeaders.test(line)) break;
      if (line.length > 3 && line.length < 40 && !/^\s*[-•]/.test(line)) {
        name = line;
        break;
      }
    }
  }

  // Look for title after name (next 3 lines)
  if (name) {
    const nameIdx = trimmedLines.indexOf(name);
    for (let i = nameIdx + 1; i < Math.min(nameIdx + 4, trimmedLines.length); i++) {
      const line = trimmedLines[i];
      // Skip contact info
      if (line.includes('@') || line.includes('http') || /^\d/.test(line)) continue;
      // Title should be a reasonable phrase
      if (line.length > 3 && line.length < 60 && !sectionHeaders.test(line)) {
        title = line;
        break;
      }
    }
  }

  const locationMatch = findFirst(/([A-Z][a-zA-Z\s]+,\s*[A-Z]{2})/);
  const location = locationMatch ? locationMatch[1] : "";

  const personal = {
    name: name,
    title: title,
    email: emailMatch ? emailMatch[0] : "",
    phone: phoneMatch ? phoneMatch[0] : "",
    linkedin: linkedinMatch ? linkedinMatch[0] : "",
    github: githubMatch ? githubMatch[0] : "",
    location: location,
  };

  // ---- SUMMARY ----
  const summaryLines = getSectionContent(/^(summary|objective|profile|about)\s*:?\s*$/i);
  const summary = summaryLines.filter(Boolean).join(" ").trim();

  // ---- EXPERIENCE ----
  const expLines = getSectionContent(/^(experience|work experience|employment)\s*:?\s*$/i);
  const experience = parseExperience(expLines);

  // ---- EDUCATION ----
  const eduLines = getSectionContent(/^(education|academic)\s*:?\s*$/i);
  const education = parseEducation(eduLines);

  // ---- SKILLS ----
  const skillLines = getSectionContent(/^(skills|technical skills|core competencies)\s*:?\s*$/i);
  const skills = parseSkills(skillLines);

  // ---- PROJECTS ----
  const projLines = getSectionContent(/^(projects|personal projects)\s*:?\s*$/i);
  const projects = parseProjects(projLines);

  return { personal, summary, experience, education, skills, projects };
}

// SIMPLIFIED Experience Parser
function parseExperience(lines) {
  if (!lines.length) return [];

  const dateRangeRe = /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4})\s*[-–—]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{1,2}\/\d{4}|\d{4}|present|current|now)\b/i;
  const bulletRe = /^[•\-–—*▪▸►‣◦∙·]\s*/;
  const entries = [];
  let current = null;
  let achievements = [];

  for (const line of lines) {
    if (!line || !line.trim()) continue;

    const trimmed = line.trim();
    const isBullet = bulletRe.test(trimmed);
    const dateMatch = trimmed.match(dateRangeRe);

    // New entry: has date and not a bullet
    if (dateMatch && !isBullet) {
      // Save previous entry
      if (current) {
        current.achievements = achievements;
        entries.push(current);
        achievements = [];
      }

      current = { company: "", role: "", duration: "", achievements: [] };
      current.duration = dateMatch[0];

      // Parse role and company from remaining text
      let remaining = trimmed.replace(dateRangeRe, "").trim();
      remaining = remaining.replace(/^[|-–—@\s]+/, "").trim();
      
      // Common patterns: "Role at Company" or "Role | Company" or "Role - Company"
      const separators = /\s*(?:at|\||@|[-–—])\s*/i;
      const parts = remaining.split(separators).filter(s => s.trim());
      
      if (parts.length >= 2) {
        current.role = parts[0].trim();
        current.company = parts[1].trim();
      } else {
        current.role = remaining;
      }
    }
    // Bullet point = achievement
    else if (current && isBullet) {
      achievements.push(trimmed.replace(bulletRe, "").trim());
    }
    // Non-bullet text after entry started = might be additional info or achievement
    else if (current && trimmed.length > 10) {
      achievements.push(trimmed);
    }
  }

  // Don't forget last entry
  if (current) {
    current.achievements = achievements;
    entries.push(current);
  }

  return entries;
}

// SIMPLIFIED Education Parser
function parseEducation(lines) {
  if (!lines.length) return [];

  const entries = [];
  let current = null;
  const degreeKeywords = /\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|MBA|Ph\.?D|Bachelor|Master|Doctorate|Associate|Diploma|Certificate)\b/i;
  const yearRe = /\b(19|20)\d{2}\b/g;

  for (const line of lines) {
    if (!line || !line.trim()) continue;

    const trimmed = line.trim();
    const hasDegree = degreeKeywords.test(trimmed);
    const years = trimmed.match(yearRe);

    // New entry if has degree or year
    if (hasDegree || years || (/^[A-Z]/.test(trimmed) && trimmed.length > 5)) {
      if (current) entries.push(current);
      current = { institution: "", degree: "", year: "" };

      // Extract year(s)
      if (years) {
        current.year = years[years.length - 1]; // Use last year (graduation)
      }

      // Simple split: degree often comes first
      if (hasDegree) {
        const degreeMatch = trimmed.match(degreeKeywords);
        if (degreeMatch) {
          current.degree = degreeMatch[0];
          // Institution is usually after degree
          const parts = trimmed.split(/[,|-]/).map(s => s.trim());
          if (parts.length > 1) {
            current.institution = parts[parts.length - 1].replace(/\d{4}/g, "").trim();
          }
        }
      } else {
        // No degree found - assume it's the institution
        current.institution = trimmed.replace(/\d{4}/g, "").trim();
      }
    }
  }

  if (current) entries.push(current);
  return entries;
}

// IMPROVED Skills Parser
function parseSkills(lines) {
  if (!lines.length) return [];

  // Phrases to exclude (not actual skills)
  const excludePatterns = [
    /^programming$/i,
    /^over\s+\d+\s+lines?$/i,
    /^over\s+5000\s+lines$/i,
    /^over\s+1000\s+lines$/i,
    /^familiar$/i,
    /^proficient$/i,
    /^advanced$/i,
    /^intermediate$/i,
    /^beginner$/i,
    /^expert$/i,
    /^native$/i,
    /^fluent$/i,
    /^[a-z]\s+levels?$/i,
    /^years?\s+of\s+experience$/i,
    /^(skills|technologies|expertise|proficient|programming|languages?)$/i
  ];

  // Join all lines
  const allText = lines.join(" ");
  
  // Split by: commas, bullet points (•, -, *), pipes, or spaces
  const parts = allText.split(/[•\-\*\s]+|[,;|]+/);
  
  const skills = [];
  const seen = new Set();

  for (const part of parts) {
    // Clean up the skill name
    let skill = part.trim();
    
    // Remove leading/trailing special characters
    skill = skill.replace(/^[\-\*•\.\s]+|[\-\*•\.\s]+$/g, "");
    
    // Skip if empty or too short
    if (!skill || skill.length < 2) continue;
    
    // Skip if matches exclude patterns
    let shouldExclude = false;
    for (const pattern of excludePatterns) {
      if (pattern.test(skill)) {
        shouldExclude = true;
        break;
      }
    }
    if (shouldExclude) continue;
    
    // Skip if contains numbers at start (like "5+ years")
    if (/^\d/.test(skill)) continue;
    
    // Normalize: capitalize first letter of each word (title case)
    const normalized = skill.replace(/\b\w/g, c => c.toUpperCase());
    
    // Skip duplicates (case-insensitive)
    const lowerKey = normalized.toLowerCase();
    if (seen.has(lowerKey)) continue;
    seen.add(lowerKey);
    
    skills.push(normalized);
  }

  return skills;
}

// SIMPLIFIED Projects Parser
function parseProjects(lines) {
  if (!lines.length) return [];

  const bulletRe = /^[•\-–—*]\s*/;
  const urlRe = /github\.com\/[^\s]+/i;
  const entries = [];
  let current = null;
  let description = [];

  for (const line of lines) {
    if (!line || !line.trim()) continue;

    const trimmed = line.trim();
    const isBullet = bulletRe.test(trimmed);
    const urlMatch = trimmed.match(urlRe);

    // New project: starts with capital letter, not a bullet, reasonable length
    if (!isBullet && /^[A-Z]/.test(trimmed) && trimmed.length < 60 && !urlMatch) {
      // Save previous
      if (current) {
        current.description = description.join(" ");
        entries.push(current);
        description = [];
      }

      current = { name: trimmed, description: "", technologies: [], link: "" };
    }
    // Line with URL
    else if (urlMatch && current) {
      current.link = "https://" + urlMatch[0];
      // If there's text before URL, it's part of description
      const textBefore = trimmed.substring(0, trimmed.indexOf(urlMatch[0])).trim();
      if (textBefore && textBefore.length > 3) {
        description.push(textBefore);
      }
    }
    // Bullet point or description
    else if (current) {
      const cleaned = trimmed.replace(bulletRe, "").trim();
      if (cleaned) description.push(cleaned);
    }
  }

  if (current) {
    current.description = description.join(" ");
    entries.push(current);
  }

  return entries;
}

// ================================================================
// SECTION SEGMENTATION
// ================================================================

/**
 * Normalizes section headers in resume text by inserting newlines around detected headers
 * This helps with two-column layouts and inline headers from PDF extraction
 * @param {string} text - Raw resume text
 * @returns {string} Text with newlines inserted around section headers
 */
function normalizeSectionHeaders(text) {
  if (!text) return "";

  // Define section headers to detect
  const headers = [
    "EDUCATION",
    "EXPERIENCE",
    "WORK EXPERIENCE",
    "PROFESSIONAL EXPERIENCE",
    "SKILLS",
    "TECHNICAL SKILLS",
    "PROJECTS",
    "COURSEWORK",
    "AWARDS",
    "PUBLICATIONS",
    "RESEARCH",
    "LINKS",
    "SUMMARY",
    "PROFILE"
  ];

  // Sort by length descending to match longer headers first
  headers.sort((a, b) => b.length - a.length);

  let result = text;

  // Create regex pattern to find headers (case insensitive)
  // Matches header possibly followed by text, or text before and after header
  const headerPattern = new RegExp(
    "(\\b" + headers.join("\\b|\\b") + "\\b)",
    "gi"
  );

  // Replace header with newline + header + newline
  result = result.replace(headerPattern, "\n$1\n");

  // Clean up multiple newlines (keep max 2)
  result = result.replace(/\n{3,}/g, "\n\n");

  return result;
}

/**
 * Segments resume text into logical sections
 * @param {string} text - Raw resume text
 * @returns {object} Object with section name as key and section content as value
 */
function segmentResumeSections(text) {
  if (!text) {
    return {
      summary: "",
      experience: "",
      education: "",
      skills: "",
      projects: "",
      awards: "",
      publications: "",
      research: ""
    };
  }

  // Define section header mappings (exact dictionary from requirements)
  const sectionMappings = {
    "EDUCATION": "education",
    "ACADEMIC BACKGROUND": "education",
    "EXPERIENCE": "experience",
    "WORK EXPERIENCE": "experience",
    "PROFESSIONAL EXPERIENCE": "experience",
    "SKILLS": "skills",
    "TECHNICAL SKILLS": "skills",
    "PROJECTS": "projects",
    "COURSEWORK": "coursework",
    "AWARDS": "awards",
    "PUBLICATIONS": "publications",
    "RESEARCH": "research",
    "LINKS": "links",
    "SUMMARY": "summary"
  };

  // Get all headers sorted by length (longest first for matching)
  const allHeaders = Object.keys(sectionMappings).sort((a, b) => b.length - a.length);

  // Split text into lines
  const lines = text.split(/\n/);

  // Result object
  const sections = {
    summary: "",
    experience: "",
    education: "",
    skills: "",
    projects: "",
    awards: "",
    publications: "",
    research: ""
  };

  let currentSection = null;
  const sectionContent = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentSection) {
        sectionContent.push("");
      }
      continue;
    }

    // Convert to uppercase for matching
    const upperLine = trimmed.toUpperCase();

    // Clean the line (remove bullets, trailing punctuation)
    const cleanLine = upperLine
      .replace(/^[•\-\*\d\.]+\s*/, "")
      .replace(/:\s*$/, "")
      .replace(/\s*-\s*$/, "");

    // Check if this line is a header
    let detectedHeader = null;
    let canonicalName = null;

    for (const header of allHeaders) {
      // Match exact header or header at start of line
      if (cleanLine === header || cleanLine.startsWith(header + " ") || cleanLine.startsWith(header + ":")) {
        detectedHeader = header;
        canonicalName = sectionMappings[header];
        break;
      }
    }

    if (detectedHeader) {
      // Save previous section content
      if (currentSection) {
        sections[currentSection] = sectionContent.join("\n").trim();
      }
      // Start new section
      currentSection = canonicalName;
      sectionContent.length = 0;
    } else if (currentSection) {
      // Add line to current section
      sectionContent.push(trimmed);
    }
  }

  // Save last section
  if (currentSection) {
    sections[currentSection] = sectionContent.join("\n").trim();
  }

  return sections;
}

// ================================================================
// FALLBACK NAME EXTRACTION FOR HEURISTIC PARSING
// ================================================================

/**
 * Fallback name detection for heuristic parsing
 * @param {string} text - Resume text
 * @returns {string} Extracted name or empty string
 */
function extractNameFromHeuristics(text) {
  if (!text) return "";

  // Section headers to exclude
  const headerKeywords = [
    "education", "experience", "skills", "projects", "awards",
    "publications", "research", "links", "summary", "profile"
  ];

  // Patterns to exclude (not names)
  const excludePatterns = [
    /@/, // email
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // phone
    /github\.com/i,
    /linkedin\.com/i,
    /http/i,
    /www\./i
  ];

  const lines = text.split(/\n/);
  const searchLimit = Math.min(10, lines.length);

  for (let i = 0; i < searchLimit; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip if contains email, phone, or URLs
    let shouldSkip = false;
    for (const pattern of excludePatterns) {
      if (pattern.test(line)) {
        shouldSkip = true;
        break;
      }
    }
    if (shouldSkip) continue;

    // Skip if line contains any header keywords
    const lowerLine = line.toLowerCase();
    let hasHeader = false;
    for (const kw of headerKeywords) {
      if (lowerLine.includes(kw)) {
        hasHeader = true;
        break;
      }
    }
    if (hasHeader) continue;

    // Check if line has 2-4 capitalized words
    const words = line.split(/\s+/);
    const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w));

    // Name should have 2-4 capitalized words
    if (capitalizedWords.length >= 2 && capitalizedWords.length <= 4) {
      return capitalizedWords.join(" ");
    }
  }

  return "";
}

// ================================================================
// FALLBACK EDUCATION EXTRACTION FOR HEURISTIC PARSING
// ================================================================

/**
 * Extracts education entries from education section text
 * @param {string} educationText - Raw education section text
 * @returns {Array} Array of education objects
 */
function extractEducationFromText(educationText) {
  if (!educationText) return [];

  const entries = [];
  const lines = educationText.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Keywords to identify institution lines
  const institutionKeywords = ["university", "college", "institute", "school", "academy"];
  
  // Degree patterns
  const degreePatterns = [
    /phd|doctorate|doctoral/i,
    /master|ms|ma|mba|m\.sc|m\.a/i,
    /bachelor|bs|ba|b\.sc|b\.a|btech|be/i,
    /associate|a\.s|a\.a/i,
    /high school|diploma|certificate/i
  ];

  // Year pattern
  const yearPattern = /(?:19|20)\d{2}|present|current/i;

  let currentEntry = null;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Check if line contains institution keyword
    const hasInstitution = institutionKeywords.some(kw => lowerLine.includes(kw));

    // Check if line contains degree keyword
    const hasDegree = degreePatterns.some(p => p.test(lowerLine));

    // Check if line contains year
    const hasYear = yearPattern.test(lowerLine);

    if (hasInstitution) {
      // Save previous entry
      if (currentEntry && (currentEntry.institution || currentEntry.degree)) {
        entries.push(currentEntry);
      }
      // Start new entry with institution
      currentEntry = {
        institution: line,
        degree: "",
        year: "",
        location: ""
      };
    } else if (currentEntry) {
      // Add to current entry
      if (hasDegree && !currentEntry.degree) {
        currentEntry.degree = line;
      } else if (hasYear && !currentEntry.year) {
        currentEntry.year = line.match(yearPattern)[0];
      } else if (!currentEntry.degree) {
        // Assume it's degree if no degree set yet
        currentEntry.degree = line;
      } else if (!currentEntry.year) {
        currentEntry.year = line;
      }
    }
  }

  // Add last entry
  if (currentEntry && (currentEntry.institution || currentEntry.degree)) {
    entries.push(currentEntry);
  }

  return entries;
}

/**
 * Checks if education entries need fallback extraction
 * @param {Array} education - Array of education objects
 * @returns {boolean} True if fallback needed
 */
function needsEducationFallback(education) {
  if (!education || !Array.isArray(education) || education.length === 0) return true;

  // Check if entries contain only generic words
  const genericPatterns = [/^graduate$/i, /^undergraduate$/i, /^student$/i, /only/i];

  for (const entry of education) {
    const degree = entry.degree || "";
    const institution = entry.institution || "";

    // If both are empty or match generic patterns, need fallback
    if (genericPatterns.test(degree) || (!degree && !institution)) {
      return true;
    }
  }

  return false;
}

// Make functions globally accessible
window.extractWithHeuristics = extractWithHeuristics;
window.parseExperience = parseExperience;
window.parseEducation = parseEducation;
window.parseSkills = parseSkills;
window.parseProjects = parseProjects;
window.segmentResumeSections = segmentResumeSections;
window.normalizeSectionHeaders = normalizeSectionHeaders;
window.extractNameFromHeuristics = extractNameFromHeuristics;
window.extractEducationFromText = extractEducationFromText;
window.needsEducationFallback = needsEducationFallback;
