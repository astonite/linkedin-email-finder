// background.js - Background script with ZoomInfo API integration

// Import configuration
importScripts("config.js");

console.log("LinkedIn Email Finder: Background script loaded");

// Get ZoomInfo configuration
const ZOOMINFO_CONFIG = getCredentials();

// Token management
let authToken = null;
let tokenExpiresAt = null;

// Storage keys (from config)
const STORAGE_KEYS = CONFIG.STORAGE_KEYS;

// Check if token is valid and not expired
function isTokenValid() {
  return (
    authToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 5 * 60 * 1000
  ); // 5 minutes buffer
}

// Load stored token from Chrome storage
async function loadStoredToken() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRES,
    ]);

    if (result[STORAGE_KEYS.AUTH_TOKEN] && result[STORAGE_KEYS.TOKEN_EXPIRES]) {
      authToken = result[STORAGE_KEYS.AUTH_TOKEN];
      tokenExpiresAt = result[STORAGE_KEYS.TOKEN_EXPIRES];

      console.log("Loaded stored token, expires at:", new Date(tokenExpiresAt));

      // Check if token is still valid
      if (!isTokenValid()) {
        console.log("Stored token is expired, clearing...");
        await clearStoredToken();
      }
    }
  } catch (error) {
    console.error("Error loading stored token:", error);
  }
}

// Save token to Chrome storage
async function saveToken(token, expiresIn = 3600) {
  try {
    authToken = token;
    tokenExpiresAt = Date.now() + expiresIn * 1000; // Convert seconds to milliseconds

    await chrome.storage.local.set({
      [STORAGE_KEYS.AUTH_TOKEN]: authToken,
      [STORAGE_KEYS.TOKEN_EXPIRES]: tokenExpiresAt,
    });

    console.log("Token saved, expires at:", new Date(tokenExpiresAt));
  } catch (error) {
    console.error("Error saving token:", error);
  }
}

// Clear stored token
async function clearStoredToken() {
  try {
    authToken = null;
    tokenExpiresAt = null;

    await chrome.storage.local.remove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.TOKEN_EXPIRES,
    ]);
    console.log("Token cleared from storage");
  } catch (error) {
    console.error("Error clearing token:", error);
  }
}

// Authenticate with ZoomInfo API
async function authenticateZoomInfo() {
  try {
    console.log("Authenticating with ZoomInfo...");

    const response = await fetch(`${ZOOMINFO_CONFIG.baseUrl}/authenticate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: ZOOMINFO_CONFIG.username,
        password: ZOOMINFO_CONFIG.password,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Authentication failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.jwt) {
      throw new Error("No JWT token received from authentication");
    }

    // Save token (ZoomInfo tokens are valid for 60 minutes)
    await saveToken(data.jwt, 3600);

    console.log("Authentication successful");
    return data.jwt;
  } catch (error) {
    console.error("ZoomInfo authentication error:", error);
    throw error;
  }
}

// Get valid token (authenticate if needed)
async function getValidToken() {
  // Check if we have a valid token
  if (isTokenValid()) {
    console.log("Using existing valid token");
    return authToken;
  }

  // Need to authenticate
  console.log("Token expired or missing, authenticating...");
  return await authenticateZoomInfo();
}

// Search for company ID (DEPRECATED - no longer used)
// Now we pass company name directly to enrichContact()
/*
async function searchCompanyId(companyName) {
  try {
    const token = await getValidToken();

    console.log(`Searching for company: "${companyName}"`);

    const response = await fetch(`${ZOOMINFO_CONFIG.baseUrl}/search/company`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        companyName: companyName,
        rpp: 1, // Return only top result
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Company search failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error(`No company found with name "${companyName}"`);
    }

    const companyId = data.data[0].id;
    console.log(`Found company ID: ${companyId} for "${companyName}"`);

    return companyId;
  } catch (error) {
    console.error("Company search error:", error);
    throw error;
  }
}
*/

// Enrich contact to get email (directly with company name)
async function enrichContact(fullName, companyName) {
  try {
    const token = await getValidToken();

    console.log(
      `Enriching contact: "${fullName}" at company: "${companyName}"`
    );

    const response = await fetch(`${ZOOMINFO_CONFIG.baseUrl}/enrich/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        matchPersonInput: [
          {
            fullName: fullName,
            companyName: companyName,
          },
        ],
        outputFields: [
          "firstName",
          "lastName",
          "email",
          "jobTitle",
          "companyName",
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Contact enrichment failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.data || !data.data.result || data.data.result.length === 0) {
      throw new Error(`No contact found for "${fullName}" at that company`);
    }

    const contactData = data.data.result[0].data[0];
    console.log("Contact enrichment successful");

    return contactData;
  } catch (error) {
    console.error("Contact enrichment error:", error);
    throw error;
  }
}

// Main function to find contact email
async function findContactEmail(fullName, companyName, source = "linkedin") {
  try {
    console.log(
      `Starting email search for: ${fullName} at ${companyName} (source: ${source})`
    );

    // Direct contact enrichment with company name (no company search needed)
    const contactData = await enrichContact(fullName, companyName);

    // Save to search history
    await saveToSearchHistory(fullName, companyName, contactData, source);

    return contactData;
  } catch (error) {
    console.error("Email search failed:", error);
    throw error;
  }
}

// Save search to history
// async function saveToSearchHistory(
//   fullName,
//   companyName,
//   contactData,
//   source = "linkedin"
// ) {
//   try {
//     const result = await chrome.storage.local.get([
//       STORAGE_KEYS.SEARCH_HISTORY,
//     ]);
//     const history = result[STORAGE_KEYS.SEARCH_HISTORY] || [];

//     // Add new search to beginning of array
//     history.unshift({
//       timestamp: Date.now(),
//       fullName,
//       companyName,
//       contactData,
//       source, // 'linkedin' or 'sales-navigator'
//       success: true,
//     });

//     // Keep only last 100 searches
//     const trimmedHistory = history.slice(0, 100);

//     await chrome.storage.local.set({
//       [STORAGE_KEYS.SEARCH_HISTORY]: trimmedHistory,
//     });

//     console.log("Search saved to history");
//   } catch (error) {
//     console.error("Error saving to search history:", error);
//   }
// }

async function saveToSearchHistory(
  fullName,
  companyName,
  contactData,
  source = "linkedin"
) {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.SEARCH_HISTORY,
    ]);
    const history = result[STORAGE_KEYS.SEARCH_HISTORY] || [];

    // Add new search to beginning of array
    history.unshift({
      timestamp: Date.now(),
      fullName,
      companyName,
      contactData,
      source, // 'linkedin', 'sales-navigator', or 'clay'
      success: true,
    });

    // No longer limiting to 100 - store all searches until user manually clears
    // const trimmedHistory = history.slice(0, 100); // REMOVED THIS LINE

    await chrome.storage.local.set({
      [STORAGE_KEYS.SEARCH_HISTORY]: history, // Changed from trimmedHistory to history
    });

    console.log("Search saved to history");
  } catch (error) {
    console.error("Error saving to search history:", error);
  }
}

// Job tracking for Clay enrichment
const clayJobs = new Map(); // Store active Clay jobs

// Generate unique job ID
function generateJobId() {
  return `clay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Clay enrichment function with job tracking
// async function enrichWithClayBackground(personName, companyName, jobId) {
//   try {
//     console.log(
//       `Starting Clay enrichment (Job ${jobId}) for: ${personName} at ${companyName}`
//     );

//     // Update job status
//     clayJobs.set(jobId, {
//       status: "processing",
//       personName,
//       companyName,
//       startTime: Date.now(),
//     });

//     // Update badge to show processing
//     chrome.action.setBadgeText({ text: "⏳" });
//     chrome.action.setBadgeBackgroundColor({ color: "#0077b5" });

//     // TODO: Replace with your actual n8n webhook URL
//     const N8N_WEBHOOK_URL =
//       "https://invisible.app.n8n.cloud/webhook/101ab177-7b51-4103-94ab-bae2753d054f";

//     const response = await fetch(N8N_WEBHOOK_URL, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         name: personName,
//         company: companyName,
//       }),
//       // Set timeout to 3 minutes (180 seconds)
//       signal: AbortSignal.timeout(180000),
//     });

//     if (!response.ok) {
//       throw new Error(
//         `Clay enrichment failed: ${response.status} ${response.statusText}`
//       );
//     }

//     const data = await response.json();

//     if (!data.email) {
//       throw new Error("No email returned from Clay");
//     }

//     // Success - update job status
//     clayJobs.set(jobId, {
//       status: "completed",
//       personName,
//       companyName,
//       email: data.email,
//       completedTime: Date.now(),
//     });

//     // Save to search history
//     await saveToSearchHistory(
//       personName,
//       companyName,
//       {
//         firstName: personName.split(" ")[0] || personName,
//         lastName: personName.split(" ").slice(1).join(" ") || "",
//         email: data.email,
//         jobTitle: "",
//         company: { name: companyName },
//       },
//       "clay"
//     );

//     // Show success notification
//     chrome.notifications.create({
//       type: "basic",
//       iconUrl: "icon48.png", // You'll need to add this
//       title: "Email Found via Clay!",
//       message: `Found email for ${personName}: ${data.email}`,
//     });

//     // Update badge to show success
//     chrome.action.setBadgeText({ text: "✅" });
//     chrome.action.setBadgeBackgroundColor({ color: "#059669" });

//     // Clear badge after 10 seconds
//     setTimeout(() => {
//       chrome.action.setBadgeText({ text: "" });
//     }, 10000);

//     console.log(`Clay enrichment successful (Job ${jobId}):`, data.email);
//     return data.email;
//   } catch (error) {
//     console.error(`Clay enrichment error (Job ${jobId}):`, error);

//     // Error - update job status
//     clayJobs.set(jobId, {
//       status: "failed",
//       personName,
//       companyName,
//       error: error.message,
//       failedTime: Date.now(),
//     });

//     // Show error notification
//     chrome.notifications.create({
//       type: "basic",
//       iconUrl: "icon48.png",
//       title: "Clay Enrichment Failed",
//       message: `Could not find email for ${personName}`,
//     });

//     // Update badge to show error
//     chrome.action.setBadgeText({ text: "❌" });
//     chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });

//     // Clear badge after 10 seconds
//     setTimeout(() => {
//       chrome.action.setBadgeText({ text: "" });
//     }, 10000);

//     throw error;
//   }
// }

async function enrichWithClayBackground(
  personName,
  companyName,
  jobId,
  originalSource = "linkedin"
) {
  try {
    console.log(
      `Starting Clay enrichment (Job ${jobId}) for: ${personName} at ${companyName}`
    );

    // Update job status
    clayJobs.set(jobId, {
      status: "processing",
      personName,
      companyName,
      originalSource, // Store the original source
      startTime: Date.now(),
    });

    // Update badge to show processing
    chrome.action.setBadgeText({ text: "⏳" });
    chrome.action.setBadgeBackgroundColor({ color: "#0077b5" });

    // n8n webhook URL from config
    const N8N_WEBHOOK_URL = CONFIG.N8N_WEBHOOK;

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: personName,
        company: companyName,
      }),
      // Set timeout from config (under Cloudflare 100s timeout)
      signal: AbortSignal.timeout(CONFIG.CLAY_TIMEOUT),
    });

    if (!response.ok) {
      throw new Error(
        `Clay enrichment failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.email) {
      throw new Error("No email returned from Clay");
    }

    // Success - update job status
    clayJobs.set(jobId, {
      status: "completed",
      personName,
      companyName,
      email: data.email,
      originalSource,
      completedTime: Date.now(),
    });

    // Update existing search history entry instead of creating new one
    await updateSearchHistoryWithClayEmail(
      personName,
      companyName,
      data.email,
      originalSource
    );

    // Show success notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png", // You'll need to add this
      title: "Email Found via Clay!",
      message: `Found email for ${personName}: ${data.email}`,
    });

    // Update badge to show success
    chrome.action.setBadgeText({ text: "✅" });
    chrome.action.setBadgeBackgroundColor({ color: "#059669" });

    // Clear badge after 10 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 10000);

    console.log(`Clay enrichment successful (Job ${jobId}):`, data.email);
    return data.email;
  } catch (error) {
    console.error(`Clay enrichment error (Job ${jobId}):`, error);

    // Error - update job status
    clayJobs.set(jobId, {
      status: "failed",
      personName,
      companyName,
      originalSource,
      error: error.message,
      failedTime: Date.now(),
    });

    // Show error notification
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon48.png",
      title: "Clay Enrichment Failed",
      message: `Could not find email for ${personName}`,
    });

    // Update badge to show error
    chrome.action.setBadgeText({ text: "❌" });
    chrome.action.setBadgeBackgroundColor({ color: "#ef4444" });

    // Clear badge after 10 seconds
    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 10000);

    throw error;
  }
}

// New function to update existing search history entry with Clay email
async function updateSearchHistoryWithClayEmail(
  personName,
  companyName,
  email,
  originalSource
) {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.SEARCH_HISTORY,
    ]);
    const history = result[STORAGE_KEYS.SEARCH_HISTORY] || [];

    // Find the most recent entry matching the person and company (without email)
    const entryIndex = history.findIndex(
      (item) =>
        item.fullName === personName &&
        item.companyName === companyName &&
        (!item.contactData.email || item.contactData.email === "") // Only update entries without email
    );

    if (entryIndex !== -1) {
      // Update the existing entry
      history[entryIndex].contactData.email = email;
      // Change source to indicate Clay enrichment
      // Format: "original-source-clay" (e.g., "linkedin-clay" or "sales-navigator-clay")
      history[entryIndex].source = `${originalSource}-clay`;
      history[entryIndex].clayEnriched = true;
      history[entryIndex].clayEnrichedAt = Date.now();

      console.log(
        `Updated existing entry at index ${entryIndex} with Clay email`
      );
    } else {
      // If no matching entry found (shouldn't happen normally), create a new one
      console.log("No matching entry found, creating new Clay entry");
      history.unshift({
        timestamp: Date.now(),
        fullName: personName,
        companyName: companyName,
        contactData: {
          firstName: personName.split(" ")[0] || personName,
          lastName: personName.split(" ").slice(1).join(" ") || "",
          email: email,
          jobTitle: "",
          company: { name: companyName },
        },
        source: `${originalSource}-clay`,
        clayEnriched: true,
        success: true,
      });
    }

    // Save updated history
    await chrome.storage.local.set({
      [STORAGE_KEYS.SEARCH_HISTORY]: history,
    });

    console.log("Search history updated with Clay email");
  } catch (error) {
    console.error("Error updating search history with Clay email:", error);
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "findEmail") {
    console.log("Received findEmail request:", request.data);

    // Handle async operation
    (async () => {
      try {
        const { personName, companyName } = request.data;
        const source = request.source || "linkedin";

        if (!personName || !companyName) {
          throw new Error("Missing person name or company name");
        }

        const contactData = await findContactEmail(
          personName,
          companyName,
          source
        );

        sendResponse({
          success: true,
          data: contactData,
        });
      } catch (error) {
        console.error("Error in findEmail:", error);

        sendResponse({
          success: false,
          error: error.message,
        });
      }
    })();

    // Return true to indicate we'll send response asynchronously
    return true;
  }

  // Handle OpenAI extraction request
  if (request.action === "extractWithAI") {
    console.log("Received OpenAI extraction request");

    (async () => {
      try {
        const { pageContent, type } = request.data;

        if (!pageContent) {
          throw new Error("No page content provided for AI extraction");
        }

        // Check if OpenAI is enabled and API key is configured
        if (!CONFIG.AI || !CONFIG.AI.USE_OPENAI || !CONFIG.AI.OPENAI_API_KEY) {
          throw new Error(
            "OpenAI extraction is not enabled or API key is missing"
          );
        }

        // Truncate content to save tokens (OpenAI has limits)
        const truncatedContent = pageContent.substring(0, 8000);

        // Determine what to extract
        let systemPrompt = "";
        if (type === "name") {
          systemPrompt =
            'You are a data extraction assistant. Extract ONLY the person\'s full name from this LinkedIn profile text. Return valid JSON: {"name": "First Last"}';
        } else if (type === "company") {
          systemPrompt =
            'You are a data extraction assistant. Extract ONLY the person\'s CURRENT company name from this LinkedIn profile text. Return valid JSON: {"company": "Company Name"}';
        } else {
          systemPrompt =
            'You are a data extraction assistant. Extract the person\'s full name and CURRENT company from this LinkedIn profile text. Return valid JSON: {"name": "First Last", "company": "Company Name"}';
        }

        console.log("Calling OpenAI API...");
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${deobfuscate(CONFIG.AI.OPENAI_API_KEY)}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini", // Cheaper & faster
              messages: [
                {
                  role: "system",
                  content: systemPrompt,
                },
                {
                  role: "user",
                  content: `LinkedIn profile content:\n\n${truncatedContent}`,
                },
              ],
              response_format: { type: "json_object" }, // Force JSON
              temperature: 0, // Deterministic
              max_tokens: 150, // Keep it short
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            `OpenAI API error: ${response.status} - ${
              errorData.error?.message || "Unknown error"
            }`
          );
        }

        const data = await response.json();
        const extracted = JSON.parse(data.choices[0].message.content);

        console.log("OpenAI extraction successful:", extracted);

        sendResponse({
          success: true,
          data: extracted,
        });
      } catch (error) {
        console.error("OpenAI extraction error:", error);
        sendResponse({
          success: false,
          error: error.message,
        });
      }
    })();

    return true; // Async response
  }

  // Handle Clay enrichment request (background processing)
  // if (request.action === "enrichWithClayBackground") {
  //   console.log("Received background Clay enrichment request:", request.data);

  //   const { personName, companyName } = request.data;

  //   if (!personName || !companyName) {
  //     sendResponse({
  //       success: false,
  //       error: "Missing person name or company name for Clay enrichment",
  //     });
  //     return;
  //   }

  //   // Generate job ID and start background processing
  //   const jobId = generateJobId();

  //   // Start Clay processing in background (don't await)
  //   enrichWithClayBackground(personName, companyName, jobId).catch((error) => {
  //     console.error("Background Clay enrichment failed:", error);
  //   });

  //   // Immediately return job ID
  //   sendResponse({
  //     success: true,
  //     jobId: jobId,
  //     status: "processing",
  //   });

  //   return false; // Synchronous response
  // }

  if (request.action === "enrichWithClayBackground") {
    console.log("Received background Clay enrichment request:", request.data);

    const { personName, companyName } = request.data;
    const originalSource = request.source || "linkedin"; // Get the original source

    if (!personName || !companyName) {
      sendResponse({
        success: false,
        error: "Missing person name or company name for Clay enrichment",
      });
      return;
    }

    // Generate job ID and start background processing
    const jobId = generateJobId();

    // Start Clay processing in background with original source
    enrichWithClayBackground(
      personName,
      companyName,
      jobId,
      originalSource
    ).catch((error) => {
      console.error("Background Clay enrichment failed:", error);
    });

    // Immediately return job ID
    sendResponse({
      success: true,
      jobId: jobId,
      status: "processing",
    });

    return false; // Synchronous response
  }

  // Handle job status check
  if (request.action === "getClayJobStatus") {
    const { jobId } = request.data;
    const job = clayJobs.get(jobId);

    if (!job) {
      sendResponse({
        success: false,
        error: "Job not found",
      });
    } else {
      sendResponse({
        success: true,
        job: job,
      });
    }

    return false; // Synchronous response
  }

  // Handle get search history request
  if (request.action === "getSearchHistory") {
    (async () => {
      try {
        const result = await chrome.storage.local.get([
          STORAGE_KEYS.SEARCH_HISTORY,
        ]);
        const history = result[STORAGE_KEYS.SEARCH_HISTORY] || [];

        sendResponse({
          success: true,
          data: history,
        });
      } catch (error) {
        sendResponse({
          success: false,
          error: error.message,
        });
      }
    })();

    return true;
  }
});

// Extension installation/update handling
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Extension installed/updated:", details.reason);

  // Load stored token on installation
  loadStoredToken();
});

// Load stored token when background script starts
loadStoredToken();
