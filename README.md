# R2P — Resume to Portfolio

**R2P** is a browser-based tool that converts plain-text resumes into structured JSON, which can then be used to generate beautiful portfolio websites.

> **Current version: Phase 1 — JSON Extraction Layer**

---

## What is R2P?

R2P (Resume-to-Portfolio) is a multi-phase project that aims to turn any resume into a deployable personal portfolio site. The pipeline is:

1. **Phase 1** ✅ — Extract structured JSON from a pasted resume
2. **Phase 2** (planned) — Choose a portfolio template/theme
3. **Phase 3** (planned) — Generate a static portfolio site from the JSON + template
4. **Phase 4** (planned) — One-click deploy to Netlify/Vercel

## Phase 1: JSON Extraction

Phase 1 provides a clean web UI where users can paste their resume as plain text and extract structured data in a well-defined JSON schema. The output includes:

- **Personal info** (name, title, email, phone, LinkedIn, GitHub, location)
- **Summary / objective**
- **Work experience** (company, role, duration, achievements)
- **Education** (institution, degree, year)
- **Skills** (flat list)
- **Projects** (name, description, technologies, link)

### Two Extraction Modes

| Mode | How it works | Accuracy |
|------|-------------|----------|
| **LLM (OpenAI)** | Sends resume text to GPT-3.5-turbo with a structured prompt. Requires an API key. | High — handles varied formats well |
| **Regex/Heuristic** | Pure client-side JavaScript parsing using regex patterns and section detection. No API key needed. | Good for standard resume formats |

The mode is selected automatically:
- If an OpenAI API key is provided → LLM mode
- Otherwise → Regex/heuristic fallback

**Privacy note:** In heuristic mode, no data ever leaves your browser. In LLM mode, resume text is sent to OpenAI's API.

## How to Use

### Option 1: Open locally
```bash
# Just open the file in your browser
open index.html
```

### Option 2: Deploy to Netlify
1. Drag and drop the project folder onto [Netlify Drop](https://app.netlify.com/drop)
2. That's it — the site is live

### Option 3: Any static host
The project is a single `index.html` file with no build step. Deploy it anywhere that serves static files.

### Using the tool
1. (Optional) Paste your OpenAI API key for higher-quality extraction
2. Paste your resume as plain text into the textarea
3. Click **Extract JSON**
4. Review the structured output
5. **Copy** or **Download** the JSON file

## JSON Schema

The extraction outputs this structure:

```json
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
      "achievements": []
    }
  ],
  "education": [
    {
      "institution": "",
      "degree": "",
      "year": ""
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
  ]
}
```

## Tech Stack

- **Vanilla HTML/CSS/JS** — no frameworks, no build step
- **Tailwind CSS** via CDN — for styling
- **OpenAI API** (optional) — for LLM-powered extraction

## Future Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | JSON extraction from resume text | ✅ Complete |
| 2 | Portfolio template selection UI | 🔜 Planned |
| 3 | Static site generation from JSON + template | 🔜 Planned |
| 4 | One-click deployment (Netlify/Vercel) | 🔜 Planned |

## License

MIT
