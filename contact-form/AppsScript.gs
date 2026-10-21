var OWNER_EMAIL = "";
var SCRIPT_VERSION = "2026-10-21.2";
var SITE_NAME = "Joe Tayactac";
var OTP_TTL_SECONDS = 600;
var RESEND_COOLDOWN_SECONDS = 60;
var MAX_VERIFY_ATTEMPTS = 5;
var MAX_CODES_PER_HOUR = 20;

function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = params.action || "";
  if (action === "requestOtp") return handleRequestOtp(params);
  if (action === "verifyOtp") return handleVerifyOtp(params);
  if (action === "hit" || action === "visits") return handleVisits(action);
  return jsonOut({ ok: false, reason: "bad_request", version: SCRIPT_VERSION, message: "This endpoint powers the joetayactac.site contact form. Expected action=requestOtp or action=verifyOtp." });
}

function doPost(e) {
  var params = {};
  try { params = JSON.parse(e.postData.contents); } catch (err) {}
  var action = params.action || "";
  if (action === "requestOtp") return handleRequestOtp(params);
  if (action === "verifyOtp") return handleVerifyOtp(params);
  return jsonOut({ ok: false, reason: "bad_request" });
}

function handleRequestOtp(params) {
  if (String(params.website || "").trim()) return jsonOut({ ok: true });

  var name = String(params.name || "").trim().slice(0, 200);
  var email = String(params.email || "").trim().slice(0, 200);
  var message = String(params.message || "").trim().slice(0, 1500);

  if (!name || !email || !message) return jsonOut({ ok: false, reason: "bad_request" });
  if (!isValidEmail(email)) return jsonOut({ ok: false, reason: "invalid_email" });

  var cache = CacheService.getScriptCache();
  var emailKey = email.toLowerCase();
  var cooldownKey = "cooldown_" + emailKey;

  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return jsonOut({ ok: false, reason: "busy" });
  try {
    if (cache.get(cooldownKey)) return jsonOut({ ok: false, reason: "cooldown" });

    var hourKey = "codes_" + Math.floor(Date.now() / 3600000);
    var sentThisHour = Number(cache.get(hourKey) || 0);
    if (sentThisHour >= MAX_CODES_PER_HOUR) return jsonOut({ ok: false, reason: "busy" });

    var otp = generateOtp();
    var record = { otp: otp, name: name, email: email, message: message, attempts: 0, expiresAt: Date.now() + OTP_TTL_SECONDS * 1000 };

    try {
      sendOtpEmail(email, name, otp);
    } catch (err) {
      console.error("Sending the verification code failed: " + err);
      return jsonOut({ ok: false, reason: "server_error" });
    }

    cache.put("otp_" + emailKey, JSON.stringify(record), OTP_TTL_SECONDS);
    cache.put(cooldownKey, "1", RESEND_COOLDOWN_SECONDS);
    cache.put(hourKey, String(sentThisHour + 1), 3600);
  } finally {
    lock.releaseLock();
  }

  return jsonOut({ ok: true });
}

function handleVerifyOtp(params) {
  var email = String(params.email || "").trim().toLowerCase();
  var otp = String(params.otp || "").trim();
  if (!email || !otp) return jsonOut({ ok: false, reason: "bad_request" });

  var cache = CacheService.getScriptCache();
  var key = "otp_" + email;
  var raw = cache.get(key);
  if (!raw) return jsonOut({ ok: false, reason: "expired" });

  var record = JSON.parse(raw);
  var remainingTtl = Math.floor((record.expiresAt - Date.now()) / 1000);
  if (remainingTtl <= 0) {
    cache.remove(key);
    return jsonOut({ ok: false, reason: "expired" });
  }

  if (String(record.otp) !== otp) {
    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      cache.remove(key);
      return jsonOut({ ok: false, reason: "too_many_attempts" });
    }
    cache.put(key, JSON.stringify(record), remainingTtl);
    return jsonOut({ ok: false, reason: "invalid_code", attemptsLeft: MAX_VERIFY_ATTEMPTS - record.attempts });
  }

  try {
    sendOwnerNotification(record);
  } catch (err) {
    console.error("Sending the inquiry to the owner failed: " + err);
    return jsonOut({ ok: false, reason: "server_error" });
  }
  cache.remove(key);

  try {
    sendVisitorConfirmation(record);
  } catch (err) {
    console.error("Sending the confirmation to the visitor failed: " + err);
  }

  return jsonOut({ ok: true });
}

function handleVisits(action) {
  var props = PropertiesService.getScriptProperties();
  if (action !== "hit") return jsonOut({ ok: true, visits: Number(props.getProperty("visits") || 0) });
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return jsonOut({ ok: true, visits: Number(props.getProperty("visits") || 0) });
  try {
    var visits = Number(props.getProperty("visits") || 0) + 1;
    props.setProperty("visits", String(visits));
    return jsonOut({ ok: true, visits: visits });
  } finally {
    lock.releaseLock();
  }
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function sendOtpEmail(toEmail, name, otp) {
  var subject = "Your verification code: " + otp;
  var body =
    "Hi " + name + ",\n\n" +
    "Thanks for reaching out! To keep spam out, I just need to confirm this is your email address before your message goes through.\n\n" +
    "Your verification code is:\n\n" +
    "    " + otp + "\n\n" +
    "Enter it on the contact form to send your message. It expires in " + Math.round(OTP_TTL_SECONDS / 60) + " minutes.\n\n" +
    "If you didn't request this, you can ignore this email. Nothing is sent without the code.\n\n" +
    "- " + SITE_NAME + "\n\n" +
    "This is an automated message. Please do not reply to it.";
  MailApp.sendEmail({ to: toEmail, subject: subject, body: body, name: SITE_NAME });
}

function sendOwnerNotification(record) {
  var subject = "Portfolio inquiry from " + record.name;
  var body =
    "New verified inquiry from the joetayactac.site contact form:\n\n" +
    "Name: " + record.name + "\n" +
    "Email: " + record.email + "\n\n" +
    "Message:\n" + record.message + "\n\n" +
    "(Reply-To is set to their email, so you can just hit Reply.)";
  MailApp.sendEmail({ to: ownerEmail(), subject: subject, body: body, replyTo: record.email, name: SITE_NAME + " website" });
}

function sendVisitorConfirmation(record) {
  var subject = "I got your message - " + SITE_NAME;
  var body =
    "Hi " + record.name + ",\n\n" +
    "Thank you for reaching out. I've received your message and will get back to you by email as soon as I can.\n\n" +
    "Your message:\n\"" + record.message + "\"\n\n" +
    "- " + SITE_NAME + "\n\n" +
    "This is an automated message. Please do not reply to it.";
  MailApp.sendEmail({ to: record.email, subject: subject, body: body, name: SITE_NAME });
}

function ownerEmail() {
  var email = OWNER_EMAIL || Session.getEffectiveUser().getEmail();
  if (!email) throw new Error("No owner email. Run testOwnerEmail once in the editor to grant permission, or set OWNER_EMAIL.");
  return email;
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function testOwnerEmail() {
  var to = ownerEmail();
  Logger.log("Inquiries go to: " + to + " | Emails left today: " + MailApp.getRemainingDailyQuota() + " | Version: " + SCRIPT_VERSION);
  MailApp.sendEmail({ to: to, subject: "Contact form test", body: "If you can read this, inquiries from joetayactac.site will reach this inbox.", name: SITE_NAME + " website" });
}

function testSendOtp() {
  var result = handleRequestOtp({ name: "Test User", email: "REPLACE_WITH_A_TEST_EMAIL@example.com", message: "This is a test message from testSendOtp()." });
  Logger.log(result.getContent());
}
