"""Synthetic Engineering Data Factory runner.

Generates N synthetic HMI engineering project variants across several
machine-type templates, injects deterministic (seeded) structural defects,
runs them through the REAL structural validator and the REAL self-correction
engine used everywhere else in this app, and reports aggregate counts.

Every number in the result is directly counted from actual validator/
self-correction runs against generated Project objects -- nothing here is a
trained model or a fabricated statistic. Behavioral (simulation-scenario)
validation is intentionally NOT run here: that validator's expected-alarm
logic is hardcoded to the bundled demo machine's specific tag names, so it
would vacuously "pass" for these other machine types rather than genuinely
testing anything -- see README limitations. This factory checks what it can
actually verify: structural integrity and self-correction convergence.
"""
import random

from backend.factory.templates import TEMPLATES
from backend.factory.defect_injector import inject_random_defects
from backend.validation.structural import validate_structural
from backend.validation.validator import run_structural_only_validation
from backend.ai.self_correction import run_self_correction


def run_factory(count: int, seed: int = 42, max_defects: int = 2) -> dict:
    count = max(1, min(count, 500))
    rng = random.Random(seed)
    machine_types = list(TEMPLATES.keys())

    variants = []
    total_defects_injected = 0
    total_auto_corrected = 0
    total_needs_review = 0
    defect_type_counts: dict[str, int] = {}

    for i in range(count):
        machine_type = machine_types[i % len(machine_types)]
        instance_num = (i // len(machine_types)) + 1
        project = TEMPLATES[machine_type](instance_num)

        defects = inject_random_defects(project, rng, max_defects=max_defects)
        for d in defects:
            defect_type_counts[d["type"]] = defect_type_counts.get(d["type"], 0) + 1
        total_defects_injected += len(defects)

        issues_before = validate_structural(project)

        if defects:
            correction = run_self_correction(project, validate_fn=run_structural_only_validation)
            final_status = correction["final_status"]
            issues_after = correction["final_validation"]["structural_issues"]
        else:
            final_status = "PASS" if not issues_before else "FAILED"
            issues_after = issues_before

        if defects:
            if final_status == "PASS":
                total_auto_corrected += 1
            else:
                total_needs_review += 1

        variants.append({
            "id": f"{machine_type}_{instance_num}",
            "machine_type": machine_type,
            "project_name": project.project.name,
            "tag_count": len(project.tags),
            "screen_count": len(project.screens),
            "alarm_count": len(project.alarms),
            "defects_injected": defects,
            "issues_before": len(issues_before),
            "issues_after": len(issues_after),
            "final_status": final_status,
        })

    return {
        "generated": count,
        "validated": count,
        "defective_variants": sum(1 for v in variants if v["defects_injected"]),
        "clean_variants": sum(1 for v in variants if not v["defects_injected"]),
        "total_defects_injected": total_defects_injected,
        "defect_type_counts": defect_type_counts,
        "auto_corrected": total_auto_corrected,
        "needs_review": total_needs_review,
        "machine_type_counts": {mt: sum(1 for v in variants if v["machine_type"] == mt) for mt in machine_types},
        "seed": seed,
        "variants": variants,
    }
