# AI Svelte Builder

Transform natural language prompts into Svelte components using AI with real-time preview.

## 🚀 One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fheliosbayma%2Fsvelte-ai-builder&project-name=svelte-ai-builder&repository-name=svelte-ai-builder)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/heliosbayma/svelte-ai-builder)

### Fly.io Deployment

```bash
# Install flyctl: https://fly.io/docs/hands-on/install-flyctl/
fly auth login
fly launch --no-deploy  # Creates app from fly.toml
fly deploy               # Deploy your app
fly open                 # Open in browser
```

## Run locally (no Docker)

```bash
git clone <repository-url>
cd svelte-ai-builder
pnpm install
pnpm dev
```

Open <http://localhost:5173>

## Run with Docker

Prerequisites: Docker Desktop.

```bash
# With pnpm installed:
pnpm run dev:docker

# Without pnpm (Docker only):
docker compose up --build
```

Open <http://localhost:5173>.

Notes:

- The dev container targets linux/amd64 for maximum portability across hosts.
- Uses WASM-based Rollup for cross-platform compatibility
- If Docker fails on a reviewer machine, use the non-Docker path above.

## API Keys

**Required**: Provide at least one key for:

- OpenAI (GPT models)
- Anthropic (Claude models)
- Google (Gemini models)

**Where to add**: Click the Settings button in the app and paste your key(s). You can choose storage mode:

- Local (persists across tabs) or Session-only.

**Storage & security**:

- Keys are encrypted client-side in your browser using AES-GCM and a per-session password. They are never persisted on the server.
- When you run a prompt, the key is sent only for that request to the app’s internal endpoint `/api/llm`, which immediately proxies the request to the selected provider and returns the response. We do not log or store keys server-side.
- Header usage: OpenAI uses `Authorization: Bearer <key>`, Anthropic uses `x-api-key: <key>`, and Gemini includes the key in the provider URL.
- If you deploy this app yourself, ensure you use HTTPS and a trusted hosting environment, as your deployment will see keys in transit during proxying.

## Limitations

- **Proxy required**: Uses a lightweight server route to avoid CORS. No key storage server-side.
- **Your API costs**: You pay providers directly for usage and are subject to rate limits.
- **Scope**: Generates Svelte components/pages; not a full project scaffolder.
- **Modern browsers**: Requires ES modules, `iframe`, and SSE streaming support.
- **Network required**: Internet access is required for provider API calls.

Built with SvelteKit + TypeScript + Tailwind CSS
