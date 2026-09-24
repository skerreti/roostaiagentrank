# AI Agent Market Intelligence

A weekly, GitHub-driven ranking of APIs and agent endpoints across:

1. Crypto / DeFi
2. TradFi
3. Meme / Trenching / Culture

The site is designed for Netlify. GitHub Actions runs the weekly research job, updates JSON data, commits the results, and Netlify redeploys automatically.

## Architecture

GitHub Actions
→ candidate providers
→ public provider pages + optional search API
→ LLM analysis
→ structured weekly rankings
→ `public/data/*.json`
→ Git commit
→ Netlify deploy

## LLM

The default implementation uses OpenRouter because it gives you a single OpenAI-compatible endpoint and supports free-model routing.

Set:

- `OPENROUTER_API_KEY`
- optional `LLM_MODEL` (default: `openrouter/free`)

For stronger research, optionally set:

- `TAVILY_API_KEY`

Without Tavily, the workflow still works from the provider source URLs and public GitHub metadata.

## Local setup

Requires Node 20+.

```bash
npm run build
npm run dev
```

Open `http://localhost:8888`.

To run the weekly job locally:

```bash
npm run research
```

Environment variables:

```bash
export OPENROUTER_API_KEY="..."
export LLM_MODEL="openrouter/free"
export TAVILY_API_KEY="..."       # optional
export GITHUB_TOKEN="..."         # optional locally
```

## GitHub

1. Create a new GitHub repository.
2. Upload this project.
3. Add repository secret `OPENROUTER_API_KEY`.
4. Optionally add `TAVILY_API_KEY`.
5. Enable Actions.
6. Connect the repository to Netlify.
7. Netlify build command: `npm run build`
8. Netlify publish directory: `public`

The workflow is scheduled for Sunday at 15:00 UTC and can also be launched manually from GitHub Actions.

## Important methodology

This project does **not** ask the LLM to invent a "best API" list.

It starts with a controlled candidate universe and collects evidence. The LLM scores each provider against a published rubric.

The ranking is an editorial/algorithmic score, not an objective measurement of total market usage.

Scores are deliberately split into:

- Market / ecosystem relevance
- Agent readiness
- Data quality / freshness
- Coverage
- Accessibility
- Documentation
- Weekly momentum

The site stores previous rankings so weekly movement can be displayed.

## Categories

### Crypto / DeFi
Market data, DeFi protocol data, on-chain indexing, wallet intelligence, RPC and blockchain infrastructure.

### TradFi
Equities, options, FX, macro, fundamentals, news and brokerage/execution APIs.

### Meme / Trenching
DEX discovery, new pairs, liquidity, social attention, wallet/smart-money intelligence, token launches and narrative/culture signals.

## Disclaimer

This is an API/agent infrastructure research directory. Rankings are not investment advice and should not be interpreted as recommendations to buy, sell or trade any asset.


## ROOST token gate

The public site now uses the same client-side gating model as the supplied Agent Rank page:

- Base chain only (chain ID 8453)
- ROOST contract: `0xeD899bfDB28c8ad65307Fa40f4acAB113AE2E14c`
- Minimum holding: `$25` worth of Base ROOST
- Price sources: DexScreener → CoinGecko → GeckoTerminal
- Balance is checked directly against Base RPC
- Uses the browser-injected `window.ethereum` provider (including wallets that expose an injected provider such as Coinbase Wallet or MetaMask)
- Robinhood-chain ROOST is not accepted

### Security note

This is **the same client-side gate pattern** as the supplied page. It controls normal access through the UI, but it is not cryptographic server-side access control: `public/data/rankings.json` remains a publicly addressable static Netlify asset. Anyone who knows the asset URL can technically request it without passing the UI gate.

If the ranking data itself must be genuinely private, the next step is a server-side/Netlify Function gate using wallet signature verification (or an authenticated API) so the weekly JSON is never publicly served to unauthenticated clients.
