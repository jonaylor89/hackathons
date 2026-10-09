SHELL := /bin/bash
.SHELLFLAGS := -eu -o pipefail -c

FRONTEND_HOST ?= 127.0.0.1
FRONTEND_PORT ?= 5174
BACKEND_HOST ?= 127.0.0.1
BACKEND_PORT ?= 8787

RUN_DIR := .run
FRONTEND_PID := $(RUN_DIR)/frontend.pid
BACKEND_PID := $(RUN_DIR)/backend.pid
FRONTEND_LOG := $(RUN_DIR)/frontend.log
BACKEND_LOG := $(RUN_DIR)/backend.log
FRONTEND_URL := http://$(FRONTEND_HOST):$(FRONTEND_PORT)
BACKEND_URL := http://$(BACKEND_HOST):$(BACKEND_PORT)

.PHONY: help up down down-force restart status logs build check bake-discover bake

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "; printf "FastAndSlow commands:\n\n"} /^[a-zA-Z0-9_-]+:.*## / {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

up: ## Start the axum backend and Vite frontend in the background
	@mkdir -p $(RUN_DIR)
	@for file in $(BACKEND_PID) $(FRONTEND_PID); do \
		if [[ -f "$$file" ]] && ! kill -0 "$$(cat "$$file")" 2>/dev/null; then rm -f "$$file"; fi; \
	done
	@if [[ -f $(BACKEND_PID) ]] || [[ -f $(FRONTEND_PID) ]]; then \
		echo "FastAndSlow is already managed by make. Run 'make status' or 'make restart'."; exit 1; \
	fi
	@if lsof -tiTCP:$(BACKEND_PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "Port $(BACKEND_PORT) is already occupied. Use 'make down-force' only if it is a stale FastAndSlow process."; exit 1; \
	fi
	@if lsof -tiTCP:$(FRONTEND_PORT) -sTCP:LISTEN >/dev/null 2>&1; then \
		echo "Port $(FRONTEND_PORT) is already occupied. Override with FRONTEND_PORT=… or use 'make down-force'."; exit 1; \
	fi
	@echo "Starting backend on $(BACKEND_URL)…"
	@nohup cargo run --manifest-path backend/Cargo.toml >$(BACKEND_LOG) 2>&1 & echo $$! >$(BACKEND_PID)
	@ready=0; for _ in $$(seq 1 90); do \
		if curl -fsS $(BACKEND_URL)/health >/dev/null 2>&1; then ready=1; break; fi; sleep 1; \
	done; \
	if [[ $$ready -ne 1 ]]; then \
		echo "Backend failed to become ready. Last log lines:"; tail -30 $(BACKEND_LOG); \
		kill "$$(cat $(BACKEND_PID))" 2>/dev/null || true; rm -f $(BACKEND_PID); exit 1; \
	fi
	@echo "Starting frontend on $(FRONTEND_URL)…"
	@nohup npm run dev -- --host $(FRONTEND_HOST) --port $(FRONTEND_PORT) --strictPort >$(FRONTEND_LOG) 2>&1 & echo $$! >$(FRONTEND_PID)
	@ready=0; for _ in $$(seq 1 60); do \
		if curl -fsS $(FRONTEND_URL) >/dev/null 2>&1; then ready=1; break; fi; sleep 1; \
	done; \
	if [[ $$ready -ne 1 ]]; then \
		echo "Frontend failed to become ready. Last log lines:"; tail -30 $(FRONTEND_LOG); \
		$(MAKE) --no-print-directory down; exit 1; \
	fi
	@echo
	@echo "FastAndSlow is ready:"
	@echo "  Frontend  $(FRONTEND_URL)"
	@echo "  Backend   $(BACKEND_URL)"
	@echo "  Logs      make logs"
	@echo "  Stop      make down"

down: ## Stop services started by make
	@stop_tree() { \
		local pid="$$1"; \
		for child in $$(pgrep -P "$$pid" 2>/dev/null || true); do stop_tree "$$child"; done; \
		kill -TERM "$$pid" 2>/dev/null || true; \
	}; \
	stopped=0; \
	for service in frontend backend; do \
		pid_file="$(RUN_DIR)/$$service.pid"; \
		if [[ -f "$$pid_file" ]]; then \
			pid="$$(cat "$$pid_file")"; \
			if kill -0 "$$pid" 2>/dev/null; then echo "Stopping $$service (PID $$pid)…"; stop_tree "$$pid"; stopped=1; fi; \
			rm -f "$$pid_file"; \
		fi; \
	done; \
	[[ $$stopped -eq 1 ]] && echo "FastAndSlow stopped." || echo "No make-managed services were running."

down-force: down ## Stop managed services and anything listening on the configured ports
	@for port in $(FRONTEND_PORT) $(BACKEND_PORT); do \
		pids="$$(lsof -tiTCP:$$port -sTCP:LISTEN 2>/dev/null || true)"; \
		if [[ -n "$$pids" ]]; then echo "Force-stopping listener(s) on port $$port: $$pids"; kill -TERM $$pids 2>/dev/null || true; fi; \
	done

restart: down up ## Restart both services

status: ## Show process and HTTP readiness status
	@check_service() { \
		local name="$$1" pid_file="$$2" url="$$3"; \
		local process="stopped" http="unreachable"; \
		if [[ -f "$$pid_file" ]] && kill -0 "$$(cat "$$pid_file")" 2>/dev/null; then process="running (PID $$(cat "$$pid_file"))"; fi; \
		if curl -fsS "$$url" >/dev/null 2>&1; then http="ready"; fi; \
		printf "%-10s %-22s %s\n" "$$name" "$$process" "$$http"; \
	}; \
	check_service backend $(BACKEND_PID) $(BACKEND_URL)/health; \
	check_service frontend $(FRONTEND_PID) $(FRONTEND_URL)

logs: ## Follow frontend and backend logs (Ctrl-C exits without stopping services)
	@mkdir -p $(RUN_DIR); touch $(FRONTEND_LOG) $(BACKEND_LOG)
	@tail -n 80 -f $(BACKEND_LOG) $(FRONTEND_LOG)

build: ## Build frontend and compile-check backend
	npm run build
	cargo check --manifest-path backend/Cargo.toml

check: build ## Alias for all build checks

bake-discover: ## Refresh real Deepfire hotspots/perimeters without spread simulation jobs
	npm run bake -- --discover-only

bake: ## Run the complete Deepfire bake, including spread simulations
	npm run bake
