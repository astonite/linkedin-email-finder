// ai-extractor.js - AI-powered data extraction using OpenAI

/**
 * Extract person name and company from page content using OpenAI
 * @param {string} pageContent - Text content or HTML from the page
 * @param {string} type - 'name', 'company', or 'both'
 * @returns {Promise<{name: string, company: string}>}
 */
async function extractWithOpenAI(pageContent, type = "both") {
  console.log("🤖 Using OpenAI for data extraction...");

  try {
    // Send message to background script to handle API call
    const response = await chrome.runtime.sendMessage({
      action: "extractWithAI",
      data: {
        pageContent,
        type,
      },
    });

    if (response && response.success) {
      console.log("✅ OpenAI extraction successful:", response.data);
      return response.data;
    } else {
      throw new Error(response?.error || "OpenAI extraction failed");
    }
  } catch (error) {
    console.error("❌ OpenAI extraction error:", error);
    throw error;
  }
}

/**
 * Get relevant page content for AI extraction
 * Extracts just the text we need, not the entire HTML
 */
function getRelevantPageContent() {
  // Get the main profile section
  const main = document.querySelector("main");
  if (!main) {
    return document.body.innerText.substring(0, 8000); // Fallback
  }

  // Get first section (profile header) text
  const profileSection = main.querySelector("section:first-of-type");
  if (profileSection) {
    return profileSection.innerText.substring(0, 8000);
  }

  // Fallback to main content
  return main.innerText.substring(0, 8000);
}

/**
 * Smart extraction with AI fallback
 * Tries traditional selectors first, falls back to AI if needed
 */
async function extractPersonNameWithAI() {
  console.log("=== Attempting person name extraction (AI-enhanced) ===");

  // Step 1: Try traditional selector extraction
  const traditionalName = extractPersonName();

  if (traditionalName && isValidPersonName(traditionalName)) {
    console.log("✅ Traditional extraction successful, skipping AI");
    return traditionalName;
  }

  // Step 2: Traditional failed, try AI if enabled
  if (!CONFIG.AI || !CONFIG.AI.USE_OPENAI) {
    console.log("⚠️ Traditional extraction failed and AI is disabled");
    return traditionalName; // Return what we have (might be null)
  }

  console.log("⚠️ Traditional extraction failed, using AI fallback...");

  try {
    const pageContent = getRelevantPageContent();
    const aiResult = await extractWithOpenAI(pageContent, "name");

    if (aiResult.name && isValidPersonName(aiResult.name)) {
      console.log(`✅ AI extraction successful: "${aiResult.name}"`);
      return aiResult.name;
    } else {
      console.log("⚠️ AI extraction returned invalid name");
      return traditionalName; // Return traditional result as fallback
    }
  } catch (error) {
    console.error("❌ AI extraction failed:", error);
    return traditionalName; // Return traditional result as fallback
  }
}

/**
 * Smart company extraction with AI fallback
 */
async function extractCompanyNameWithAI(personName = null) {
  console.log("=== Attempting company extraction (AI-enhanced) ===");

  // Step 1: Try traditional selector extraction
  const traditionalCompany = extractCompanyNameWithName(personName);

  if (traditionalCompany && isValidCompanyName(traditionalCompany)) {
    console.log("✅ Traditional extraction successful, skipping AI");
    return traditionalCompany;
  }

  // Step 2: Traditional failed, try AI if enabled
  if (!CONFIG.AI || !CONFIG.AI.USE_OPENAI) {
    console.log("⚠️ Traditional extraction failed and AI is disabled");
    return traditionalCompany;
  }

  console.log("⚠️ Traditional extraction failed, using AI fallback...");

  try {
    const pageContent = getRelevantPageContent();
    const aiResult = await extractWithOpenAI(pageContent, "company");

    if (aiResult.company && isValidCompanyName(aiResult.company)) {
      console.log(`✅ AI extraction successful: "${aiResult.company}"`);
      return aiResult.company;
    } else {
      console.log("⚠️ AI extraction returned invalid company");
      return traditionalCompany;
    }
  } catch (error) {
    console.error("❌ AI extraction failed:", error);
    return traditionalCompany;
  }
}

/**
 * Extract both name and company in one AI call (more efficient)
 */
async function extractBothWithAI() {
  console.log("=== Attempting combined extraction with AI ===");

  try {
    const pageContent = getRelevantPageContent();
    const result = await extractWithOpenAI(pageContent, "both");

    return {
      name: result.name || null,
      company: result.company || null,
    };
  } catch (error) {
    console.error("❌ AI extraction failed:", error);
    return { name: null, company: null };
  }
}
