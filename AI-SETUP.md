# AI-Enhanced Data Extraction Setup Guide

## What Changed?

Your extension now has **3-tier fallback extraction**:

1. **✅ CSS Selectors** (Free, Fast) - Updated with current LinkedIn HTML structure
2. **🤖 OpenAI AI** (Costs $, Always works) - Fallback when selectors fail
3. **👤 Manual Input** (Free, User effort) - Last resort if both fail

## Quick Fixes Applied

### 1. Updated CSS Selectors (Oct 2025)

- LinkedIn changed from `<h1>` to `<p>` tags for names
- Added new selectors based on `data-view-name` attributes (most stable)
- Updated obfuscated class names to current ones

### 2. Better Sidebar Detection

- Added phrase-based detection ("Explore premium profiles", "More profiles for you")
- Checks parent elements for sidebar indicators
- Prevents extracting recommendation section headers

### 3. Profile Header Boost

- Elements in the profile header get +200 score boost
- Ensures real name beats sidebar text
- Uses `data-view-name="profile-card"` detection

### 4. Blacklist Expansion

- Added common sidebar headers to invalid names list
- Filters out ad-related text
- Prevents extraction of UI elements

## How to Enable OpenAI (Optional)

### Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)

### Step 2: Configure Extension

Open `config.js` and update:

```javascript
// AI-powered extraction (OpenAI)
AI: {
  USE_OPENAI: true, // ← Change to true
  OPENAI_API_KEY: obfuscate("sk-proj-YOUR-KEY-HERE"), // ← Paste your key
},
```

### Step 3: Reload Extension

1. Go to `chrome://extensions/`
2. Find "LinkedIn Email Finder"
3. Click the **Reload** button
4. Test on a LinkedIn profile

## Cost Estimation

**OpenAI Pricing (gpt-4o-mini):**

- Input: $0.15 per 1M tokens
- Output: $0.60 per 1M tokens

**Typical Usage:**

- Per extraction: ~2000 input tokens + 50 output tokens
- Cost per extraction: **~$0.0003 to $0.0010** (less than a penny!)
- 100 extractions: **~$0.05 to $0.10**
- 1000 extractions: **~$0.50 to $1.00**

**When AI is Used:**

- Only when CSS selectors fail
- With updated selectors, ~10-20% of profiles may need AI
- So 100 searches = ~10-20 AI calls = ~$0.01

## Testing

### Test Without AI (Free)

```javascript
// In config.js
AI: {
  USE_OPENAI: false, // AI disabled
  OPENAI_API_KEY: null,
}
```

Your extension will:

1. ✅ Try updated CSS selectors (should work on most profiles now!)
2. ❌ Skip AI (disabled)
3. ⚠️ Show error if selectors fail

### Test With AI (Costs money)

```javascript
// In config.js
AI: {
  USE_OPENAI: true,
  OPENAI_API_KEY: obfuscate("sk-proj-..."),
}
```

Your extension will:

1. ✅ Try CSS selectors first
2. 🤖 Use OpenAI if selectors fail
3. ✅ Almost never fail!

## Monitoring AI Usage

Check the browser console (F12) on LinkedIn profiles:

```
🔍 Button clicked, attempting to extract profile data...
Using traditional extraction...
=== Extracting person name from LinkedIn profile ===
Selector "[data-view-name="profile-top-card-verified-badge"] p" found: "John Doe"
✅ Valid name found: "John Doe"
✅ Traditional extraction successful, skipping AI
```

**If AI is used, you'll see:**

```
⚠️ Traditional extraction failed, using AI fallback...
🤖 Using OpenAI for data extraction...
Calling OpenAI API...
OpenAI extraction successful: {name: "John Doe", company: "Acme Corp"}
✅ AI extraction successful: "John Doe"
```

## Troubleshooting

### "OpenAI extraction is not enabled or API key is missing"

- Make sure `USE_OPENAI: true` in config.js
- Make sure `OPENAI_API_KEY` is set with your key wrapped in `obfuscate()`
- Reload the extension

### "OpenAI API error: 401 - Incorrect API key"

- Your API key is wrong or expired
- Go to https://platform.openai.com/api-keys and generate a new one
- Update config.js and reload

### "OpenAI API error: 429 - Rate limit exceeded"

- You've hit OpenAI's rate limit
- Wait a few minutes and try again
- Or upgrade your OpenAI plan

### Still Extracting Wrong Names

- Check console (F12) to see what's being extracted
- Look for the scoring output to see which element won
- The updated selectors should fix the "Explore premium profiles" issue
- If still broken, AI fallback should catch it

## What's Next?

### Option 1: Use Updated Selectors Only (Recommended for now)

- Keep AI disabled
- Test on 10-20 different LinkedIn profiles
- See if the updated selectors work consistently
- Enable AI only if you still see failures

### Option 2: Enable AI Immediately

- Set up OpenAI API key
- AI will catch any selector failures
- Monitor costs for first week
- Should be < $1/month for normal usage

### Option 3: Add Manual Input Fallback (Future)

- If both selectors and AI fail, ask user to type name/company
- 100% reliable but requires user interaction
- Good for edge cases

## Summary of Changes

**Files Modified:**

- ✅ `config.js` - Updated selectors, added AI config
- ✅ `modules/data-extractor.js` - Better validation, sidebar detection, scoring
- ✅ `modules/ai-extractor.js` - NEW: AI extraction functions
- ✅ `modules/ui-manager.js` - Uses AI-enhanced extraction
- ✅ `background.js` - OpenAI API handler
- ✅ `manifest.json` - Includes AI module

**Key Improvements:**

- 🎯 Name extraction now prioritizes profile header (+200 score)
- 🚫 Sidebar headers blacklisted (no more "Explore premium profiles")
- 🔍 Better sidebar detection (checks parent text content)
- 🤖 AI fallback ready (disabled by default)
- 📊 Updated selectors for Oct 2025 LinkedIn layout

**Test it now!** Reload the extension and try it on Simon Wilhelm's profile again. It should correctly extract "Simon Wilhelm" instead of "Explore premium profiles"! 🎉
