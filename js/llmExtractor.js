/**
 * LLM Extractor Module
 * Handles Groq API extraction for resume parsing
 */

// ================================================================
// PREPROCESSING FUNCTIONS
// ================================================================

/**
 * Preprocesses resume text before sending to AI
 * @param {string} text - Raw resume text
 * @returns {string} Cleaned resume text
 */
function preprocessResumeText(text) {
  if (!text) return "";

  let cleaned = text;

  // 1. Replace multiple spaces with a single space
  cleaned = cleaned.replace(/[ \t]+/g, " ");

  // 2. Normalize bullet points - each bullet starts on a new line
  cleaned = cleaned.replace(/([•\-\*])\s*/g, "\n$1 ");

  // 3. Insert newlines before common section headers
  const sectionHeaders = [
    "EXPERIENCE",
    "EDUCATION",
    "SKILLS",
    "PROJECTS",
    "AWARDS",
    "PUBLICATIONS",
    "RESEARCH",
    "SUMMARY"
  ];

  sectionHeaders.forEach(header => {
    const regex = new RegExp(`\\n?\\s*${header}\\s*`, "gi");
    cleaned = cleaned.replace(regex, "\n\n" + header + "\n");
  });

  // 4. Collapse multiple blank lines into a single blank line
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

// ================================================================
// TEXT CLEANING
// ================================================================

/**
 * Cleans and normalizes resume text before sending to AI
 * @param {string} text - Raw resume text
 * @returns {string} Cleaned resume text
 */
function cleanResumeText(text) {
  if (!text) return "";

  let cleaned = text;

  // 1. Replace pipe characters with spaces
  cleaned = cleaned.replace(/\|/g, " ");

  // 2. Normalize whitespace (multiple spaces -> single space)
  cleaned = cleaned.replace(/[ \t]+/g, " ");

  // 3. Ensure bullet points start on new lines
  cleaned = cleaned.replace(/([•\-\*])\s*/g, "\n$1 ");

  // 4. Insert newlines before section headers if they appear inline
  const sectionHeaders = [
    "EDUCATION",
    "EXPERIENCE",
    "WORK EXPERIENCE",
    "PROFESSIONAL EXPERIENCE",
    "SKILLS",
    "PROJECTS",
    "COURSEWORK",
    "AWARDS",
    "PUBLICATIONS",
    "RESEARCH",
    "LINKS",
    "SUMMARY",
    "PROFILE"
  ];

  // Sort headers by length (longest first) to match longer headers first
  sectionHeaders.sort((a, b) => b.length - a.length);

  for (const header of sectionHeaders) {
    // Match header possibly with text before or after
    const regex = new RegExp(`(\\b${header})(\\s+)`, "gi");
    cleaned = cleaned.replace(regex, "$1\n");
  }

  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

// ================================================================
// AI SECTION DETECTION
// ================================================================

/**
 * Uses Groq API to identify resume sections before structured extraction
 * @param {string} text - Cleaned resume text
 * @param {string} apiKey - Groq API key
 * @returns {object} Object with section names as keys and section text as values
 */
async function detectSectionsWithAI(text, apiKey) {
  const systemPrompt = `You are analyzing a resume.

Identify the major sections and return them in JSON format.

Sections may include:

summary
experience
education
skills
projects
coursework
awards
publications
research
links

Return ONLY JSON in this format:

{
"sections": {
"summary": "",
"experience": "",
"education": "",
"skills": "",
"projects": "",
"coursework": "",
"awards": "",
"publications": "",
"research": "",
"links": ""
}
}

Each value should contain the raw text belonging to that section.

If a section does not exist return an empty string.

Do not return explanations. Only return JSON.`;

  // Make API call with retry logic for rate limits
  const makeApiCall = async (attempt = 1) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
        temperature: 0.05,
        max_tokens: 600,
      }),
    });

    // Handle rate limit with retry
    if (response.status === 429 && attempt < 2) {
      console.warn(`Rate limited, retrying in 5 seconds... (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, 5000));
      return makeApiCall(attempt + 1);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API returned ${response.status}`);
    }

    return response;
  };

  const response = await makeApiCall();

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error("Empty response from API");

  // Log raw AI response for debugging
  console.log("RAW AI RESPONSE:", content);

  // Clean up the response
  let cleaned = content;
  cleaned = cleaned.replace(/^`+/, "").replace(/`+$/, "");
  cleaned = cleaned.replace(/^json\s*/i, "");
  cleaned = cleaned.trim();

  const firstBrace = cleaned.indexOf("{");
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }

  try {
    const parsed = JSON.parse(cleaned);
    return parsed.sections || parsed;
  } catch (parseError) {
    console.error("AI Section Detection Error:", { original: content, cleaned: cleaned });
    throw new Error("Failed to parse AI section detection response");
  }
}

// ================================================================
// LLM EXTRACTION (Groq API - OpenAI Compatible)
// ================================================================
async function extractWithLLM(resumeText, apiKey) {
  // Truncate resume text to prevent token limit issues
  resumeText = resumeText.slice(0, 8000);

  // Preprocess the resume text before sending to AI
  const processedText = preprocessResumeText(resumeText);

  // Clean the text (normalize pipes, bullets, insert newlines before headers)
  const cleanedText = cleanResumeText(processedText);

  // Try AI-based section detection first (only for longer resumes)
  let sections;
  if (cleanedText.length >= 4000) {
    try {
      sections = await detectSectionsWithAI(cleanedText, apiKey);
    } catch (err) {
      // Fall back to rule-based section detection if AI fails
      console.warn("AI section detection failed, using rule-based:", err.message);
      const normalizedText = normalizeSectionHeaders(cleanedText);
      sections = segmentResumeSections(normalizedText);
    }
  } else {
    // Skip AI section detection for shorter resumes
    const normalizedText = normalizeSectionHeaders(cleanedText);
    sections = segmentResumeSections(normalizedText);
  }

  // Format the input as structured text for better extraction
  let formattedInput = "";
  if (sections.summary) formattedInput += `SUMMARY:\n${sections.summary}\n\n`;
  if (sections.experience) formattedInput += `EXPERIENCE:\n${sections.experience}\n\n`;
  if (sections.education) formattedInput += `EDUCATION:\n${sections.education}\n\n`;
  if (sections.skills) formattedInput += `SKILLS:\n${sections.skills}\n\n`;
  if (sections.projects) formattedInput += `PROJECTS:\n${sections.projects}\n\n`;
  if (sections.coursework) formattedInput += `COURSEWORK:\n${sections.coursework}\n\n`;
  if (sections.awards) formattedInput += `AWARDS:\n${sections.awards}\n\n`;
  if (sections.publications) formattedInput += `PUBLICATIONS:\n${sections.publications}\n\n`;
  if (sections.research) formattedInput += `RESEARCH:\n${sections.research}\n\n`;
  if (sections.links) formattedInput += `LINKS:\n${sections.links}\n\n`;

  // Use formatted input, fall back to processed text if empty
  const finalInput = formattedInput.trim() || cleanedText;

  const systemPrompt = `You are an expert resume parser.

You will receive resume content already separated into sections.

Extract structured information and return ONLY valid JSON.

Do not include markdown or explanations.

JSON schema:

{
"personal": {
"name": "",
"title": "",
"email": "",
"phone": "",
"linkedin": "",
"github": "",
"location": ""
},
"summary": "",
"experience": [
{
"company": "",
"role": "",
"duration": "",
"location": "",
"achievements": []
}
],
"education": [
{
"institution": "",
"degree": "",
"year": "",
"location": ""
}
],
"skills": [],
"projects": [
{
"name": "",
"description": "",
"technologies": [],
"link": ""
}
],
"links": [],
"awards": [],
"publications": [],
"research": []
}

Rules:

Only extract information that exists.
Return empty arrays for missing sections.
Skills must be simple strings.
Achievements must be bullet points.
Output valid JSON only.`;

  // Make API call with retry logic for rate limits
  const makeExtractionApiCall = async (attempt = 1) => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: finalInput },
        ],
        temperature: 0.05,
        max_tokens: 600,
      }),
    });

    // Handle rate limit with retry
    if (response.status === 429 && attempt < 2) {
      console.warn(`Rate limited, retrying in 5 seconds... (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, 5000));
      return makeExtractionApiCall(attempt + 1);
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `API returned ${response.status}`);
    }

    return response;
  };

  const response = await makeExtractionApiCall();

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error("Empty response from API");

  // Log raw AI response for debugging
  console.log("RAW AI RESPONSE:", content);

  // Robust JSON parsing: clean up the response before parsing
  let cleaned = content;

  // 1. Remove any leading or trailing backticks
  cleaned = cleaned.replace(/^`+/, "").replace(/`+$/, "");

  // 2. Remove accidental "json" markdown labels
  cleaned = cleaned.replace(/^json\s*/i, "");

  // 3. Trim whitespace
  cleaned = cleaned.trim();

  // 4. Ensure the first character is "{" - find the first opening brace
  const firstBrace = cleaned.indexOf("{");
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }
  if (firstBrace === -1) {
    // No opening brace found, try to find array
    const firstBracket = cleaned.indexOf("[");
    if (firstBracket > 0) {
      cleaned = cleaned.substring(firstBracket);
    }
  }

  try {
    const parsedData = JSON.parse(cleaned);
    // Validate the parsed data
    const validatedData = validateResumeJSON(parsedData);
    // Compute confidence score
    const confidenceScore = computeConfidenceScore(validatedData);

    // If no education entries, try fallback extraction
    if (!validatedData.education || validatedData.education.length === 0) {
      const fallbackEducation = extractEducationFallback(resumeText);
      if (fallbackEducation.length > 0) {
        validatedData.education = fallbackEducation;
      }
    } else {
      // Check if education entries contain only generic words
      const needsFallback = needsEducationFallback(validatedData.education);
      if (needsFallback) {
        const sections = segmentResumeSections(normalizeSectionHeaders(cleanResumeText(preprocessResumeText(resumeText))));
        const extractedEducation = extractEducationFromText(sections.education);
        if (extractedEducation.length > 0) {
          validatedData.education = extractedEducation;
        }
      }
    }

    // If no name, try fallback name detection
    if (!validatedData.personal?.name?.trim()) {
      const fallbackName = extractNameFallback(resumeText);
      if (fallbackName) {
        validatedData.personal.name = fallbackName;
      }
    }

    // Return data with confidence score
    return {
      data: validatedData,
      confidenceScore: confidenceScore
    };
  } catch (parseError) {
    // Log the raw response for debugging
    console.error("LLM Response Parsing Error:", {
      original: content,
      cleaned: cleaned,
      error: parseError.message
    });
    throw new Error("Unable to parse AI response. Please check the resume format and try again.");
  }
}

// ================================================================
// CONFIDENCE SCORING
// ================================================================

/**
 * Computes a confidence score (0-100) based on extracted resume data
 * @param {object} parsedData - The parsed resume JSON
 * @returns {number} Confidence score from 0 to 100
 */
function computeConfidenceScore(parsedData) {
  if (!parsedData) return 0;

  let score = 0;

  // Name detected (+20)
  if (parsedData.personal?.name?.trim()) {
    score += 20;
  }

  // Email detected (+20)
  if (parsedData.personal?.email?.trim()) {
    score += 20;
  }

  // At least one education entry (+20)
  if (parsedData.education && parsedData.education.length > 0) {
    score += 20;
  }

  // At least one experience entry (+20)
  if (parsedData.experience && parsedData.experience.length > 0) {
    score += 20;
  }

  // At least five skills extracted (+20)
  const skillCount = parsedData.skills?.length || 0;
  if (skillCount >= 5) {
    score += 20;
  }

  // Cap at 100
  return Math.min(score, 100);
}

// ================================================================
// FALLBACK EDUCATION EXTRACTION
// ================================================================

/**
 * Fallback education extraction when LLM returns no education entries
 * Searches for university keywords and reconstructs education entries
 * @param {string} resumeText - Original resume text
 * @returns {Array} Array of education objects
 */
function extractEducationFallback(resumeText) {
  if (!resumeText) return [];

  // University/college keywords to search for
  const institutionKeywords = [
    "university",
    "college",
    "institute",
    "school",
    "academy",
    "polytechnic",
    "borsen"
  ];

  // Degree keywords
  const degreeKeywords = [
    "phd", "doctorate", "doctoral",
    "master", "ms", "ma", "mba", "m.sc", "m.a",
    "bachelor", "bs", "ba", "b.sc", "b.a", "btech", "be",
    "associate", "a.s", "a.a",
    "high school", "diploma", "certificate"
  ];

  // Year patterns
  const yearPattern = /(?:19|20)\d{2}/g;

  const lines = resumeText.split(/\n/);
  const educationEntries = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase().trim();
    if (!line) continue;

    // Check if line contains an institution keyword
    const hasInstitution = institutionKeywords.some(kw => line.includes(kw));

    if (hasInstitution) {
      // Get surrounding context (previous and next lines)
      const context = [
        i > 0 ? lines[i - 1] : "",
        lines[i],
        i < lines.length - 1 ? lines[i + 1] : ""
      ].join(" ");

      const entry = {
        institution: "",
        degree: "",
        year: "",
        location: ""
      };

      // Extract institution name (capitalized words near keyword)
      const instMatch = lines[i].match(/([A-Z][a-zA-Z\s]+(?:University|College|Institute|School|Academy))/);
      if (instMatch) {
        entry.institution = instMatch[1];
      } else {
        // Use the line as institution if no pattern matched
        entry.institution = lines[i].replace(/[^a-zA-Z\s]/g, "").trim();
      }

      // Extract degree
      for (const deg of degreeKeywords) {
        const degIndex = context.toLowerCase().indexOf(deg);
        if (degIndex !== -1) {
          // Extract a few words around the degree keyword
          const start = Math.max(0, degIndex - 20);
          const end = Math.min(context.length, degIndex + 30);
          let degreeText = context.substring(start, end).trim();
          // Clean up
          degreeText = degreeText.replace(/^[^a-zA-Z]+/, "").replace(/[^a-zA-Z]+$/, "");
          entry.degree = degreeText;
          break;
        }
      }

      // Extract year
      const years = context.match(yearPattern);
      if (years && years.length > 0) {
        // Prefer years in degree context, otherwise take first year found
        entry.year = years[0];
        if (years.length > 1) {
          // Could be graduation year and maybe start year
          entry.year = years[years.length - 1]; // Assume last year is graduation
        }
      }

      // Only add if we found something meaningful
      if (entry.institution || entry.degree) {
        // Avoid duplicates
        const exists = educationEntries.some(e => 
          e.institution.toLowerCase() === entry.institution.toLowerCase()
        );
        if (!exists) {
          educationEntries.push(entry);
        }
      }
    }
  }

  return educationEntries;
}

// ================================================================
// FALLBACK NAME EXTRACTION
// ================================================================

/**
 * Fallback name extraction when LLM returns no name
 * Searches first 10 lines for a probable name
 * @param {string} resumeText - Original resume text
 * @returns {string} Extracted name or empty string
 */
function extractNameFallback(resumeText) {
  if (!resumeText) return "";

  // Patterns to exclude (not names)
  const excludePatterns = [
    /@/, // email
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/, // phone
    /github\.com/i,
    /linkedin\.com/i,
    /http/i,
    /www\./i,
    /resume/i,
    /cv/i,
    /curriculum/i
  ];

  const lines = resumeText.split(/\n/);
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

    // Check if line has 2-4 capitalized words
    const words = line.split(/\s+/);
    
    // Filter to only words that start with capital letters
    const capitalizedWords = words.filter(w => /^[A-Z][a-z]+$/.test(w));

    // Name should have 2-4 capitalized words
    if (capitalizedWords.length >= 2 && capitalizedWords.length <= 4) {
      return capitalizedWords.join(" ");
    }
  }

  return "";
}

// ================================================================
// VALIDATION
// ================================================================

/**
 * Validates and ensures all required fields exist in the resume JSON
 * Also removes duplicate skills and normalizes capitalization
 * @param {object} data - The parsed resume JSON
 * @returns {object} Validated resume object with all required fields
 */
function validateResumeJSON(data) {
  if (!data || typeof data !== "object") {
    data = {};
  }

  // Ensure personal object exists with all required fields
  if (!data.personal || typeof data.personal !== "object") {
    data.personal = {};
  }
  data.personal = {
    name: data.personal.name || "",
    title: data.personal.title || "",
    email: data.personal.email || "",
    phone: data.personal.phone || "",
    linkedin: data.personal.linkedin || "",
    github: data.personal.github || "",
    location: data.personal.location || ""
  };

  // Ensure required arrays exist
  data.experience = Array.isArray(data.experience) ? data.experience : [];
  data.education = Array.isArray(data.education) ? data.education : [];
  data.skills = Array.isArray(data.skills) ? data.skills : [];
  data.projects = Array.isArray(data.projects) ? data.projects : [];

  // Process skills: remove duplicates and normalize capitalization
  if (data.skills.length > 0) {
    const seen = new Map();
    const normalizedSkills = [];
    
    for (const skill of data.skills) {
      if (typeof skill !== "string" || !skill.trim()) continue;
      
      // Normalize: trim, lowercase for comparison
      const normalized = skill.trim();
      const lowerKey = normalized.toLowerCase();
      
      // Skip if we've seen this skill (case-insensitive)
      if (seen.has(lowerKey)) continue;
      
      seen.set(lowerKey, true);
      
      // Title case the skill (capitalize first letter of each word)
      const titleCased = normalized.replace(/\b\w/g, c => c.toUpperCase());
      normalizedSkills.push(titleCased);
    }
    
    data.skills = normalizedSkills;
  }

  // Ensure additional optional arrays exist
  data.links = Array.isArray(data.links) ? data.links : [];
  data.awards = Array.isArray(data.awards) ? data.awards : [];
  data.publications = Array.isArray(data.publications) ? data.publications : [];
  data.research = Array.isArray(data.research) ? data.research : [];

  // Ensure summary exists
  data.summary = typeof data.summary === "string" ? data.summary : "";

  return data;
}

// Make functions globally accessible
window.extractWithLLM = extractWithLLM;
window.preprocessResumeText = preprocessResumeText;
window.cleanResumeText = cleanResumeText;
window.detectSectionsWithAI = detectSectionsWithAI;
window.computeConfidenceScore = computeConfidenceScore;
window.validateResumeJSON = validateResumeJSON;
window.segmentResumeSections = segmentResumeSections;
window.normalizeSectionHeaders = normalizeSectionHeaders;
window.extractEducationFallback = extractEducationFallback;
window.extractNameFallback = extractNameFallback;
