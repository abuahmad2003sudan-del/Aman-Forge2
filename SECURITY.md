# Security Policy

## Supported branch

Security fixes should target the current default branch, `main`. Older commits and forks may not receive updates.

## Reporting a vulnerability

Please do not publish exploitable details, credentials, personal information or reproduction data for a live vulnerability in a public issue.

Use GitHub's **Report a vulnerability** action in the repository's Security tab to submit a private advisory. Include:

- affected component and commit, if known;
- impact and realistic attack preconditions;
- a minimal reproduction;
- suggested mitigation, if known.

Do not include real API keys, session cookies, user records or production data. Revoke and rotate any credential that may have been exposed.

## Security invariants

- Backend operations authenticate the caller and remain user-scoped by default.
- Entity owner/admin access rules must not be broadened without a documented reason.
- Provider keys stay in server-side secrets.
- Preview content is untrusted and executes in an isolated sandbox.
- Preview network access is denied by default.
- Generated file paths and file sizes are validated before persistence.
- Build and save concurrency must use a genuinely atomic coordination mechanism before being described as race-safe.

## Response

A maintainer will triage reports, determine severity, reproduce the issue in a non-production environment, and coordinate a fix and disclosure. No response-time SLA is promised by this repository.
