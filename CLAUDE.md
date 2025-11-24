# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

This Chrome extension uses vanilla JavaScript without a build system:

- **Load Extension**: Open Chrome → Extensions → Developer Mode → Load Unpacked (select project directory)
- **Debug Background Script**: Chrome Extensions page → Extension details → "Inspect views: service worker"
- **Debug Content Script**: F12 on LinkedIn profile page → Console tab
- **Reload Extension**: Extensions page → Reload button (after code changes)

## Architecture Overview

This is a Chrome Extension (Manifest V3) that integrates ZoomInfo API to find email addresses for LinkedIn profiles and Sales Navigator leads. The extension provides a fallback Clay enrichment service when ZoomInfo fails to find emails.

### Core Components

**Background Service Worker** (`background.js`):
- Handles ZoomInfo API communication (authentication, company search, contact enrichment)
- Manages JWT token lifecycle with automatic refresh and Chrome storage persistence
- Implements Clay enrichment via n8n webhook for background processing
- Maintains unlimited search history (removed 100-search limit)
- Provides job tracking system for Clay enrichment requests
- Sends Chrome notifications for Clay completion/failure

**Content Script** (`content-script.js`):
- Injected into LinkedIn profiles (`linkedin.com/in/*`) and Sales Navigator (`linkedin.com/sales/*`)
- Extracts profile data using multiple robust CSS selectors
- Creates floating "Find Email" button for LinkedIn profiles
- Injects 📧 buttons into Sales Navigator lead lists, sidebars, and profile pages
- Handles SPA navigation with URL change monitoring
- Manages Clay enrichment workflow with real-time polling
- Provides comprehensive UI state management and cleanup

**Extension Popup** (`popup.html/js`):
- Shows extension status for LinkedIn profiles and Sales Navigator
- Advanced search history with filtering capabilities
- Bulk operations: select all, delete selected, clear all
- CSV export functionality for search history
- Real-time search across names, companies, and emails
- Enhanced source tracking with Clay enrichment indicators

**Configuration** (`config.js`):
- Contains ZoomInfo API credentials with Base64 obfuscation
- Exports `getCredentials()` function for background script

**Styling** (`content-style.css`):
- Comprehensive styling for all UI components
- Sales Navigator button styles (circular, square, profile variants)
- Result popups with modern gradient designs
- Responsive design for mobile and desktop
- Clay enrichment UI states and animations

### Data Flow

#### Primary Flow (ZoomInfo)
1. Content script detects LinkedIn/Sales Navigator page and extracts name/company
2. Background script authenticates with ZoomInfo API
3. Two-step API process: company search → contact enrichment
4. Results displayed via content script UI and saved to Chrome storage

#### Fallback Flow (Clay)
1. When ZoomInfo fails or returns no email, Clay enrichment option appears
2. Background processing initiated via n8n webhook
3. Job tracking with unique IDs and status monitoring
4. Real-time polling for completion with notifications
5. Automatic update of existing search history entries

### LinkedIn/Sales Navigator Data Extraction

**Profile Name**: 
- LinkedIn: `h1.text-heading-xlarge`, `h1.break-words`, etc.
- Sales Navigator: `a[data-anonymize="person-name"]`, `h1[data-anonymize="person-name"]`

**Company Name**: 
- LinkedIn: Complex extraction with job title filtering via aria-labels
- Sales Navigator: `a[data-anonymize="company-name"]`, company logo titles
- Handles various formats and fallback patterns

**Lead List Integration**:
- Monitors `.people-list-detail__table` for new leads
- Injects buttons into `.list-people-detail-header__actions`
- Handles dynamic content loading and pagination

### API Integrations

**ZoomInfo API**:
- Authentication: Username/password → JWT token (60-minute expiry)
- Token stored in Chrome local storage with 5-minute buffer
- Search Process: company search → contact enrichment

**Clay Integration**:
- Background processing via n8n webhook
- 180-second timeout with job tracking
- Real-time status polling every 3 seconds
- Automatic search history updates

### Extension Permissions

- `storage`: Token and history persistence
- `activeTab`: Current tab access  
- `scripting`: Content script injection
- `notifications`: Clay completion alerts
- Host permissions: `linkedin.com/*`, `api.zoominfo.com/*`

### Key Features

**Multi-Platform Support**:
- LinkedIn profiles (`linkedin.com/in/*`)
- Sales Navigator lead lists (`linkedin.com/sales/lists/*`)
- Sales Navigator search results (`linkedin.com/sales/search/*`)
- Sales Navigator profiles (`linkedin.com/sales/lead/*`)

**Advanced Search History**:
- Unlimited storage capacity
- Real-time search filtering
- Bulk selection and deletion
- CSV export functionality
- Source tracking (LinkedIn, Sales Navigator, Clay enrichment)

**Clay Enrichment**:
- Background processing with notifications
- Real-time status updates
- Automatic history integration
- Timeout handling and error recovery

**Robust UI Handling**:
- SPA navigation monitoring
- Dynamic content injection
- Multiple button variants for different contexts
- Comprehensive cleanup on navigation

### Development Considerations

**SPA Navigation**: Both LinkedIn and Sales Navigator are single-page apps requiring URL monitoring and component reinitialization.

**Robust Selectors**: Multiple fallback selectors handle frequent LinkedIn UI changes across different page types.

**Token Management**: Automatic JWT refresh prevents authentication failures during extended usage.

**Error Handling**: User-friendly error messages with Clay fallback options for failed searches.

**Performance**: Efficient DOM monitoring and cleanup prevent memory leaks during navigation.

**Security**: API credentials use basic obfuscation - consider server-side proxy for production deployment.