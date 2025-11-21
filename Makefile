# RefertoSicuro v2 - Development Makefile
# ========================================

# Variables
DOCKER_COMPOSE = docker-compose -f docker-compose.dev.yml
DOCKER_COMPOSE_PROD = docker-compose -f docker-compose.prod.yml
PYTHON = python3.12
NODE = node
NPM = npm
VENV = venv

# Colors for output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
NC = \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

# ==========================================
# HELP & INFO
# ==========================================

.PHONY: help
help: ## Show this help message
	@echo "$(GREEN)RefertoSicuro v2 - Development Commands$(NC)"
	@echo "========================================"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage: make $(YELLOW)<command>$(NC)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

.PHONY: status
status: ## Show status of all services
	@$(DOCKER_COMPOSE) ps

.PHONY: urls
urls: ## Show all service URLs
	@echo "$(GREEN)Service URLs:$(NC)"
	@echo "========================================"
	@echo "Frontend:           http://localhost:5173"
	@echo "API Gateway:        http://localhost:8000"
	@echo ""
	@echo "$(YELLOW)Microservices:$(NC)"
	@echo "Auth Service:       http://localhost:8010"
	@echo "Reports Service:    http://localhost:8011"
	@echo "Billing Service:    http://localhost:8012"
	@echo "Admin Service:      http://localhost:8013"
	@echo "Analytics Service:  http://localhost:8014"
	@echo "Notification:       http://localhost:8015"
	@echo ""
	@echo "$(YELLOW)Databases:$(NC)"
	@echo "pgAdmin:            http://localhost:5050"
	@echo "Adminer:            http://localhost:8080"
	@echo "Mongo Express:      http://localhost:8081"
	@echo "RedisInsight:       http://localhost:8001"
	@echo ""
	@echo "$(YELLOW)Monitoring:$(NC)"
	@echo "Grafana:            http://localhost:3000"
	@echo "Prometheus:         http://localhost:9090"
	@echo "Jaeger:             http://localhost:16686"
	@echo ""
	@echo "$(YELLOW)Tools:$(NC)"
	@echo "RabbitMQ:           http://localhost:15672"
	@echo "Kong Admin:         http://localhost:8002"
	@echo "Konga:              http://localhost:1337"
	@echo "Swagger UI:         http://localhost:8082"
	@echo "Mailhog:            http://localhost:8025"
	@echo "MinIO:              http://localhost:9001"
	@echo "Portainer:          http://localhost:9002"

# ==========================================
# SETUP & INITIALIZATION
# ==========================================

.PHONY: setup
setup: ## Initial project setup
	@echo "$(GREEN)Setting up RefertoSicuro v2...$(NC)"
	@cp -n .env.example .env || true
	@echo "$(YELLOW)Installing dependencies...$(NC)"
	@$(MAKE) deps
	@echo "$(YELLOW)Creating necessary directories...$(NC)"
	@mkdir -p logs data backups
	@echo "$(GREEN)Setup complete!$(NC)"

.PHONY: deps
deps: ## Install all dependencies
	@echo "$(GREEN)Installing Python dependencies...$(NC)"
	@cd services/auth && pip install -r requirements.txt
	@cd services/reports && pip install -r requirements.txt
	@cd services/billing && pip install -r requirements.txt
	@cd services/admin && pip install -r requirements.txt
	@cd services/analytics && pip install -r requirements.txt
	@cd services/notification && pip install -r requirements.txt
	@echo "$(GREEN)Installing Node dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)Dependencies installed!$(NC)"

# ==========================================
# DOCKER COMPOSE COMMANDS
# ==========================================

.PHONY: up
up: ## Start all services
	@echo "$(GREEN)Starting all services...$(NC)"
	@$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)Services started! Run 'make urls' to see all endpoints$(NC)"

.PHONY: down
down: ## Stop all services
	@echo "$(YELLOW)Stopping all services...$(NC)"
	@$(DOCKER_COMPOSE) down
	@echo "$(GREEN)Services stopped!$(NC)"

.PHONY: restart
restart: ## Restart all services
	@echo "$(YELLOW)Restarting all services...$(NC)"
	@$(DOCKER_COMPOSE) restart
	@echo "$(GREEN)Services restarted!$(NC)"

.PHONY: rebuild
rebuild: ## Rebuild and restart all services
	@echo "$(YELLOW)Rebuilding all services...$(NC)"
	@$(DOCKER_COMPOSE) down
	@$(DOCKER_COMPOSE) build --no-cache
	@$(DOCKER_COMPOSE) up -d
	@echo "$(GREEN)Services rebuilt and started!$(NC)"

.PHONY: logs
logs: ## Show logs from all services
	@$(DOCKER_COMPOSE) logs -f

.PHONY: logs-service
logs-service: ## Show logs for specific service (use SERVICE=auth-service make logs-service)
	@$(DOCKER_COMPOSE) logs -f $(SERVICE)

# ==========================================
# INDIVIDUAL SERVICE CONTROL
# ==========================================

.PHONY: start-infra
start-infra: ## Start only infrastructure services (DB, Redis, RabbitMQ)
	@echo "$(GREEN)Starting infrastructure services...$(NC)"
	@$(DOCKER_COMPOSE) up -d postgres mongodb redis rabbitmq kong-database kong-migration kong

.PHONY: start-monitoring
start-monitoring: ## Start monitoring services
	@echo "$(GREEN)Starting monitoring services...$(NC)"
	@$(DOCKER_COMPOSE) up -d prometheus grafana loki promtail jaeger

.PHONY: start-tools
start-tools: ## Start development tools
	@echo "$(GREEN)Starting development tools...$(NC)"
	@$(DOCKER_COMPOSE) up -d pgadmin adminer mongo-express redisinsight konga swagger-ui mailhog minio portainer

.PHONY: start-services
start-services: ## Start only microservices
	@echo "$(GREEN)Starting microservices...$(NC)"
	@$(DOCKER_COMPOSE) up -d auth-service reports-service billing-service admin-service analytics-service notification-service

.PHONY: start-frontend
start-frontend: ## Start frontend only
	@echo "$(GREEN)Starting frontend...$(NC)"
	@$(DOCKER_COMPOSE) up -d frontend

# ==========================================
# DATABASE OPERATIONS
# ==========================================

.PHONY: db-migrate
db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service alembic upgrade head
	@echo "$(GREEN)Migrations complete!$(NC)"

.PHONY: db-rollback
db-rollback: ## Rollback last migration
	@echo "$(YELLOW)Rolling back last migration...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service alembic downgrade -1
	@echo "$(GREEN)Rollback complete!$(NC)"

.PHONY: db-reset
db-reset: ## Reset database (WARNING: destroys all data)
	@echo "$(RED)WARNING: This will destroy all data!$(NC)"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	@$(DOCKER_COMPOSE) exec postgres psql -U refertosicuro -d refertosicuro_dev -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
	@$(MAKE) db-migrate
	@$(MAKE) db-seed
	@echo "$(GREEN)Database reset complete!$(NC)"

.PHONY: db-seed
db-seed: ## Seed database with test data
	@echo "$(GREEN)Seeding database...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service python scripts/seed_data.py
	@echo "$(GREEN)Database seeded!$(NC)"

.PHONY: db-backup
db-backup: ## Backup database
	@echo "$(GREEN)Backing up database...$(NC)"
	@mkdir -p backups
	@$(DOCKER_COMPOSE) exec postgres pg_dump -U refertosicuro refertosicuro_dev > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup complete!$(NC)"

.PHONY: db-restore
db-restore: ## Restore database from latest backup
	@echo "$(YELLOW)Restoring database from latest backup...$(NC)"
	@$(DOCKER_COMPOSE) exec -T postgres psql -U refertosicuro refertosicuro_dev < $(shell ls -t backups/*.sql | head -1)
	@echo "$(GREEN)Restore complete!$(NC)"

.PHONY: db-shell
db-shell: ## Open PostgreSQL shell
	@$(DOCKER_COMPOSE) exec postgres psql -U refertosicuro -d refertosicuro_dev

.PHONY: mongo-shell
mongo-shell: ## Open MongoDB shell
	@$(DOCKER_COMPOSE) exec mongodb mongosh -u admin -p dev_password_change_me

.PHONY: redis-cli
redis-cli: ## Open Redis CLI
	@$(DOCKER_COMPOSE) exec redis redis-cli

# ==========================================
# TESTING
# ==========================================

.PHONY: test
test: ## Run all tests
	@echo "$(GREEN)Running all tests...$(NC)"
	@$(MAKE) test-unit
	@$(MAKE) test-integration
	@$(MAKE) test-e2e

.PHONY: test-unit
test-unit: ## Run unit tests
	@echo "$(GREEN)Running unit tests...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service pytest tests/unit -v
	@$(DOCKER_COMPOSE) exec reports-service pytest tests/unit -v
	@$(DOCKER_COMPOSE) exec billing-service pytest tests/unit -v

.PHONY: test-integration
test-integration: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service pytest tests/integration -v
	@$(DOCKER_COMPOSE) exec reports-service pytest tests/integration -v

.PHONY: test-e2e
test-e2e: ## Run end-to-end tests
	@echo "$(GREEN)Running e2e tests...$(NC)"
	@cd frontend && npm run test:e2e

.PHONY: test-coverage
test-coverage: ## Generate test coverage report
	@echo "$(GREEN)Generating coverage report...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service pytest --cov=app --cov-report=html tests/
	@echo "$(GREEN)Coverage report generated in htmlcov/$(NC)"

# ==========================================
# CODE QUALITY
# ==========================================

.PHONY: lint
lint: ## Run linters
	@echo "$(GREEN)Running linters...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service ruff check .
	@$(DOCKER_COMPOSE) exec auth-service mypy .
	@cd frontend && npm run lint

.PHONY: format
format: ## Format code
	@echo "$(GREEN)Formatting code...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service black .
	@$(DOCKER_COMPOSE) exec auth-service isort .
	@cd frontend && npm run format

.PHONY: type-check
type-check: ## Run type checking
	@echo "$(GREEN)Running type checks...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service mypy .
	@cd frontend && npm run type-check

# ==========================================
# DEVELOPMENT UTILITIES
# ==========================================

.PHONY: shell
shell: ## Open shell in service (use SERVICE=auth-service make shell)
	@$(DOCKER_COMPOSE) exec $(SERVICE) /bin/sh

.PHONY: python-shell
python-shell: ## Open Python shell in service (use SERVICE=auth-service make python-shell)
	@$(DOCKER_COMPOSE) exec $(SERVICE) python

.PHONY: clean
clean: ## Clean up temporary files and caches
	@echo "$(YELLOW)Cleaning up...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "node_modules" -prune -o -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)Cleanup complete!$(NC)"

.PHONY: prune
prune: ## Remove all containers, volumes, and images
	@echo "$(RED)WARNING: This will remove all Docker resources!$(NC)"
	@echo "Press Ctrl+C to cancel, or Enter to continue..."
	@read confirm
	@$(DOCKER_COMPOSE) down -v --rmi all
	@docker system prune -af
	@echo "$(GREEN)Prune complete!$(NC)"

# ==========================================
# MONITORING & DEBUGGING
# ==========================================

.PHONY: health
health: ## Check health of all services
	@echo "$(GREEN)Checking service health...$(NC)"
	@$(DOCKER_COMPOSE) ps
	@echo ""
	@echo "$(YELLOW)Database connections:$(NC)"
	@$(DOCKER_COMPOSE) exec postgres pg_isready
	@$(DOCKER_COMPOSE) exec redis redis-cli ping
	@$(DOCKER_COMPOSE) exec mongodb mongosh --eval "db.adminCommand('ping')"

.PHONY: metrics
metrics: ## Show service metrics
	@echo "$(GREEN)Opening Grafana dashboards...$(NC)"
	@open http://localhost:3000

.PHONY: traces
traces: ## Show distributed traces
	@echo "$(GREEN)Opening Jaeger UI...$(NC)"
	@open http://localhost:16686

# ==========================================
# PRODUCTION COMMANDS
# ==========================================

.PHONY: build-prod
build-prod: ## Build production images
	@echo "$(GREEN)Building production images...$(NC)"
	@docker-compose -f docker-compose.prod.yml build

.PHONY: deploy
deploy: ## Deploy to production (requires configuration)
	@echo "$(GREEN)Deploying to production...$(NC)"
	@./scripts/deployment/deploy.sh

# ==========================================
# DOCUMENTATION
# ==========================================

.PHONY: docs
docs: ## Generate API documentation
	@echo "$(GREEN)Generating API documentation...$(NC)"
	@$(DOCKER_COMPOSE) exec auth-service python -m app.generate_openapi
	@echo "$(GREEN)Documentation available at http://localhost:8082$(NC)"

.PHONY: diagram
diagram: ## Generate architecture diagram
	@echo "$(GREEN)Generating architecture diagram...$(NC)"
	@docker run --rm -v $(PWD):/data plantuml/plantuml docs/architecture/diagram.puml

# ==========================================
# SHORTCUTS
# ==========================================

.PHONY: u
u: up ## Shortcut for 'make up'

.PHONY: d
d: down ## Shortcut for 'make down'

.PHONY: l
l: logs ## Shortcut for 'make logs'

.PHONY: r
r: restart ## Shortcut for 'make restart'

.PHONY: s
s: status ## Shortcut for 'make status'