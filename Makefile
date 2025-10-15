.PHONY: help install dev dev-udp build build-udp start start-udp docker-redis docker-compose format format-check clean

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies with Bun
	bun install

dev: ## Run both servers in development mode with watch
	bun run dev

dev-udp: ## Run only UDP server in development mode with watch
	bun run dev:udp

build: ## Build TypeScript to dist/ for Node.js
	bun run build

build-udp: ## Build only UDP server to dist/
	bun run build:udp

start: ## Start built services (requires build first)
	bun run start

start-udp: ## Start only built UDP server
	bun run start:udp

docker-redis: ## Start Redis container on host port 6379
	bun run docker:redis

docker-compose: ## Run app + Redis with docker-compose
	bun run docker:compose

docker-down: ## Stop and remove docker-compose services
	docker-compose down

lint: ## Lint code with ESLint
	bun run lint

lint-fix: ## Lint and auto-fix code with ESLint
	bun run lint:fix

format: ## Format code with Prettier
	bun run format

format-check: ## Check code formatting with Prettier
	bun run format:check

clean: ## Remove build artifacts and node_modules
	rm -rf dist node_modules

test: ## Placeholder for future tests
	@echo "No tests configured yet. Add tests and update this target."

.DEFAULT_GOAL := help
