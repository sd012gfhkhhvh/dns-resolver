# DNS Resolver (local development & Docker)

[![CI](https://github.com/sd012gfhkhhvh/dns-resolver/actions/workflows/ci.yml/badge.svg)](https://github.com/sd012gfhkhhvh/dns-resolver/actions/workflows/ci.yml)

Lightweight TypeScript DNS resolver used for learning and experimentation.

This README covers how to run the project locally (with Bun) and with
Docker Compose, environment variables you can adjust, and common troubleshooting.

## Requirements

- Node.js (only required if you run the built JS with `node`)

1. Install dependencies:

```bash
bun install
```

2. Run in development (runs TypeScript directly, restarts on changes):

```bash
# run both servers (udp + forwarding)
bun run dev
```

3. Build (produce JS in `dist/`):

```bash
bun run build
```

4. Run the built app (uses `node` to run output in `dist/`):

```bash
bun run start
```

## Docker (app + Redis)

Bring up the app and Redis with Docker Compose (recommended for reproducible
envs):

```bash
docker-compose up --build
# stop
docker-compose down
```

## Project scripts (package.json)

The repository provides convenient npm/Bun scripts defined in `package.json`.
Use `bun run <script>` to execute any of these.

Key scripts:

- `dev` — Run both servers in development mode with Bun's --watch (restarts on
  change):
  - `bun run dev`
- `dev:udp` — Run only the UDP DNS server in watch mode:
  - `bun run dev:udp`
- `build` — Build the TypeScript entrypoints for Node (outputs to `dist/`):
  - `bun run build`
- `build:udp` — Build only the UDP server for Node:
  - `bun run build:udp`
- `start` — Start the built services using the project start script (POSIX
  compatible):
  - `bun run start`
- `start:udp` — Start only the built UDP server with Node:
  - `bun run start:udp`
- `docker:redis` — Run a disposable Redis container bound to host 6379:
  - `bun run docker:redis`
- `docker:compose` — Run the docker-compose setup (app + redis):
  - `bun run docker:compose`
- `lint` — Lint code with ESLint:
  - `bun run lint`
- `lint:fix` — Lint and auto-fix code with ESLint:
  - `bun run lint:fix`
- `format` — Format the repository using Prettier:
  - `bun run format`
- `format:check` — Check formatting with Prettier:
  - `bun run format:check`

## Makefile (quick commands)

A `Makefile` is provided for convenience. Run `make` or `make help` to see all available targets:

```bash
make help          # Show all available targets
make install       # Install dependencies
make dev           # Run both servers in dev mode
make build         # Build for production
make start         # Start built services
make docker-compose # Run with Docker Compose
make lint          # Lint code with ESLint
make lint-fix      # Lint and auto-fix with ESLint
make format        # Format code with Prettier
make clean         # Remove build artifacts
```

The Makefile wraps the npm/bun scripts and adds a few extras like `clean` and `docker-down`.

## Linting & Code Quality

The project uses **ESLint** with TypeScript support for code quality and **Prettier** for formatting.

**Lint your code:**

```bash
bun run lint       # Check for linting errors
bun run lint:fix   # Auto-fix linting errors
make lint          # Alternative using Makefile
make lint-fix      # Alternative using Makefile
```

**ESLint configuration:**

- Located in `.eslintrc.cjs`
- Uses `@typescript-eslint` for TypeScript-specific rules
- Integrates with Prettier (no conflicts)
- Enforces type-safe practices

**Common lint rules:**

- Warns on `any` types
- Enforces `const` over `let` where possible
- Catches unhandled promises
- Allows console logs (needed for DNS server)

## Git pre-commit hook (automatic checks)

**Husky** is used to manage git hooks. A pre-commit hook runs linting and formatting checks before every commit.

**What runs on commit:**

1. ESLint checks (`bun run lint`)
2. Prettier format check (`bun run format:check`)

**How it works:**

- On every `git commit`, the hook runs both checks
- If linting or formatting issues are found, commit is blocked
- Run `make lint-fix` and `make format` to auto-fix, then commit again
- Husky hooks are located in `.husky/` directory

**Setup (automatic on install):**

```bash
bun install  # runs 'husky install' via prepare script
```

**To bypass the hook** (not recommended):

```bash
git commit --no-verify
```

## GitHub Actions CI/CD

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on every push and pull request.

**CI Pipeline:**

1. **Lint & Format Check** — validates ESLint rules and Prettier formatting
2. **Build** — compiles TypeScript to JavaScript and uploads artifacts
3. **Docker Build** — builds and tests Docker Compose setup

**View workflow runs:**

- Navigate to the "Actions" tab in the GitHub repository
- All checks must pass before merging pull requests

**Add CI badge to README:**

```markdown
[![CI](https://github.com/sd012gfhkhhvh/dns-resolver/actions/workflows/ci.yml/badge.svg)](https://github.com/sd012gfhkhhvh/dns-resolver/actions/workflows/ci.yml)
```

- If formatting is incorrect, commit fails with a message
- Run `make format` to auto-fix, then commit again

**To bypass the hook** (not recommended):

```bash
git commit --no-verify
```

## Features (current)

- UDP DNS server capable of parsing and responding to DNS queries
- HTTP forwarding server (simple API to forward DNS queries over UDP)
- Recursive resolver implementation that performs iterative lookups
- Simple Redis-backed cache for DNS answers
- **ESLint** for TypeScript linting with strict type-checking rules
- **Prettier** integration for consistent formatting
- Docker Compose setup for running app + Redis together
- Docker healthchecks for app and Redis services
- Makefile with common development tasks
- **Husky** for git pre-commit hooks (linting + formatting validation)
- **GitHub Actions CI/CD** pipeline (lint, build, docker tests)

## Upcoming / Planned

- Unit tests for packet encoding/decoding and resolver logic
- Improved logging and structured JSON logs
- Optional TLS/DoH frontend (experimental)
- Graceful reloads and zero-downtime restarts

## Running without Docker (local host)

1. Create `.env` from `.env.example` (already added to repository as `.env`):

```bash
cp .env.example .env    # if you don't have .env
# review .env and ensure REDIS_URL has protocol, e.g. REDIS_URL=redis://127.0.0.1:6379
```

2. Start a local Redis server (optional, recommended for caching):

```bash
# on systems with apt
sudo apt install redis-server
redis-server --daemonize yes
# or use docker: bun run docker:redis
```

3. Run the app in dev mode:

```bash
bun run dev
```

## Running with Docker Compose

1. Make sure `.env` is present (the repo already contains a default `.env` which
   points REDIS_URL to `redis://127.0.0.1:6379`). Adjust if you prefer to use the
   compose-provided Redis service (set REDIS_URL=redis://redis:6379).

2. Start compose:

```bash
docker-compose up --build
# or use bun script
bun run docker:compose (recommended)
```

3. Logs will show server startup and bound addresses. If you see the UDP server
   bound to `127.0.0.1` inside the container, change `UDP_BIND_ADDRESS` to
   `0.0.0.0` in the environment so Docker can forward UDP traffic.

## Environment

Copy the example env and edit if needed:

```bash
cp .env.example .env
# edit .env and adjust REDIS_URL, UDP_BIND_ADDRESS, UDP_PORT if needed
```

Important vars:

- `REDIS_URL` — URL for Redis (use `redis://host:6379` or `host:6379`)
- `UDP_BIND_ADDRESS` — interface to bind the UDP server to. Recommended:
  - `127.0.0.1` for local dev
  - `0.0.0.0` inside containers (so Docker port forwarding works)
- `UDP_PORT` — UDP port (default 2053)

## Typical workflows

- Development (fast edit/test cycle):
  - `bun run dev` — runs servers directly with Bun and restarts on changes
- Build + run in Node (simulate production):
  - `bun run build` then `bun run start`
- Run with Docker Compose:
  - `docker-compose up --build`
    or `bun run docker:compose(recommended)`

## Formatting

This repository uses Prettier. Format or check formatting with:

```bash
bun run format    # fix files
bun run format:check  # only check
```

## Tests

There are no automated tests in this repo. You can validate behavior using `dig`
and `curl` as shown below.

## Quick validation

Use these exact commands to validate the running services.

- HTTP forwarding server (host):

```bash
curl 'http://127.0.0.1:8080/resolve?domain=google.com&type=A'
```

- UDP DNS server (host): the project does not use EDNS by default, so use the
  following dig flags which disable EDNS and additional sections:

```bash
dig @127.0.0.1 -p 2053 +qid=1234 +noedns +noad google.com A
```

Note: if you are running via Docker Compose and the UDP port is mapped
`127.0.0.1:2053:2053/udp`, the same dig command will target the containerized
server from the host.

## Notes & Troubleshooting

- If you see `Error: Invalid protocol` from Redis, ensure `REDIS_URL` includes
  the protocol (e.g. `redis://redis:6379` or `redis://127.0.0.1:6379`).
- If `dig` times out from the host but the UDP server works inside the
  container, the reason is usually the bind address. Ensure the server binds to
  an interface reachable by Docker (use `0.0.0.0` in containerized mode).
- Use `lsof -nP -i UDP:2053` and `docker ps`/`docker logs` to debug binding and
  exposed ports.

## Contact / Support

If you find bugs or want features, open an issue or submit a PR with tests and
formatting applied (`bun run format`).

Notes:

- The Compose file maps the UDP port and HTTP port. By default the project
  exposes the forwarding server on `127.0.0.1:8080` (HTTP) and UDP on host
  `127.0.0.1:2053` if configured that way. See the compose file for exact
  ports.
- If you run into an `Invalid protocol` error from Redis, set `REDIS_URL` to
  a full URL (example: `redis://redis:6379`) — some Redis clients require the
  protocol present.

## Contributing

If you change DNS encoding/decoding logic, add unit tests and run formatting
before committing.
