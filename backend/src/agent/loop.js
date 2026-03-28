// agent/loop.js
// The heart of the agent — the "agentic loop".
//
// HOW IT WORKS (at a high level):
//   1. We give Claude a system prompt and an initial user message.
//   2. Claude reads the available tools and decides which one to call first.
//   3. We execute that tool and send the result back to Claude.
//   4. Claude decides its next action — maybe call another tool, or wrap up.
//   5. We keep looping until Claude stops requesting tools (stop_reason = "end_turn").
//   6. Claude's final text response contains a structured list of the best repos.
//   7. We parse that list and send one WhatsApp message per repo.
//
// The `emit` function passed in lets us push live status events to the frontend
// via SSE (Server-Sent Events) managed in index.js.
require('dotenv').config();

const Anthropic = require('@anthropic-ai/sdk');
const { TOOLS } = require('./tools');
const { executeTool } = require('./handlers');
const { sendMessage, sendSummary } = require('../services/whatsapp');

// ─── Main exported function ───────────────────────────────────────────────────

// emit(data) is a callback that sends a live event to the React frontend.
// data is always a plain object like: { type: 'log', message: '...' }
async function runAgentLoop(emit) {
  console.log('[Loop] ===== Agent loop starting =====');
  emit({ type: 'log', message: '🚀 Agent started! Connecting to Claude...' });

  // Initialise the Anthropic SDK – it automatically reads ANTHROPIC_API_KEY from .env
  const client = new Anthropic();

  // ── System prompt ──────────────────────────────────────────────────────────
  // This is the "personality" and high-level instruction set we give Claude.
  // Claude will follow these instructions throughout the entire conversation.
  const systemPrompt = `You are an expert GitHub repository researcher. Your mission:

1. Search for TRENDING React.js and Node.js repositories created in the LAST 7 DAYS with 100+ stars.
   - Search for "react" AND "nodejs" separately using the search_repos tool.
2. For the most interesting repos, use fetch_readme and fetch_repo_stats to understand them deeply.
3. Select the BEST 5 to 7 repositories based on: novelty, usefulness, star count, and quality.
4. End with a structured summary. For EACH chosen repo use EXACTLY this format (one per block):

REPO: <owner/reponame>
URL: <full github url>
STARS: <number>
DESCRIPTION: <one or two sentence plain-English description of what it does>
WHY_INTERESTING: <one sentence on why developers should care about this>
---

Do not include any extra text after the last --- separator.`;

  // ── Initial conversation message ───────────────────────────────────────────
  // We keep the full message history in this array.
  // Claude needs the entire history on every request to maintain context.
  const messages = [
    {
      role: 'user',
      content:
        'Please research trending React.js and Node.js repositories from the last 7 days ' +
        'and give me the best 5–7 repos with full summaries. Use your tools to search and ' +
        'deeply investigate before making your final selection.',
    },
  ];

  let finalText = ''; // Will hold Claude's last text block when it finishes

  // ── The loop ───────────────────────────────────────────────────────────────
  // We cap at 20 iterations as a safety net – Claude should finish well before that.
  const MAX_ITERATIONS = 20;
  let iteration = 0;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`[Loop] ── Iteration ${iteration} – calling Claude ──`);
    emit({ type: 'log', message: `🧠 Asking Claude what to do next... (step ${iteration})` });

    // Call Claude with the current message history and available tools
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,       // The tool definitions from tools.js
      messages: messages, // The full conversation history
    });

    console.log(`[Loop] Claude responded — stop_reason: "${response.stop_reason}"`);
    emit({
      type: 'log',
      message: `💬 Claude responded (reason: ${response.stop_reason})`,
    });

    // Add Claude's full response to the history so the next call has context
    messages.push({ role: 'assistant', content: response.content });

    // ── Case 1: Claude is done — no more tool calls ────────────────────────
    if (response.stop_reason === 'end_turn') {
      console.log('[Loop] Claude has finished (end_turn). Extracting final text...');
      emit({ type: 'log', message: '✅ Claude has finished researching!' });

      // Pull out all the text blocks from the final response
      for (const block of response.content) {
        if (block.type === 'text') {
          finalText += block.text;
        }
      }
      break; // Exit the while loop
    }

    // ── Case 2: Claude wants to call one or more tools ─────────────────────
    if (response.stop_reason === 'tool_use') {
      const toolResults = []; // We'll collect results for all tool calls in this turn

      for (const block of response.content) {

        // Log any text Claude wrote alongside its tool call (e.g. "Let me search...")
        if (block.type === 'text' && block.text.trim()) {
          console.log(`[Loop] Claude says: ${block.text.trim().substring(0, 120)}`);
          emit({ type: 'log', message: `💭 Claude: ${block.text.trim()}` });
        }

        // Process each tool_use block
        if (block.type === 'tool_use') {
          console.log(`[Loop] Claude is calling tool: "${block.name}" with input: ${JSON.stringify(block.input)}`);
          emit({
            type: 'tool_call',
            tool: block.name,
            input: block.input,
            message: `🔧 Calling tool: ${block.name}(${JSON.stringify(block.input)})`,
          });

          // Run the actual tool (GitHub API call via handlers.js)
          const result = await executeTool(block.name, block.input);

          console.log(`[Loop] Tool "${block.name}" returned a result`);
          emit({
            type: 'tool_result',
            tool: block.name,
            message: `✔️ Tool ${block.name} completed`,
          });

          // Package the result in the format Claude expects
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,           // Must match the id Claude sent in the tool_use block
            content: JSON.stringify(result), // Must be a string
          });
        }
      }

      // Send ALL tool results back to Claude in the next turn
      // (Anthropic requires all tool results in a single "user" message)
      messages.push({ role: 'user', content: toolResults });
    }
  }

  // ── Parse repos from Claude's final text ──────────────────────────────────
  console.log('[Loop] Parsing structured repo list from Claude\'s final response...');
  emit({ type: 'log', message: '📋 Parsing repo summaries...' });

  const repos = parseFinalRepos(finalText);
  console.log(`[Loop] Parsed ${repos.length} repos from final response`);
  emit({ type: 'log', message: `Found ${repos.length} repos! Sending WhatsApp messages...` });

  // ── Send WhatsApp messages ─────────────────────────────────────────────────
  const whatsappTo = process.env.TWILIO_WHATSAPP_TO;

  for (const repo of repos) {
  emit({ type: 'result', repo });
}

// ── Send ONE combined WhatsApp message with all repos ─────────────────────
try {
  emit({ type: 'log', message: '📱 Sending WhatsApp summary...' });
  const whatsappResult = await sendSummary(repos);

  if (whatsappResult.success) {
    console.log(`[Loop] WhatsApp summary sent successfully`);
    emit({ type: 'log', message: '📱 WhatsApp message sent successfully!' });
  } else {
    console.error(`[Loop] WhatsApp failed: ${whatsappResult.error}`);
    emit({ type: 'log', message: `⚠️ WhatsApp failed: ${whatsappResult.error}` });
  }
} catch (whatsappError) {
  console.error(`[Loop] WhatsApp error: ${whatsappError.message}`);
  emit({ type: 'log', message: `⚠️ WhatsApp error: ${whatsappError.message}` });
}

  // ── All done ───────────────────────────────────────────────────────────────
  emit({
    type: 'done',
    message: `🎉 Agent complete! Found ${repos.length} trending repos. Check your WhatsApp!`,
    repos,
  });
  console.log('[Loop] ===== Agent loop complete =====');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Parses the structured repo summaries from Claude's final text response.
// Claude is instructed to output blocks in this format:
//
//   REPO: owner/reponame
//   URL: https://github.com/...
//   STARS: 1234
//   DESCRIPTION: What it does.
//   WHY_INTERESTING: Why devs care.
//   ---
//
// We split on "---" and extract each field with a simple regex.
function parseFinalRepos(text) {
  console.log('[Loop] parseFinalRepos called, text length:', text.length);
  const repos = [];

  // Split the text into blocks (each block is one repo)
  const blocks = text.split('---');

  for (const block of blocks) {
    // Skip blocks that don't look like a repo entry
    if (!block.includes('REPO:')) continue;

    const repo = {};

    // Use regex to extract each labelled field
    const repoMatch        = block.match(/REPO:\s*(.+)/);
    const urlMatch         = block.match(/URL:\s*(.+)/);
    const starsMatch       = block.match(/STARS:\s*(\d[\d,]*)/);
    const descMatch        = block.match(/DESCRIPTION:\s*(.+)/);
    const whyMatch         = block.match(/WHY_INTERESTING:\s*(.+)/);

    if (repoMatch)   repo.full_name       = repoMatch[1].trim();
    if (urlMatch)    repo.url             = urlMatch[1].trim();
    if (starsMatch)  repo.stars           = parseInt(starsMatch[1].replace(/,/g, ''));
    if (descMatch)   repo.description     = descMatch[1].trim();
    if (whyMatch)    repo.why_interesting = whyMatch[1].trim();

    // Only add if we at least have the name and URL
    if (repo.full_name && repo.url) {
      repos.push(repo);
      console.log(`[Loop] Parsed repo: ${repo.full_name}`);
    }
  }

  console.log(`[Loop] Total repos parsed: ${repos.length}`);
  return repos;
}

module.exports = { runAgentLoop };
