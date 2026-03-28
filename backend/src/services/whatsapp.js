// services/whatsapp.js
// Handles sending WhatsApp messages using the Twilio sandbox.
//
// SETUP REMINDER (do this once before running the agent):
//   1. Go to https://console.twilio.com → Messaging → Try it out → Send a WhatsApp message.
//   2. Send the sandbox join code from YOUR WhatsApp number to the Twilio sandbox number.
//   3. Fill in TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM,
//      and TWILIO_WHATSAPP_TO in backend/.env
//
// Exports:
//   sendMessage(to, body)  – sends any single message to a given number
//   sendSummary(repos)     – formats all repos into one combined message and sends it

// Load .env values (TWILIO_ACCOUNT_SID etc.) before anything else runs
require('dotenv').config();

const twilio = require('twilio');

// Initialize the Twilio client once at module level.
// process.env values are already loaded by dotenv above.
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─── sendMessage ──────────────────────────────────────────────────────────────
// Sends a single WhatsApp message via the Twilio sandbox.
//
// Parameters:
//   to   – recipient in "whatsapp:+<country><number>" format, e.g. whatsapp:+919876543210
//   body – the message text (WhatsApp supports *bold* and _italic_ markdown)
//
// Returns:
//   { success: true,  sid: "SMxxx..." }  on success
//   { success: false, error: "..."     }  on failure  (never throws)
async function sendMessage(to, body) {
  console.log(`[WhatsApp] Sending message to: ${to}`);

  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM, // sandbox number e.g. whatsapp:+14155238886
      to: to,
      body: body,
    });

    console.log(`[WhatsApp] Message sent successfully! SID: ${message.sid}`);
    return { success: true, sid: message.sid };

  } catch (error) {
    console.error(`[WhatsApp] Failed to send message: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ─── sendSummary ──────────────────────────────────────────────────────────────
// Formats an array of repo objects (from the agent loop) into ONE combined
// WhatsApp message and sends it to TWILIO_WHATSAPP_TO in .env.
//
// Each repo object should have:
//   full_name, stars, description, why_interesting, url
//
// Returns whatever sendMessage returns:
//   { success: true, sid } or { success: false, error }
async function sendSummary(repos) {
  console.log(`[WhatsApp] Formatting summary for ${repos.length} repos...`);

  try {
    // ── Format today's date as "DD Mon YYYY" (e.g. "17 Mar 2026") ────────────
    const now = new Date();
    const day   = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('en-GB', { month: 'short' }); // "Mar"
    const year  = now.getFullYear();
    const dateStr = `${day} ${month} ${year}`;

    // ── Build the message header ──────────────────────────────────────────────
    let message = `🔥 *GitHub Trending — React & Node.js*\n`;
    message    += `📅 ${dateStr}\n`;

    // ── Append one block per repo ─────────────────────────────────────────────
    repos.forEach((repo, index) => {
      // Keep each repo block SHORT — just the essentials
      message += `*${index + 1}. ${repo.full_name}*\n`;
      message += `⭐ ${repo.stars || 'N/A'} stars\n`;

      // Truncate description to 80 chars max
      const desc = repo.description || 'No description';
      message += `${desc.length > 80 ? desc.slice(0, 80) + '...' : desc}\n`;

      message += `🔗 ${repo.url}\n\n`;
    });

   console.log(`[WhatsApp] Message length: ${message.length} chars (limit: 1600)`);

    // Safety check — if still too long, trim to first 5 repos
    if (message.length > 1550) {
      console.log('[WhatsApp] Message too long — trimming to first 4 repos');
      message = message.split('\n\n').slice(0, 9).join('\n\n');
    }


    // ── Send the single combined message ─────────────────────────────────────
    const result = await sendMessage(process.env.TWILIO_WHATSAPP_TO, message);
    return result;

  } catch (error) {
    console.error(`[WhatsApp] sendSummary failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

module.exports = { sendMessage, sendSummary };
