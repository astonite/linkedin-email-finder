// data-extractor.js - Handles data extraction from LinkedIn and Sales Navigator

// Extract structured data from JSON-LD (most stable method)
function extractFromJSONLD() {
  console.log("=== Attempting JSON-LD extraction ===");

  try {
    const jsonLdScripts = document.querySelectorAll(
      'script[type="application/ld+json"]'
    );
    console.log(`Found ${jsonLdScripts.length} JSON-LD script tags`);

    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.textContent);
        console.log("Parsed JSON-LD data:", data);

        // Extract name
        const name =
          data.name || data.author?.name || (data.givenName && data.familyName)
            ? `${data.givenName} ${data.familyName}`
            : null;

        // Extract company
        const company =
          data.worksFor?.name ||
          data.memberOf?.name ||
          data.affiliation?.name ||
          null;

        if (name || company) {
          console.log(
            `✅ JSON-LD extraction successful - Name: "${name}", Company: "${company}"`
          );
          return { name, company };
        }
      } catch (e) {
        console.warn("Failed to parse JSON-LD script:", e);
      }
    }

    console.log("❌ No valid data found in JSON-LD");
    return null;
  } catch (error) {
    console.warn("JSON-LD extraction error:", error);
    return null;
  }
}

// Validate if a string looks like a person's name
function isValidPersonName(name) {
  if (!name || typeof name !== "string") return false;

  const trimmed = name.trim();

  // Basic checks
  if (trimmed.length < 2) return false;
  if (trimmed.length > 100) return false;

  // Should have at least a first and last name (at least one space)
  if (!trimmed.includes(" ")) return false;

  // Should not be common LinkedIn UI text or sidebar headers
  const invalidNames = [
    "linkedin",
    "home",
    "my network",
    "jobs",
    "messaging",
    "notifications",
    "me",
    "work",
    "learn",
    "profile",
    "sign in",
    "join now",
    "settings",
    "help",
    // Sidebar/recommendation section headers (Oct 2025)
    "explore premium profiles",
    "more profiles for you",
    "people also viewed",
    "people you may know",
    "you might like",
    "pages for you",
    "similar profiles",
    "view similar profiles",
    // Ad-related text
    "why am i seeing this ad",
    "manage your ad preferences",
    "hide or report this ad",
    "tell us why you don't want to see this",
  ];

  if (invalidNames.some((invalid) => trimmed.toLowerCase() === invalid)) {
    return false;
  }

  // Should contain mostly letters and spaces (allow hyphens, apostrophes)
  const letterRatio =
    (trimmed.match(/[a-zA-Z\s\-']/g) || []).length / trimmed.length;
  if (letterRatio < 0.8) return false;

  return true;
}

// Validate if a string looks like a company name
function isValidCompanyName(company) {
  if (!company || typeof company !== "string") return false;

  const trimmed = company.trim();

  // Basic checks
  if (trimmed.length < 2) return false;
  if (trimmed.length > 200) return false;

  // Skip connection level indicators (· 1st, · 2nd, · 3rd, 1st degree, etc.)
  const connectionPatterns = [
    /^·\s*(1st|2nd|3rd)$/i,
    /^(1st|2nd|3rd)\s*degree$/i,
    /^·\s*$/,
    /^\d+(st|nd|rd|th)$/i,
  ];

  if (connectionPatterns.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  // Skip if starts with bullet or special characters only
  if (/^[·•○●\s]+$/.test(trimmed)) {
    return false;
  }

  // Should not be common LinkedIn UI text
  const invalidCompanies = [
    "linkedin",
    "see more",
    "show less",
    "company",
    "about",
    "follow",
    "connect",
    "message",
    "more",
    "less",
    "view",
    "edit",
    "add",
    "remove",
    "save",
    "share",
  ];

  if (invalidCompanies.some((invalid) => trimmed.toLowerCase() === invalid)) {
    return false;
  }

  // Skip location-like text (common non-company text in profiles)
  const locationPatterns = [
    /^\d+\s+connections?$/i,
    /^\d+\s+followers?$/i,
    /^contact\s+info$/i,
    /^profile$/i,
  ];

  if (locationPatterns.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  // Skip UI/modal/ad text patterns
  const uiTextPatterns = [
    /dialog/i,
    /window/i,
    /modal/i,
    /manage.*preferences/i,
    /hide.*report/i,
    /feedback/i,
    /annoying/i,
    /don't want/i,
    /tell us why/i,
    /your experience/i,
    /community policies/i,
    /let us know/i,
    /see this ad/i,
    /improve/i,
  ];

  if (uiTextPatterns.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  // Skip if it looks like a job title/headline (contains @ or |)
  // These are common in LinkedIn headlines like "CEO @ Company | Author"
  // NOTE: Removed the job title keyword filter because we're now searching
  // within the Experience section with specific patterns, so we don't need
  // to be overly aggressive about filtering out potential job titles
  if (trimmed.includes("@") || trimmed.includes("|")) {
    return false;
  }

  return true;
}

// Check if an element is inside the "More profiles for you" section or any sidebar
function isInMoreProfilesSection(element) {
  if (!element) return false;

  // STRATEGY 1: Check ancestor text content for giveaway sidebar phrases
  let parent = element.parentElement;
  let depth = 0;

  while (parent && depth < 20) {
    const parentText = parent.textContent || "";

    // Giveaway phrases that indicate sidebar/recommendations/ads
    const sidebarPhrases = [
      "More profiles for you",
      "Explore premium profiles",
      "People also viewed",
      "People you may know",
      "Pages for you",
      "You might like",
      "Similar profiles",
      "View similar profiles",
      "Why am I seeing this ad",
      "Manage your ad preferences",
      "Hide or report this ad",
    ];

    // Check if parent contains any sidebar phrase
    for (const phrase of sidebarPhrases) {
      if (parentText.includes(phrase)) {
        console.log(
          `Element is inside sidebar section containing: "${phrase}"`
        );
        return true;
      }
    }

    parent = parent.parentElement;
    depth++;
  }

  // STRATEGY 2: Prefer structural detection using closest()
  const sidebarContainer = element.closest(
    [
      "aside",
      ".scaffold-layout__aside",
      ".artdeco-card--aside",
      ".pvs-list--sidebar",
      ".scaffold-layout-list--aside",
      'section[aria-label*="More profiles" i]',
      'section[aria-label*="People also viewed" i]',
      "[data-test-more-profiles]",
    ].join(", ")
  );

  if (sidebarContainer) {
    console.log(
      `Element is inside sidebar/suggestions container: ${
        sidebarContainer.tagName
      }.${sidebarContainer.className || ""}`
    );
    return true;
  }

  return false;
}

// Check if element is likely in a modal/dialog/overlay
function isInModal(element) {
  if (!element) return false;

  // Check if inside common modal/dialog containers
  const modal = element.closest(
    [
      '[role="dialog"]',
      '[role="alertdialog"]',
      ".artdeco-modal",
      ".msg-overlay-bubble-header",
      "[data-test-modal]",
      ".ad-feedback",
      '[aria-modal="true"]',
    ].join(", ")
  );

  if (modal) {
    console.log("Element is inside modal/dialog - skipping");
    return true;
  }

  return false;
}

// Basic visibility check
function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (
    style.display === "none" ||
    style.visibility === "hidden" ||
    style.opacity === "0"
  )
    return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  return true;
}

// Clean and normalize raw company text
function sanitizeCompanyText(text) {
  if (!text) return "";
  let t = text
    .replace(/\s+/g, " ") // collapse whitespace
    .replace(/[•·]+/g, " ") // bullets to space
    .trim();

  // Remove durations in parentheses, e.g. (2 yrs 3 mos)
  t = t
    .replace(
      /\((?:\d+\s*(?:yrs?|years?)\s*)?(?:\d+\s*(?:mos?|months?)\s*)?\)/gi,
      ""
    )
    .trim();

  // Remove date ranges like "Jan 2010 – Present", "2019 - 2021", "2009 - Present"
  const months = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";
  t = t
    .replace(
      new RegExp(
        `${months}\\s+\\d{4}\\s*[–—-]\\s*(?:${months}\\s+\\d{4}|Present)`,
        "gi"
      ),
      ""
    )
    .trim();
  t = t
    .replace(/\b(19|20)\d{2}\s*[–—-]\s*(?:\b(19|20)\d{2}\b|Present)/gi, "")
    .trim();

  // If the string contains " at Company", keep the part after the last " at "
  const atIdx = t.toLowerCase().lastIndexOf(" at ");
  if (atIdx !== -1) {
    t = t.substring(atIdx + 4).trim();
  }

  // If contains '@ Company', keep after '@'
  const atSymIdx = t.indexOf("@");
  if (atSymIdx !== -1) {
    t = t.substring(atSymIdx + 1).trim();
  }

  // Remove trailing separators and punctuation
  t = t.replace(/[|,;:–—-]+\s*$/g, "").trim();

  // Remove trailing lone words like "Present" or date fragments
  t = t.replace(/\b(Present|Formerly)\b.*$/i, "").trim();

  // Collapse multiple spaces again
  t = t.replace(/\s{2,}/g, " ").trim();

  return t;
}

// Extract person's name from LinkedIn profile - ROBUST VERSION
function extractPersonName() {
  console.log("=== Extracting person name from LinkedIn profile ===");

  // Strategy: Look for the name in the profile header section only
  // This is stable regardless of scroll position

  // Get the main profile area (not feed, not sidebar)
  const main = document.querySelector("main");
  if (!main) {
    console.error("Could not find main element");
    return null;
  }

  // Try config selectors first
  const nameSelectors = CONFIG.SELECTORS.LINKEDIN.PROFILE_NAME;

  for (const selector of nameSelectors) {
    try {
      const nameElement = main.querySelector(selector);
      if (nameElement) {
        const name = nameElement.textContent.trim();
        console.log(`Selector "${selector}" found: "${name}"`);

        if (isValidPersonName(name)) {
          console.log(`✅ Valid name found: "${name}"`);
          return name;
        } else {
          console.log(`❌ Invalid name (failed validation): "${name}"`);
        }
      }
    } catch (error) {
      console.warn(`Error with selector "${selector}":`, error);
    }
  }

  // Fallback 1: Look for h1 in main area
  console.log("Trying fallback 1: looking for h1 elements...");
  const allH1s = main.querySelectorAll("h1");
  console.log(`Found ${allH1s.length} h1 elements`);

  for (const h1 of allH1s) {
    if (isInModal(h1)) continue;

    const name = h1.textContent.trim();
    console.log(`Checking h1: "${name}"`);

    if (isValidPersonName(name)) {
      console.log(`✅ Valid name found via h1: "${name}"`);
      return name;
    }
  }

  // Fallback 2: Look for large text paragraphs that look like names
  // Focus on the profile header (first section in main)
  console.log("Trying fallback 2: looking for name-like paragraphs...");

  // Get all paragraphs, but prioritize ones with large font
  const allParagraphs = main.querySelectorAll("p");
  console.log(`Found ${allParagraphs.length} paragraph elements`);

  const candidates = [];

  for (const p of allParagraphs) {
    // Skip if in modal/dialog
    if (isInModal(p)) continue;

    // Skip if in sidebar
    if (isInMoreProfilesSection(p)) continue;

    const text = p.textContent.trim();

    // Skip if too short or too long
    if (text.length < 5 || text.length > 100) continue;

    // Check if it's a valid person name
    if (isValidPersonName(text)) {
      const fontSize = parseFloat(window.getComputedStyle(p).fontSize);

      // Calculate DOM depth (shallower = more likely to be header)
      let depth = 0;
      let el = p;
      while (el && el !== main && depth < 50) {
        depth++;
        el = el.parentElement;
      }

      // Check if in profile header section (HUGE BOOST)
      const isInProfileHeader =
        p.closest('[data-view-name="profile-card"]') ||
        p.closest('[data-view-name="profile-top-card"]') ||
        p.closest("section:first-of-type") ||
        (depth < 15 && fontSize > 20); // Shallow + large = likely header

      // Score: prioritize larger font and shallower DOM depth
      let score = fontSize * 3 - depth;

      // MASSIVE boost if in profile header (makes it beat sidebar elements)
      if (isInProfileHeader) {
        score += 200;
        console.log(`  ⭐ IN PROFILE HEADER! Boosted score by 200`);
      }

      console.log(
        `Name candidate: "${text}" (fontSize: ${fontSize}, depth: ${depth}, score: ${score.toFixed(
          1
        )}${isInProfileHeader ? " ⭐ HEADER" : ""})`
      );

      candidates.push({ text, fontSize, depth, score, isInProfileHeader });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    console.log(
      `✅ Valid name found via paragraph: "${best.text}" (fontSize: ${
        best.fontSize
      }, depth: ${best.depth}, header: ${best.isInProfileHeader || false})`
    );
    return best.text;
  }

  console.error("❌ Could not extract valid person name");
  return null;
}

// Extract company name from LinkedIn profile - ROBUST VERSION
function extractCompanyNameWithName(personName = null) {
  console.log("=== Extracting company name from LinkedIn profile ===");
  console.log(`Reference name for filtering: "${personName}"`);

  // Get the main profile area
  const main = document.querySelector("main");
  if (!main) {
    console.error("Could not find main element");
    return null;
  }

  // STRATEGY 1: Look for "TITLE at COMPANY" pattern in EXPERIENCE SECTION
  // This is the most reliable pattern based on actual LinkedIn HTML
  // We scope to Experience section to avoid false positives from About section
  console.log(
    "Strategy 1: Searching for 'Title at Company' pattern in Experience section..."
  );

  // Find the Experience section first
  const experienceSection = main.querySelector(
    '[data-view-name="profile-card-experience"]'
  );

  if (!experienceSection) {
    console.log("Experience section not found, skipping Strategy 1");
  } else {
    console.log("Found Experience section, searching within it...");
    const allParagraphs = experienceSection.querySelectorAll("p");
    console.log(
      `Found ${allParagraphs.length} paragraph elements in Experience section`
    );

    let previousParagraphText = null; // Track previous paragraph for multi-paragraph jobs

    for (const p of allParagraphs) {
      // Skip if in modal/dialog
      if (isInModal(p)) {
        continue;
      }

      // Skip if in sidebar
      if (isInMoreProfilesSection(p)) {
        continue;
      }

      const fullText = p.textContent.trim();
      console.log(`Checking paragraph: "${fullText.substring(0, 100)}..."`);

      // PATTERN 1A: "Full-time · 2 yrs 6 mos" where previous paragraph is the company
      // This happens when someone has multiple roles at the same company
      // Example: Previous paragraph: "Invisible Technologies"
      //          Current paragraph: "Full-time · 2 yrs 6 mos"
      const employmentTypePattern =
        /^(Full-time|Part-time|Contract|Freelance|Self-employed)\s*·/i;
      if (employmentTypePattern.test(fullText) && previousParagraphText) {
        const company = previousParagraphText.trim();
        console.log(
          `Found employment-type line, checking previous paragraph as company: "${company}"`
        );

        // Skip if it's the person's name
        if (personName && company.toLowerCase() === personName.toLowerCase()) {
          console.log(`Skipped: matches person name`);
          previousParagraphText = fullText;
          continue;
        }

        // Validate
        if (isValidCompanyName(company)) {
          console.log(`✅ FOUND COMPANY via previous paragraph: "${company}"`);
          return company;
        } else {
          console.log(`Rejected (failed validation): "${company}"`);
        }
      }

      // PATTERN 1B: "Company Name · Full-time" (single paragraph format)
      // This appears when someone has a single role at the company
      // Example: "The North Stands · Full-time"
      const companyTimePattern =
        /^(.+?)\s*·\s*(Full-time|Part-time|Contract|Freelance|Self-employed)/i;
      const timeMatch = fullText.match(companyTimePattern);

      if (timeMatch && timeMatch[1]) {
        let company = timeMatch[1].trim();
        console.log(`Found "Company · Employment-type" pattern: "${company}"`);

        // Skip if it's the person's name
        if (personName && company.toLowerCase() === personName.toLowerCase()) {
          console.log(`Skipped: matches person name`);
          previousParagraphText = fullText;
          continue;
        }

        // Validate
        if (isValidCompanyName(company)) {
          console.log(
            `✅ FOUND COMPANY via "Company · Type" pattern: "${company}"`
          );
          return company;
        } else {
          console.log(`Rejected (failed validation): "${company}"`);
        }
      }

      // PATTERN 2: "Title at Company" or "Title @ Company"
      // Match: "Chief Executive Officer at Invisible Technologies"
      const atPattern = /(?:\bat\s+|@\s+)([^\n]+?)(?:\n|Formerly|·|$)/i;
      const match = fullText.match(atPattern);

      if (match && match[1]) {
        let company = match[1].trim();
        console.log(`Found "at" pattern match: "${company}"`);

        // Clean up the company name
        company = sanitizeCompanyText(company);

        // Skip if it's the person's name
        if (personName && company.toLowerCase() === personName.toLowerCase()) {
          console.log(`Skipped: matches person name`);
          previousParagraphText = fullText;
          continue;
        }

        // Validate
        if (isValidCompanyName(company)) {
          console.log(`✅ FOUND COMPANY via "at" pattern: "${company}"`);
          return company;
        } else {
          console.log(`Rejected (failed validation): "${company}"`);
        }
      }

      // Remember this paragraph for next iteration
      previousParagraphText = fullText;
    }
  } // Close the else block for experienceSection

  // STRATEGY 2: Try config selectors (scoped to Experience section if available)
  console.log("Strategy 2: Trying config selectors in Experience section...");
  const companySelectors = CONFIG.SELECTORS.LINKEDIN.COMPANY_NAME;

  // Use Experience section if we found it, otherwise fall back to main
  const searchScope = experienceSection || main;
  console.log(
    `Searching in: ${
      experienceSection ? "Experience section" : "entire main element"
    }`
  );

  for (const selector of companySelectors) {
    try {
      const elements = searchScope.querySelectorAll(selector);
      console.log(
        `Trying selector "${selector}": found ${elements.length} elements`
      );

      for (const element of elements) {
        // Skip if in modal/dialog
        if (isInModal(element)) continue;

        // Skip if in sidebar
        if (isInMoreProfilesSection(element)) continue;

        // Get the text
        let companyText = element.textContent.trim();

        // For links, try to get company name from href if text is empty
        if (!companyText && element.tagName === "A") {
          const href = element.getAttribute("href") || "";
          const match = href.match(/\/company\/([^/?#]+)/);
          if (match && match[1]) {
            companyText = match[1].replace(/-/g, " ");
          }
        }

        if (!companyText) continue;

        // Clean and validate
        const cleaned = sanitizeCompanyText(companyText);

        // Skip if matches person name
        if (personName && cleaned.toLowerCase() === personName.toLowerCase()) {
          console.log(`Skipped (matches person name): "${cleaned}"`);
          continue;
        }

        // Validate
        if (isValidCompanyName(cleaned)) {
          console.log(
            `✅ Found valid company with selector "${selector}": "${cleaned}"`
          );
          return cleaned;
        } else {
          console.log(`Rejected (failed validation): "${cleaned}"`);
        }
      }
    } catch (error) {
      console.warn(`Error with selector "${selector}":`, error);
    }
  }

  // STRATEGY 3: Look for standalone company paragraphs (less reliable)
  console.log("Strategy 3: Looking for standalone company paragraphs...");

  const companyCandidates = [];

  for (const p of allParagraphs) {
    // Skip if in modal/dialog
    if (isInModal(p)) continue;

    // Skip if in sidebar
    if (isInMoreProfilesSection(p)) continue;

    const text = p.textContent.trim();

    // Skip if it's the person's name
    if (personName && text.toLowerCase() === personName.toLowerCase()) continue;

    // Skip if it looks like a job title with "at" in it (we already checked those)
    if (/\bat\s+/i.test(text) || /\bformerly\s+/i.test(text)) continue;

    // Skip very short or very long text
    if (text.length < 2 || text.length > 100) continue;

    const cleaned = sanitizeCompanyText(text);

    if (isValidCompanyName(cleaned)) {
      // Get font size and DOM depth for scoring
      const fontSize = parseFloat(window.getComputedStyle(p).fontSize);

      // Calculate DOM depth (shallower = more likely to be in header)
      let depth = 0;
      let el = p;
      while (el && el !== main && depth < 50) {
        depth++;
        el = el.parentElement;
      }

      // Score: prefer shorter names, larger font, shallower depth
      const lengthScore = Math.max(0, 50 - cleaned.length);
      const fontScore = fontSize;
      const depthScore = Math.max(0, 30 - depth);
      const totalScore = lengthScore + fontScore + depthScore;

      console.log(
        `Company candidate: "${cleaned}" (score: ${totalScore.toFixed(
          1
        )}, fontSize: ${fontSize}, depth: ${depth}, length: ${cleaned.length})`
      );

      companyCandidates.push({
        text: cleaned,
        score: totalScore,
        fontSize,
        depth,
        length: cleaned.length,
      });
    }
  }

  // Return the best candidate
  if (companyCandidates.length > 0) {
    companyCandidates.sort((a, b) => b.score - a.score);
    const best = companyCandidates[0];
    console.log(
      `✅ Found company from paragraph: "${
        best.text
      }" (score: ${best.score.toFixed(1)})`
    );
    return best.text;
  }

  console.error("❌ Could not extract company name");
  return null;
}

// Legacy wrapper for backward compatibility
function extractCompanyName() {
  return extractCompanyNameWithName(null);
}

// Extract lead data from Sales Navigator table row
function extractSalesNavLeadData(leadRow) {
  try {
    console.log("--- Extracting data from row ---");

    // Name extraction
    const nameSelectors = CONFIG.SELECTORS.SALES_NAV.LEAD_NAME;
    let nameElement = null;
    let fullName = null;

    for (const selector of nameSelectors) {
      nameElement = leadRow.querySelector(selector);
      if (nameElement) {
        fullName = nameElement.textContent.trim();
        console.log(`Found name with selector "${selector}": ${fullName}`);
        break;
      }
    }

    if (!fullName) {
      console.log("Could not find name element, available elements:");
      nameSelectors.forEach((selector) => {
        console.log(
          `  ${selector}: ${leadRow.querySelectorAll(selector).length} elements`
        );
      });
    }

    // Company extraction
    const companySelectors = CONFIG.SELECTORS.SALES_NAV.COMPANY_NAME;
    let companyElement = null;
    let companyName = null;

    for (const selector of companySelectors) {
      companyElement = leadRow.querySelector(selector);
      if (companyElement) {
        companyName = companyElement.textContent.trim();
        console.log(
          `Found company with selector "${selector}": ${companyName}`
        );
        break;
      }
    }

    if (!companyName) {
      console.log("Could not find company element, available elements:");
      companySelectors.forEach((selector) => {
        console.log(
          `  ${selector}: ${leadRow.querySelectorAll(selector).length} elements`
        );
      });
    }

    // Job Title extraction
    const titleSelectors = CONFIG.SELECTORS.SALES_NAV.JOB_TITLE;
    let titleElement = null;
    let jobTitle = null;

    for (const selector of titleSelectors) {
      titleElement = leadRow.querySelector(selector);
      if (titleElement) {
        jobTitle = titleElement.textContent.trim();
        console.log(`Found title with selector "${selector}": ${jobTitle}`);
        break;
      }
    }

    // Location extraction
    const locationSelectors = CONFIG.SELECTORS.SALES_NAV.LOCATION;
    let locationElement = null;
    let location = null;

    for (const selector of locationSelectors) {
      locationElement = leadRow.querySelector(selector);
      if (locationElement) {
        location = locationElement.textContent.trim();
        console.log(`Found location with selector "${selector}": ${location}`);
        break;
      }
    }

    const result = {
      fullName,
      companyName,
      jobTitle,
      location,
      isValid: fullName && companyName,
    };

    console.log("Final extracted data:", result);
    return result;
  } catch (error) {
    console.error("Error extracting Sales Nav lead data:", error);
    return { isValid: false };
  }
}

// Extract lead data from Sales Navigator sidebar
function extractSalesNavSidebarData() {
  try {
    console.log("--- Extracting data from Sales Nav sidebar ---");

    // Sidebar name extraction
    const nameSelectors = CONFIG.SELECTORS.SALES_NAV.SIDEBAR_NAME;
    let nameElement = null;
    let fullName = null;

    for (const selector of nameSelectors) {
      nameElement = document.querySelector(selector);
      if (nameElement) {
        fullName = nameElement.textContent.trim();
        console.log(
          `Found sidebar name with selector "${selector}": ${fullName}`
        );
        break;
      }
    }

    if (!fullName) {
      console.log("Could not find sidebar name element, available elements:");
      nameSelectors.forEach((selector) => {
        console.log(
          `  ${selector}: ${
            document.querySelectorAll(selector).length
          } elements`
        );
      });
    }

    // Sidebar company extraction
    const companySelectors = CONFIG.SELECTORS.SALES_NAV.SIDEBAR_COMPANY;
    let companyElement = null;
    let companyName = null;

    for (const selector of companySelectors) {
      companyElement = document.querySelector(selector);
      if (companyElement) {
        if (selector === 'img[data-anonymize="company-logo"]') {
          // Get company name from image title attribute
          companyName =
            companyElement.getAttribute("title") ||
            companyElement.getAttribute("alt");
        } else if (selector === 'span[data-anonymize="job-title"]') {
          // Extract company from "Job Title at Company" pattern
          const jobTitleText = companyElement.textContent.trim();
          const atIndex = jobTitleText.lastIndexOf(" at ");
          if (atIndex !== -1) {
            companyName = jobTitleText.substring(atIndex + 4).trim();
          }
        } else {
          // Regular text extraction
          companyName = companyElement.textContent.trim();
        }

        if (companyName && companyName !== "") {
          console.log(
            `Found sidebar company with selector "${selector}": ${companyName}`
          );
          break;
        }
      }
    }

    if (!companyName) {
      console.log(
        "Could not find sidebar company element, available elements:"
      );
      companySelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        console.log(`  ${selector}: ${elements.length} elements`);
        if (
          elements.length > 0 &&
          selector === 'img[data-anonymize="company-logo"]'
        ) {
          console.log(
            `    First img title: ${elements[0].getAttribute("title")}`
          );
          console.log(`    First img alt: ${elements[0].getAttribute("alt")}`);
        }
      });
    }

    // Sidebar title extraction
    const titleSelectors = CONFIG.SELECTORS.SALES_NAV.SIDEBAR_TITLE;
    let titleElement = null;
    let jobTitle = null;

    for (const selector of titleSelectors) {
      titleElement = document.querySelector(selector);
      if (titleElement) {
        jobTitle = titleElement.textContent.trim();
        // If this is the job-title element, extract just the job part (before " at Company")
        if (selector.includes("job-title")) {
          const atIndex = jobTitle.lastIndexOf(" at ");
          if (atIndex !== -1) {
            jobTitle = jobTitle.substring(0, atIndex).trim();
          }
        }
        console.log(
          `Found sidebar title with selector "${selector}": ${jobTitle}`
        );
        break;
      }
    }

    const result = {
      fullName,
      companyName,
      jobTitle,
      isValid: fullName && companyName,
    };

    console.log("Final extracted sidebar data:", result);
    return result;
  } catch (error) {
    console.error("Error extracting Sales Nav sidebar data:", error);
    return { isValid: false };
  }
}

// Extract lead data from Sales Navigator profile page
function extractSalesNavProfileData() {
  try {
    // Profile page name - need to check actual profile page structure
    const nameElement =
      document.querySelector('h1[data-anonymize="person-name"]') ||
      document.querySelector("[data-x--lead--name]") ||
      document.querySelector(".profile-topcard-person-entity__name");

    const fullName = nameElement ? nameElement.textContent.trim() : null;

    // Profile page company
    const companyElement =
      document.querySelector('a[data-anonymize="company-name"]') ||
      document.querySelector('a[href*="/sales/company/"]') ||
      document.querySelector(".profile-topcard-person-entity__company a");

    const companyName = companyElement
      ? companyElement.textContent.trim()
      : null;

    // Profile page title
    const titleElement =
      document.querySelector('span[data-anonymize="headline"]') ||
      document.querySelector('[data-anonymize="job-title"]') ||
      document.querySelector(".profile-topcard-person-entity__headline");

    const jobTitle = titleElement ? titleElement.textContent.trim() : null;

    console.log("Extracted Sales Nav profile data:", {
      fullName,
      companyName,
      jobTitle,
    });

    return {
      fullName,
      companyName,
      jobTitle,
      isValid: fullName && companyName,
    };
  } catch (error) {
    console.error("Error extracting Sales Nav profile data:", error);
    return { isValid: false };
  }
}
