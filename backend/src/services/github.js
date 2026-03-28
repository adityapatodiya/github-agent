// services/github.js
require('dotenv').config(); // ← ADD THIS FIRST LINE

const axios = require('axios');

function getSevenDaysAgo() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().split('T')[0];
}

function githubHeaders() {
  return {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  };
}

async function searchRepos(topic) {
  console.log(`[GitHub] searchRepos called with topic: "${topic}"`);

  const since = getSevenDaysAgo();
  const query = `topic:${topic} created:>${since} stars:>=100`;
  console.log(`[GitHub] Search query: ${query}`);

  try {
    const response = await axios.get('https://api.github.com/search/repositories', {
      params: {
        q: query,
        sort: 'stars',
        order: 'desc',
        per_page: 10,
      },
      headers: githubHeaders(),
    });

    const items = response.data.items;
    console.log(`[GitHub] Total results: ${response.data.total_count}, returning top ${items.length}`);

    return items.map((repo) => ({
      name: repo.name,
      owner: repo.owner.login,
      full_name: repo.full_name,
      description: repo.description,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      language: repo.language,
      url: repo.html_url,
      created_at: repo.created_at,
    }));
  } catch (error) {
    if (error.response?.status === 403) {
      console.error('GitHub rate limit hit — check your GITHUB_TOKEN');
    }
    console.error(`[GitHub] searchRepos failed: ${error.message}`);
    throw error;
  }
}

async function fetchReadme(owner, repo) {
  console.log(`[GitHub] fetchReadme called for ${owner}/${repo}`);

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/readme`,
      {
        headers: {
          ...githubHeaders(),
          Accept: 'application/vnd.github.v3.raw',
        },
      }
    );

    const readme = String(response.data).substring(0, 3000);
    console.log(`[GitHub] README fetched: ${readme.length} characters`);
    return readme;
  } catch (error) {
    console.warn(`[GitHub] Could not fetch README for ${owner}/${repo}: ${error.message}`);
    return 'README not available for this repository.';
  }
}

async function fetchRepoStats(owner, repo) {
  console.log(`[GitHub] fetchRepoStats called for ${owner}/${repo}`);

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers: githubHeaders() }
    );

    const d = response.data;
    console.log(`[GitHub] Stats fetched: ⭐ ${d.stargazers_count} stars, 🍴 ${d.forks_count} forks`);

    return {
      name: d.name,
      owner: d.owner.login,
      full_name: d.full_name,
      description: d.description,
      stars: d.stargazers_count,
      forks: d.forks_count,
      watchers: d.watchers_count,
      open_issues: d.open_issues_count,
      language: d.language,
      topics: d.topics,
      url: d.html_url,
      created_at: d.created_at,
      updated_at: d.updated_at,
      license: d.license ? d.license.name : null,
    };
  } catch (error) {
    console.error(`[GitHub] fetchRepoStats failed for ${owner}/${repo}: ${error.message}`);
    throw error;
  }
}

module.exports = { searchRepos, fetchReadme, fetchRepoStats };

// ─── Self test ────────────────────────────────────────────────────────────────
if (require.main === module) {
  async function test() {
    console.log('Testing github.js...\n');
    try {
      const repos = await searchRepos('react');
      console.log('First repo found:');
      console.log(repos[0]);
    } catch (err) {
      console.error('Test failed:', err.message);
    }
  }
  test();
}
