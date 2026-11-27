# Contributing to AMAN FORGE

## Development setup

The repository includes a Codespaces devcontainer with Node.js 22 and Deno 2.

1. Open the repository in GitHub Codespaces.
2. Wait for dependency setup to finish.
3. Run `npm run build`, `npm run lint`, `npm run test:preview`, and `npm run test:shared`.
4. For Base44-backed local development, authenticate with the Base44 CLI and link the intended app before starting `base44 dev`.

Do not use `base44 dev --remote` casually: remote mode can write to the hosted application's production data.

## Branching

- Keep `main` releasable.
- Work in a focused branch such as `work/<topic>`.
- Open a pull request for non-trivial changes.
- Avoid mixing refactors, visual redesigns and backend behavior changes in one pull request.

## Engineering rules

- Read the owning module and its tests before editing.
- Preserve user-scoped access and existing RLS rules.
- Never put secrets in frontend code, request payloads, logs, test fixtures or committed environment files.
- Do not add a fake lock based on a read followed by a write. Cross-request coordination must rely on an actually atomic primitive.
- Do not mark generated projects ready when the available runtime cannot execute them.
- Keep the preview iframe isolated and network-denied by default.
- Prefer small pure helpers with focused tests for security-sensitive parsing and validation.
- Avoid new dependencies unless the value is clear and the license and maintenance status are acceptable.

## Required checks

Run these locally where the relevant tools are available:

```bash
npm run build
npm run lint
npm run test:preview
npm run test:shared
npm run typecheck
```

The legacy JavaScript/JSX typecheck is temporarily advisory. Do not interpret that as permission to add new type errors. Add or update focused tests and reduce the known baseline.

## Pull request checklist

- [ ] Scope and user impact are clear.
- [ ] Ownership and authorization behavior are preserved.
- [ ] No secrets or production data are included.
- [ ] Failure and cancellation behavior is considered.
- [ ] Tests cover new behavior and relevant regressions.
- [ ] Build, lint and applicable tests pass.
- [ ] Screenshots or a short preview recording are attached for UI changes.
- [ ] Documentation is updated when behavior or setup changes.
