# LinkedIn Email Finder Chrome Extension

A Chrome extension that finds email addresses for LinkedIn profiles and Sales Navigator leads using ZoomInfo API, with Clay enrichment fallback.

## 🚀 Features

- **LinkedIn Profile Integration**: Floating "Find Email" button on profile pages
- **Sales Navigator Support**: Email buttons on lead lists, sidebars, and profile pages
- **Clay Enrichment Fallback**: Automatic fallback when ZoomInfo doesn't find an email
- **Search History**: Unlimited storage with filtering, bulk operations, and CSV export
- **Smart Data Extraction**: Robust selectors with validation to handle LinkedIn UI changes
- **Background Processing**: Clay enrichment runs in background with notifications

## 📁 Architecture

### Core Components

```
├── manifest.json                 # Extension configuration
├── background.js                 # Service worker (ZoomInfo API, Clay webhook, job tracking)
├── config.js                     # Credentials, selectors, timeouts
├── content-script-main.js        # Main orchestrator (URL monitoring, page detection)
├── popup.html/js                 # Extension popup (history, search, export)
├── content-style.css             # Styling for all UI components
└── modules/
    ├── data-extractor.js         # Extract names/companies with validation
    ├── ui-manager.js             # Buttons, popups, user interactions
    ├── clay-handler.js           # Clay enrichment workflow
    ├── sales-navigator.js        # Sales Navigator functionality
    └── error-handler.js          # Error handling utilities
```

### Data Flow

#### Primary Flow (ZoomInfo)
1. User clicks "Find Email" button on LinkedIn/Sales Navigator
2. Content script extracts name and company with validation
3. Background script authenticates with ZoomInfo (JWT tokens cached 60min)
4. Two-step API: company search → contact enrichment
5. Results displayed and saved to Chrome storage

#### Fallback Flow (Clay)
1. ZoomInfo returns no email or fails
2. User clicks "Continue to Clay" button
3. Background job initiated via n8n webhook
4. Content script polls status every 3 seconds for 93 seconds
5. Updates existing history entry (no duplicate)
6. Chrome notification on completion

## 🔧 Installation

### Development Mode

1. Clone/download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension directory
6. Navigate to LinkedIn or Sales Navigator

### Configuration

Update `config.js` with your credentials:

```javascript
const ZOOMINFO_CREDENTIALS = {
  username: "your-zoominfo-email@example.com",
  password: "your-zoominfo-password",
};

// Update Clay webhook URL
N8N_WEBHOOK: "https://your-n8n-instance.com/webhook/your-webhook-id",
```

**⚠️ Security Note**: For production, move credentials to a secure backend proxy.

## 🎯 Usage

### LinkedIn Profiles

1. Navigate to any LinkedIn profile (`linkedin.com/in/*`)
2. Wait for the floating "📧 Find Email" button to appear (top right)
3. Click the button
4. Email appears in popup (or "Continue to Clay" if not found)

### Sales Navigator

1. Navigate to Sales Navigator lead lists or profiles
2. Look for 📧 buttons next to each lead
3. Click to find email
4. Sidebar profiles also have email buttons

### Search History

1. Click the extension icon (top right Chrome toolbar)
2. View all past searches with filtering
3. Click any entry to copy email
4. Use bulk operations or export to CSV

## 🐛 Troubleshooting

### Button Not Appearing on LinkedIn

**Symptoms**: No floating button after page loads

**Causes & Solutions**:

1. **Slow page load**: Wait 15 seconds or refresh the page
   - Extension waits for valid profile data, not just DOM load
   - Check browser console for "✅ Profile data loaded successfully"

2. **LinkedIn UI changed**: Selectors may need updating
   - Open browser console (F12)
   - Look for errors like "❌ Could not extract valid person name"
   - See "Updating Selectors" section below

3. **Extension not loaded properly**:
   - Go to `chrome://extensions/`
   - Find "LinkedIn Email Finder"
   - Click "Reload" button
   - Refresh LinkedIn page

### "Invalid Name" or "Could Not Extract" Errors

**Symptoms**: Button appears but clicking shows extraction errors

**Causes & Solutions**:

1. **Check browser console (F12)**:
   ```
   === Extracting person name from LinkedIn profile ===
   Selector "h1.text-heading-xlarge" found: "John Doe"
   ✅ Valid name found: "John Doe"
   ```

2. **If you see "❌ Invalid name"**:
   - LinkedIn changed their HTML structure
   - Update selectors in `config.js` (see below)

3. **Name extracted but invalid**:
   - Check validation logic in `modules/data-extractor.js:4-31`
   - May be extracting navigation text instead of profile name

### Updating Selectors (When LinkedIn Changes Layout)

**Step 1**: Inspect LinkedIn profile in browser

1. Right-click on the person's name → "Inspect"
2. Note the CSS classes and structure
3. Look for unique identifiers (classes, data attributes)

**Step 2**: Update `config.js`

```javascript
SELECTORS: {
  LINKEDIN: {
    PROFILE_NAME: [
      "new-selector-here",  // Add your new selector first
      "h1.text-heading-xlarge",  // Keep old ones as fallbacks
      // ...
    ],
    COMPANY_NAME: [
      "new-company-selector",
      // ...
    ]
  }
}
```

**Step 3**: Test and reload

1. Save `config.js`
2. Go to `chrome://extensions/` → Reload extension
3. Refresh LinkedIn profile
4. Check console for successful extraction

### ZoomInfo API Errors

**Symptoms**: "ZoomInfo API error" in popup

**Solutions**:

1. **Check credentials in `config.js`**
2. **Token expired**: Extension auto-refreshes, wait 10 seconds and retry
3. **Rate limited**: Wait a few minutes
4. **Account issue**: Verify ZoomInfo account is active

### Clay Enrichment Issues

**Symptoms**: "Clay couldn't find an email" or timeout

**Solutions**:

1. **Check n8n webhook URL** in `config.js`
2. **Timeout (93 seconds)**: Clay may be slow, try again later
3. **Webhook failing**: Check n8n workflow is active and accessible
4. **Check browser console** for detailed error messages

### General Debugging

Enable detailed logging:

1. Open browser console (F12)
2. Navigate to LinkedIn profile
3. Look for these key messages:

```
✅ LinkedIn Email Finder: Content script loaded
🔵 Initializing LinkedIn Profile extension...
=== Waiting for LinkedIn profile to load ===
✅ Profile data loaded successfully
✅ Button successfully injected into page
```

If you see ❌ errors, read the error message for specific guidance.

## 🔄 How It Works

### Smart Profile Detection

The extension uses a **smart waiting system** that:

1. Checks every 500ms for valid profile data (up to 15 seconds)
2. Uses MutationObserver to detect DOM changes
3. Validates extracted data before showing button
4. Handles LinkedIn's progressive rendering (skeleton → data)

### Robust Data Extraction

**Multi-layered selector approach**:
- Primary selectors (most reliable LinkedIn classes)
- Fallback selectors (older/alternative layouts)
- Last resort (scan all h1 elements with validation)

**Validation checks**:
- Name must have first + last name (contains space)
- Must be mostly letters (80%+ letter ratio)
- Cannot be common UI text ("LinkedIn", "Home", etc.)
- Length constraints (2-100 chars for names)

### SPA Navigation Handling

LinkedIn/Sales Navigator are Single Page Apps:
- MutationObserver monitors URL changes
- Extension reinitializes on navigation
- Cleans up old UI before injecting new buttons

## 📊 Search History Format

Stored in Chrome local storage:

```javascript
{
  timestamp: 1234567890,
  fullName: "John Doe",
  companyName: "Acme Corp",
  contactData: {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@acme.com",
    jobTitle: "CEO",
    company: { name: "Acme Corp" }
  },
  source: "linkedin" | "sales-navigator" | "linkedin-clay" | "sales-navigator-clay",
  success: true
}
```

## 🛠️ Development

### Making Changes

1. Edit files in the extension directory
2. Go to `chrome://extensions/`
3. Click "Reload" button on the extension
4. Refresh the LinkedIn/Sales Navigator page
5. Check browser console (F12) for logs

### Testing Checklist

- [ ] LinkedIn profile pages load button
- [ ] Button appears within 5 seconds on fast connections
- [ ] Name and company extract correctly
- [ ] ZoomInfo search works
- [ ] Clay fallback works
- [ ] Search history saves correctly
- [ ] Sales Navigator buttons inject properly
- [ ] CSV export works
- [ ] Bulk delete works

### Performance Considerations

- **Token caching**: JWT tokens cached in Chrome storage (5min expiry buffer)
- **History storage**: Unlimited (was previously 100-item limit)
- **Button injection**: Debounced to prevent excessive DOM manipulation
- **Memory**: Old UI elements cleaned up on navigation

## 🚨 Known Issues & Limitations

1. **LinkedIn Selector Brittleness**: LinkedIn changes UI frequently
   - **Solution**: Update selectors in `config.js` when layout changes
   - We provide extensive fallbacks, but new layouts may need new selectors

2. **Timing Issues on Slow Connections**: Button may take 10-15 seconds
   - **Solution**: Increased timeout to 15 seconds, added polling

3. **Clay Timeout (93 seconds)**: Cloudflare worker has 100s limit
   - **Solution**: Background processing with notifications

4. **Credentials in Code**: Basic Base64 obfuscation only
   - **Solution**: For production, use backend proxy with server-side auth

## 📝 Changelog

### Version 4.2 (Current - Major Refactor)

**Fixed:**
- ❌ Button not appearing on LinkedIn profiles (h1 selector too generic)
- ❌ "Invalid name" extraction errors (no validation)
- ❌ Duplicate code conflicts (old monolithic file vs modules)
- ❌ Race conditions on page load
- ❌ Selectors failing with LinkedIn layout changes

**Improved:**
- ✅ Smart profile waiting (waits for valid data, not just DOM)
- ✅ Robust data extraction with validation
- ✅ Better error messages and logging
- ✅ Increased timeout to 15 seconds
- ✅ Added multiple fallback selectors
- ✅ Removed duplicate code
- ✅ Better console logging for debugging

### Version 4.1 (Previous)
- Modularized content scripts
- Added Clay enrichment
- Unlimited search history

### Version 4.0
- Sales Navigator support
- Search history with CSV export

## 📄 License

Proprietary - Internal Use Only

## 🤝 Support

For issues or questions:
1. Check the "Troubleshooting" section above
2. Enable browser console (F12) and look for error messages
3. Contact the development team with console logs

---

**Built with**: Chrome Extensions API, ZoomInfo API, Clay/n8n integration
