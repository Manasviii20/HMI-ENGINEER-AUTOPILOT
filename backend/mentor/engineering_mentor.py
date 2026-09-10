"""Engineering Mentor -- a grounded Q&A helper.

Answers are always grounded in one of: the actual current project/validation
state, or a small fixed FAQ of engineering-rule explanations
(data/rules/engineering_rules.json plus the concepts this app itself
implements). If an LLM is configured (see backend/ai/llm_client.py), the
question and a compact project snapshot are sent to it for a more natural
answer; the system prompt still forbids inventing facts about the project.
In mock mode, a deterministic keyword-matched FAQ + live project snapshot
is used instead -- so the Mentor still works with zero API key, same as
the rest of the app.
"""
import json
import re

from backend.models.project import Project
from backend.ai.llm_client import llm_client
from backend.graph.project_graph import ProjectGraph
from backend.graph.graph_builder import build_graph
from backend.validation.validator import run_full_validation

FAQ: list[tuple[set[str], str]] = [
    ({"binding", "bind", "bound"}, (
        "A tag binding connects an HMI object (a gauge, value display, trend, "
        "or status indicator) to a live tag so it shows real data. GAUGE, "
        "VALUE_DISPLAY and TREND objects must have a binding -- validation "
        "reports 'MISSING_BINDING' if one is missing. Self-correction can "
        "usually fix this automatically by matching the object's label against "
        "an existing tag's name (see the Validation page)."
    )),
    ({"alarm", "alarms"}, (
        "An alarm watches one tag against a threshold using a condition "
        "(GT/LT/EQ/NEQ) and fires with a severity (LOW/MEDIUM/HIGH/CRITICAL). "
        "Every alarm must reference a real, existing tag -- the planner and "
        "validator both reject an alarm pointing at a tag that doesn't exist."
    )),
    ({"navigation", "nav", "menu"}, (
        "Every generated screen needs at least one navigation link to/from "
        "another screen, or it's unreachable in the running HMI. The "
        "'NO_NAVIGATION_PATH' validation issue flags a screen with no links; "
        "self-correction fixes it by linking the screen back to the Dashboard."
    )),
    ({"validation", "validate", "valid"}, (
        "Validation runs two kinds of checks: structural (tag bindings, alarm "
        "tag references, navigation targets) and behavioral (does each "
        "simulation scenario fire the alarms it should, does E-Stop actually "
        "stop the motor, etc). Both must pass for overall status PASS."
    )),
    ({"selfcorrection", "autofix", "autocorrect", "correction"}, (
        "Self-correction runs up to 3 cycles: detect issues, propose a fix "
        "grounded in existing project data (never an invented tag/screen), "
        "apply it, and re-validate. If no grounded fix can be found for an "
        "issue, it's reported as REQUIRES_ENGINEER_INPUT instead of guessed at."
    )),
    ({"approve", "approval"}, (
        "Approval is only allowed once validation status is PASS. It marks "
        "the project as reviewed and ready to export; any further change to "
        "the project (applying a plan, auto-fixing, or manually breaking a "
        "binding) automatically un-approves it again."
    )),
    ({"export", "package"}, (
        "Export writes the current project, its dependency graph, tags, "
        "screens, alarms, and validation/simulation reports to generated/, "
        "zipped as a 'Generated HMI Engineering Project Package'. This is a "
        "vendor-neutral structured representation, not a native Schneider "
        "EOTE project file -- that would require EOTE's proprietary format spec."
    )),
    ({"overload", "overheating", "temperature", "hot"}, (
        "In the demo machine, MOTOR_OVERLOAD stops the motor and conveyor and "
        "sets Motor_01_Overload true; HIGH_TEMPERATURE keeps it running but "
        "raises Motor_01_Temperature. Try both scenarios on the Virtual HMI "
        "page and watch which alarms fire."
    )),
    ({"script", "scripting"}, (
        "The Script Generator produces neutral IEC 61131-3 structured-text-"
        "style pseudocode for a screen's objects or an alarm's check logic, "
        "grounded in the real tags/objects in your project. It is explicitly "
        "NOT verified against Schneider EOTE's actual scripting runtime, "
        "which this project doesn't have access to -- see the Scripts page."
    )),
    ({"migration", "migrate", "import", "csv"}, (
        "The Migration Assistant imports/exports a generic CSV or JSON tag "
        "list into the neutral project representation. It cannot migrate a "
        "real Schneider EOTE project file, since that proprietary format "
        "spec wasn't available to this project -- see the Migration page."
    )),
]

SYSTEM_PROMPT = (
    "You are an engineering mentor for an HMI engineering tool. Answer the "
    "user's question about THIS project only, using the JSON snapshot given "
    "to you. Never invent tags, screens, alarms, or facts not present in the "
    "snapshot. If you don't know, say so plainly. Keep answers under 120 words."
)


def _project_snapshot(project: Project) -> dict:
    validation = run_full_validation(project)
    return {
        "project_name": project.project.name,
        "tags": [t.name for t in project.tags],
        "screens": [s.id for s in project.screens],
        "alarms": [a.name for a in project.alarms],
        "validation_status": validation["status"],
        "structural_issues": validation["structural_issues"],
    }


def _mock_answer(question: str, project: Project) -> str:
    tokens = set(re.findall(r"[a-z]+", question.lower()))
    matches = [text for keywords, text in FAQ if keywords & tokens]

    validation = run_full_validation(project)
    status_line = f"Current project status: validation is {validation['status']}"
    if validation["structural_issues"]:
        issue_types = ", ".join(sorted({i["type"] for i in validation["structural_issues"]}))
        status_line += f" ({len(validation['structural_issues'])} issue(s): {issue_types})."
    else:
        status_line += " (no structural issues)."

    if matches:
        return matches[0] + "\n\n" + status_line

    return (
        "I don't have a specific answer for that in this demo's FAQ, but here's what I can "
        "ground in your actual project: " + status_line + " Try asking about 'binding', 'alarm', "
        "'navigation', 'validation', 'self-correction', 'approve', 'export', 'script', or 'migration'."
    )


def ask_mentor(question: str, project: Project) -> dict:
    if llm_client.mock_mode:
        return {"answer": _mock_answer(question, project), "mock_mode": True}

    snapshot = _project_snapshot(project)
    user_prompt = f"Question: {question}\n\nProject snapshot:\n{json.dumps(snapshot)}"
    try:
        answer = llm_client.complete_json(SYSTEM_PROMPT, user_prompt, max_tokens=400)
        return {"answer": answer.strip(), "mock_mode": False}
    except Exception:
        return {"answer": _mock_answer(question, project), "mock_mode": True}
