# Ranking methodology

## Purpose

The ranking is intended to answer:

> Which APIs/endpoints are most useful to an AI agent operating in this category?

It is **not** intended to claim which vendor has the most total API calls or the largest customer base.

## Score

| Factor | Weight |
|---|---:|
| Ecosystem relevance | 25% |
| Agent readiness | 20% |
| Data quality | 15% |
| Coverage | 15% |
| Accessibility | 10% |
| Documentation | 10% |
| Weekly momentum | 5% |

### Ecosystem relevance
How central the provider is to workflows in the category.

### Agent readiness
Structured responses, predictable schemas, tool-call ergonomics, OpenAPI, MCP, SDKs and agent-specific support.

### Data quality
Freshness, breadth/depth and observable reliability indicators.

### Coverage
Chains, exchanges, assets, instruments, protocols, social networks or other relevant surface area.

### Accessibility
Free/trial access, authentication simplicity and developer accessibility.

### Documentation
Reference quality, examples, schemas, endpoint discoverability and current documentation.

### Weekly momentum
Recent product changes, agent support, new endpoints or ecosystem developments.

## Evidence rules

The automation should prefer:

1. Official API documentation
2. Official provider pages
3. Official GitHub repositories
4. Reputable independent comparisons
5. Search results only as supporting evidence

The model must not invent quantitative adoption figures.

If no reliable evidence exists for a criterion, use a neutral score rather than fabricate evidence.

## Candidate replacement

The initial candidate universe is intentionally controlled. A future version can allow the model to propose replacements, but new providers should pass a separate validation stage before entering the ranked universe.
