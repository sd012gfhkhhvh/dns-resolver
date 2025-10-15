# GitHub Actions Workflows

This directory contains CI/CD workflows for the DNS Resolver project.

## Workflows

### CI (`ci.yml`)

Runs on push and pull requests to `master`, `main`, and `develop` branches.

**Jobs:**

1. **lint-and-format**
   - Checks code formatting with Prettier
   - Fails if formatting issues are detected

2. **build**
   - Builds TypeScript to JavaScript for Node.js
   - Uploads build artifacts (retained for 7 days)
   - Only runs if linting passes

3. **docker-build**
   - Builds Docker image using docker-compose
   - Tests that containers start successfully
   - Only runs if linting passes

**Required:**
- Bun runtime (automatically installed via `oven-sh/setup-bun`)
- Docker & Docker Compose (pre-installed on GitHub runners)

## Local Testing

To test workflows locally before pushing:

```bash
# Check formatting (same as CI)
bun run format:check

# Build (same as CI)
bun run build

# Docker build (same as CI)
docker-compose build
docker-compose up -d
docker-compose down
```

## Adding New Workflows

1. Create a new `.yml` file in this directory
2. Follow GitHub Actions syntax
3. Test locally if possible
4. Commit and push to trigger the workflow

## Status Badges

Add this badge to the main README to show CI status:

```markdown
[![CI](https://github.com/sd012gfhkhhvh/dns-resolver/actions/workflows/ci.yml/badge.svg)](https://github.com/sd012gfhkhhvh/dns-resolver/actions/workflows/ci.yml)
```
