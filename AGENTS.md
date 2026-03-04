# Agent Instructions

This file provides guidance for AI coding agents (Codex, Claude Code, etc.) working in this repository.

## Project Overview

`@schaferandrew/mealie-mcp-server` is an MCP (Model Context Protocol) server published to npm as `@schaferandrew/mealie-mcp-server`. It connects AI assistants to a self-hosted Mealie recipe manager instance.

## Build

```bash
npm install
npm run build   # TypeScript → dist/
```

Always verify `npm run build` succeeds before committing changes to TypeScript source.

## Releasing a New Version

When instructed to bump the version and create a release PR:

### Step 1 — bump version

Choose the appropriate bump level:
- `patch` for bug fixes or non-functional changes
- `minor` for new features or new MCP tools
- `major` for breaking changes

```bash
npm version <patch|minor|major> --no-git-tag-version
```

### Step 2 — create a release branch and PR

```bash
VERSION=$(node -p "require('./package.json').version")

git checkout -b release/v$VERSION
git add package.json package-lock.json
git commit -m "chore: bump version to $VERSION"
git push -u origin release/v$VERSION

gh pr create \
  --title "chore: release v$VERSION" \
  --body "## Release v$VERSION

Version bump to v$VERSION. Merge this PR then publish a GitHub Release to trigger npm publish." \
  --base main
```

### Step 3 — after PR is merged, publish the release

```bash
git checkout main && git pull origin main
VERSION=$(node -p "require('./package.json').version")

gh release create "v$VERSION" \
  --title "v$VERSION" \
  --generate-notes
```

The `publish.yml` GitHub Actions workflow will automatically publish to npm when the release is published.

## Key Constraints

- **Never log credentials.** `MEALIE_URL` and `MEALIE_API_KEY` must be redacted in any error output.
- **Do not commit `.env`.** Use `.env.example` for documentation.
- **Branch naming for releases:** always `release/v<version>`.
- **Target branch for release PRs:** always `main`.
