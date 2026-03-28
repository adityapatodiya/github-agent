// agent/handlers.js
// The "tool dispatcher" — called by loop.js whenever Claude asks to run a tool.
//
// Claude returns a tool name (e.g. "search_repos") and an input object.
// This file maps that tool name to the real GitHub service function and
// returns the result back so loop.js can forward it to Claude.

const github = require('../services/github');

// Executes the tool Claude requested and returns the result.
//   toolName  – one of: "search_repos", "fetch_readme", "fetch_repo_stats"
//   toolInput – the argument object Claude provided (matches each tool's input_schema)
async function executeTool(toolName, toolInput) {
  console.log(`[Handler] Executing tool: "${toolName}"`);
  console.log(`[Handler] Input: ${JSON.stringify(toolInput)}`);

  try {
    let result;

    if (toolName === 'search_repos') {
      // toolInput.topic is the search keyword, e.g. "react"
      result = await github.searchRepos(toolInput.topic);

    } else if (toolName === 'fetch_readme') {
      // toolInput.owner and toolInput.repo identify the repository
      result = await github.fetchReadme(toolInput.owner, toolInput.repo);

    } else if (toolName === 'fetch_repo_stats') {
      result = await github.fetchRepoStats(toolInput.owner, toolInput.repo);

    } else {
      // Claude somehow called a tool that doesn't exist – shouldn't happen,
      // but we return an error string rather than crashing so Claude can recover.
      console.warn(`[Handler] Unknown tool requested: "${toolName}"`);
      return `Error: Unknown tool "${toolName}". Available tools are: search_repos, fetch_readme, fetch_repo_stats.`;
    }

    console.log(`[Handler] Tool "${toolName}" completed successfully`);
    return result;

  } catch (error) {
    // Return the error as a string rather than throwing, so Claude
    // can see what went wrong and decide how to proceed.
    console.error(`[Handler] Tool "${toolName}" failed: ${error.message}`);
    return `Error executing ${toolName}: ${error.message}`;
  }
}

module.exports = { executeTool };
