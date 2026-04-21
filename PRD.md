# Claude Command Central - Product Requirements Document

## 1. Overview

Claude Command Central is a terminal-native live visualization layer for agentic software workflows, designed primarily for Claude Code style multi-phase execution. It renders an animated 2D command office inside the CLI so an operator can see, in real time, which agents are active, where work is happening, how the overall task is progressing, and where the flow is blocked between prompt intake and deploy.

The product exists to solve a visibility gap. Agentic systems often produce useful work, but the operator experiences them as a black box with intermittent textual output. Claude Command Central turns that invisible execution into a durable, glanceable operational view that feels like a live R&D floor rather than a stream of logs.

The initial product is intentionally lightweight:

- standalone Python CLI
- zero external runtime dependencies
- file-based event ingestion via JSONL
- visual dashboard optimized for interactive terminal sessions
- integration-friendly command interface for wrappers, scripts, and orchestrators

**Primary Value Proposition:** Make agentic task execution observable, inspectable, and emotionally legible in real time without requiring a web app, daemon, database, or heavyweight orchestration platform.

**Tech Stack:** Python 3, ANSI terminal rendering, JSONL event feed, shell integration

**Deployment Model:** Local CLI tool, run directly from a repository or copied into another project

**Primary Users:**

- solo developers using Claude Code or similar coding agents
- technical operators running scripted multi-phase task flows
- teams experimenting with agent orchestration who need instant runtime visibility
- product/engineering leads demoing agentic workflows live in a terminal

## 2. Problem Statement

Current agentic coding workflows have three major observability problems:

1. The operator cannot easily tell what stage the system is in.
2. Multiple agents or phases are hard to differentiate in plain-text output.
3. There is no compact visual model of overall task health, momentum, or blockage.

This causes practical friction:

- uncertainty about whether work is progressing or stalled
- poor demoability for agentic workflows
- weak debugging ergonomics when orchestration is misbehaving
- fragmented status understanding across prompts, shell scripts, logs, and tooling

Claude Command Central addresses these issues by providing a shared visual language for runtime agent activity in the terminal itself.

## 3. Product Vision

The product should feel like a command center for software R&D:

- a live floor plan with rooms mapped to workflow phases
- agents moving through those rooms as work changes
- a clear task pipeline from prompt to deploy
- a visible roster showing each agent’s current focus
- a compact event feed for narrative context

The operator should be able to glance at the terminal for two seconds and answer:

- What task is currently being worked on?
- Which phase is active?
- Which agents are involved?
- What are they doing right now?
- Is the flow healthy, blocked, or complete?

## 4. Goals

| Goal | Metric | Target |
|------|--------|--------|
| Make task progress legible at a glance | Operator can identify active phase within 2 seconds | 95% of demo sessions |
| Reduce integration friction | Time to connect an existing project to live visualization | <= 15 minutes with docs |
| Keep runtime overhead minimal | Additional CPU/memory impact during watch mode | Negligible on a normal developer machine |
| Preserve portability | External dependencies required to run MVP | 0 |
| Improve demo/readability value | Dashboard remains usable in a standard terminal window | 100+ column terminal supported |

## 5. Non-Goals

The MVP does not aim to:

- become a full orchestration engine
- schedule or control agents directly
- persist historical analytics in a database
- expose a browser UI
- replace logs, tracing, or APM tools
- infer agent state from arbitrary terminal output automatically

Those may become future roadmap items, but they are explicitly outside MVP scope.

## 6. User Personas

### 6.1 Solo Agentic Developer

Runs Claude Code or a custom agent loop locally and wants immediate confidence that the task is moving through planning, implementation, review, testing, and deploy in a coherent way.

### 6.2 Workflow Builder

Has scripts, prompts, or orchestration layers already in place and needs a dead-simple surface to push lifecycle events into a visual system without adopting extra infrastructure.

### 6.3 Technical Demo Operator

Needs a compelling terminal-native visual experience for live demos, stakeholder reviews, or recorded walkthroughs that makes agent activity feel concrete and understandable.

## 7. Core User Stories

### 7.1 Watch Live Agent Activity

As an operator, I want to launch a dashboard and see agentic work happening live, so that I can monitor execution without reading raw logs continuously.

### 7.2 Understand What Each Agent Is Doing

As an operator, I want to see a per-agent roster with current phase, status, and task description, so that I can understand workload distribution and current focus.

### 7.3 See Workflow Progress

As an operator, I want a visual prompt-to-deploy pipeline with progress and status, so that I can understand overall task state quickly.

### 7.4 Integrate With Existing Tooling

As a workflow builder, I want to emit simple events from shell scripts or orchestrators, so that I can adopt the visualization without redesigning my system.

### 7.5 Demonstrate Agentic Execution

As a demo operator, I want the terminal UI to feel intentional and cinematic rather than like debug output, so that the experience communicates sophistication and control.

## 8. Functional Requirements

### 8.1 Live Dashboard Rendering

**Description:** The system must render a continuously updating terminal dashboard from an event feed.

**Acceptance Criteria:**

- [ ] `watch` mode reads from a JSONL feed path and refreshes the UI continuously.
- [ ] The dashboard renders a title, objective, flow status, and progress percentage.
- [ ] The dashboard updates without requiring manual refresh.
- [ ] The dashboard handles an empty or not-yet-created feed without crashing.
- [ ] The dashboard exits cleanly on interrupt signals.

### 8.2 2D Command Office Visualization

**Description:** The UI must represent the workflow as a floor plan with rooms mapped to phases.

**Acceptance Criteria:**

- [ ] The office includes dedicated rooms for prompt intake, planning, build, review, test, and deploy.
- [ ] Agents appear inside the room that corresponds to their latest phase.
- [ ] Active agents visibly pulse or otherwise look “live.”
- [ ] Blocked or errored states are visually differentiated from normal active states.
- [ ] The visualization remains readable in a standard terminal width.

### 8.3 Pipeline Strip

**Description:** The dashboard must show the end-to-end workflow as a linear strip from prompt to deploy.

**Acceptance Criteria:**

- [ ] The strip shows all core workflow phases in order.
- [ ] Completed phases are visually distinct from pending phases.
- [ ] The active phase is highlighted.
- [ ] The pipeline reflects current progress/state using the latest known events.

### 8.4 Agent Roster

**Description:** The dashboard must show a compact roster summarizing per-agent state.

**Acceptance Criteria:**

- [ ] Each visible agent shows name, phase, status, and current task summary.
- [ ] The roster prioritizes recently updated agents.
- [ ] Long task strings are truncated gracefully.
- [ ] The roster remains readable under common terminal widths.

### 8.5 Live Event Feed

**Description:** The dashboard must show recent narrative events as a compact feed.

**Acceptance Criteria:**

- [ ] `message` events appear in a timestamped log area.
- [ ] Flow and agent events may optionally add a log message.
- [ ] The log retains only a bounded number of recent entries.
- [ ] Missing or malformed lines do not crash the dashboard.

### 8.6 Event Emission CLI

**Description:** The product must provide a convenient command for appending valid events into a feed.

**Acceptance Criteria:**

- [ ] `emit` supports `flow`, `agent`, and `log` event types.
- [ ] `emit` creates parent directories when needed.
- [ ] Phase names are normalized for consistency.
- [ ] The CLI exits non-destructively and predictably on invalid arguments.

### 8.7 Demo Mode

**Description:** The product must include a built-in simulation so users can see the experience immediately.

**Acceptance Criteria:**

- [ ] `demo` populates a feed with a believable sequence of events.
- [ ] Demo mode can reset a feed before replay.
- [ ] Demo mode exercises multiple phases and agents.
- [ ] Demo mode ends in a completed state.

### 8.8 Integration Example

**Description:** The project must include a minimal real-world integration pattern.

**Acceptance Criteria:**

- [ ] A shell-based example demonstrates feed creation and event emission.
- [ ] The example uses the same public CLI the end user will use.
- [ ] The example is documented and runnable with minimal edits.

## 9. Workflow Model

The MVP standardizes on six visible phases:

1. `PROMPT`
2. `PLAN`
3. `BUILD`
4. `REVIEW`
5. `TEST`
6. `DEPLOY`

These phases are opinionated defaults, not a full ontology. They should map cleanly to most Claude Code style loops and remain easy to understand in demos.

### Status Model

Supported status semantics for MVP:

- `idle`
- `active`
- `blocked`
- `done`
- `error`

The system should treat status as presentation state rather than business logic. Producers remain free to define orchestration semantics outside the dashboard.

## 10. Event Ingestion Contract

The system ingests newline-delimited JSON objects from a single append-only feed file.

### 10.1 Event Types

| Type | Purpose |
|------|---------|
| `flow` | Updates title, objective, progress, or overall task status |
| `agent` | Updates a named agent’s phase, status, or task |
| `log` | Appends a plain narrative message to the live feed |

### 10.2 Feed Principles

- A producer can be any script, wrapper, or orchestrator.
- The dashboard is read-only relative to the target project.
- Malformed lines should be ignored rather than treated as fatal.
- The latest event for a given agent defines that agent’s current rendered state.
- The latest `flow` event defines top-level task state.

## 11. UX Requirements

### 11.1 Experience Principles

- Glanceable before it is comprehensive
- Cinematic without being fragile
- Informative without requiring mouse interaction
- Useful in both demos and real work
- Understandable even when only partially configured

### 11.2 Visual Direction

The CLI should evoke an R&D operations room rather than a plain dashboard. That means:

- strong room boundaries
- intentional spatial layout
- animated markers for active work
- clear separation between strategic overview and local agent state

### 11.3 Terminal Behavior

- Use an alternate screen in live mode when appropriate.
- Support a non-alternate-screen snapshot mode for scripting and debugging.
- Handle terminal resize gracefully where feasible.
- Remain readable in smaller terminals by truncating rather than breaking.

## 12. Technical Requirements

### 12.1 Runtime Constraints

- Must run on standard `python3` without pip-installed packages.
- Must work in local developer environments without network access.
- Must not require a background server or daemon.

### 12.2 Performance

| Requirement | Target | Notes |
|-------------|--------|-------|
| UI refresh cadence | 4-10 FPS | Smooth enough for live updates without waste |
| Feed polling behavior | Lightweight | Safe for local append-only files |
| Startup time | Near-instant | Typical local CLI expectations |
| Memory footprint | Low | Suitable for concurrent terminal use |

### 12.3 Reliability

- Missing feed files must not crash watch mode.
- Partial writes or malformed JSON lines must be skipped safely.
- Interrupt and terminate signals should restore terminal state cleanly.

## 13. Security and Safety

This product is low-risk by design because it is local, file-based, and read-mostly.

### Requirements

- The dashboard must not execute payloads from the event feed.
- The renderer must treat event content as display text only.
- Documentation must discourage logging secrets, tokens, or sensitive payloads into the feed.
- The tool must not modify a connected project except through explicit user-invoked `emit` operations or direct feed writes by that project.

### Security Notes

- Secrets entered into the feed are visible on-screen and may be persisted in the file.
- Event producers should avoid writing credentials, tokens, PII, or proprietary code snippets into messages unless explicitly intended.

## 14. Project Structure Requirements

The project repository should include:

- a single primary executable entrypoint
- runtime feed examples
- integration examples
- user documentation
- product documentation

Minimum required files for MVP:

- `command_central.py`
- `README.md`
- `PRD.md`
- `examples/project_hook.sh`

## 15. MVP Scope

### In Scope

- terminal dashboard renderer
- agent roster
- office floor plan
- progress pipeline
- JSONL feed reader
- event emitter command
- demo mode
- shell integration example
- written setup and integration documentation

### Out of Scope

- web UI
- historical playback mode
- event persistence beyond raw feed file
- multi-feed aggregation
- terminal input controls
- filtering, search, or drill-down panels
- native Claude Code protocol integration
- automatic parsing of arbitrary stdout/stderr

## 16. Future Roadmap

### Phase 2

- historical session replay
- richer room occupancy and motion
- multiple concurrent tasks or lanes
- richer status icons and color themes
- summarized blocker detection

### Phase 3

- adapters for known orchestrators
- direct integration with issue/PR systems
- split-pane detail views
- timeline scrubber or event replay mode
- pluggable phase definitions and custom room layouts

### Phase 4

- browser companion mode
- collaborative viewing
- telemetry export
- task analytics and duration reporting

## 17. Success Metrics

The MVP is successful if:

- a new user can run the demo in under 2 minutes
- a technically capable user can connect a project feed in under 15 minutes
- the dashboard remains stable during a normal live session
- the UI communicates phase and agent state more clearly than raw logs alone
- the tool is compelling enough to use in demos, recordings, or local development loops

## 18. Definition of Done

- [ ] Live dashboard renders from a JSONL feed
- [ ] Demo mode produces a believable animated run
- [ ] `emit` supports flow, agent, and log events
- [ ] Office visualization maps phases to rooms
- [ ] Agent roster shows current tasks
- [ ] Pipeline strip communicates lifecycle state
- [ ] README explains quick start and project integration
- [ ] Example hook script works as a template for real projects
- [ ] Terminal cleanup works correctly on exit
- [ ] No external dependencies are required for MVP

## 19. Open Questions

- Should future versions support custom phase names without losing the office metaphor?
- Should the product eventually consume structured events from Claude Code directly if a stable interface exists?
- Should replay/history be file-based only, or should a lightweight local state store be introduced later?
- Is the primary long-term value in demos, observability, or orchestration debugging?

## 20. Summary

Claude Command Central is a terminal-native observability product for agentic execution. Its job is not to run the workflow; its job is to make the workflow visible, legible, and operationally intuitive in real time. The MVP should remain small, dependency-free, visually distinctive, and easy to attach to any project capable of emitting structured task events.
