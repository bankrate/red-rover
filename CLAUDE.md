# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RedRover is a GitHub Action that provides AI-powered pull request reviews and summaries using OpenAI and Anthropic models. It's written in TypeScript and designed to run as a GitHub Action workflow.

## Key Commands

**Development:**
```bash
npm install                 # Install dependencies
npm run build              # Compile TypeScript and copy WASM files
npm run package            # Bundle with ncc for distribution
npm run all                # Build, format, lint, package, and test
```

**Testing:**
```bash
npm test                   # Run all tests
npm test -- main.test.ts   # Run specific test file
npm run act                # Test locally with act (requires .secrets file)
```

**Code Quality:**
```bash
npm run lint               # Lint TypeScript code
npm run format             # Format code with Prettier
npm run format-check       # Check formatting without changes
```

## Architecture Overview

The codebase follows a modular architecture with clear separation of concerns:

1. **Entry Flow**: `main.ts` → validates inputs, creates bot instances, routes to review or comment handling
2. **AI Abstraction**: `bot.ts` provides a unified interface for OpenAI and Anthropic APIs with retry logic
3. **Review Logic**: `review.ts` orchestrates the review process - fetching diffs, summarizing, and reviewing code
4. **GitHub Integration**: `commenter.ts` handles all GitHub API interactions for posting comments and reviews
5. **Configuration**: `options.ts` manages model settings, token limits, and filtering rules

Key design patterns:
- Model-agnostic bot interface allows easy addition of new AI providers
- Incremental review system tracks reviewed commits to avoid duplicate work
- Concurrent processing with configurable limits for API calls
- Token management respects model-specific limits

## Testing Approach

- Jest is configured for TypeScript testing
- Tests are located in `__tests__/` directory
- Mock GitHub context and API responses when testing
- Use `npm test` to run all tests or specify individual test files

## Multi-Provider Support

The current branch (multi-provider) adds Anthropic Claude support alongside OpenAI:
- Model selection via `openai_model_provider` and `anthropic_model` inputs
- Separate API key configuration for each provider
- Unified `ModelClient` interface in `bot.ts` handles provider differences