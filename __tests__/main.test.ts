import {expect, test} from '@jest/globals'
import * as cp from 'child_process'
import * as path from 'path'
import * as process from 'process'
import * as fs from 'fs'

test('test runs', () => {
  // Test PR configuration - set these environment variables to test with a real PR:
  // TEST_GITHUB_REPOSITORY - e.g., 'owner/repo'
  // TEST_GITHUB_PR_NUMBER - e.g., '123'
  const testRepo =
    process.env['TEST_GITHUB_REPOSITORY'] ||
    'test-owner-fake-do-not-use/test-repo-fake'
  const testPRNumber = parseInt(process.env['TEST_GITHUB_PR_NUMBER'] || '1')
  const [repoOwner, repoName] = testRepo.split('/')
  const isRealRepo = testRepo !== 'test-owner-fake-do-not-use/test-repo-fake'
  const hasRealGitHubToken =
    !!process.env['GITHUB_TOKEN'] &&
    process.env['GITHUB_TOKEN'] !== 'test-token'

  // Create dynamic test event JSON
  let testEvent: any

  if (isRealRepo && hasRealGitHubToken) {
    // For real repos, fetch actual PR data
    console.log(`Fetching real PR data for ${testRepo}#${testPRNumber}...`)
    try {
      const fetchScript = path.join(__dirname, 'fetch-pr-data.js')
      const eventJson = cp
        .execFileSync(process.execPath, [fetchScript], {
          env: {
            ...process.env,
            TEST_GITHUB_REPOSITORY: testRepo,
            TEST_GITHUB_PR_NUMBER: testPRNumber.toString(),
            GITHUB_TOKEN: process.env.GITHUB_TOKEN
          }
        })
        .toString()
      testEvent = JSON.parse(eventJson)
      console.log(
        `Fetched PR data: base=${testEvent.pull_request.base.sha}, head=${testEvent.pull_request.head.sha}`
      )
    } catch (error: any) {
      console.error('Failed to fetch PR data:', error.message)
      // Fallback to dummy data
      testEvent = {
        action: 'opened',
        pull_request: {
          number: testPRNumber,
          base: {sha: 'dummy'},
          head: {sha: 'dummy'}
        },
        repository: {
          name: repoName,
          owner: {login: repoOwner}
        }
      }
    }
  } else {
    // For fake repos, use fake data
    testEvent = {
      action: 'opened',
      pull_request: {
        number: testPRNumber,
        title: 'Test PR',
        body: 'Test description for automated testing',
        state: 'open',
        base: {
          sha: 'abc123',
          ref: 'main'
        },
        head: {
          sha: 'def456',
          ref: 'test-branch'
        },
        user: {
          login: 'test-user'
        }
      },
      repository: {
        name: repoName,
        owner: {
          login: repoOwner
        },
        default_branch: 'main'
      }
    }
  }

  const testEventPath = path.join(__dirname, 'test-event-dynamic.json')
  fs.writeFileSync(testEventPath, JSON.stringify(testEvent, null, 2))
  // Save original env vars
  const originalOpenAIKey = process.env['OPENAI_API_KEY']
  const originalAnthropicKey = process.env['ANTHROPIC_API_KEY']

  // Set required GitHub Actions environment variables
  // Using a clearly fake repository to ensure no real GitHub operations occur
  process.env['GITHUB_ACTION'] = 'test'
  process.env['GITHUB_ACTIONS'] = 'true'
  process.env['GITHUB_TOKEN'] = process.env['GITHUB_TOKEN'] || 'test-token'
  process.env['GITHUB_REPOSITORY'] = testRepo
  process.env['GITHUB_EVENT_NAME'] = 'pull_request'
  process.env['GITHUB_EVENT_PATH'] = testEventPath
  // Set all required inputs
  process.env['INPUT_DEBUG'] = 'false'
  // Safety: Always disable actual reviews in tests unless explicitly enabled
  process.env['INPUT_DISABLE_REVIEW'] =
    process.env['TEST_ENABLE_REVIEW'] || 'true'
  process.env['INPUT_DISABLE_RELEASE_NOTES'] = 'false'
  process.env['INPUT_MAX_FILES'] = '150'
  process.env['INPUT_REVIEW_SIMPLE_CHANGES'] = 'false'
  process.env['INPUT_LESS_VERBOSE_REVIEW'] = 'false'
  process.env['INPUT_REVIEW_COMMENT_LGTM'] = 'false'
  process.env['INPUT_PATH_FILTERS'] = '!dist/**'
  process.env['INPUT_SYSTEM_MESSAGE'] = ''
  process.env['INPUT_MODEL_PROVIDER'] = process.env['TEST_MODEL_PROVIDER'] || 'openai'
  process.env['INPUT_LIGHT_MODEL'] = process.env['TEST_LIGHT_MODEL'] || 'gpt-4.1-mini'
  process.env['INPUT_HEAVY_MODEL'] = process.env['TEST_HEAVY_MODEL'] || 'gpt-4.1'
  process.env['INPUT_MODEL_TEMPERATURE'] = '0.05'
  process.env['INPUT_MODEL_RETRIES'] = '3'
  process.env['INPUT_MODEL_TIMEOUT_MS'] = '120000'
  process.env['INPUT_MODEL_CONCURRENCY_LIMIT'] = '6'
  process.env['INPUT_GITHUB_CONCURRENCY_LIMIT'] = '6'
  process.env['INPUT_MODEL_BASE_URL'] = ''
  process.env['INPUT_LANGUAGE'] = 'en-US'
  process.env['INPUT_POEM_ENABLED'] = 'false'
  process.env['INPUT_SUMMARIZE'] = ''
  process.env['INPUT_SUMMARIZE_RELEASE_NOTES'] = ''
  process.env['INPUT_POEM'] = ''

  const np = process.execPath
  const ip = path.join(__dirname, '..', 'lib', 'main.js')
  const options: cp.ExecFileSyncOptions = {
    env: process.env
  }

  // This will either succeed with real API keys or fail with expected errors
  const hasRealOpenAIKey = !!originalOpenAIKey
  const hasRealAnthropicKey = !!originalAnthropicKey

  console.log('Test configuration:', {
    repo: testRepo,
    prNumber: testPRNumber,
    hasRealOpenAIKey,
    hasRealGitHubToken,
    isRealRepo
  })

  try {
    const output = cp.execFileSync(np, [ip], options).toString()
    console.log('Output:', output)

    // If we get here, it means the app started successfully
    if (
      (hasRealOpenAIKey || hasRealAnthropicKey) &&
      hasRealGitHubToken &&
      isRealRepo
    ) {
      // With real credentials and real repo, expect some activity
      // Note: Set INPUT_DISABLE_REVIEW=true to avoid making actual review comments
      expect(output).toMatch(/Skipped|review|summary|comment|processed/i)
    }
  } catch (error: any) {
    // The error might be in stdout or stderr
    const errorOutput =
      error.stdout?.toString() || error.stderr?.toString() || error.message
    console.log('Error output:', errorOutput)

    if (!hasRealOpenAIKey && !hasRealAnthropicKey) {
      // Without API keys, expect it to fail asking for keys
      expect(errorOutput).toMatch(/OPENAI_API_KEY|ANTHROPIC_API_KEY/i)
    } else if (!hasRealGitHubToken) {
      // With API keys but fake GitHub token, expect bad credentials
      expect(errorOutput).toMatch(/Bad credentials|Unauthorized/i)
    } else if (!isRealRepo) {
      // With credentials but fake repo, expect 404 or bad credentials
      expect(errorOutput).toMatch(/Bad credentials|Not Found|404|Skipped/i)
    } else {
      // With real credentials and real repo, various outcomes possible
      expect(errorOutput).toMatch(
        /Skipped|processed|review|rate limit|permissions|403|404/i
      )
    }
  }

  // Cleanup
  if (fs.existsSync(testEventPath)) {
    fs.unlinkSync(testEventPath)
  }

  // Restore original env vars
  if (originalOpenAIKey) process.env['OPENAI_API_KEY'] = originalOpenAIKey
  else delete process.env['OPENAI_API_KEY']
  if (originalAnthropicKey)
    process.env['ANTHROPIC_API_KEY'] = originalAnthropicKey
  else delete process.env['ANTHROPIC_API_KEY']
})
