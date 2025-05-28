import {info} from '@actions/core'
import {minimatch} from 'minimatch'
import {TokenLimits} from './limits'

export type ModelProvider = 'openai' | 'anthropic'

export interface ModelConfig {
  provider: ModelProvider
  lightModel: string
  heavyModel: string
  temperature?: number
  retries: number
  timeoutMS: number
  apiKey?: string
  apiBaseUrl?: string
}

export class Options {
  debug: boolean
  disableReview: boolean
  disableReleaseNotes: boolean
  maxFiles: number
  reviewSimpleChanges: boolean
  lessVerboseReview: boolean
  reviewCommentLGTM: boolean
  pathFilters: PathFilter
  systemMessage: string
  modelConfig: ModelConfig
  concurrencyLimits: {
    model: number
    github: number
  }
  lightTokenLimits: TokenLimits
  heavyTokenLimits: TokenLimits
  language: string

  constructor(
    debug: boolean,
    disableReview: boolean,
    disableReleaseNotes: boolean,
    maxFiles = '0',
    reviewSimpleChanges = false,
    lessVerboseReview = false,
    reviewCommentLGTM = false,
    pathFilters: string[] | null = null,
    systemMessage = '',
    provider: ModelProvider = 'openai',
    lightModel = 'gpt-4o-mini',
    heavyModel = 'gpt-4o',
    modelTemperature = '0.0',
    modelRetries = '3',
    modelTimeoutMS = '120000',
    modelConcurrencyLimit = '6',
    githubConcurrencyLimit = '6',
    apiBaseUrl?: string,
    language = 'en-US'
  ) {
    this.debug = debug
    this.disableReview = disableReview
    this.disableReleaseNotes = disableReleaseNotes
    this.maxFiles = parseInt(maxFiles)
    this.reviewSimpleChanges = reviewSimpleChanges
    this.lessVerboseReview = lessVerboseReview
    this.reviewCommentLGTM = reviewCommentLGTM
    this.pathFilters = new PathFilter(pathFilters)
    this.systemMessage = systemMessage
    this.modelConfig = {
      provider,
      lightModel,
      heavyModel,
      temperature: parseFloat(modelTemperature),
      retries: parseInt(modelRetries),
      timeoutMS: parseInt(modelTimeoutMS),
      apiBaseUrl
    }
    this.concurrencyLimits = {
      model: parseInt(modelConcurrencyLimit),
      github: parseInt(githubConcurrencyLimit)
    }
    this.lightTokenLimits = new TokenLimits(lightModel)
    this.heavyTokenLimits = new TokenLimits(heavyModel)
    this.language = language
  }

  // print all options using core.info
  print(): void {
    info(`debug: ${this.debug}`)
    info(`disable_review: ${this.disableReview}`)
    info(`disable_release_notes: ${this.disableReleaseNotes}`)
    info(`max_files: ${this.maxFiles}`)
    info(`review_simple_changes: ${this.reviewSimpleChanges}`)
    info(`less_verbose_review: ${this.lessVerboseReview}`)
    info(`review_comment_lgtm: ${this.reviewCommentLGTM}`)
    info(`path_filters: ${this.pathFilters}`)
    info(`system_message: ${this.systemMessage}`)
    info(`model_provider: ${this.modelConfig.provider}`)
    info(`light_model: ${this.modelConfig.lightModel}`)
    info(`heavy_model: ${this.modelConfig.heavyModel}`)
    info(`model_temperature: ${this.modelConfig.temperature}`)
    info(`model_retries: ${this.modelConfig.retries}`)
    info(`model_timeout_ms: ${this.modelConfig.timeoutMS}`)
    info(`model_concurrency_limit: ${this.concurrencyLimits.model}`)
    info(`github_concurrency_limit: ${this.concurrencyLimits.github}`)
    info(`summary_token_limits: ${this.lightTokenLimits.string()}`)
    info(`review_token_limits: ${this.heavyTokenLimits.string()}`)
    info(`api_base_url: ${this.modelConfig.apiBaseUrl}`)
    info(`language: ${this.language}`)
  }

  checkPath(path: string): boolean {
    const ok = this.pathFilters.check(path)
    info(`checking path: ${path} => ${ok}`)
    return ok
  }
}

export class PathFilter {
  private readonly rules: Array<[string /* rule */, boolean /* exclude */]>

  constructor(rules: string[] | null = null) {
    this.rules = []
    if (rules != null) {
      for (const rule of rules) {
        const trimmed = rule?.trim()
        if (trimmed) {
          if (trimmed.startsWith('!')) {
            this.rules.push([trimmed.substring(1).trim(), true])
          } else {
            this.rules.push([trimmed, false])
          }
        }
      }
    }
  }

  check(path: string): boolean {
    if (this.rules.length === 0) {
      return true
    }

    let included = false
    let excluded = false
    let inclusionRuleExists = false

    for (const [rule, exclude] of this.rules) {
      if (minimatch(path, rule)) {
        if (exclude) {
          excluded = true
        } else {
          included = true
        }
      }
      if (!exclude) {
        inclusionRuleExists = true
      }
    }

    return (!inclusionRuleExists || included) && !excluded
  }
}
