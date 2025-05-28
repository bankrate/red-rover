#!/usr/bin/env node

// Helper script to fetch real PR data for testing
const https = require('https');

function fetchPRData(owner, repo, prNumber, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${owner}/${repo}/pulls/${prNumber}`,
      method: 'GET',
      headers: {
        'User-Agent': 'RedRover-Test',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${token}`
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to fetch PR: ${res.statusCode} ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  const repo = process.env.TEST_GITHUB_REPOSITORY;
  const prNumber = process.env.TEST_GITHUB_PR_NUMBER;
  const token = process.env.GITHUB_TOKEN;

  if (!repo || !prNumber || !token) {
    console.error('Missing required environment variables');
    process.exit(1);
  }

  const [owner, repoName] = repo.split('/');
  
  try {
    const prData = await fetchPRData(owner, repoName, prNumber, token);
    
    // Create minimal event payload with real data
    const event = {
      action: 'opened',
      pull_request: {
        number: prData.number,
        title: prData.title,
        body: prData.body,
        state: prData.state,
        base: {
          sha: prData.base.sha,
          ref: prData.base.ref
        },
        head: {
          sha: prData.head.sha,
          ref: prData.head.ref
        },
        user: {
          login: prData.user.login
        }
      },
      repository: {
        name: repoName,
        owner: {
          login: owner
        },
        default_branch: prData.base.repo.default_branch
      }
    };
    
    console.log(JSON.stringify(event, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}