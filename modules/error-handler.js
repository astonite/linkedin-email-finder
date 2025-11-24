// error-handler.js - Simple error handling utilities

// Custom error class for extension-specific errors
class ExtensionError extends Error {
  constructor(message, type = 'general', details = null) {
    super(message);
    this.name = 'ExtensionError';
    this.type = type; // 'network', 'extraction', 'clay', 'zoominfo', 'storage'
    this.details = details;
    this.timestamp = Date.now();
  }
}

// Error types
const ERROR_TYPES = {
  NETWORK: 'network',
  EXTRACTION: 'extraction', 
  CLAY: 'clay',
  ZOOMINFO: 'zoominfo',
  STORAGE: 'storage',
  GENERAL: 'general'
};

// Safe async wrapper that catches and logs errors
async function safeAsync(fn, context = 'unknown') {
  try {
    return await fn();
  } catch (error) {
    console.error(`Error in ${context}:`, error);
    
    // Classify error
    let errorType = ERROR_TYPES.GENERAL;
    if (error.message.includes('fetch') || error.message.includes('network')) {
      errorType = ERROR_TYPES.NETWORK;
    } else if (error.message.includes('extract') || error.message.includes('selector')) {
      errorType = ERROR_TYPES.EXTRACTION;
    } else if (error.message.includes('Clay') || error.message.includes('clay')) {
      errorType = ERROR_TYPES.CLAY;
    } else if (error.message.includes('ZoomInfo') || error.message.includes('zoominfo')) {
      errorType = ERROR_TYPES.ZOOMINFO;
    } else if (error.message.includes('storage') || error.message.includes('chrome.storage')) {
      errorType = ERROR_TYPES.STORAGE;
    }
    
    throw new ExtensionError(error.message, errorType, {
      originalError: error,
      context: context
    });
  }
}

// Get user-friendly error message
function getUserFriendlyError(error) {
  if (error instanceof ExtensionError) {
    switch (error.type) {
      case ERROR_TYPES.NETWORK:
        return "Network error. Please check your connection and try again.";
      case ERROR_TYPES.EXTRACTION:
        return "Could not extract profile data. LinkedIn may have changed their layout.";
      case ERROR_TYPES.CLAY:
        return "Clay enrichment failed. The service may be temporarily unavailable.";
      case ERROR_TYPES.ZOOMINFO:
        return "ZoomInfo API error. Please try again in a moment.";
      case ERROR_TYPES.STORAGE:
        return "Storage error. Please try refreshing the page.";
      default:
        return error.message || "An unexpected error occurred.";
    }
  }
  
  return error.message || "An unexpected error occurred.";
}

// Simple retry mechanism
async function withRetry(fn, maxRetries = 2, delay = 1000) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${i + 1} failed:`, error.message);
      
      if (i < maxRetries) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
}

// Validate required data
function validateSearchData(data) {
  if (!data) {
    throw new ExtensionError("No search data provided", ERROR_TYPES.EXTRACTION);
  }
  
  if (!data.personName || typeof data.personName !== 'string' || data.personName.trim() === '') {
    throw new ExtensionError("Invalid person name", ERROR_TYPES.EXTRACTION);
  }
  
  if (!data.companyName || typeof data.companyName !== 'string' || data.companyName.trim() === '') {
    throw new ExtensionError("Invalid company name", ERROR_TYPES.EXTRACTION);
  }
  
  return {
    personName: data.personName.trim(),
    companyName: data.companyName.trim()
  };
}

// Safe DOM operations
function safeQuerySelector(selector, context = document) {
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.warn(`Invalid selector: ${selector}`, error);
    return null;
  }
}

function safeQuerySelectorAll(selector, context = document) {
  try {
    return context.querySelectorAll(selector);
  } catch (error) {
    console.warn(`Invalid selector: ${selector}`, error);
    return [];
  }
}