# AI Svelte Builder

Transform natural language prompts into Svelte components using AI with real-time preview.

## Run locally (no Docker)

```bash
git clone <repository-url>
cd svelte-ai-builder
pnpm install
pnpm dev
```

Open <http://localhost:5173>

## Run with Docker (one-command)

Prerequisites: Docker Desktop.

```bash
pnpm run dev:docker
```

Open <http://localhost:5173>.

Notes:

- The dev container targets linux/amd64 for maximum portability across hosts.
- If Docker fails on a reviewer machine, use the non-Docker path above.

## API Keys

**Required**: At least one API key from:

- OpenAI (GPT models)
- Anthropic (Claude models)
- Google (Gemini models)

**How it works**:

- Keys stored locally in your browser only, never sent to our servers
- Enter via Settings button on first use
- Direct API calls from browser to chosen provider

## Limitations

- **Client-only**: Runs entirely in browser, no backend
- **Your API costs**: You pay LLM providers directly for usage
- **Single components**: Generates individual .svelte files, not full apps
- **Modern browsers**: Requires ES modules and iframe support
- **Internet required**: For API calls to LLM providers

Built with SvelteKit + TypeScript + Tailwind CSS
