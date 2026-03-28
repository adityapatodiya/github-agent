// agent/tools.js
// Defines the three tools that Claude AI is allowed to call during the agent loop.
//
// This file only DESCRIBES the tools — it contains no API call logic.
// Actual implementation is in handlers.js (which calls github.js).
//
// When Claude decides to call a tool it returns a "tool_use" content block
// containing the tool name and the arguments it chose.
// loop.js reads that block, passes it to handlers.js, and sends the result back.
//
// The format every tool definition must follow (Anthropic API requirement):
//   name         – the identifier Claude uses when calling the tool
//   description  – plain English instruction to Claude on when/why to use it
//   input_schema – JSON Schema object describing the accepted parameters

// No require() needed here — this file only exports static data.

const TOOLS = [
  // ── Tool 1: search_repos ───────────────────────────────────────────────────
  // Claude calls this FIRST to discover what repos are currently trending.
  // Without this tool the agent would have no repos to evaluate — it's the
  // starting point of every run. Claude should call it multiple times with
  // different topics (e.g. "react", "nodejs", "nextjs", "expressjs") to cast
  // a wide net before deciding which repos to dig into further.
  {
    name: 'search_repos',
    description:
      'Search GitHub for trending React or Node.js repositories created ' +
      'in the last 7 days with 100+ stars. Use this first to discover repos. ' +
      'Try topics: react, nodejs, nextjs, expressjs',
    input_schema: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          description: 'github topic to search e.g. react, nodejs, nextjs',
        },
      },
      required: ['topic'],
    },
  },

  // ── Tool 2: fetch_readme ───────────────────────────────────────────────────
  // Search results only give Claude a one-line description — not enough to judge
  // quality. This tool lets Claude read the full README so it can understand
  // *what the project actually does* before deciding whether to recommend it.
  // Claude should call this for the most promising repos from the search results.
  {
    name: 'fetch_readme',
    description:
      'Fetch the README of a specific GitHub repository to understand ' +
      'what it does in detail. Use this for repos that look promising from search results.',
    input_schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'repository owner username e.g. facebook',
        },
        repo: {
          type: 'string',
          description: 'repository name e.g. react',
        },
      },
      required: ['owner', 'repo'],
    },
  },

  // ── Tool 3: fetch_repo_stats ──────────────────────────────────────────────
  // A repo might have a great README but zero recent activity — or could be a
  // one-day spike with no sustained interest. This tool gives Claude hard numbers
  // (stars, forks, open issues, last-update date) to verify the repo is genuinely
  // trending and actively maintained before it makes a final recommendation.
  {
    name: 'fetch_repo_stats',
    description:
      'Get detailed statistics for a repository including stars, forks, ' +
      'issues, last update date. Use this to verify a repo is actively maintained.',
    input_schema: {
      type: 'object',
      properties: {
        owner: {
          type: 'string',
          description: 'repository owner username',
        },
        repo: {
          type: 'string',
          description: 'repository name',
        },
      },
      required: ['owner', 'repo'],
    },
  },
];

module.exports = { TOOLS };
