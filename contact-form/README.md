# Contact form (email verified with a one-time code)

The site is static, so the contact form in `index.html` talks to
`AppsScript.gs`, a small Google Apps Script web app that sends the emails
from your Google account. Your email address never appears in the page.

How it works:

1. **`action=requestOtp`**: the visitor's name, email and message come in.
   The script emails a 6-digit code to that address and holds the message
   in `CacheService` for 10 minutes.
2. **`action=verifyOtp`**: the visitor types the code. If it matches, two
   emails go out:
   - to **you**: "Portfolio inquiry from {name}", with `Reply-To` set to
     their address so you can just hit Reply.
   - to **them**: a short "I got your message" confirmation.

A message only reaches you if the sender proved they own the email
address, so fake addresses and most spam never arrive.

## Setup (once)

1. Go to [script.google.com](https://script.google.com) → **New project**.
2. Paste in `AppsScript.gs`. Set `OWNER_EMAIL` at the top to the address
   that should receive inquiries (use the same Google account you deploy
   with, since mail is always sent *from* that account).
3. **Deploy → New deployment → Web app**. Execute as **Me**. Who has
   access: **Anyone**. It must be exactly "Anyone": any other setting makes
   every request from the website fail. Grant the email permission it asks
   for, then copy the URL ending in `/exec`.
4. In `index.html`, find `CONTACT_FORM_URL` and paste that URL in.
5. After editing `AppsScript.gs` later, publish a **new version**
   (Deploy → Manage deployments → edit → New version), or the live URL
   keeps running the old code.

Until step 4 is done, the form shows "The contact form isn't connected yet".

## Settings at the top of `AppsScript.gs`

- `OTP_TTL_SECONDS` (600): how long a code works. This is 10 minutes, not
  1, because verification emails often take more than a minute to arrive.
- `RESEND_COOLDOWN_SECONDS` (60): minimum wait before "Resend code" works
  for the same address. A resend replaces the old code.
- `MAX_VERIFY_ATTEMPTS` (5): wrong guesses before the code is thrown away.
- `MAX_CODES_PER_HOUR` (20): a site-wide cap on codes sent per hour. A
  free Gmail account can send roughly 100 emails a day through Apps Script
  and each real inquiry uses 3, so without this cap a bot cycling through
  addresses could use up the quota and silently break the form for the
  day.

The hidden `website` field is a honeypot. People never see it, bots fill
it in, and the script quietly drops those requests.

## Debugging

Run **`testSendOtp`** from the function dropdown in the Apps Script editor
(set the test email at its top first), then check **Executions / Logs**.
`ok: false` means the call failed. `ok: true` with no email means look in
spam. If the website says "Couldn't reach the server", double-check that
the deployment's access is exactly **Anyone**.
