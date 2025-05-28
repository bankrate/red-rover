# Testing with Real Pull Requests

The test suite supports testing against real GitHub pull requests for more realistic testing scenarios.

## Configuration

Set these environment variables before running tests:

```bash
# Required: The repository to test against
export TEST_GITHUB_REPOSITORY="owner/repo"

# Required: The PR number to test
export TEST_GITHUB_PR_NUMBER="123"

# Optional: Enable actual review comments (DANGEROUS - defaults to disabled)
# export TEST_ENABLE_REVIEW="false"  # Keep this false unless you want real comments!

# Required: GitHub token with repo access
export GITHUB_TOKEN="your-github-token"

# Required: API key for your chosen provider
export OPENAI_API_KEY="your-openai-key"
# or
export ANTHROPIC_API_KEY="your-anthropic-key"

# Optional: Override default models (defaults shown)
export TEST_MODEL_PROVIDER="openai"       # or "anthropic"
export TEST_LIGHT_MODEL="gpt-4.1-mini"    # or "claude-3-5-haiku-20241022"
export TEST_HEAVY_MODEL="gpt-4.1"         # or "o4-mini", "claude-sonnet-4-20250514"
```

## Safety Features

1. **Reviews are disabled by default** - The test sets `INPUT_DISABLE_REVIEW=true` unless you explicitly set `TEST_ENABLE_REVIEW=false`
2. **Only reads PR data** - With reviews disabled, the action only reads PR information and generates summaries
3. **Clear test indication** - Any comments posted (if reviews are enabled) come from your test environment

## Example Usage

### Safe Testing (Recommended)
```bash
# Test with a real PR but don't post any comments
export TEST_GITHUB_REPOSITORY="octocat/hello-world"
export TEST_GITHUB_PR_NUMBER="1"
export GITHUB_TOKEN="ghp_..."
export OPENAI_API_KEY="sk-..."
npm test
```

### Testing with Reviews (Use Caution!)
```bash
# This will post actual review comments to the PR!
export TEST_GITHUB_REPOSITORY="your-test-repo/test-project"
export TEST_GITHUB_PR_NUMBER="42"
export TEST_ENABLE_REVIEW="false"  # This enables reviews!
export GITHUB_TOKEN="ghp_..."
export OPENAI_API_KEY="sk-..."
npm test
```

### Testing with Different Models
```bash
# Test with OpenAI o4-mini thinking model
export TEST_GITHUB_REPOSITORY="octocat/hello-world"
export TEST_GITHUB_PR_NUMBER="1"
export TEST_HEAVY_MODEL="o4-mini"
export GITHUB_TOKEN="ghp_..."
export OPENAI_API_KEY="sk-..."
npm test

# Test with Anthropic Claude
export TEST_GITHUB_REPOSITORY="octocat/hello-world"
export TEST_GITHUB_PR_NUMBER="1"
export TEST_MODEL_PROVIDER="anthropic"
export TEST_LIGHT_MODEL="claude-3-5-haiku-20241022"
export TEST_HEAVY_MODEL="claude-3-5-sonnet-20241022"
export GITHUB_TOKEN="ghp_..."
export ANTHROPIC_API_KEY="sk-ant-..."
npm test
```

## What Happens During Testing

1. The test creates a dynamic event payload with your specified repository and PR
2. The action fetches real PR data from GitHub
3. It processes the PR with the AI model
4. With reviews disabled (default), it only logs what it would do
5. With reviews enabled, it posts actual comments to the PR

## Choosing a Test PR

Good test PRs:
- Your own test repositories
- Closed/merged PRs (still readable but less risk)
- Small PRs with few changes
- PRs in repositories where you have permission to comment

Avoid testing on:
- Active PRs in important projects
- PRs you don't have permission to access
- Very large PRs (may hit token limits)

## Debugging

Set `INPUT_DEBUG=true` in the test file to see detailed logs:

```typescript
process.env['INPUT_DEBUG'] = 'true'
```