# HMI Engineering Autopilot

AI that doesn't just generate an HMI screen — it understands engineering
dependencies, builds an HMI project representation, runs it against a
virtual machine, detects engineering failures, fixes them where it safely
can, validates the result, and hands it to an engineer for approval.

This is an **engineering automation system**, not a chatbot and not a
screen-generation toy.

## 1. Problem

HMI engineering (Schneider Electric EcoStruxure Operator Terminal Expert
and similar tools) is manual, repetitive, and error-prone: tags get bound
incorrectly, alarms get created without valid tag references, screens get
built without navigation paths, and these mistakes are usually only caught
during commissioning — on the plant floor.

## 2. Solution

A pipeline that treats HMI engineering as a **graph of dependencies**
(tags → objects → screens → alarms → navigation) rather than a pile of
independent files:

```
Existing HMI Project + Templates
        │
        ▼
   Deterministic Parser  (tags / screens / alarms / objects / navigation)
        │
        ▼
   Project Graph (NetworkX)
        │
        ▼
   AI Engineering Planner  (requirement → structured JSON plan)
        │
        ▼
   Deterministic Plan Executor  (HMI Generator)
        │
        ▼
   Virtual HMI Simulator  ⇄  Validation Engine (structural + behavioral)
        │
        ▼
   Self-Correction  (detect → explain → propose fix → re-validate, max 3 cycles)
        │
        ▼
   Engineer Review (approve / feedback / manual edit)
        │
        ▼
   Final HMI Project + Validation Report (export package)
```

## 3. Why it's different

- **Grounded, not hallucinated.** The LLM never invents a tag, screen, or
  engineering fact. Every action it proposes is validated against the
  actual parsed project before it is applied. If something can't be
  grounded, the system returns `UNKNOWN` / `REQUIRES_ENGINEER_INPUT`
  instead of guessing.
- **Deterministic execution.** The LLM produces a structured
  `EngineeringPlan` (Pydantic-validated JSON). A separate, deterministic
  Python layer (`backend/hmi/*`) is the only code that ever mutates the
  project. JSON parsing, graph construction, alarm-threshold comparisons,
  and simulation are never delegated to the LLM.
- **Self-correcting, bounded.** When validation fails (e.g. a missing tag
  binding), the system proposes a grounded correction, applies it, and
  re-validates — capped at 3 cycles so it can never loop forever.
- **Runs with zero API key.** A deterministic mock planner reproduces the
  full requirement → plan → generate → validate → self-correct workflow
  without any LLM credits, for demoing or CI.

## 4. Architecture

| Layer | Responsibility | LLM used? |
|---|---|---|
| `backend/parser` | Parse the neutral JSON project format | No |
| `backend/graph` | Build/query the NetworkX dependency graph | No |
| `backend/ai/planner.py` | Requirement → structured `EngineeringPlan` | Yes (or deterministic mock) |
| `backend/ai/self_correction.py` | Detect issues → propose grounded fixes | Rule-based (LLM-ready) |
| `backend/ai/impact_analyzer.py` | Graph-based change impact | No |
| `backend/hmi/*` | Deterministically executes plans against the project | No |
| `backend/simulator` | Virtual packaging conveyor / motor machine state | No |
| `backend/validation` | Structural + behavioral + scenario validation | No |
| `backend/api` | FastAPI REST + WebSocket surface | — |
| `frontend` | React/TypeScript/Tailwind industrial UI | — |

## 5. Tech stack

- **Backend:** Python, FastAPI, Pydantic v2, NetworkX, WebSockets
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, react-router
- **AI:** Anthropic Claude (optional) via `ANTHROPIC_API_KEY`; deterministic
  mock planner used automatically when no key is configured

## 6. Demo workflow

The bundled demo project is **Packaging Line 01**: a motor/conveyor system
with 8 tags, 3 screens, 4 alarms, and a navigation hierarchy.

1. **Load Project** — the app loads `data/demo_project.json` on startup.
2. **Parse** — Dashboard shows detected tags, screens, objects, alarms.
3. **Project Graph** — Engineering page renders the NetworkX dependency
   graph (Screen → Object → Tag → Alarm columns with relationship lines).
4. **Requirement** — enter (pre-filled):
   > "Add a motor overview screen showing motor speed, temperature and
   > overload status. Add a high-temperature alarm and make the screen
   > accessible from main navigation."
5. **AI Plan** — structured `EngineeringPlan` JSON is generated and shown,
   grounded only in existing tags/screens.
6. **Generate** — plan is applied deterministically; the new screen,
   objects, alarm and navigation link appear in the project.
7. **Virtual HMI** — open the generated "Motor Overview" screen; live
   values stream over WebSocket from the simulator.
8. **Run scenarios** — NORMAL, HIGH_TEMPERATURE, MOTOR_OVERLOAD,
   EMERGENCY_STOP, COMMUNICATION_LOSS. Watch alarms fire live.
9. **Inject Broken Binding** (Validation page) — intentionally removes a
   tag binding from the generated gauge object.
10. **Validation detects it** — `MISSING_BINDING` structural issue, overall
    status FAILS.
11. **AI Auto-Fix** — proposes and applies a grounded correction (re-binds
    to the existing `Motor_01_Speed` tag because it matches the object's
    semantic role), re-validates — PASS.
12. **Approve** — engineer approves (only allowed once validation PASSes).
13. **Export** — downloads a `Generated HMI Engineering Project Package`
    (JSON files + validation/simulation reports, zipped).

## 7. Installation

### Backend

```bash
python -m venv venv
# Windows: venv\Scripts\activate    macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # optional: add ANTHROPIC_API_KEY to use a real LLM
uvicorn backend.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173` (proxies `/api` to `http://localhost:8000`)

### Tests

```bash
pytest tests/ -v
```

20 tests cover the parser, graph, plan execution (including rejection of
invented tags), structural + behavioral + scenario validation, and the
self-correction cycle (including the bounded-retry guarantee).

## 8. Environment variables

See `.env.example`:

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=
MODEL=claude-sonnet-5
```

Leave `ANTHROPIC_API_KEY` blank to run entirely in mock mode — the full
workflow still works, using a deterministic keyword-based planner grounded
in the same project graph.

## 9. Demo scenarios (virtual machine)

| Scenario | Motor | Speed | Temp | Overload | E-Stop | Comms | Expected alarm |
|---|---|---|---|---|---|---|---|
| NORMAL | running | ~72 | ~56°C | off | off | ok | none |
| HIGH_TEMPERATURE | running | ~68 | 90°C | off | off | ok | High Temperature |
| MOTOR_OVERLOAD | stopped | 0 | ~78°C | **on** | off | ok | Motor Overload |
| EMERGENCY_STOP | stopped | 0 | ~50°C | off | **on** | ok | Emergency Stop |
| COMMUNICATION_LOSS | running | ~72 | ~56°C | off | off | **lost** | Communication Loss |

## 10. Validation & self-correction

- **Structural:** missing/invalid tag bindings, invalid alarm tag
  references, broken navigation targets, screens with no navigation path.
- **Behavioral / simulation:** for every scenario above, asserts the
  expected alarm(s) fire and core rules hold (`RULE_ESTOP_STOPS_MOTOR`,
  `RULE_COMM_LOSS_ALARM`, etc. — see `data/rules/engineering_rules.json`).
- **Self-correction:** capped at **3 cycles**. Each cycle re-runs full
  validation; if no correction can be applied (nothing is grounded in
  existing project data), the issue is reported as
  `REQUIRES_ENGINEER_INPUT` rather than guessed at.

## 11. Export format

`GET /api/export` writes to `generated/`:

```
generated/
├── project.json              # full neutral project representation
├── project_graph.json        # NetworkX graph as nodes/edges
├── tags.json
├── screens.json
├── alarms.json
├── validation_report.json
├── simulation_report.json
└── hmi_engineering_project_package.zip
```

This is explicitly a **Generated HMI Engineering Project Package** — a
vendor-neutral structured representation used to demonstrate the workflow.
It is **not** a native Schneider EOTE project file.

## 12. Limitations

- The neutral JSON project format is not a parser/writer for EOTE's actual
  proprietary project format — that structure has not been verified against
  official documentation in this MVP.
- The mock LLM planner uses keyword/role matching, not true NLU. It is
  deliberately simple and fully transparent — every action it proposes is
  still re-validated deterministically before being applied.
- Simulation is a small deterministic state machine with jitter, not a
  physics engine or digital twin.
- Single in-memory project store (no database, no multi-user concurrency).

## 13. Future EOTE adapter (not implemented)

A real Schneider EOTE import/export adapter is architecturally anticipated
(`backend/hmi` already separates "generate against a project model" from
"serialize a project model") but is **not implemented or verified** in this
MVP. Building it would require validated access to EOTE's actual project
file format/APIs. Until then, all claims here are scoped to the neutral
representation.

## 14. Project structure

```
hmi-engineering-autopilot/
├── backend/
│   ├── main.py                  # FastAPI app entrypoint
│   ├── api/                     # routes, request schemas, in-memory store
│   ├── ai/                      # planner, self-correction, impact analysis, LLM client
│   ├── parser/                  # deterministic project JSON parser
│   ├── graph/                   # NetworkX graph builder + queries
│   ├── hmi/                     # deterministic plan executor / generators
│   ├── simulator/                # virtual machine state + scenarios
│   ├── validation/               # structural + behavioral + scenario tests
│   └── models/                  # Pydantic schemas (project + engineering plan)
├── frontend/
│   └── src/
│       ├── pages/                # Dashboard, Engineering, VirtualHmi, Validation, Review
│       ├── components/           # GraphView, Panel, StatusPill
│       └── services/              # API client, ProjectContext
├── data/
│   ├── demo_project.json         # Packaging Line 01 demo project
│   ├── templates/                # motor_card, alarm_panel, navigation_template
│   ├── assets/                   # motor, conveyor, sensor asset definitions
│   └── rules/                    # deterministic engineering rules
├── generated/                    # export output (gitignored except .gitkeep)
├── tests/                        # pytest suite (20 tests)
├── requirements.txt
├── .env.example
└── README.md
```
