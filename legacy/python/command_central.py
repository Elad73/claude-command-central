#!/usr/bin/env python3
import argparse
import json
import os
import random
import shutil
import signal
import sys
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional


RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
CYAN = "\033[36m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
MAGENTA = "\033[35m"
BLUE = "\033[34m"

PHASES = ["PROMPT", "PLAN", "BUILD", "REVIEW", "TEST", "DEPLOY"]
PHASE_COLORS = {
    "PROMPT": BLUE,
    "PLAN": CYAN,
    "BUILD": YELLOW,
    "REVIEW": MAGENTA,
    "TEST": GREEN,
    "DEPLOY": RED,
}
ROOMS = [
    ("INTAKE", (2, 2)),
    ("STRATEGY", (31, 2)),
    ("BUILD BAY", (60, 2)),
    ("REVIEW", (2, 12)),
    ("QA LAB", (31, 12)),
    ("DEPLOY", (60, 12)),
]
ROOM_BY_PHASE = {
    "PROMPT": "INTAKE",
    "PLAN": "STRATEGY",
    "BUILD": "BUILD BAY",
    "REVIEW": "REVIEW",
    "TEST": "QA LAB",
    "DEPLOY": "DEPLOY",
}


def clamp(value: int, lower: int, upper: int) -> int:
    return max(lower, min(value, upper))


def shorten(text: str, width: int) -> str:
    if width <= 0:
        return ""
    if len(text) <= width:
        return text.ljust(width)
    if width <= 2:
        return text[:width]
    return text[: width - 1] + "…"


def visible_len(value: str) -> int:
    out = []
    skip = False
    for ch in value:
        if ch == "\033":
            skip = True
            continue
        if skip:
            if ch == "m":
                skip = False
            continue
        out.append(ch)
    return len("".join(out))


def ansi_fit(text: str, width: int) -> str:
    if width <= 0:
        return ""
    plain = []
    current = []
    skip = False
    for ch in text:
        current.append(ch)
        if ch == "\033":
            skip = True
            continue
        if skip:
            if ch == "m":
                skip = False
            continue
        plain.append(ch)
        if len(plain) >= width:
            break
    rendered = "".join(current)
    plain_text = "".join(plain)
    if len(plain_text) > width:
        plain_text = plain_text[:width]
    if len(plain_text) < width:
        rendered += " " * (width - len(plain_text))
    return rendered


@dataclass
class AgentState:
    name: str
    phase: str = "PROMPT"
    status: str = "idle"
    task: str = "Waiting for assignment"
    updated_at: float = field(default_factory=time.time)

    @property
    def room(self) -> str:
        return ROOM_BY_PHASE.get(self.phase, "INTAKE")


@dataclass
class FlowState:
    title: str = "Claude Code Mission Control"
    objective: str = "Waiting for prompt"
    status: str = "idle"
    progress: int = 0
    updated_at: float = field(default_factory=time.time)


class EventFeed:
    def __init__(self, path: Path):
        self.path = path
        self.offset = 0

    def poll(self) -> List[dict]:
        if not self.path.exists():
            return []
        events = []
        with self.path.open("r", encoding="utf-8") as handle:
            handle.seek(self.offset)
            while True:
                line = handle.readline()
                if not line:
                    break
                self.offset = handle.tell()
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return events


class Dashboard:
    def __init__(self):
        self.flow = FlowState()
        self.agents: Dict[str, AgentState] = {}
        self.log_lines: List[str] = []
        self.tick = 0

    def apply(self, event: dict) -> None:
        now = time.time()
        etype = event.get("type", "log")
        if etype == "flow":
            if "title" in event:
                self.flow.title = event["title"]
            if "objective" in event:
                self.flow.objective = event["objective"]
            if "status" in event:
                self.flow.status = event["status"]
            if "progress" in event:
                self.flow.progress = clamp(int(event["progress"]), 0, 100)
            self.flow.updated_at = now
        elif etype == "agent":
            name = event.get("agent", "unnamed-agent")
            agent = self.agents.get(name, AgentState(name=name))
            if "phase" in event:
                agent.phase = event["phase"].upper()
            if "status" in event:
                agent.status = event["status"]
            if "task" in event:
                agent.task = event["task"]
            agent.updated_at = now
            self.agents[name] = agent
        elif etype == "log":
            message = event.get("message", "")
            if message:
                self.log(message)

        note = event.get("message")
        if note and etype != "log":
            self.log(note)

    def log(self, message: str) -> None:
        stamp = time.strftime("%H:%M:%S")
        self.log_lines.append(f"{stamp}  {message}")
        self.log_lines = self.log_lines[-8:]

    def render(self, width: int, height: int) -> str:
        self.tick += 1
        lines: List[str] = []
        inner_width = max(40, width - 2)
        lines.append(self._border("top", inner_width))
        header = f"{BOLD}{self.flow.title}{RESET}"
        meta = f"{DIM}status:{RESET} {self.flow.status}  {DIM}progress:{RESET} {self.flow.progress}%"
        lines.append(self._boxed(f"{header}  {meta}", inner_width))
        lines.append(self._boxed(shorten(self.flow.objective, inner_width - 2), inner_width))
        lines.append(self._border("mid", inner_width))
        for row in self._render_pipeline(inner_width):
            lines.append(self._boxed(row, inner_width))
        lines.append(self._border("mid", inner_width))
        lines.append(self._boxed(f"{BOLD}Agent Roster{RESET}", inner_width))
        for row in self._render_roster(inner_width, 6):
            lines.append(self._boxed(row, inner_width))
        lines.append(self._border("mid", inner_width))
        office_lines = self._render_office(inner_width)
        for row in office_lines:
            lines.append(self._boxed(row, inner_width))
        lines.append(self._border("mid", inner_width))
        log_title = f"{BOLD}Live Feed{RESET}"
        lines.append(self._boxed(log_title, inner_width))
        log_height = max(4, height - len(lines) - 2)
        for row in self._render_logs(inner_width, log_height):
            lines.append(self._boxed(row, inner_width))
        lines.append(self._border("bottom", inner_width))
        return "\n".join(lines[:height])

    def _border(self, kind: str, inner_width: int) -> str:
        chars = {
            "top": ("╔", "═", "╗"),
            "mid": ("╠", "═", "╣"),
            "bottom": ("╚", "═", "╝"),
        }
        left, fill, right = chars[kind]
        return f"{left}{fill * inner_width}{right}"

    def _boxed(self, content: str, inner_width: int) -> str:
        visible = visible_len(content)
        pad = max(0, inner_width - visible)
        return f"║{content}{' ' * pad}║"

    def _render_pipeline(self, width: int) -> List[str]:
        active_phase = self._dominant_phase()
        chunks = []
        phase_width = max(7, (width - (len(PHASES) - 1) * 3) // len(PHASES))
        for phase in PHASES:
            color = PHASE_COLORS[phase]
            if phase == active_phase:
                pulse = "◉" if self.tick % 2 == 0 else "◎"
            elif PHASES.index(phase) < PHASES.index(active_phase):
                pulse = "●"
            else:
                pulse = "·"
            chunks.append(ansi_fit(f"{color}{pulse} {phase}{RESET}", phase_width))
        return [" → ".join(chunks)]

    def _dominant_phase(self) -> str:
        if not self.agents:
            return "PROMPT"
        latest = max(self.agents.values(), key=lambda agent: agent.updated_at)
        return latest.phase if latest.phase in PHASES else "PROMPT"

    def _render_office(self, width: int) -> List[str]:
        canvas_width = min(88, max(50, width))
        canvas_height = 16
        canvas = [[" " for _ in range(canvas_width)] for _ in range(canvas_height)]

        def draw_text(x: int, y: int, text: str) -> None:
            if y < 0 or y >= canvas_height:
                return
            for idx, ch in enumerate(text):
                xx = x + idx
                if 0 <= xx < canvas_width:
                    canvas[y][xx] = ch

        room_w = 24
        room_h = 6
        for name, (rx, ry) in ROOMS:
            self._draw_room(canvas, rx, ry, room_w, room_h, name)

        hallway = "═" * 82
        draw_text(3, 9, hallway[: max(0, canvas_width - 6)])
        draw_text(44, 6, "║")
        draw_text(44, 7, "║")
        draw_text(44, 8, "║")
        draw_text(44, 10, "║")
        draw_text(44, 11, "║")

        grouped: Dict[str, List[AgentState]] = {}
        for agent in sorted(self.agents.values(), key=lambda item: item.name.lower()):
            grouped.setdefault(agent.room, []).append(agent)

        for room_name, (rx, ry) in ROOMS:
            room_agents = grouped.get(room_name, [])
            for idx, agent in enumerate(room_agents[:3]):
                marker = self._agent_marker(agent)
                task = shorten(agent.name, room_w - 6)
                draw_text(rx + 2, ry + 2 + idx, f"{marker} {task}")

        return ["".join(row).rstrip() for row in canvas]

    def _render_roster(self, width: int, height: int) -> List[str]:
        rows = []
        ordered = sorted(self.agents.values(), key=lambda agent: (-agent.updated_at, agent.name.lower()))
        for agent in ordered[:height]:
            label = f"{agent.name} [{agent.phase}/{agent.status}] {agent.task}"
            rows.append(shorten(label, width))
        while len(rows) < height:
            rows.append("")
        return rows

    def _draw_room(self, canvas: List[List[str]], x: int, y: int, w: int, h: int, title: str) -> None:
        max_y = len(canvas)
        max_x = len(canvas[0]) if canvas else 0
        for xx in range(x, min(x + w, max_x)):
            if 0 <= y < max_y:
                canvas[y][xx] = "═"
            if 0 <= y + h - 1 < max_y:
                canvas[y + h - 1][xx] = "═"
        for yy in range(y, min(y + h, max_y)):
            if 0 <= x < max_x:
                canvas[yy][x] = "║"
            if 0 <= x + w - 1 < max_x:
                canvas[yy][x + w - 1] = "║"
        for corner_x, corner_y, char in [
            (x, y, "╔"),
            (x + w - 1, y, "╗"),
            (x, y + h - 1, "╚"),
            (x + w - 1, y + h - 1, "╝"),
        ]:
            if 0 <= corner_y < max_y and 0 <= corner_x < max_x:
                canvas[corner_y][corner_x] = char
        label = f" {title} "
        start = x + max(1, (w - len(label)) // 2)
        for idx, ch in enumerate(label):
            xx = start + idx
            if 0 <= y < max_y and 0 <= xx < max_x:
                canvas[y][xx] = ch

    def _agent_marker(self, agent: AgentState) -> str:
        age = time.time() - agent.updated_at
        if agent.status in {"blocked", "error"}:
            return "!"
        if age < 2:
            return "*" if self.tick % 2 == 0 else "+"
        if agent.status in {"done", "idle"}:
            return "o"
        return "@"

    def _render_logs(self, width: int, height: int) -> List[str]:
        rows = [shorten(line, width) for line in self.log_lines[-height:]]
        while len(rows) < height:
            rows.append("")
        return rows

def write_event(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(payload) + "\n")


def run_demo(feed_path: Path, reset: bool = False) -> None:
    if reset and feed_path.exists():
        feed_path.unlink()

    title = "Claude Code Command Central"
    objective = "Ship terminal R&D office visualization"
    agents = [
        ("orchestrator", "PROMPT", "active", "Triaging prompt and splitting work"),
        ("researcher", "PLAN", "active", "Mapping requirements to phases"),
        ("coder-a", "BUILD", "active", "Rendering office floor plan"),
        ("reviewer", "REVIEW", "idle", "Waiting for diff"),
        ("qa", "TEST", "idle", "Waiting for runnable build"),
        ("release", "DEPLOY", "idle", "Standing by"),
    ]
    steps = [
        ("Task received from operator", 5),
        ("Orchestrator decomposed the prompt into agent tracks", 15),
        ("Researchers drafted workflow and event schema", 28),
        ("Build bay is drawing the live command office", 46),
        ("Code review started on renderer internals", 63),
        ("QA is validating terminal resize and feed updates", 82),
        ("Deployment lane is preparing handoff instructions", 100),
    ]

    write_event(feed_path, {"type": "flow", "title": title, "objective": objective, "status": "running", "progress": 0})
    for name, phase, status, task in agents:
        write_event(feed_path, {"type": "agent", "agent": name, "phase": phase, "status": status, "task": task, "message": f"{name} moved into {phase.lower()}."})
        time.sleep(0.3)

    dynamic_phases = ["PROMPT", "PLAN", "BUILD", "REVIEW", "TEST", "DEPLOY"]
    for idx, (message, progress) in enumerate(steps):
        phase = dynamic_phases[min(idx, len(dynamic_phases) - 1)]
        write_event(feed_path, {"type": "flow", "status": "running", "progress": progress, "objective": objective, "message": message})
        movers = random.sample(agents, k=min(3, len(agents)))
        for name, _, _, _ in movers:
            task = f"{phase.lower().title()} task {idx + 1}: {message.lower()}"
            agent_status = "active" if phase != "DEPLOY" else "done"
            write_event(feed_path, {"type": "agent", "agent": name, "phase": phase, "status": agent_status, "task": task})
        time.sleep(1.2)

    write_event(feed_path, {"type": "flow", "status": "done", "progress": 100, "objective": "Mission complete", "message": "Task delivered to operator."})
    for name, phase, _, _ in agents:
        write_event(feed_path, {"type": "agent", "agent": name, "phase": phase, "status": "done", "task": "Awaiting next assignment"})


def render_loop(feed_path: Path, fps: int, once: bool, no_alt_screen: bool) -> int:
    dashboard = Dashboard()
    feed = EventFeed(feed_path)
    stop = False
    last_frame = None

    def handle_signal(signum, frame):
        nonlocal stop
        stop = True

    signal.signal(signal.SIGINT, handle_signal)
    signal.signal(signal.SIGTERM, handle_signal)

    if not no_alt_screen:
        sys.stdout.write("\033[?1049h\033[?25l\033[2J")
        sys.stdout.flush()

    try:
        while not stop:
            had_events = False
            for event in feed.poll():
                dashboard.apply(event)
                had_events = True
            cols, rows = shutil.get_terminal_size((120, 36))
            frame = dashboard.render(cols, rows - 1)
            should_redraw = once or had_events or frame != last_frame
            if should_redraw:
                sys.stdout.write("\033[H")
                sys.stdout.write(frame)
                sys.stdout.write("\033[J")
                sys.stdout.flush()
                last_frame = frame
            if once:
                break
            time.sleep(max(0.05, 1 / max(1, fps)))
    finally:
        if not no_alt_screen:
            sys.stdout.write("\033[?25h\033[?1049l")
        else:
            sys.stdout.write("\n")
        sys.stdout.flush()

    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Live terminal command center for agentic workflows.")
    sub = parser.add_subparsers(dest="command", required=True)

    demo = sub.add_parser("demo", help="Write demo events into a feed.")
    demo.add_argument("--feed", default="runtime/demo-feed.jsonl")
    demo.add_argument("--reset", action="store_true")

    watch = sub.add_parser("watch", help="Render the dashboard from an event feed.")
    watch.add_argument("--feed", default="runtime/demo-feed.jsonl")
    watch.add_argument("--fps", type=int, default=6)
    watch.add_argument("--once", action="store_true")
    watch.add_argument("--no-alt-screen", action="store_true")

    emit = sub.add_parser("emit", help="Append a single event into a feed.")
    emit.add_argument("--feed", default="runtime/demo-feed.jsonl")
    emit.add_argument("--type", choices=["flow", "agent", "log"], required=True)
    emit.add_argument("--agent")
    emit.add_argument("--phase")
    emit.add_argument("--status")
    emit.add_argument("--task")
    emit.add_argument("--title")
    emit.add_argument("--objective")
    emit.add_argument("--progress", type=int)
    emit.add_argument("--message")

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base_dir = Path(__file__).resolve().parent
    feed_path = (base_dir / args.feed).resolve()

    if args.command == "demo":
        run_demo(feed_path, reset=args.reset)
        return 0

    if args.command == "watch":
        return render_loop(feed_path, fps=args.fps, once=args.once, no_alt_screen=args.no_alt_screen)

    if args.command == "emit":
        payload = {"type": args.type}
        for key in ["agent", "phase", "status", "task", "title", "objective", "progress", "message"]:
            value = getattr(args, key)
            if value is not None:
                payload[key] = value
        if "phase" in payload:
            payload["phase"] = payload["phase"].upper()
        write_event(feed_path, payload)
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main())
