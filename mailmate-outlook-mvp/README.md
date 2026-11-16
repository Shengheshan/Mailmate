# Mailmate Outlook MVP

This is an installable Chromium extension MVP for Outlook Web. It reads **only the email already open in Outlook's reading pane**, after the user clicks the Mailmate button, then asks Groq for a structured single-email analysis.

## Load it in Edge

1. Unzip this package into a folder.
2. Open `edge://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder that contains `manifest.json`.
4. If Outlook was already open, refresh that tab. Sign in normally and open a test email.
5. Click the floating **Mailmate** button at the bottom right.
6. Choose Chinese or English, paste a Groq API key into the password field, check the consent box, and click **Read and analyze this email**.

The API key is not stored. It is sent in the authorization header for this request and the input is cleared when the request finishes. Email content is sent to Groq only after the user checks the consent box and clicks the analysis button. Link addresses are excluded by default; a separate checkbox is required to include them.

## MVP scope

- Reads visible DOM content from one email that the user has already opened.
- Shows category, importance, a short summary, and action/reply flags.
- Supports Simplified Chinese and English; the default follows the browser language.
- Does not call Microsoft Graph, read cookies/tokens, click messages, scroll the inbox, or change message state.
- Does not store email text, predictions, API keys, or cache results.

The extension does not open messages itself. Outlook may change read state when a user opens an email depending on Outlook settings. If preserving unread status is important, first set Outlook **Mark as read** to **Don't automatically mark as read** and verify that setting with a test email.

This version handles one open email only. It does not yet scan the first 50 messages, aggregate multiple emails, cache incremental sync results, read attachments, or run a Mailmate backend.

## Data and deployment notes

- The request sends the current email subject, sender, visible body text, and optionally link addresses to Groq's API in the United States.
- Keep the Groq account on the intended plan and review its data-retention settings before using personal or school email.
- The selected Qwen model is marked Preview by Groq. This MVP is for a controlled demonstration, not a production deployment.
- Do not publish a build that asks end users for a shared developer API key. A public product needs a Mailmate backend to hold provider credentials, enforce per-user limits, validate/normalize results, cache by message ID/content hash, and delete data on the product's retention schedule.
- Test on a non-sensitive email first. Outlook DOM selectors can change; if the extension cannot identify the body, it reports that instead of crawling other content.

## Files

- `manifest.json` — Manifest V3 extension settings and Outlook host matching.
- `content.js` — user-triggered floating panel and visible email DOM extraction.
- `background.js` — one-request Groq client and minimal schema checks.
