const ZOOMINFO_CREDENTIALS = {
  username: "jack.widnell@invisible.email",
  password: "qve9aya!huj!mrz6HWH",
};

// Simple obfuscation function (basic security)
function obfuscate(str) {
  return btoa(str); // Base64 encoding
}

function deobfuscate(str) {
  return atob(str); // Base64 decoding
}

// Export obfuscated credentials
const CONFIG = {
  username: obfuscate(ZOOMINFO_CREDENTIALS.username),
  password: obfuscate(ZOOMINFO_CREDENTIALS.password),
  baseUrl: "https://api.zoominfo.com",

  // Clay integration
  N8N_WEBHOOK:
    "https://invisible.app.n8n.cloud/webhook/101ab177-7b51-4103-94ab-bae2753d054f",

  // AI-powered extraction (OpenAI)
  AI: {
    USE_OPENAI: false, // Set to true to enable AI fallback (will cost $)
    OPENAI_API_KEY: null, // Set your OpenAI API key here: obfuscate("sk-proj-...")
    // When enabled, AI will be used as fallback when CSS selectors fail
    // Cost: ~$0.01-0.02 per extraction with gpt-4o-mini
  },

  // Timeouts
  CLAY_TIMEOUT: 90000, // 90 seconds (under Cloudflare 100s limit)
  ZOOMINFO_TIMEOUT: 30000, // 30 seconds
  CLAY_POLL_INTERVAL: 3000, // 3 seconds
  CLAY_MAX_POLLS: 31, // 31 * 3 = 93 seconds total

  // Storage keys
  STORAGE_KEYS: {
    AUTH_TOKEN: "zoominfo_auth_token",
    TOKEN_EXPIRES: "zoominfo_token_expires",
    SEARCH_HISTORY: "search_history",
  },

  // CSS Selectors - Updated for modern LinkedIn (2024/2025)
  // Ordered by stability: Data attributes > Semantic patterns > Obfuscated classes
  SELECTORS: {
    LINKEDIN: {
      PROFILE_NAME: [
        // Tier 1: Data attributes (MOST STABLE - won't change)
        '[data-view-name="profile-top-card-verified-badge"] p',
        '[data-view-name="profile-card"] p:first-of-type',

        // Tier 2: Semantic patterns (stable - structural)
        "main section:first-of-type p:first-of-type",
        ".scaffold-layout__main section:first-of-type p",

        // Tier 3: Proximity to verified badge (stable element relationship)
        'svg[id="verified-medium"] ~ p',
        'div[role="button"][tabindex="0"] > div > div > p:first-child',

        // Tier 4: Legacy h1 selectors (kept for backwards compatibility)
        "main h1",
        ".scaffold-layout__main h1",
        "h1.text-heading-xlarge",
        "h1.break-words",

        // Tier 5: Obfuscated classes (LEAST STABLE - updated Oct 2025)
        "p.f11b6631.e526f3b0", // Current Oct 2025 layout
        "p.f11b6631", // Variant
        "p._4f72bd89.c80ef3c3._03ac4b6c", // Previous layout
        "p._4f72bd89",
        "p._7ba27260._1d487f80",
        "p._7ba27260",
      ],
      COMPANY_NAME: [
        // Tier 1: Data attributes + structural patterns (MOST STABLE)
        '[data-view-name="profile-card"] img[src*="company-logo"] + div p',
        'figure[data-view-name="image"] img[src*="company-logo"] ~ div p',

        // Tier 2: URL patterns (stable - routing architecture)
        '.pvs-list__item--one-column a[href*="/company/"]',
        'a[href*="/company/"]',

        // Tier 3: ARIA labels (stable - accessibility)
        'button[aria-label*="Current company:"] span .inline-show-more-text--is-collapsed',
        'button[aria-label*="Current company:"] span div',
        'button[aria-label*="Current company:"] div[aria-hidden="true"]',

        // Tier 4: Data attributes (stable - JS hooks)
        'a[data-field="experience_company_logo"]',

        // Tier 5: Obfuscated classes (LEAST STABLE - updated Oct 2025)
        "p.f11b6631._7d5e841d._2578c488", // Current Oct 2025
        "p.f11b6631._7d5e841d",
        "p._4f72bd89.d19a3465.b4d479d9",
        "p._4f72bd89.d19a3465",
        "p._7ba27260.ce3ac449._0dfd3b8b",
        "p._7ba27260.ce3ac449",

        // Tier 6: Legacy selectors (kept for backwards compatibility)
        ".pv-top-card-v2-section__company-name",
        ".pv-text-details__left-panel .text-body-medium",
        ".experience-section .pv-entity__secondary-title",
      ],
    },
    SALES_NAV: {
      LEAD_NAME: [
        'a[data-anonymize="person-name"]',
        ".lists-detail__view-profile-name-link",
        'a[href*="/sales/lead/"]',
        "[data-x--people-list--person-name]",
      ],
      COMPANY_NAME: [
        'a[data-anonymize="company-name"]',
        '.artdeco-entity-lockup__title span[data-anonymize="company-name"]',
        'a[href*="/sales/company/"]',
        ".list-people-detail-header__account a",
      ],
      JOB_TITLE: [
        'div[data-anonymize="job-title"]',
        ".Sans-14px-black-90\\%",
        'div[style*="-webkit-box-orient: vertical"]',
        '[data-anonymize="headline"]',
      ],
      LOCATION: [
        'td[data-anonymize="location"]',
        ".list-people-detail-header__geography",
      ],
      SIDEBAR_NAME: [
        'h1[data-anonymize="person-name"]',
        'a[data-anonymize="person-name"]',
        "h1[data-x--lead--name]",
        "._headingText_e3b563 a",
      ],
      SIDEBAR_COMPANY: [
        'img[data-anonymize="company-logo"]',
        'span[data-anonymize="job-title"]',
        'a[data-anonymize="company-name"]',
        'a[href*="/sales/company/"]',
      ],
      SIDEBAR_TITLE: [
        'span[data-anonymize="headline"]',
        'span[data-anonymize="job-title"]',
        '._bodyText_1e5nen span[data-anonymize="headline"]',
      ],
    },
  },

  // Job title blacklist for filtering
  JOB_TITLE_BLACKLIST: [
    "engineer",
    "manager",
    "director",
    "analyst",
    "consultant",
    "specialist",
    "coordinator",
    "developer",
    "designer",
    "lead",
    "senior",
    "junior",
    "assistant",
    "associate",
    "vice president",
    "vp",
    "ceo",
    "cto",
    "cfo",
  ],

  // Wait times
  WAIT_TIMES: {
    PROFILE_INIT: 1000,
    SALES_NAV_INIT: 2000,
    SIDEBAR_INJECTION: 1000,
    BUTTON_RETRY: 1000,
  },
};

// Function to get credentials
function getCredentials() {
  return {
    username: deobfuscate(CONFIG.username),
    password: deobfuscate(CONFIG.password),
    baseUrl: CONFIG.baseUrl,
  };
}
