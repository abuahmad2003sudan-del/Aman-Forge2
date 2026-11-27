# AMAN FORGE — AI App Studio

AMAN FORGE is an AI-assisted application workspace for describing, building, inspecting and editing web projects. The current product combines a React/Vite studio with Base44-backed identity, persistence and server functions.

> **Repository status:** the source has been imported from the existing Base44 application and is being expanded in GitHub. GitHub is the canonical source for this engineering track. It is not yet a fully independent replacement for Base44.

[![CI](https://github.com/abuahmad2003sudan-del/Aman-Forge2/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/abuahmad2003sudan-del/Aman-Forge2/actions/workflows/ci.yml)
[![CodeQL](https://github.com/abuahmad2003sudan-del/Aman-Forge2/actions/workflows/codeql.yml/badge.svg?branch=main)](https://github.com/abuahmad2003sudan-del/Aman-Forge2/actions/workflows/codeql.yml)

## Current capabilities

- React studio dashboard and builder workspace
- Project file editor, preview, versions and build logs
- Fast and deep agent modes with bounded planning and project inspection
- Server-side AI provider configuration; API credentials are resolved from platform secrets
- File path, extension, size and project-shape validation
- Isolated HTML preview with a restrictive Content Security Policy and network access denied by default
- Base44 entities and server functions for authentication, projects, snapshots and provider configuration

The current generation contract targets static HTML, CSS and JavaScript. It does not yet provide an isolated Node.js/npm runtime for arbitrary React, Next.js or server-side projects. See [ARCHITECTURE.md](ARCHITECTURE.md).

## Open in Codespaces

The repository includes a devcontainer for browser-based development with Node.js 22, Deno 2 and the Base44 CLI.

1. Open [Codespaces](https://github.com/abuahmad2003sudan-del/Aman-Forge2/codespaces).
2. Create a codespace from `work/engineering` or the branch you intend to work on.
3. Wait for the devcontainer setup to install packages and the Base44 CLI.
4. Authenticate and link the Base44 app if you need its backend:

```bash
base44 login
base44 link
base44 dev
```

The local UI is normally served on port 5173. Codespaces forwards this port and can open its browser preview.

### Important: local versus remote data

- `base44 dev` runs the local backend and uses local/in-memory entity data for development.
- `base44 dev --remote` connects the frontend to the hosted backend. Writes may affect production data. Use it only when that is intentional.
- The frontend requires a Base44 app association and the existing app to have been published at least once for the full hosted settings/auth bootstrap.

The GitHub repository does not currently auto-sync to the Base44 Builder. Treat GitHub commits and Base44 app changes as separate until a verified integration is established.

## Development commands

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test:preview
npm run test:shared
npm run test
npm run typecheck
```

`npm run test:shared` runs the Deno tests for shared backend validation and agent-pipeline logic. Deno is included in the devcontainer and CI workflow.

The legacy JavaScript/JSX `checkJs` typecheck currently reports pre-existing diagnostics and is advisory in CI while the baseline is reduced. Build, lint and focused tests remain required checks. Track progress in [issue #1](https://github.com/abuahmad2003sudan-del/Aman-Forge2/issues/1).

## Repository structure

```text
base44/
  entities/       Data models and row-level access rules
  functions/      Server-side request handlers
  shared/         Shared validation, provider and agent logic
src/
  components/     Studio and UI components
  pages/          Dashboard, builder, auth and settings pages
  lib/            Preview, auth and app helpers
.github/
  workflows/      CI and CodeQL workflows
.devcontainer/    Codespaces environment
```

## Security and engineering

- Never commit `.env`, `.env.*`, API keys, session tokens, private keys, local Base44 link files or production data.
- Provider credentials belong in server-side platform secrets.
- Preserve user-scoped access and entity RLS rules.
- Keep generated code isolated in the preview frame; network access is an explicit opt-in.
- Do not implement project serialization with a read-then-write lock on a normal entity. The concurrency issue is tracked in [issue #2](https://github.com/abuahmad2003sudan-del/Aman-Forge2/issues/2).
- Use focused branches and pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).

## Roadmap direction

1. Eliminate the confirmed concurrency race with an actually atomic coordination primitive.
2. Stabilize the existing build, lint and test pipeline; reduce legacy typecheck diagnostics.
3. Separate identity, project persistence, model gateway, runtime and artifact interfaces.
4. Add isolated build/run environments with resource limits and controlled network egress.
5. Add durable snapshots, rollback, cancellation and structured execution telemetry.
6. Reduce platform coupling through tested adapters before migrating production data or authentication.

## License

No open-source license has been added yet. All rights remain with the repository owner unless and until a license is explicitly selected.
