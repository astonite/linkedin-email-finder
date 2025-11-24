// popup.js - Script for the extension popup

let searchHistory = [];
let filteredHistory = [];
let selectedItems = new Set();

document.addEventListener("DOMContentLoaded", function () {
  console.log("Popup loaded");

  // Check what type of page we're on
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    const currentTab = tabs[0];
    const statusText = document.getElementById("status-text");

    if (currentTab.url && currentTab.url.includes("linkedin.com/in/")) {
      statusText.textContent =
        "LinkedIn profile detected! Use the floating button on the page.";
      statusText.style.color = "#059669";
    } else if (
      currentTab.url &&
      currentTab.url.includes("linkedin.com/sales/")
    ) {
      statusText.textContent =
        "Sales Navigator detected! Look for 📧 buttons on leads.";
      statusText.style.color = "#059669";
    } else {
      statusText.textContent =
        "Please navigate to LinkedIn or Sales Navigator.";
      statusText.style.color = "#dc2626";
    }
  });

  // Load search history
  loadSearchHistory();

  // Event listeners
  document
    .getElementById("clear-history")
    .addEventListener("click", clearAllHistory);

  document
    .getElementById("select-all")
    .addEventListener("click", toggleSelectAll);

  document
    .getElementById("delete-selected")
    .addEventListener("click", deleteSelectedItems);

  document.getElementById("export-csv").addEventListener("click", exportToCSV);

  // Search functionality
  document
    .getElementById("search-input")
    .addEventListener("input", handleSearch);
});

// Handle search input
function handleSearch(event) {
  const searchTerm = event.target.value.toLowerCase().trim();

  if (searchTerm === "") {
    // Show all if search is empty
    filteredHistory = searchHistory;
  } else {
    // Filter history based on search term
    filteredHistory = searchHistory.filter((item) => {
      const fullName =
        `${item.contactData.firstName} ${item.contactData.lastName}`.toLowerCase();
      const company = (item.companyName || "").toLowerCase();
      const email = (item.contactData.email || "").toLowerCase();

      return (
        fullName.includes(searchTerm) ||
        company.includes(searchTerm) ||
        email.includes(searchTerm)
      );
    });
  }

  // Re-render the filtered results
  displayHistory(filteredHistory);
}

// Load and display search history
function loadSearchHistory() {
  chrome.runtime.sendMessage({ action: "getSearchHistory" }, (response) => {
    const historyContent = document.getElementById("history-content");
    const searchCount = document.getElementById("search-count");
    const selectAllBtn = document.getElementById("select-all");
    const deleteSelectedBtn = document.getElementById("delete-selected");
    const exportBtn = document.getElementById("export-csv");

    if (response && response.success) {
      searchHistory = response.data;
      filteredHistory = searchHistory; // Initially show all

      if (searchHistory.length === 0) {
        historyContent.innerHTML =
          '<div class="no-history">No searches yet</div>';
        searchCount.textContent = "";
        selectAllBtn.style.display = "none";
        deleteSelectedBtn.style.display = "none";
        exportBtn.style.display = "none";
      } else {
        displayHistory(filteredHistory);
        exportBtn.style.display = "inline-block";
      }
    } else {
      historyContent.innerHTML =
        '<div class="no-history">Error loading history</div>';
      searchCount.textContent = "";
    }
  });
}

// Display history items
function displayHistory(historyToDisplay) {
  const historyContent = document.getElementById("history-content");
  const searchCount = document.getElementById("search-count");
  const selectAllBtn = document.getElementById("select-all");

  if (historyToDisplay.length === 0) {
    historyContent.innerHTML =
      '<div class="no-history">No matching searches found</div>';
    searchCount.textContent = `(0 of ${searchHistory.length})`;
    selectAllBtn.style.display = "none";
  } else {
    historyContent.innerHTML = "";
    searchCount.textContent =
      historyToDisplay.length === searchHistory.length
        ? `(${searchHistory.length})`
        : `(${historyToDisplay.length} of ${searchHistory.length})`;

    // Show selection button if there are items
    selectAllBtn.style.display = "inline-block";

    // Show filtered searches
    historyToDisplay.forEach((item, index) => {
      // Find the original index in the full history
      const originalIndex = searchHistory.indexOf(item);
      const historyItem = createHistoryItem(item, originalIndex);
      historyContent.appendChild(historyItem);
    });
  }
}

// Export to CSV
function exportToCSV() {
  if (searchHistory.length === 0) {
    alert("No data to export!");
    return;
  }

  // Create CSV content
  let csvContent = "Name,Company,Email\n";

  searchHistory.forEach((item) => {
    const name = `${item.contactData.firstName} ${item.contactData.lastName}`;
    const company = item.companyName || "";
    const email = item.contactData.email || "";

    // Escape commas and quotes in data
    const escapedName = `"${name.replace(/"/g, '""')}"`;
    const escapedCompany = `"${company.replace(/"/g, '""')}"`;
    const escapedEmail = `"${email.replace(/"/g, '""')}"`;

    csvContent += `${escapedName},${escapedCompany},${escapedEmail}\n`;
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  // Create download link
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format
  link.setAttribute("href", url);
  link.setAttribute("download", `linkedin_emails_${timestamp}.csv`);

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);

  // Show success feedback
  const exportBtn = document.getElementById("export-csv");
  const originalText = exportBtn.textContent;
  exportBtn.textContent = "✅ Exported!";
  exportBtn.style.background = "#059669";

  setTimeout(() => {
    exportBtn.textContent = originalText;
    exportBtn.style.background = "#10b981";
  }, 2000);
}

// Create history item element with checkbox and delete button
function createHistoryItem(item, index) {
  const div = document.createElement("div");
  div.className = "history-item";
  div.dataset.index = index;

  const date = new Date(item.timestamp).toLocaleDateString();
  const time = new Date(item.timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Determine source icon
  let sourceIcon = "👤"; // Default LinkedIn
  if (item.source === "sales-navigator") {
    sourceIcon = "🔗";
  } else if (item.source === "clay") {
    sourceIcon = "🎯";
  } else if (item.source === "linkedin-clay") {
    sourceIcon = "👤→🎯"; // LinkedIn then enriched with Clay
  } else if (item.source === "sales-navigator-clay") {
    sourceIcon = "🔗→🎯"; // Sales Navigator then enriched with Clay
  }

  // Create checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "history-checkbox";
  checkbox.dataset.index = index;
  checkbox.addEventListener("change", handleCheckboxChange);

  // Create content div
  const contentDiv = document.createElement("div");
  contentDiv.className = "history-content";
  contentDiv.innerHTML = `
    <div class="history-name">${sourceIcon} ${item.contactData.firstName} ${item.contactData.lastName}</div>
    <div class="history-company">${item.companyName} • ${date} ${time}</div>
    <div class="history-email">${item.contactData.email}</div>
  `;

  // Click content to copy email
  contentDiv.addEventListener("click", () => {
    navigator.clipboard.writeText(item.contactData.email).then(() => {
      // Brief visual feedback
      div.style.background = "#dcfce7";
      setTimeout(() => {
        div.style.background = "";
      }, 500);
    });
  });

  // Create delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "history-delete";
  deleteBtn.innerHTML = "🗑️";
  deleteBtn.title = "Delete this search";
  deleteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    deleteItem(index);
  });

  // Append all elements
  div.appendChild(checkbox);
  div.appendChild(contentDiv);
  div.appendChild(deleteBtn);

  return div;
}

// Handle checkbox changes
function handleCheckboxChange(event) {
  const index = parseInt(event.target.dataset.index);
  const deleteSelectedBtn = document.getElementById("delete-selected");

  if (event.target.checked) {
    selectedItems.add(index);
  } else {
    selectedItems.delete(index);
  }

  // Show/hide delete selected button
  if (selectedItems.size > 0) {
    deleteSelectedBtn.style.display = "inline-block";
    deleteSelectedBtn.textContent = `Delete Selected (${selectedItems.size})`;
  } else {
    deleteSelectedBtn.style.display = "none";
  }
}

// Toggle select all
function toggleSelectAll() {
  const checkboxes = document.querySelectorAll(".history-checkbox");
  const selectAllBtn = document.getElementById("select-all");
  const allChecked = selectedItems.size === searchHistory.length;

  checkboxes.forEach((checkbox) => {
    const index = parseInt(checkbox.dataset.index);
    checkbox.checked = !allChecked;
    if (!allChecked) {
      selectedItems.add(index);
    } else {
      selectedItems.delete(index);
    }
  });

  // Update button text
  selectAllBtn.textContent = allChecked ? "Select All" : "Deselect All";

  // Update delete selected button
  const deleteSelectedBtn = document.getElementById("delete-selected");
  if (selectedItems.size > 0) {
    deleteSelectedBtn.style.display = "inline-block";
    deleteSelectedBtn.textContent = `Delete Selected (${selectedItems.size})`;
  } else {
    deleteSelectedBtn.style.display = "none";
  }
}

// Delete single item
function deleteItem(index) {
  if (!confirm("Delete this search from history?")) {
    return;
  }

  console.log("Deleting item at index:", index);
  
  try {
    // Get current history from storage using the correct key
    chrome.storage.local.get(["search_history"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting history:", chrome.runtime.lastError);
        alert("Failed to delete item. Please try again.");
        return;
      }

      const currentHistory = result.search_history || [];
      console.log("Current history length:", currentHistory.length);

      if (index >= 0 && index < currentHistory.length) {
        // Remove the item
        currentHistory.splice(index, 1);
        console.log("New history length:", currentHistory.length);

        // Save back to storage
        chrome.storage.local.set({ search_history: currentHistory }, () => {
          if (chrome.runtime.lastError) {
            console.error("Error saving history:", chrome.runtime.lastError);
            alert("Failed to delete item. Please try again.");
            return;
          }

          console.log("Item deleted successfully");
          // Clear selected items and reload
          selectedItems.clear();
          loadSearchHistory();
        });
      } else {
        console.error("Invalid index:", index);
        alert("Invalid item selected. Please refresh and try again.");
      }
    });
  } catch (error) {
    console.error("Error in deleteItem:", error);
    alert("Failed to delete item. Please try again.");
  }
}

// Delete selected items
function deleteSelectedItems() {
  const count = selectedItems.size;
  if (count === 0) return;

  if (!confirm(`Delete ${count} selected search${count > 1 ? "es" : ""} from history?`)) {
    return;
  }

  console.log("Deleting selected items:", Array.from(selectedItems));

  try {
    chrome.storage.local.get(["search_history"], (result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting history:", chrome.runtime.lastError);
        alert("Failed to delete selected items. Please try again.");
        return;
      }

      const currentHistory = result.search_history || [];
      console.log("Current history length:", currentHistory.length);

      // Sort indices in descending order to delete from end to beginning
      const indicesToDelete = Array.from(selectedItems).sort((a, b) => b - a);
      console.log("Indices to delete:", indicesToDelete);

      // Remove items from the array
      indicesToDelete.forEach((index) => {
        if (index >= 0 && index < currentHistory.length) {
          currentHistory.splice(index, 1);
        }
      });

      console.log("New history length:", currentHistory.length);

      // Save updated history
      chrome.storage.local.set({ search_history: currentHistory }, () => {
        if (chrome.runtime.lastError) {
          console.error("Error saving history:", chrome.runtime.lastError);
          alert("Failed to delete selected items. Please try again.");
          return;
        }

        console.log("Selected items deleted successfully");
        // Clear selected items and reload
        selectedItems.clear();
        loadSearchHistory();
      });
    });
  } catch (error) {
    console.error("Error in deleteSelectedItems:", error);
    alert("Failed to delete selected items. Please try again.");
  }
}

// Clear all search history
function clearAllHistory() {
  // Get current history count first
  chrome.storage.local.get(["search_history"], (result) => {
    if (chrome.runtime.lastError) {
      console.error("Error getting history:", chrome.runtime.lastError);
      alert("Failed to access history. Please try again.");
      return;
    }

    const currentHistory = result.search_history || [];
    
    if (currentHistory.length === 0) {
      alert("No history to clear!");
      return;
    }

    if (!confirm(`Are you sure you want to clear all ${currentHistory.length} searches from history?`)) {
      return;
    }

    console.log("Clearing all history");

    // Clear the history
    chrome.storage.local.set({ search_history: [] }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error clearing history:", chrome.runtime.lastError);
        alert("Failed to clear history. Please try again.");
        return;
      }

      console.log("All history cleared successfully");
      selectedItems.clear();
      loadSearchHistory(); // Reload to show empty state
    });
  });
}