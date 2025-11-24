// clay-handler.js - Handles Clay enrichment workflow

// Handle Clay enrichment (background processing)
async function handleClayEnrichment(originalSearchData, popup) {
  if (!originalSearchData) {
    showError("Original search data not available for Clay enrichment");
    return;
  }

  // Check if we're already processing this request (prevent double-clicks)
  const clayBtn = popup.querySelector(".clay-btn");
  if (clayBtn.dataset.processing === "true") {
    console.log(
      "Clay enrichment already in progress, ignoring duplicate request"
    );
    return;
  }

  // Mark as processing to prevent duplicate requests
  clayBtn.dataset.processing = "true";

  // Update the popup to show initial processing state
  const originalBtnText = clayBtn.textContent;
  clayBtn.textContent = "Starting Clay...";
  clayBtn.disabled = true;
  clayBtn.style.opacity = "0.6";

  try {
    console.log("Starting background Clay enrichment for:", originalSearchData);

    // Send message to background script to start background processing
    const response = await chrome.runtime.sendMessage({
      action: "enrichWithClayBackground",
      data: {
        personName: originalSearchData.personName,
        companyName: originalSearchData.companyName,
      },
    });

    if (response.success && response.jobId) {
      // Background processing started successfully
      showClayBackgroundStarted(response.jobId, popup, originalSearchData);
    } else {
      // Failed to start background processing
      showClayError("Failed to start Clay enrichment", popup);
      // Reset processing flag on error
      clayBtn.dataset.processing = "false";
    }
  } catch (error) {
    console.error("Clay enrichment error:", error);
    showClayError("Failed to start Clay enrichment", popup);
    // Reset processing flag on error
    clayBtn.dataset.processing = "false";
  }
}

// Show that Clay is processing in background
function showClayBackgroundStarted(jobId, popup, originalSearchData) {
  // Update the popup content to show background processing info
  const resultHeader = popup.querySelector(".result-header h3");
  const clayBtn = popup.querySelector(".clay-btn");

  resultHeader.textContent = "Clay Processing...";

  // IMPORTANT: Remove ALL existing event listeners before adding new one
  // Clone the button to remove all event listeners
  const newClayBtn = clayBtn.cloneNode(true);
  clayBtn.parentNode.replaceChild(newClayBtn, clayBtn);

  // Now work with the new button that has no listeners
  const cleanClayBtn = popup.querySelector(".clay-btn");

  cleanClayBtn.textContent = "Close";
  cleanClayBtn.disabled = false;
  cleanClayBtn.style.opacity = "1";
  cleanClayBtn.style.background = "#7c3aed";

  // Add more concise instructions
  const resultDetails = popup.querySelector(".result-details");
  const existingInstructions =
    resultDetails.querySelector(".clay-instructions");
  if (!existingInstructions) {
    const instructions = document.createElement("div");
    instructions.className = "clay-instructions";
    instructions.innerHTML = `
      <p style="color: #7c3aed; font-weight: 500; margin-top: 12px; font-size: 13px;">
        🎯 Searching for email via Clay...<br>
        Wait here or close to continue working.
      </p>
    `;
    resultDetails.appendChild(instructions);
  }

  // Store job ID for potential status checking
  popup.dataset.clayJobId = jobId;

  // Add SINGLE new click handler to just close the popup
  cleanClayBtn.addEventListener(
    "click",
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      clearInterval(pollInterval); // Stop polling if user closes
      popup.remove();
    },
    { once: true }
  );

  // Start polling for job completion (check every 3 seconds)
  let pollCount = 0;
  const maxPolls = CONFIG.CLAY_MAX_POLLS;

  const pollInterval = setInterval(async () => {
    pollCount++;

    try {
      // Check job status
      const response = await chrome.runtime.sendMessage({
        action: "getClayJobStatus",
        data: { jobId: jobId },
      });

      if (response.success && response.job) {
        const job = response.job;

        if (job.status === "completed" && job.email) {
          // Success! Update the popup with the email
          clearInterval(pollInterval);
          updatePopupWithClayEmail(popup, job.email, originalSearchData);
        } else if (job.status === "failed") {
          // Failed
          clearInterval(pollInterval);
          showClayError("Clay couldn't find an email", popup);
        }
      }
    } catch (error) {
      console.error("Error polling Clay job status:", error);
    }

    // Check for timeout (93 seconds to stay under Cloudflare 100s limit)
    if (pollCount >= maxPolls) {
      clearInterval(pollInterval);
      console.log("Clay enrichment timed out after 93 seconds (Cloudflare limit)");
      showClayTimeoutError(popup);
    }
  }, CONFIG.CLAY_POLL_INTERVAL);

  // Store interval ID so we can clear it if needed
  popup.dataset.pollInterval = pollInterval;

  console.log(`Clay background processing started with job ID: ${jobId}`);
}

// Update popup with found Clay email
function updatePopupWithClayEmail(popup, email, originalSearchData) {
  // Update the popup to show the found email
  const resultHeader = popup.querySelector(".result-header h3");
  const resultDetails = popup.querySelector(".result-details");
  const resultActions = popup.querySelector(".result-actions");

  resultHeader.textContent = "Email Found via Clay!";

  // Remove Clay instructions
  const instructions = resultDetails.querySelector(".clay-instructions");
  if (instructions) {
    instructions.remove();
  }

  // Update the email field
  const emailParagraphs = resultDetails.querySelectorAll("p");
  emailParagraphs.forEach((p) => {
    if (p.innerHTML.includes("Email:")) {
      p.innerHTML = `<strong>Email:</strong> <span class="email">${email}</span>`;
    }
  });

  // Update actions to show copy button and remove Clay button
  resultActions.innerHTML = `
    <button class="copy-email-btn" data-action="copy" data-email="${email}">Copy Email</button>
  `;

  // Add copy functionality
  const copyBtn = resultActions.querySelector(".copy-email-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      copyEmailToClipboard(email, copyBtn);
    });
  }

  // Brief success animation
  popup.style.animation = "none";
  setTimeout(() => {
    popup.style.animation = "pulse 0.5s ease-out";
  }, 10);

  console.log("Popup updated with Clay email:", email);
}

// Show Clay timeout error
function showClayTimeoutError(popup) {
  const resultHeader = popup.querySelector(".result-header h3");
  const clayBtn = popup.querySelector(".clay-btn");
  const instructions = popup.querySelector(".clay-instructions");

  resultHeader.textContent = "Clay Timeout";

  if (instructions) {
    instructions.innerHTML = `
      <p style="color: #ef4444; font-weight: 500; margin-top: 12px; font-size: 13px;">
        ⏱️ Clay search timed out (Cloudflare limit).<br>
        Try again later - this usually means Clay is processing slowly.
      </p>
    `;
  }

  if (clayBtn) {
    clayBtn.textContent = "Close";
    clayBtn.style.background = "#ef4444";
  }
}

// Show Clay error in the existing popup
function showClayError(errorMessage, popup) {
  const clayBtn = popup.querySelector(".clay-btn");
  const resultHeader = popup.querySelector(".result-header h3");
  const instructions = popup.querySelector(".clay-instructions");

  if (resultHeader) {
    resultHeader.textContent = "No Email Found";
  }

  if (instructions) {
    instructions.innerHTML = `
      <p style="color: #ef4444; font-weight: 500; margin-top: 12px; font-size: 13px;">
        ❌ ${errorMessage}
      </p>
    `;
  }

  if (clayBtn) {
    clayBtn.textContent = "Close";
    clayBtn.disabled = false;
    clayBtn.style.background = "#ef4444";
    clayBtn.style.cursor = "pointer";
  }
}