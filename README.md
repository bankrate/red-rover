# RedRover - AI-powered PR reviewer and summarizer

![small-red-rover](https://github.com/bankrate/red-rover/assets/64108082/9ee5df3f-bc3f-4bfc-878e-171d7ccca96e)

## Overview

RedRover is an AI-based code reviewer and summarizer for
GitHub pull requests supporting both OpenAI and Anthropic models. It is
designed to be used as a GitHub Action and can be configured to run on every
pull request and review comments

## Install instructions

RedRover runs as a GitHub Action. Add the below file to your repository
at `.github/workflows/redrover-review.yml`

```yaml
name: RedRover Reviewer

permissions:
  contents: read
  pull-requests: write

on:
  pull_request:
  pull_request_review_comment:
    types: [created]

concurrency:
  group: ${{ github.repository }}-${{ github.event.number || github.head_ref ||
    github.sha }}-${{ github.workflow }}-${{ github.event_name ==
    'pull_request_review_comment' && 'pr_comment' || 'pr' }}
  cancel-in-progress: ${{ github.event_name != 'pull_request_review_comment' }}

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: bankrate/red-rover@latest
        env:
          GITHUB_TOKEN: ${{ secrets.BANKRATE_BOT_TOKEN }}
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          # ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }} # Uncomment if using Anthropic
        with:
          model_provider: openai # or 'anthropic'
          light_model: gpt-4.1-mini # or 'claude-3-5-haiku-20241022'
          heavy_model: gpt-4.1 # or 'o4-mini', 'claude-sonnet-4-20250514'
          review_simple_changes: false
          less_verbose_review: false
          review_comment_lgtm: false
          poem_enabled: false
          debug: false
```

#### Environment variables

- `GITHUB_TOKEN`: This should already be available to the GitHub Action
  environment. This is used to add comments to the pull request.
- `OPENAI_API_KEY`: Required if using OpenAI models. You can get one
  [here](https://platform.openai.com/account/api-keys). Please add this key to
  your GitHub Action secrets.
- `ANTHROPIC_API_KEY`: Required if using Anthropic models. You can get one
  [here](https://console.anthropic.com/). Please add this key to
  your GitHub Action secrets.
- `OPENAI_API_ORG`: (optional) use this to use the specified organization with
  OpenAI API if you have multiple. Please add this key to your GitHub Action
  secrets.

### Supported Models

#### OpenAI Models
- **Light models**: `gpt-4o-mini`, `gpt-4.1-mini`
- **Heavy models**: `gpt-4o`, `gpt-4.1`, `o4-mini`, `o3`

#### Anthropic Models
- **Light models**: `claude-3-5-haiku-20241022`
- **Heavy models**: `claude-sonnet-4-20250514`, `claude-opus-4-20250514`

Recommend using lighter models for summarizing changes and heavier models for complex
review and commenting tasks.

Costs vary by model - lighter models are significantly cheaper while heavier models
provide superior results for complex reasoning tasks.

## Reviewer Features:

- **PR Summarization**: It generates a summary and release notes of the changes
  in the pull request.
- **Line-by-line code change suggestions**: Reviews the changes line by line and
  provides code change suggestions.
- **Continuous, incremental reviews**: Reviews are performed on each commit
  within a pull request, rather than a one-time review on the entire pull
  request.
- **Cost-effective and reduced noise**: Incremental reviews save on API costs
  and reduce noise by tracking changed files between commits and the base of the
  pull request.
- **"Light" model for summary**: Designed to be used with a "light"
  summarization model (e.g. `gpt-4.1-mini`, `claude-3-5-haiku-20241022`) and a "heavy" review model (e.g.
  `gpt-4.1`, `o4-mini`, `claude-sonnet-4-20250514`. _For best results, use advanced models as the "heavy" model, as thorough
  code review needs strong reasoning abilities.
- **Multi-provider support**: Choose between OpenAI and Anthropic models based on your needs.
  Supports OpenAI's thinking models (o1, o3, etc.) which automatically disable temperature and system messages.
- **Chat with bot**: Supports conversation with the bot in the context of lines
  of code or entire files, useful for providing context, generating test cases,
  and reducing code complexity.
- **Smart review skipping**: By default, skips in-depth review for simple
  changes (e.g. typo fixes) and when changes look good for the most part. It can
  be disabled by setting `review_simple_changes` and `review_comment_lgtm` to
  `true`.
- **Less verbose reviews**: For more experienced users the Red Rover can err on 
  side of ignoring a change unless it is a major one. This is disabled by default,
  to enable set `review_simple_changes` to `false` and `less_verbose_review` to
  `true`.
- **Customizable prompts**: Tailor the `system_message`, `summarize`, and
  `summarize_release_notes` prompts to focus on specific aspects of the review
  process or even change the review objective.

To use this tool, you need to add the provided YAML file to your repository and
configure the required environment variables, such as `GITHUB_TOKEN` and either
`OPENAI_API_KEY` or `ANTHROPIC_API_KEY` depending on your chosen provider.

### Prompts & Configuration

See: [action.yml](./action.yml)

Tip: You can change the bot personality by configuring the `system_message`
value. For example, to review docs/blog posts, you can use the following prompt:

<details>
<summary>Blog Reviewer Prompt</summary>

```yaml
system_message: |
  You are `@redrover` (aka `github-actions[bot]`), an AI assistant
  trained to act as a highly experienced software engineer. Your purpose
  is to provide thorough reviews of code changes and suggest improvements
  in key areas such as:
    - Logic
    - Security
    - Performance
    - Data races
    - Consistency
    - Error handling
    - Maintainability
    - Modularity
    - Complexity
    - Optimization
    - Best practices: DRY, SOLID, KISS

  Do not comment on minor code style issues, missing 
  comments/documentation. Identify and resolve significant 
  concerns to improve overall code quality while deliberately 
  disregarding minor issues.
  
  When providing summaries, be factual and objective. Do not add 
  editorial comments, opinions, praise, or introductory phrases.
```

</details>

## Conversation with RedRover

You can reply to a review comment made by this action and get a response based
on the diff context. Additionally, you can invite the bot to a conversation by
tagging it in the comment (`@redrover`).

Example:

> @redrover Please generate a test plan for this file.

Note: A review comment is a comment made on a diff or a file in the pull
request.

### Ignoring PRs

Sometimes it is useful to ignore a PR. For example, if you are using this action
to review documentation, you can ignore PRs that only change the documentation.
To ignore a PR, add the following keyword in the PR description:

```text
@redrover: ignore
```

## Examples

Some of the reviews done by ai-pr-reviewer

![PR Summary](./docs/images/openai-pr-summary.png)

![PR Release Notes](./docs/images/openai-pr-release-notes.png)

![PR Review](./docs/images/openai-pr-review.png)

![PR Conversation](./docs/images/openai-review-conversation.png)

Any suggestions or pull requests for improving the prompts are highly
appreciated.

### Developing

> First, you'll need to have a reasonably modern version of `node` handy, tested
> with node 17+.

Install the dependencies

```bash
$ npm install
```

Build the typescript and package it for distribution

```bash
$ npm run build && npm run package
```

### Inspect the messages between OpenAI server

Set `debug: true` in the workflow file to enable debug mode, which will show the
messages

### Disclaimer

- Your code (files, diff, PR title/description) will be sent to your chosen AI provider's servers
  (OpenAI or Anthropic) for processing. Please check with your compliance team before using this on
  your private code repositories.
- Both OpenAI and Anthropic APIs have data usage policies:
  - [OpenAI API data usage policy](https://openai.com/policies/api-data-usage-policies)
  - [Anthropic data usage policy](https://www.anthropic.com/legal/privacy)
- This action is not affiliated with OpenAI or Anthropic.
