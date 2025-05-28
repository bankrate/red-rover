export class TokenLimits {
  maxTokens: number
  requestTokens: number
  responseTokens: number
  knowledgeCutOff: string

  constructor(model = 'gpt-4o-mini') {
    this.knowledgeCutOff = '2021-09-01'
    if (model === 'gpt-4-32k') {
      this.maxTokens = 32600
      this.responseTokens = 4000
    } else if (model === 'gpt-3.5-turbo-16k') {
      this.maxTokens = 16300
      this.responseTokens = 3000
    } else if (model === 'gpt-4') {
      this.maxTokens = 8192
      this.responseTokens = 8192
    } else if (model.includes('gpt-4.1')) {
      this.maxTokens = 1000000
      this.responseTokens = 16384
    } else if (model === 'gpt-4o') {
      this.maxTokens = 128000
      this.responseTokens = 4096
    } else if (model === 'o1-mini') {
      this.maxTokens = 128000
      this.responseTokens = 65536
    } else if (model === 'o1-preview') {
      this.maxTokens = 128000
      this.responseTokens = 32768
    } else if (model.includes('o3')) {
      this.maxTokens = 200000
      this.responseTokens = 100000
    } else if (model.includes('o4-mini')) {
      this.maxTokens = 128000
      this.responseTokens = 100000
    } else if (model === 'claude-3-opus-20240229') {
      this.maxTokens = 200000
      this.responseTokens = 4096
    } else if (model === 'claude-3-sonnet-20240229') {
      this.maxTokens = 200000
      this.responseTokens = 4096
    } else if (model === 'claude-3-haiku-20240307') {
      this.maxTokens = 200000
      this.responseTokens = 4096
    } else if (model.includes('claude-4-opus')) {
      this.maxTokens = 200000
      this.responseTokens = 32000
    } else if (model.includes('claude-4-sonnet')) {
      this.maxTokens = 200000
      this.responseTokens = 64000
    } else if (model.includes('claude-3-5-haiku')) {
      this.maxTokens = 200000
      this.responseTokens = 8192
    } else if (model.includes('claude-3-5-sonnet')) {
      this.maxTokens = 200000
      this.responseTokens = 8192
    } else if (model.includes('claude-3') || model.includes('claude-2')) {
      this.maxTokens = 200000
      this.responseTokens = 4096
    } else {
      this.maxTokens = 128000
      this.responseTokens = 16384
    }
    // provide some margin for the request tokens
    this.requestTokens = this.maxTokens - this.responseTokens - 100
  }

  string(): string {
    return `max_tokens=${this.maxTokens}, request_tokens=${this.requestTokens}, response_tokens=${this.responseTokens}`
  }
}
