// sales-navigator.js - Handles Sales Navigator functionality

// Global variables for Sales Navigator
let salesNavButtons = new Map(); // Track injected buttons

// Check page types
function isSalesNavigatorPage() {
  return window.location.href.includes("linkedin.com/sales/");
}

function isSalesNavigatorLeadList() {
  return (
    window.location.href.includes("linkedin.com/sales/lists/people/") ||
    window.location.href.includes("linkedin.com/sales/search/people")
  );
}

function isSalesNavigatorLeadProfile() {
  return window.location.href.includes("linkedin.com/sales/lead/");
}

// Create Sales Navigator lead row button
function createSalesNavRowButton(leadData, leadRow) {
  const buttonId = `sales-nav-btn-${Date.now()}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;

  const button = document.createElement("button");
  button.id = buttonId;
  button.className = "sales-nav-email-btn";
  button.innerHTML = "📧";
  button.title = "Find Email";

  // Store lead data on button
  button.leadData = leadData;

  // Add click event listener
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleSalesNavEmailSearch(leadData, button);
  });

  return button;
}

// Create Sales Navigator sidebar button
function createSalesNavSidebarButton() {
  const button = document.createElement("button");
  button.id = "sales-nav-sidebar-btn";
  button.className = "sales-nav-sidebar-email-btn-square";
  button.innerHTML = "📧";
  button.title = "Find Email"; // Tooltip for the icon

  // Add click event listener
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const leadData = extractSalesNavSidebarData();
    handleSalesNavEmailSearch(leadData, button);
  });

  return button;
}

// Create Sales Navigator profile button
function createSalesNavProfileButton() {
  const button = document.createElement("button");
  button.id = "sales-nav-profile-btn";
  button.className = "sales-nav-profile-email-btn";
  button.innerHTML = `
    <span class="email-icon">📧</span>
    <span class="btn-text">Find Email</span>
  `;

  // Add click event listener
  button.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const leadData = extractSalesNavProfileData();
    handleSalesNavEmailSearch(leadData, button);
  });

  return button;
}

// Handle Sales Navigator email search
async function handleSalesNavEmailSearch(leadData, buttonElement) {
  if (!leadData.isValid) {
    showError("Could not extract valid lead data from this row");
    return;
  }

  // Show loading state
  const originalContent = buttonElement.innerHTML;
  buttonElement.innerHTML = "⏳";
  buttonElement.disabled = true;

  try {
    console.log("Starting Sales Nav email search for:", leadData);

    // Store original search data for potential Clay fallback
    const originalSearchData = {
      personName: leadData.fullName,
      companyName: leadData.companyName,
    };

    // Send message to background script to handle API call
    const response = await chrome.runtime.sendMessage({
      action: "findEmail",
      data: {
        personName: leadData.fullName,
        companyName: leadData.companyName,
      },
      source: "sales-navigator",
    });

    if (response.success) {
      showResult(response.data, originalSearchData);
      // Update button to show success
      buttonElement.innerHTML = "✅";
      setTimeout(() => {
        buttonElement.innerHTML = originalContent;
        buttonElement.disabled = false;
      }, 3000);
    } else {
      throw new Error(response.error || "Failed to find email");
    }
  } catch (error) {
    console.error("Sales Nav email search error:", error);
    showError(error.message);

    // Reset button
    buttonElement.innerHTML = originalContent;
    buttonElement.disabled = false;
  }
}

// Inject buttons into Sales Navigator lead list table
function injectSalesNavLeadListButtons() {
  console.log("=== Starting Sales Nav button injection ===");

  // First, let's look for the actual table with real data
  const actualTable = document.querySelector(".people-list-detail__table");
  if (!actualTable) {
    console.log("Could not find .people-list-detail__table");
    return;
  }

  // Find rows with actual data
  const leadRows = actualTable.querySelectorAll("tr[data-x--people-list--row]");

  if (leadRows.length === 0) {
    console.log("No lead rows found in people-list-detail__table");
    // Let's see what's actually in the table
    const allRows = actualTable.querySelectorAll("tr");
    console.log(`Found ${allRows.length} total rows in table`);
    allRows.forEach((row, i) => {
      console.log(`Row ${i}: ${row.outerHTML.substring(0, 100)}...`);
    });
    return;
  }

  console.log(
    `Processing ${leadRows.length} lead rows from people-list-detail__table`
  );

  leadRows.forEach((row, index) => {
    console.log(`--- Processing row ${index} ---`);

    // Skip if button already exists
    if (row.querySelector(".sales-nav-email-btn")) {
      console.log(`Row ${index}: Button already exists, skipping`);
      return;
    }

    // Extract lead data from this row
    const leadData = extractSalesNavLeadData(row);
    console.log(`Row ${index} extracted data:`, leadData);

    if (!leadData.isValid) {
      console.log(`Row ${index}: Invalid data, skipping`);
      return;
    }

    // Create button
    const button = createSalesNavRowButton(leadData, row);
    console.log(`Row ${index}: Created button`);

    // Find the actions cell
    const actionsCell = row.querySelector(
      ".list-people-detail-header__actions"
    );

    if (actionsCell) {
      console.log(`Row ${index}: Found actions cell, injecting button`);

      // Find the dropdown container
      const dropdownContainer = actionsCell.querySelector(".artdeco-dropdown");
      if (dropdownContainer) {
        // Insert button BEFORE the dropdown container (to the left)
        actionsCell.insertBefore(button, dropdownContainer);
        console.log(`Row ${index}: Inserted button before dropdown`);
      } else {
        // If no dropdown found, just append to actions cell
        actionsCell.appendChild(button);
        console.log(`Row ${index}: Appended button to actions cell`);
      }

      salesNavButtons.set(button.id, button);
      console.log(
        `Row ${index}: Successfully injected button for ${leadData.fullName}`
      );
    } else {
      console.log(`Row ${index}: Could not find actions cell`);
    }
  });

  console.log("=== Sales Nav button injection complete ===");
}

// Inject button into Sales Navigator sidebar
function injectSalesNavSidebarButton() {
  console.log("Injecting button into Sales Nav sidebar...");

  // Remove existing sidebar button
  const existingButton = document.getElementById("sales-nav-sidebar-btn");
  if (existingButton) {
    existingButton.remove();
  }

  // Look for button containers in the sidebar
  const possibleContainers = [
    "._actions-container_1dg5u8 ._cta-container_1xow7n",
    "._cta-container_1xow7n",
    "._actions-bar_1xow7n ._cta-container_1xow7n",
    "._actions-bar_1xow7n",
    ".lead-sidesheet ._actions-bar_1xow7n",
  ];

  let buttonContainer = null;
  for (const selector of possibleContainers) {
    buttonContainer = document.querySelector(selector);
    if (buttonContainer) {
      console.log(`Found sidebar container with selector: ${selector}`);
      break;
    }
  }

  if (buttonContainer) {
    const button = createSalesNavSidebarButton();

    // Try to insert after the first button (Message button)
    const messageButton =
      buttonContainer.querySelector('button[aria-label*="Message"]') ||
      buttonContainer.querySelector("button");

    if (messageButton && messageButton.parentNode === buttonContainer) {
      // Insert after the message button
      if (messageButton.nextSibling) {
        buttonContainer.insertBefore(button, messageButton.nextSibling);
      } else {
        buttonContainer.appendChild(button);
      }
      console.log("Injected sidebar button after Message button");
    } else {
      // Just append to the container
      buttonContainer.appendChild(button);
      console.log("Injected sidebar button at end of container");
    }
  } else {
    console.log("Could not find sidebar button container");
    console.log("Available sidebar elements:");
    const sidebarElements = document.querySelectorAll(
      '.lead-sidesheet *[class*="action"], .lead-sidesheet *[class*="cta"], .lead-sidesheet button'
    );
    console.log(`Found ${sidebarElements.length} potential sidebar elements`);
    sidebarElements.forEach((el, i) => {
      if (i < 5) {
        // Show first 5
        console.log(`  ${i}: ${el.tagName}.${el.className}`);
      }
    });
  }
}

// Inject button into Sales Navigator profile page
function injectSalesNavProfileButton() {
  console.log("Injecting button into Sales Nav profile page...");

  // Remove existing profile button
  const existingButton = document.getElementById("sales-nav-profile-btn");
  if (existingButton) {
    existingButton.remove();
  }

  // This will need to be updated when we see the actual profile page structure
  // For now, let's try some generic selectors
  const buttonContainer =
    document.querySelector(".profile-actions") ||
    document.querySelector(".pv-s-profile-actions") ||
    document.querySelector("[data-x--lead--profile-card-actions]");

  if (buttonContainer) {
    const button = createSalesNavProfileButton();
    buttonContainer.appendChild(button);
    console.log("Injected profile button");
  } else {
    console.log("Could not find profile button container");
  }
}

// Initialize Sales Navigator extension
async function initializeSalesNavigatorExtension() {
  try {
    console.log("Initializing Sales Navigator extension...");
    console.log("Current URL:", window.location.href);

    if (isSalesNavigatorLeadList()) {
      console.log("On Sales Navigator lead list page");

      // Wait for the actual data table to load (not skeleton loading)
      try {
        console.log("Waiting for people-list-detail__table...");
        await waitForElement(".people-list-detail__table", 10000);

        // Also wait for actual data rows, not loading placeholders
        console.log("Waiting for data rows...");
        await waitForElement("tr[data-x--people-list--row]", 10000);

        console.log("Table and data loaded, injecting buttons...");
        injectSalesNavLeadListButtons();
      } catch (error) {
        console.log("Timeout waiting for table, checking what we have...");

        // Debug: check what tables exist
        const tables = document.querySelectorAll("table");
        console.log(`Found ${tables.length} tables`);
        tables.forEach((table, i) => {
          console.log(`Table ${i}:`, table.className);
        });

        // Try to inject anyway
        injectSalesNavLeadListButtons();
      }

      // Monitor for new rows (pagination, filtering, etc.)
      observeSalesNavTableChanges();
    } else if (isSalesNavigatorLeadProfile()) {
      console.log("On Sales Navigator lead profile page");
      // Wait for profile to load - need to see actual profile page structure
      await waitForElement(
        'h1[data-anonymize="person-name"], [data-x--lead--name]',
        5000
      );
      injectSalesNavProfileButton();
    }

    // Always monitor for sidebar (can appear on any Sales Nav page)
    observeSalesNavSidebar();

    console.log("Sales Navigator extension initialized successfully");
  } catch (error) {
    console.error("Sales Navigator extension initialization failed:", error);
    // Try to inject buttons anyway
    console.log("Attempting to inject buttons despite error...");
    injectSalesNavLeadListButtons();
  }
}

// Monitor Sales Navigator table changes (for dynamic content)
function observeSalesNavTableChanges() {
  // Look for the actual table container
  const tableContainer =
    document.querySelector(".people-list-detail__table tbody") ||
    document.querySelector(".people-list-detail__table") ||
    document.querySelector("table");

  if (!tableContainer) {
    console.log("No table container found for monitoring");
    return;
  }

  console.log("Monitoring table container:", tableContainer.className);

  const observer = new MutationObserver((mutations) => {
    let newRowsAdded = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (
            node.nodeType === Node.ELEMENT_NODE &&
            (node.tagName === "TR" ||
              node.hasAttribute?.("data-x--people-list--row") ||
              node.querySelector?.("tr[data-x--people-list--row]"))
          ) {
            console.log("New table row detected");
            newRowsAdded = true;
          }
        });
      }
    });

    if (newRowsAdded) {
      console.log("New rows detected, re-injecting buttons...");
      setTimeout(() => {
        injectSalesNavLeadListButtons();
      }, 1000); // Wait a bit longer for rows to fully load
    }
  });

  observer.observe(tableContainer, {
    childList: true,
    subtree: true,
  });

  console.log("Started monitoring Sales Nav table changes");
}

// Monitor Sales Navigator sidebar appearance
function observeSalesNavSidebar() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if sidebar elements were added
            if (
              node.querySelector &&
              (node.querySelector(".lead-sidesheet") ||
                node.querySelector("._actions-bar_1xow7n") ||
                node.classList?.contains("lead-sidesheet") ||
                node.classList?.contains("_inline-sidesheet_4y6x1f"))
            ) {
              console.log("Sales Nav sidebar detected");
              setTimeout(() => {
                injectSalesNavSidebarButton();
              }, CONFIG.WAIT_TIMES.SIDEBAR_INJECTION);
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("Started monitoring for Sales Nav sidebar");
}

// Remove Sales Navigator UI elements
function removeSalesNavUI() {
  // Remove Sales Navigator buttons
  salesNavButtons.forEach((button, id) => {
    if (button && button.parentElement) {
      button.remove();
    }
  });
  salesNavButtons.clear();

  // Remove sidebar button
  const sidebarButton = document.getElementById("sales-nav-sidebar-btn");
  if (sidebarButton) {
    sidebarButton.remove();
  }

  // Remove profile button
  const profileButton = document.getElementById("sales-nav-profile-btn");
  if (profileButton) {
    profileButton.remove();
  }
}