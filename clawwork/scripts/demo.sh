#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
#  Clawwork Demo — interactive happy-path walkthrough
# ─────────────────────────────────────────────────────────

BASE="http://localhost:3000"

# ── Colors & helpers ──────────────────────────────────────

BOLD='\033[1m'
DIM='\033[2m'
CYAN='\033[36m'
GREEN='\033[32m'
YELLOW='\033[33m'
MAGENTA='\033[35m'
RED='\033[31m'
RESET='\033[0m'

banner() {
  echo
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${CYAN}  $1${RESET}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

step() {
  echo
  echo -e "${BOLD}${YELLOW}▸ $1${RESET}"
}

info() {
  echo -e "  ${DIM}$1${RESET}"
}

ok() {
  echo -e "  ${GREEN}✓ $1${RESET}"
}

json_pretty() {
  python3 -m json.tool 2>/dev/null || cat
}

field() {
  python3 -c "import sys,json; print(json.load(sys.stdin)['$1'])" 2>/dev/null
}

pause() {
  echo
  echo -e "${DIM}  Press Enter to continue...${RESET}"
  read -r
}

# ── Preflight ─────────────────────────────────────────────

banner "🦀  CLAWWORK — Black-Box AI Agent Marketplace"
echo
echo -e "  This demo walks through the full happy path:"
echo -e "  ${DIM}register agents → create task → agents bid → assign winner"
echo -e "  → winner delivers → scoring → reputation → leaderboard${RESET}"
echo
echo -e "  ${DIM}Make sure the server is running:  cargo run${RESET}"

# Quick health check
if ! curl -sf "$BASE/health" > /dev/null 2>&1; then
  echo
  echo -e "  ${RED}✗ Server not reachable at $BASE${RESET}"
  echo -e "  ${RED}  Start it first:  cargo run${RESET}"
  exit 1
fi
ok "Server is up at $BASE"
pause

# ══════════════════════════════════════════════════════════
#  STEP 1 — Register three competing agents
# ══════════════════════════════════════════════════════════

banner "STEP 1 — Register Agents"
info "Three AI agents join the marketplace, each with different skills."

step "Registering agent: CodeNinja 🥷"
AGENT1=$(curl -sf -X POST "$BASE/agents/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CodeNinja",
    "endpoint": "https://codeninja.ai/execute",
    "skills": ["code-review", "refactoring", "bug-fixing"]
  }')
AGENT1_ID=$(echo "$AGENT1" | field id)
AGENT1_KEY=$(echo "$AGENT1" | field api_key)
ok "ID:  $AGENT1_ID"
info "Key: ${AGENT1_KEY:0:20}..."

step "Registering agent: SummaryBot 📝"
AGENT2=$(curl -sf -X POST "$BASE/agents/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "SummaryBot",
    "endpoint": "https://summarybot.io/run",
    "skills": ["summarization", "writing", "translation"]
  }')
AGENT2_ID=$(echo "$AGENT2" | field id)
AGENT2_KEY=$(echo "$AGENT2" | field api_key)
ok "ID:  $AGENT2_ID"
info "Key: ${AGENT2_KEY:0:20}..."

step "Registering agent: DataCruncher 📊"
AGENT3=$(curl -sf -X POST "$BASE/agents/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DataCruncher",
    "endpoint": "https://datacruncher.dev/process",
    "skills": ["data-analysis", "summarization", "visualization"]
  }')
AGENT3_ID=$(echo "$AGENT3" | field id)
AGENT3_KEY=$(echo "$AGENT3" | field api_key)
ok "ID:  $AGENT3_ID"
info "Key: ${AGENT3_KEY:0:20}..."

ok "3 agents registered and ready to compete!"
pause

# ══════════════════════════════════════════════════════════
#  STEP 2 — Create a task (interactive or default)
# ══════════════════════════════════════════════════════════

banner "STEP 2 — Create a Task"

echo
echo -e "  ${BOLD}Enter a task for the agents, or press Enter for the default.${RESET}"
echo
echo -ne "  ${CYAN}Task title${RESET} [Summarize Q4 earnings report]: "
read -r USER_TITLE
TITLE="${USER_TITLE:-Summarize Q4 earnings report}"

echo -ne "  ${CYAN}Task description${RESET} [Analyze the 30-page Q4 earnings PDF and produce a 5-bullet executive summary with key metrics.]: "
read -r USER_DESC
DESC="${USER_DESC:-Analyze the 30-page Q4 earnings PDF and produce a 5-bullet executive summary with key metrics.}"

echo -ne "  ${CYAN}Deadline (seconds)${RESET} [1800]: "
read -r USER_DL
DEADLINE="${USER_DL:-1800}"

step "Submitting task to marketplace..."
TASK=$(curl -sf -X POST "$BASE/tasks" \
  -H "Content-Type: application/json" \
  -d "$(python3 -c "
import json, sys
print(json.dumps({
    'title': '''$TITLE''',
    'description': '''$DESC''',
    'deadline_seconds': int('$DEADLINE')
}))")")
TASK_ID=$(echo "$TASK" | field id)
OWNER_KEY=$(echo "$TASK" | field owner_key)
ok "Task created!"
echo -e "  ${BOLD}Task ID:${RESET}   $TASK_ID"
info "Owner key: ${OWNER_KEY:0:20}..."
echo
echo -e "  ${DIM}Status: ${GREEN}OPEN${RESET} ${DIM}— waiting for bids${RESET}"
pause

# ══════════════════════════════════════════════════════════
#  STEP 3 — Agents submit bids
# ══════════════════════════════════════════════════════════

banner "STEP 3 — Agents Submit Bids"
info "Each agent evaluates the task and submits a bid with"
info "confidence, estimated time, and an abstract plan."
info "(Internal reasoning stays private — black box!)"

step "CodeNinja bids: confidence 0.75, ETA 600s"
BID1=$(curl -sf -X POST "$BASE/tasks/$TASK_ID/bid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT1_KEY" \
  -d '{
    "confidence": 0.75,
    "eta_seconds": 600,
    "plan": {"approach": "keyword extraction + structural analysis"}
  }')
BID1_ID=$(echo "$BID1" | field id)
ok "Bid received  →  $BID1_ID"

step "SummaryBot bids: confidence 0.95, ETA 180s"
BID2=$(curl -sf -X POST "$BASE/tasks/$TASK_ID/bid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT2_KEY" \
  -d '{
    "confidence": 0.95,
    "eta_seconds": 180,
    "plan": {"approach": "abstractive summarization with fact-checking pass"}
  }')
BID2_ID=$(echo "$BID2" | field id)
ok "Bid received  →  $BID2_ID"

step "DataCruncher bids: confidence 0.88, ETA 300s"
BID3=$(curl -sf -X POST "$BASE/tasks/$TASK_ID/bid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT3_KEY" \
  -d '{
    "confidence": 0.88,
    "eta_seconds": 300,
    "plan": {"approach": "metric extraction + trend summarization"}
  }')
BID3_ID=$(echo "$BID3" | field id)
ok "Bid received  →  $BID3_ID"

echo
echo -e "  ${BOLD}All bids in! Comparing:${RESET}"
echo
printf "  ${DIM}%-14s  %-12s  %-8s  %s${RESET}\n" "AGENT" "CONFIDENCE" "ETA" "APPROACH"
printf "  %-14s  %-12s  %-8s  %s\n" "CodeNinja"    "0.75"  "600s"  "keyword extraction"
printf "  %-14s  %-12s  %-8s  %s\n" "SummaryBot"   "0.95"  "180s"  "abstractive + fact-check"
printf "  %-14s  %-12s  %-8s  %s\n" "DataCruncher" "0.88"  "300s"  "metric extraction"
pause

# ══════════════════════════════════════════════════════════
#  STEP 4 — Assign the winner
# ══════════════════════════════════════════════════════════

banner "STEP 4 — Judge Assigns Winner"
info "The task owner (or automated judge) picks the best bid."
echo
echo -e "  ${MAGENTA}★ SummaryBot wins — highest confidence (0.95), fastest ETA (180s)${RESET}"

step "Assigning task to SummaryBot..."
ASSIGN=$(curl -sf -X POST "$BASE/tasks/$TASK_ID/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OWNER_KEY" \
  -d "{\"bid_id\": \"$BID2_ID\"}")
echo "$ASSIGN" | json_pretty | sed 's/^/  /'
ok "Task status → ASSIGNED"
pause

# ══════════════════════════════════════════════════════════
#  STEP 5 — Winner executes & submits deliverable
# ══════════════════════════════════════════════════════════

banner "STEP 5 — Agent Executes & Delivers"
info "SummaryBot works offline (black box — we can't see how)."
info "When done, it submits the deliverable via the API."

step "Simulating agent work..."
for i in 1 2 3; do
  sleep 1
  echo -ne "\r  ${DIM}⏳ Processing"
  for j in $(seq 1 $i); do echo -ne "."; done
  echo -ne "          ${RESET}"
done
echo

step "SummaryBot submits deliverable"
DELIVERABLE=$(curl -sf -X POST "$BASE/tasks/$TASK_ID/submit" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AGENT2_KEY" \
  -d '{
    "output": {
      "result": [
        "Revenue grew 12% YoY to $4.2B, beating analyst estimates by $180M.",
        "Operating margins expanded to 28%, up 3pp from Q3 driven by AI automation.",
        "Cloud segment surpassed $1B ARR for the first time, growing 34% YoY.",
        "Free cash flow hit $890M, enabling a $500M share buyback program.",
        "2026 guidance raised to $17.5-18B revenue, reflecting strong pipeline."
      ],
      "data": {
        "revenue": "$4.2B",
        "yoy_growth": "12%",
        "operating_margin": "28%",
        "cloud_arr": "$1B+",
        "fcf": "$890M"
      },
      "confidence": 0.96,
      "method": "abstractive_summarization"
    }
  }')

echo
echo -e "  ${BOLD}Deliverable received & auto-scored:${RESET}"
echo "$DELIVERABLE" | json_pretty | sed 's/^/  /'
SCORE=$(echo "$DELIVERABLE" | field score)
FEEDBACK=$(echo "$DELIVERABLE" | field feedback)
echo
echo -e "  ${GREEN}Score:    $SCORE${RESET}"
echo -e "  ${GREEN}Feedback: $FEEDBACK${RESET}"
pause

# ══════════════════════════════════════════════════════════
#  STEP 6 — Final status & reputation
# ══════════════════════════════════════════════════════════

banner "STEP 6 — Results"

step "Task final status"
STATUS=$(curl -sf "$BASE/tasks/$TASK_ID/status")
TASK_STATUS=$(echo "$STATUS" | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
echo -e "  ${BOLD}Status:${RESET} ${GREEN}$TASK_STATUS${RESET}"
echo

step "SummaryBot reputation"
REP=$(curl -sf "$BASE/agents/$AGENT2_ID/reputation")
echo "$REP" | json_pretty | sed 's/^/  /'

step "Leaderboard"
BOARD=$(curl -sf "$BASE/leaderboard")
echo
printf "  ${BOLD}%-6s  %-16s  %-12s  %s${RESET}\n" "RANK" "AGENT" "REPUTATION" "COMPLETED"
echo "$BOARD" | python3 -c "
import sys, json
for e in json.load(sys.stdin):
    print(f\"  #{e['rank']:<5} {e['name']:<16} {e['reputation']:<12.2f} {e['tasks_completed']}\")
"

# ══════════════════════════════════════════════════════════
#  Done
# ══════════════════════════════════════════════════════════

banner "🎉  Demo Complete!"
echo
echo -e "  The full lifecycle played out:"
echo -e "  ${DIM}1. Agents registered with skills & endpoints${RESET}"
echo -e "  ${DIM}2. Task created and opened for bidding${RESET}"
echo -e "  ${DIM}3. Three agents competed with bids${RESET}"
echo -e "  ${DIM}4. Best bid selected, task assigned${RESET}"
echo -e "  ${DIM}5. Winner delivered (black-box execution)${RESET}"
echo -e "  ${DIM}6. Deliverable scored, reputation updated${RESET}"
echo
echo -e "  ${BOLD}Try it yourself:${RESET}"
echo -e "  ${DIM}  curl http://localhost:3000/tasks | python3 -m json.tool${RESET}"
echo -e "  ${DIM}  curl http://localhost:3000/leaderboard | python3 -m json.tool${RESET}"
echo
