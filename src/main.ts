import {
  getBooleanInput,
  getInput,
  getMultilineInput,
  setFailed,
  warning
} from '@actions/core'
import {Bot} from './bot'
import {Options, ModelProvider} from './options'
import {Prompts} from './prompts'
import {codeReview} from './review'
import {handleReviewComment} from './review-comment'

function validateModelProvider(input: string): ModelProvider {
  if (input !== 'openai' && input !== 'anthropic') {
    throw new Error(
      `Invalid model_provider: ${input}. Must be either 'openai' or 'anthropic'.`
    )
  }
  return input
}

async function run(): Promise<void> {
  const options: Options = new Options(
    getBooleanInput('debug'),
    getBooleanInput('disable_review'),
    getBooleanInput('disable_release_notes'),
    getInput('max_files'),
    getBooleanInput('review_simple_changes'),
    getBooleanInput('less_verbose_review'),
    getBooleanInput('review_comment_lgtm'),
    getMultilineInput('path_filters'),
    getInput('system_message'),
    validateModelProvider(getInput('model_provider')),
    getInput('light_model') || getInput('openai_light_model'),
    getInput('heavy_model') || getInput('openai_heavy_model'),
    getInput('model_temperature'),
    getInput('model_retries'),
    getInput('model_timeout_ms'),
    getInput('model_concurrency_limit'),
    getInput('github_concurrency_limit'),
    getInput('model_base_url'),
    getInput('language')
  )

  // print options
  options.print()

  const prompts: Prompts = new Prompts(
    getInput('summarize'),
    getInput('summarize_release_notes'),
    getBooleanInput('poem_enabled'),
    getInput('poem')
  )

  // Create two bots, one for summary and one for review

  let lightBot: Bot | null = null
  try {
    lightBot = new Bot(options)
  } catch (e: any) {
    warning(
      `Skipped: failed to create summary bot, please check your model API key: ${e}, backtrace: ${e.stack}`
    )
    return
  }

  let heavyBot: Bot | null = null
  try {
    heavyBot = new Bot(options)
  } catch (e: any) {
    warning(
      `Skipped: failed to create review bot, please check your model API key: ${e}, backtrace: ${e.stack}`
    )
    return
  }

  try {
    // check if the event is pull_request
    if (
      process.env.GITHUB_EVENT_NAME === 'pull_request' ||
      process.env.GITHUB_EVENT_NAME === 'pull_request_target'
    ) {
      await codeReview(lightBot, heavyBot, options, prompts)
    } else if (
      process.env.GITHUB_EVENT_NAME === 'pull_request_review_comment'
    ) {
      await handleReviewComment(heavyBot, options, prompts)
    } else {
      warning('Skipped: this action only works on push events or pull_request')
    }
  } catch (e: any) {
    if (e instanceof Error) {
      setFailed(`Failed to run: ${e.message}, backtrace: ${e.stack}`)
    } else {
      setFailed(`Failed to run: ${e}, backtrace: ${e.stack}`)
    }
  }
}

process
  .on('unhandledRejection', (reason, p) => {
    warning(`Unhandled Rejection at Promise: ${reason}, promise is ${p}`)
  })
  .on('uncaughtException', (e: any) => {
    warning(`Uncaught Exception thrown: ${e}, backtrace: ${e.stack}`)
  })

// Start the application
void (async () => {
  try {
    await run()
  } catch (error) {
    setFailed(`Unhandled error: ${error}`)
    process.exit(1)
  }
})()
