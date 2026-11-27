# AMAN FORGE — AI App Studio

AMAN FORGE is an AI-assisted application workspace built with React, Vite, and Base44.

## Project structure

- `src/` — React application and UI
- `base44/entities/` — application data schemas and access rules
- `base44/functions/` — server-side application functions
- `base44/shared/` — shared server-side logic and tests
- `base44/config.jsonc` — Base44 local development configuration

## Requirements

- Node.js compatible with the installed Vite toolchain
- npm
- Deno (required by the Base44 local backend)
- Base44 CLI

## Local development

Install dependencies:

```bash
npm install
```

Authenticate and link this checkout to the intended Base44 app:

```bash
base44 login
base44 link
```

Start the integrated local environment:

```bash
base44 dev
```

Use `base44 dev --remote` only when you intentionally want the frontend to use the hosted backend and its live data. Treat writes in remote mode as production-data changes.

## Checks

```bash
npm run build
npm run lint
npm run test:preview
npm run typecheck
```

## Security

- Never commit `.env`, `.env.*`, API keys, access tokens, private keys, or Base44 local-link files.
- Store provider credentials in the platform's server-side secret store.
- Review dependency and lockfile changes before merging.
- Keep this repository private when the source is not intended for public distribution.

## Base44 integration

The app uses Base44 for authentication, data entities, backend functions, and platform services. The source repository does not contain deployed secrets or production database records.

See the [Base44 developer documentation](https://docs.base44.com/developers/app-code/local-development/github) for repository sync and local development guidance.
