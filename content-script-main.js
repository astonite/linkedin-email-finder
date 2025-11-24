// content-script-main.js - Main orchestrator for the LinkedIn extension

console.log("LinkedIn Email Finder: Content script loaded");

// Global variables to track extension state
let extensionButton = null;
let isLinkedInProfile = false;
let isSalesNavigator = false;
let urlObserver = null;

// Check page types
function isLinkedInProfilePage() {
  return (
    window.location.href.includes("linkedin.com/in/") &&
    !window.location.href.includes("linkedin.com/in/recent-activity")
  );
}

// Monitor URL changes (for single-page app navigation)
function observeUrlChanges() {
  let lastUrl = location.href;

  const observer = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log("URL changed to:", url);
      handlePageChange();
    }
  });

  observer.observe(document, {
    subtree: true,
    childList: true,
  });

  return observer;
}

// Handle page changes
function handlePageChange() {
  const currentlyOnProfile = isLinkedInProfilePage();
  const currentlyOnSalesNav = isSalesNavigatorPage();

  console.log("=== Page Change Detected ===");
  console.log("Current URL:", window.location.href);
  console.log("Is LinkedIn Profile:", currentlyOnProfile);
  console.log("Is Sales Navigator:", currentlyOnSalesNav);
  console.log("Previous state - isLinkedInProfile:", isLinkedInProfile);
  console.log("Previous state - isSalesNavigator:", isSalesNavigator);

  // Clean up previous state
  removeExtensionUI();

  if (currentlyOnProfile) {
    // Always reinitialize for LinkedIn profiles
    console.log("Navigated to LinkedIn profile page");
    isLinkedInProfile = true;
    isSalesNavigator = false;
    setTimeout(() => {
      initializeProfileExtension();
    }, CONFIG.WAIT_TIMES.PROFILE_INIT);
  } else if (currentlyOnSalesNav) {
    // Always reinitialize for Sales Navigator
    console.log("Navigated to/within Sales Navigator page");
    isLinkedInProfile = false;
    isSalesNavigator = true;
    setTimeout(() => {
      initializeSalesNavigatorExtension();
    }, CONFIG.WAIT_TIMES.SALES_NAV_INIT);
  } else {
    // Navigated away from both
    console.log("Navigated away from LinkedIn profile/Sales Navigator");
    isLinkedInProfile = false;
    isSalesNavigator = false;
  }
}

// Initialize LinkedIn profile extension
async function initializeProfileExtension() {
  try {
    console.log("🔵 Initializing LinkedIn Profile extension...");
    console.log("Current URL for profile:", window.location.href);

    // Simply wait for the body to exist, then show button immediately
    // Don't wait for profile data - we'll extract that when user clicks!
    await waitForElement("body", 5000);
    console.log("✅ Page body loaded");

    // Give LinkedIn a moment to render basic structure
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create floating button IMMEDIATELY
    const button = createFloatingButton();
    console.log("Floating button created:", button ? "success" : "failed");

    // Verify button is in DOM
    const buttonInDom = document.getElementById("linkedin-email-finder-btn");
    if (buttonInDom) {
      console.log("✅ Button successfully injected into page");
      extensionButton = buttonInDom;
    } else {
      console.error("❌ Button not found in DOM after creation");
    }

    console.log("✅ LinkedIn Profile extension initialized successfully");
  } catch (error) {
    console.error("❌ LinkedIn Profile extension initialization failed:", error);
    console.error("Error details:", error.message);
  }
}

// Remove extension UI
function removeExtensionUI() {
  // Remove floating button
  if (extensionButton) {
    extensionButton.remove();
    extensionButton = null;
  }

  // Remove Sales Navigator UI
  removeSalesNavUI();

  // Remove any open popups
  const resultPopup = document.getElementById("linkedin-email-result");
  if (resultPopup) {
    resultPopup.remove();
  }

  const errorPopup = document.getElementById("linkedin-email-error");
  if (errorPopup) {
    errorPopup.remove();
  }
}

// Main initialization
function init() {
  console.log("LinkedIn Email Finder: Starting initialization...");
  console.log("Document ready state:", document.readyState);
  console.log("Current URL:", window.location.href);

  // Set up URL monitoring for SPA navigation
  urlObserver = observeUrlChanges();

  // Check what type of page we're on
  const profilePage = isLinkedInProfilePage();
  const salesNavPage = isSalesNavigatorPage();

  console.log("Page type detection:");
  console.log("  - LinkedIn Profile:", profilePage);
  console.log("  - Sales Navigator:", salesNavPage);

  if (profilePage) {
    console.log("Currently on LinkedIn profile page");
    isLinkedInProfile = true;
    isSalesNavigator = false;
    initializeProfileExtension();
  } else if (salesNavPage) {
    console.log("Currently on Sales Navigator page");
    isLinkedInProfile = false;
    isSalesNavigator = true;
    initializeSalesNavigatorExtension();
  } else {
    console.log("Not on LinkedIn profile or Sales Navigator page");
    isLinkedInProfile = false;
    isSalesNavigator = false;
  }
}

// Start initialization
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Cleanup when page unloads
window.addEventListener("beforeunload", () => {
  if (urlObserver) {
    urlObserver.disconnect();
  }
  removeExtensionUI();
});