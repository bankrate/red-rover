import './fetch-polyfill'

import {info, warning} from '@actions/core'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type {ChatCompletionMessageParam} from 'openai/resources/chat/completions'
import pRetry from 'p-retry'
import {Options} from './options'

interface ModelClient {
  chat(
    // eslint-disable-next-line no-unused-vars
    message: string,
    // eslint-disable-next-line no-unused-vars
    ids: Ids,
    // eslint-disable-next-line no-unused-vars
    useHeavyModel?: boolean
  ): Promise<[string, Ids]>
}

class OpenAIClient implements ModelClient {
  private readonly api: OpenAI
  private readonly options: Options

  private isThinkingModel(model: string): boolean {
    // Match OpenAI thinking models: o1, o1-preview, o1-mini, o3, o3-mini, o4, o4-mini, etc.
    return /^o[0-9]+(-preview|-mini)?$/i.test(model)
  }

  constructor(options: Options) {
    this.options = options
    this.api = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_API_ORG,
      baseURL: options.modelConfig.apiBaseUrl || 'https://api.openai.com/v1',
      maxRetries: options.modelConfig.retries,
      timeout: options.modelConfig.timeoutMS
    })
  }

  async chat(
    message: string,
    ids: Ids,
    useHeavyModel = false
  ): Promise<[string, Ids]> {
    if (!message) return ['', {}]

    const model = useHeavyModel
      ? this.options.modelConfig.heavyModel
      : this.options.modelConfig.lightModel
    const tokenLimit = useHeavyModel
      ? this.options.heavyTokenLimits.responseTokens
      : this.options.lightTokenLimits.responseTokens
    const messages: Array<ChatCompletionMessageParam> = []

    // OpenAI thinking models (o1, o3, etc.) don't support system messages
    if (!this.isThinkingModel(model)) {
      messages.push({
        role: 'system',
        content: this.options.systemMessage
      })
    }

    if (ids.parentMessageId && ids.content) {
      messages.push({
        role: 'assistant',
        content: ids.content
      })
    }

    messages.push({
      role: 'user',
      content: message
    })

    try {
      const response = await pRetry(
        async () => {
          const params: any = {
            model,
            messages
          }

          // Configure parameters based on model type
          if (this.isThinkingModel(model)) {
            // Thinking models use max_completion_tokens instead of max_tokens
            // eslint-disable-next-line camelcase
            params.max_completion_tokens = tokenLimit
          } else {
            // Standard models use max_tokens and temperature
            // eslint-disable-next-line camelcase
            params.max_tokens = tokenLimit
            params.temperature = this.options.modelConfig.temperature
          }

          const completion = await this.api.chat.completions.create(params)
          return completion
        },
        {retries: this.options.modelConfig.retries}
      )

      const content = response.choices[0]?.message?.content || ''
      const cleanedContent = content.startsWith('with ')
        ? content.substring(5)
        : content

      return [
        cleanedContent,
        {
          parentMessageId: response.id,
          conversationId: undefined,
          content: cleanedContent
        }
      ]
    } catch (e: unknown) {
      if (e instanceof OpenAI.APIError) {
        warning(`Failed to send message to OpenAI: ${e}, backtrace: ${e.stack}`)
      } else {
        warning(`Unexpected error while sending message to OpenAI: ${e}`)
      }
      return ['', {}]
    }
  }
}

class AnthropicClient implements ModelClient {
  private readonly client: Anthropic
  private readonly options: Options

  constructor(options: Options) {
    this.options = options
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    })
  }

  async chat(
    message: string,
    ids: Ids,
    useHeavyModel = false
  ): Promise<[string, Ids]> {
    if (!message) return ['', {}]

    const model = useHeavyModel
      ? this.options.modelConfig.heavyModel
      : this.options.modelConfig.lightModel
    const tokenLimit = useHeavyModel
      ? this.options.heavyTokenLimits.responseTokens
      : this.options.lightTokenLimits.responseTokens

    try {
      const params: Anthropic.MessageCreateParams = {
        model,
        // eslint-disable-next-line camelcase
        max_tokens: tokenLimit,
        system: this.options.systemMessage,
        messages: [
          {
            role: 'user',
            content: message
          },
          ...(ids.content
            ? [
                {
                  role: 'assistant',
                  content: ids.content
                } as const
              ]
            : [])
        ]
      }

      const response = await pRetry(() => this.client.messages.create(params), {
        retries: this.options.modelConfig.retries
      })

      let responseText = ''
      if (response.content && Array.isArray(response.content)) {
        const textContent = response.content.find(item => item.type === 'text')
        if (textContent && 'text' in textContent) {
          responseText = textContent.text.trim()
        }
      }
      
      if (this.options.debug) {
        if (responseText === '') {
          info(`Anthropic returned empty response for model ${model}`)
          info(`Full response structure: ${JSON.stringify(response.content)}`)
        } else {
          info(`Anthropic response length: ${responseText.length} characters`)
        }
      }

      return [
        responseText,
        {
          parentMessageId: response.id,
          content: responseText
        }
      ]
    } catch (e: unknown) {
      warning(`Failed to send message to Anthropic: ${e}`)
      return ['', {}]
    }
  }
}

// define type to save parentMessageId and conversationId
export interface Ids {
  parentMessageId?: string
  conversationId?: string
  content?: string
}

export class Bot {
  private readonly client: ModelClient
  private readonly options: Options

  constructor(options: Options) {
    this.options = options

    switch (options.modelConfig.provider) {
      case 'openai':
        if (!process.env.OPENAI_API_KEY) {
          throw new Error(
            'OPENAI_API_KEY environment variable is not available'
          )
        }
        this.client = new OpenAIClient(options)
        break

      case 'anthropic':
        if (!process.env.ANTHROPIC_API_KEY) {
          throw new Error(
            'ANTHROPIC_API_KEY environment variable is not available'
          )
        }
        this.client = new AnthropicClient(options)
        break

      default:
        throw new Error(
          `Unsupported model provider: ${options.modelConfig.provider}`
        )
    }
  }

  chat = async (
    message: string,
    ids: Ids,
    useHeavyModel = false
  ): Promise<[string, Ids]> => {
    if (!message) {
      return ['', {}]
    }

    const start = Date.now()
    const result = await this.client.chat(message, ids, useHeavyModel)
    const end = Date.now()

    if (this.options.debug) {
      info(`Model response time: ${end - start} ms`)
    }

    return result
  }
}
