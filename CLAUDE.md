# Claude Code Instructions

This file tells Claude Code how to work in this repository.

## Project Overview

`@schaferandrew/mealie-mcp-server` is an MCP (Model Context Protocol) server that bridges Claude with a self-hosted Mealie recipe manager. It is published to npm and triggered via `npx`.

## Stack

- **Language:** TypeScript
- **Runtime:** Node.js 18+
- **Build:** `tsc` → `dist/`
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **HTTP client:** `axios`

## Build & Test

```bash
npm install
npm run build          # compile TypeScript → dist/
npm run test-connection  # requires MEALIE_URL + MEALIE_API_KEY env vars
```

Always run `npm run build` after changing TypeScript source to verify the build passes.

## Releasing a New Version

When asked to bump the version and open a release PR, follow these steps exactly:

### 1. Determine bump type

- `patch` — bug fixes, docs, internal changes
- `minor` — new tools or features, non-breaking
- `major` — breaking changes to the MCP interface or config

### 2. Bump, commit, and open a PR

```bash
npm version <patch|minor|major> --no-git-tag-version

VERSION=$(node -p "require('./package.json').version")

git checkout -b release/v$VERSION
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"
git push -u origin release/v$VERSION
gh pr create \
  --title "chore: release v$VERSION" \
  --body "## Release v$VERSION

- Version bump via \`npm version\`
- Merge this PR then run \`gh release create\` to publish to npm." \
  --base main
```

### 3. After the PR is merged — create the GitHub Release

```bash
git checkout main && git pull origin main
VERSION=$(node -p "require('./package.json').version")

gh release create "v$VERSION" \
  --title "v$VERSION" \
  --generate-notes
```

GitHub Actions (`publish.yml`) will publish to npm automatically on release.

## Code Conventions

- All MCP tools live in `src/tools/` (or equivalent); keep each tool focused on a single Mealie API operation
- Credentials must never be logged — redact before any error output
- Environment variables: `MEALIE_URL`, `MEALIE_API_KEY`
- Do not commit `.env`; `.env.example` is safe to commit
