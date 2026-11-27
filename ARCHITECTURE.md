# AMAN FORGE Architecture

## 1. Current system

AMAN FORGE is presently a Vite + React single-page application whose application services are supplied by Base44.

| Layer | Current implementation | Responsibility |
|---|---|---|
| Browser application | React 18, Vite, Tailwind | Dashboard, builder workspace, editor, preview, version and log views |
| Identity | Base44 Auth SDK | Sign-in, sessions, MFA and current-user context |
| Data | Base44 entities | Projects, messages, versions and build logs |
| Server operations | Base44 backend functions | AI build pipeline, provider key checks, snapshot save/restore |
| AI providers | `base44/shared/aiProviders.ts` | Server-side provider configuration and model calls |
| Project validation | `base44/shared/projectFiles.ts`, `agentPipeline.ts` | File path validation, bounds, compatibility inspection |
| Preview | `src/lib/preview.js` | Sandboxed HTML preview with a restrictive CSP |

GitHub is the canonical source repository for this engineering track. Pushing a commit here does **not** automatically synchronize the existing Base44 application unless the GitHub integration is separately connected and verified.

## 2. Request and build flow

1. A signed-in user selects a project and submits a prompt from `src/pages/Builder.jsx`.
2. The frontend invokes the `aiBuild` backend function through the Base44 SDK.
3. The backend authenticates the caller, loads the project under the caller's permissions, resolves the configured provider secret server-side, and calls the selected model.
4. Returned files pass through `sanitizeProjectFiles` and `inspectGeneratedProject`.
5. A new `Version` snapshot is created and the `Project` record is updated.
6. The browser renders the returned HTML/CSS/JavaScript in the isolated preview frame.

Manual save and restore use `commitProjectSnapshot`.

## 3. Current runtime boundary

The generator's system contract currently targets vanilla HTML, CSS and JavaScript. The preview engine is not a Node.js container and does not install npm dependencies, compile JSX/TypeScript, or run arbitrary server processes.

The project inspector deliberately marks dependency-managed or framework projects as requiring a build runtime. Do not remove this guard merely to make a project appear ready. A future runtime should explicitly provide:

- an isolated workspace per project and execution;
- bounded CPU, memory, wall-clock time, file count and storage;
- dependency allowlists or controlled package installation;
- network egress policy and SSRF protection;
- disposable execution environments;
- build logs, cancellation, resource accounting and cleanup;
- an artifact contract consumed by the preview subsystem.

## 4. Preview security model

Generated code executes inside an opaque-origin sandboxed iframe. The preview CSP denies network access by default, disallows forms and nested frames by default, and does not expose the host application's storage. External HTTPS access is an explicit per-preview opt-in.

Changes to the preview boundary require security tests. Never add `allow-same-origin`, popup, form, top-navigation or host-storage privileges as a convenience fix.

## 5. Data ownership and security

The current entity models use owner-or-admin access rules. Backend functions use the signed-in user's entity client for project reads and writes. Keep this invariant unless a specific privileged operation is justified and reviewed.

Provider credentials must remain in server-side platform secrets. Never add credentials, user session tokens, Base44 local-link files, database dumps or production records to Git.

## 6. Known engineering risks

### Concurrent project mutations

`aiBuild` and `commitProjectSnapshot` both calculate the next version using a project counter plus version history, then create a snapshot and update the project. A browser-local `busy` flag is not a server-side lock. Concurrent builds, manual saves or restores can race.

This is tracked in [issue #2](https://github.com/abuahmad2003sudan-del/Aman-Forge2/issues/2). A read-then-write lock in an ordinary entity is not atomic and is not an acceptable fix. The coordinating storage must provide a proven atomic compare-and-swap or serialized transaction, and stale operations must not update the project or its status.

### TypeScript diagnostics

The repository currently has a legacy `checkJs` diagnostics baseline. The CI typecheck step is advisory while the baseline is reduced. Build, lint and focused tests remain blocking. See [issue #1](https://github.com/abuahmad2003sudan-del/Aman-Forge2/issues/1).

## 7. Target architecture

The intended direction is to separate product capabilities behind stable interfaces:

- **Identity adapter:** user identity, sessions, MFA and authorization.
- **Project repository:** projects, snapshots, messages and logs.
- **Model gateway:** provider routing, budgets, structured output and secret access.
- **Execution runtime:** isolated build/run jobs with cancellation and resource policy.
- **Artifact service:** immutable build outputs and preview URLs.
- **Git provider adapter:** repository import/export and commit operations.
- **Observability:** traces, structured logs, build lifecycle and audit events.

Migration should be incremental. Keep the currently working Base44 adapter until a replacement has parity tests for ownership, auth, data integrity and failure handling.
