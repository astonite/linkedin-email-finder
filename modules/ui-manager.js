// ui-manager.js - Handles UI components and popup management

// Wait for page element to load
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// Smart wait for LinkedIn profile to be fully loaded with actual data
function waitForLinkedInProfile(timeout = 15000) {
  return new Promise((resolve, reject) => {
    console.log("=== Waiting for LinkedIn profile to load ===");

    const checkProfile = () => {
      // Check if we can extract valid profile data
      const personName = extractPersonName();
      const companyName = extractCompanyName();

      console.log(
        `Check attempt - Name: "${personName}", Company: "${companyName}"`
      );

      // If we have at least a valid name, consider profile loaded
      if (personName && personName.trim() !== "") {
        console.log("✅ Profile data is ready!");
        return true;
      }

      return false;
    };

    // Try immediately
    if (checkProfile()) {
      resolve(true);
      return;
    }

    // Set up polling and mutation observer
    let attempts = 0;
    const maxAttempts = Math.floor(timeout / 500); // Check every 500ms

    const pollInterval = setInterval(() => {
      attempts++;
      console.log(`Polling attempt ${attempts}/${maxAttempts}`);

      if (checkProfile()) {
        clearInterval(pollInterval);
        if (observer) observer.disconnect();
        resolve(true);
      } else if (attempts >= maxAttempts) {
        clearInterval(pollInterval);
        if (observer) observer.disconnect();
        reject(
          new Error(`LinkedIn profile data not loaded within ${timeout}ms`)
        );
      }
    }, 500);

    // Also watch for DOM changes
    const observer = new MutationObserver((mutations) => {
      if (checkProfile()) {
        clearInterval(pollInterval);
        observer.disconnect();
        resolve(true);
      }
    });

    // Watch the main content area
    const mainArea = document.querySelector("main") || document.body;
    observer.observe(mainArea, {
      childList: true,
      subtree: true,
    });
  });
}

// Create the floating button (for regular LinkedIn profiles)
function createFloatingButton() {
  console.log("Creating floating button...");

  // Remove existing button if it exists
  const existingButton = document.getElementById("linkedin-email-finder-btn");
  if (existingButton) {
    console.log("Removing existing floating button");
    existingButton.remove();
  }

  const button = document.createElement("div");
  button.id = "linkedin-email-finder-btn";
  button.innerHTML = `
    <div class="finder-btn-content">
      <span class="finder-btn-icon">📧</span>
      <span class="finder-btn-text">Find Email</span>
    </div>
  `;

  // Add click event listener properly (no inline handlers)
  button.addEventListener("click", handleButtonClick);

  // Add some inline styles to make sure it's visible
  button.style.cssText = `
    position: fixed !important;
    top: 100px !important;
    right: 20px !important;
    z-index: 9999 !important;
    background: linear-gradient(135deg, #0077b5, #005885) !important;
    color: white !important;
    border: none !important;
    border-radius: 50px !important;
    padding: 12px 20px !important;
    cursor: pointer !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    font-size: 14px !important;
    font-weight: 600 !important;
    box-shadow: 0 4px 15px rgba(0, 119, 181, 0.3) !important;
    display: block !important;
    visibility: visible !important;
  `;

  document.body.appendChild(button);

  console.log("Floating button added to page");
  return button;
}

// Show result popup
function showResult(contactData, originalSearchData = null) {
  // Remove any existing popups
  const existingPopup = document.getElementById("linkedin-email-result");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Safety check - if contactData is undefined/null, show error
  if (!contactData) {
    showError("No data returned from search. Please try again.");
    return;
  }

  // Determine the state based on the data
  const hasEmail = contactData.email && contactData.email.trim() !== "";
  const hasName = contactData.firstName && contactData.lastName;
  const hasCompany = contactData.company?.name || contactData.companyName;

  let popupTitle = "";
  let showClayButton = false;

  if (hasEmail) {
    popupTitle = "Contact Found!";
  } else if (hasName || hasCompany) {
    popupTitle = "No Email Found";
    showClayButton = true;
  } else {
    popupTitle = "Person Not Found";
    showClayButton = true;
  }

  const popup = document.createElement("div");
  popup.id = "linkedin-email-result";

  let resultDetailsHTML = "";
  if (hasName) {
    resultDetailsHTML += `<p><strong>Name:</strong> ${contactData.firstName} ${contactData.lastName}</p>`;
  }
  if (hasEmail) {
    resultDetailsHTML += `<p><strong>Email:</strong> <span class="email">${contactData.email}</span></p>`;
  } else {
    resultDetailsHTML += `<p><strong>Email:</strong> <span class="no-email">Not found</span></p>`;
  }
  if (contactData.jobTitle) {
    resultDetailsHTML += `<p><strong>Title:</strong> ${contactData.jobTitle}</p>`;
  }
  if (hasCompany) {
    resultDetailsHTML += `<p><strong>Company:</strong> ${hasCompany}</p>`;
  }

  popup.innerHTML = `
    <div class="result-content">
      <div class="result-header">
        <h3>${popupTitle}</h3>
        <button class="close-btn" data-action="close">×</button>
      </div>
      <div class="result-details">
        ${resultDetailsHTML}
      </div>
      <div class="result-actions">
        ${
          hasEmail
            ? `<button class="copy-email-btn" data-action="copy" data-email="${contactData.email}">Copy Email</button>`
            : ""
        }
        ${
          showClayButton
            ? `<button class="clay-btn" data-action="clay">Continue to Clay</button>`
            : ""
        }
      </div>
    </div>
  `;

  // Add event listeners for buttons
  const closeBtn = popup.querySelector(".close-btn");
  const copyBtn = popup.querySelector(".copy-email-btn");
  const clayBtn = popup.querySelector(".clay-btn");

  closeBtn.addEventListener("click", () => {
    popup.remove();
  });

  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const email = copyBtn.getAttribute("data-email");
      copyEmailToClipboard(email, copyBtn);
    });
  }

  if (clayBtn) {
    clayBtn.addEventListener("click", () => {
      handleClayEnrichment(originalSearchData, popup);
    });
  }

  // Add click outside to close
  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });

  document.body.appendChild(popup);
}

// Show error message
function showError(errorMessage) {
  // Remove any existing error popups
  const existingPopup = document.getElementById("linkedin-email-error");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.id = "linkedin-email-error";
  popup.innerHTML = `
    <div class="error-content">
      <div class="error-header">
        <h3>Error</h3>
        <button class="close-btn" data-action="close">×</button>
      </div>
      <p>${errorMessage}</p>
    </div>
  `;

  // Add event listener for close button
  const closeBtn = popup.querySelector(".close-btn");
  closeBtn.addEventListener("click", () => {
    popup.remove();
  });

  // Add click outside to close
  popup.addEventListener("click", (e) => {
    if (e.target === popup) {
      popup.remove();
    }
  });

  document.body.appendChild(popup);

  // Auto-remove after 8 seconds for errors
  setTimeout(() => {
    if (popup.parentElement) {
      popup.remove();
    }
  }, 8000);
}

// Copy email to clipboard
function copyEmailToClipboard(email, buttonElement) {
  navigator.clipboard
    .writeText(email)
    .then(() => {
      console.log("Email copied to clipboard");
      // Show brief confirmation
      const originalText = buttonElement.textContent;
      buttonElement.textContent = "Copied!";
      buttonElement.style.background = "#059669";

      setTimeout(() => {
        buttonElement.textContent = originalText;
        buttonElement.style.background = "#0077b5";
      }, 2000);
    })
    .catch((err) => {
      console.error("Failed to copy email:", err);
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = email;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);

      const originalText = buttonElement.textContent;
      buttonElement.textContent = "Copied!";
      setTimeout(() => {
        buttonElement.textContent = originalText;
      }, 2000);
    });
}

// Handle button click
async function handleButtonClick() {
  const button = document.getElementById("linkedin-email-finder-btn");
  const btnContent = button.querySelector(".finder-btn-content");

  // Show loading state
  btnContent.innerHTML =
    '<span class="finder-btn-loading">⏳ Loading...</span>';

  try {
    console.log("🔍 Button clicked, attempting to extract profile data...");

    // Try to extract data immediately using AI-enhanced extraction if available
    let personName = null;
    let companyName = null;

    // Check if AI extraction is available
    if (
      typeof extractPersonNameWithAI === "function" &&
      CONFIG.AI &&
      CONFIG.AI.USE_OPENAI
    ) {
      console.log("Using AI-enhanced extraction...");
      personName = await extractPersonNameWithAI();
      if (personName) {
        companyName = await extractCompanyNameWithAI(personName);
      }
    } else {
      // Fallback to traditional extraction
      console.log("Using traditional extraction...");
      personName = extractPersonName();
      if (personName) {
        companyName = extractCompanyNameWithName(personName);
      }
    }

    // If we can't find data immediately, wait a bit for LinkedIn to render
    if (!personName) {
      console.log(
        "⏳ Name not found immediately, waiting for LinkedIn to render..."
      );
      btnContent.innerHTML =
        '<span class="finder-btn-loading">⏳ Waiting for profile...</span>';

      // Wait up to 10 seconds, checking every 500ms
      let attempts = 0;
      while (!personName && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (
          typeof extractPersonNameWithAI === "function" &&
          CONFIG.AI &&
          CONFIG.AI.USE_OPENAI
        ) {
          personName = await extractPersonNameWithAI();
        } else {
          personName = extractPersonName();
        }

        if (personName) {
          if (
            typeof extractCompanyNameWithAI === "function" &&
            CONFIG.AI &&
            CONFIG.AI.USE_OPENAI
          ) {
            companyName = await extractCompanyNameWithAI(personName);
          } else {
            companyName = extractCompanyNameWithName(personName);
          }
        }
        attempts++;
        console.log(
          `Attempt ${attempts}/20: Name=${personName ? "✅" : "❌"}, Company=${
            companyName ? "✅" : "❌"
          }`
        );
      }
    }

    console.log("Final extracted data:", { personName, companyName });

    // Validate we have the required data
    if (!personName || personName.trim() === "") {
      throw new Error(
        "Could not extract person name from LinkedIn profile. Please make sure the profile is fully loaded and try again."
      );
    }

    if (!companyName || companyName.trim() === "") {
      throw new Error(
        "Could not extract company name from LinkedIn profile. This person may not have a current company listed."
      );
    }

    // Store original search data for potential Clay fallback
    const originalSearchData = {
      personName: personName.trim(),
      companyName: companyName.trim(),
    };

    console.log("✅ Extracted data successfully:", originalSearchData);
    btnContent.innerHTML =
      '<span class="finder-btn-loading">⏳ Searching...</span>';

    // Send message to background script
    const response = await chrome.runtime.sendMessage({
      action: "findEmail",
      data: originalSearchData,
    });

    if (response && response.success) {
      showResult(response.data, originalSearchData);
    } else {
      throw new Error(response?.error || "Failed to find email");
    }
  } catch (error) {
    console.error("❌ Error:", error);
    showError(error.message || "An unexpected error occurred");
  } finally {
    // Reset button
    btnContent.innerHTML = `
      <span class="finder-btn-icon">📧</span>
      <span class="finder-btn-text">Find Email</span>
    `;
  }
}
