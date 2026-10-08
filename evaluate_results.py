import json

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = BASE_DIR / "data"
RESULTS_DIR = BASE_DIR / "results"

AI_RESULTS_FILE = (
    RESULTS_DIR
    / "ai_results_offline_v1.json"
)

GOLD_FILE = (
    DATA_DIR
    / "offline_gold_v1.json"
)

REPORT_FILE = (
    RESULTS_DIR
    / "evaluation_report_offline_v1.json"
)

RESULTS_DIR.mkdir(
    parents=True,
    exist_ok=True
)

IMPORTANCE_LEVEL = {"low": 0, "medium": 1, "high": 2}

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def normalize_subject(value):
    return (value or "").strip().lower()

def safe_div(a, b):
    return a / b if b else 0.0

def pct(x):
    return f"{x:.1%}"

def get_category_schema(value):
    if isinstance(value, str):
        return value, {value}
    preferred = value.get("preferred")
    acceptable = set(value.get("acceptable") or [])
    if preferred:
        acceptable.add(preferred)
    return preferred, acceptable

def get_action_type(action):
    if not action:
        return "none"
    return action.get("type") or "none"

def get_action_target(action):
    if not action:
        return None
    target = action.get("target")
    return str(target).strip().lower() if target is not None else None

def get_time_obj(container, key):
    value = container.get(key)
    return value if isinstance(value, dict) else None

def has_time_field(container, key):
    return isinstance(container.get(key), dict)

def get_normalized_time(container, key):
    obj = get_time_obj(container, key)
    return obj.get("normalized") if obj else None

def get_precision(container, key):
    obj = get_time_obj(container, key)
    return obj.get("precision") if obj else None

def date_signature(normalized):
    if not normalized or not isinstance(normalized, str):
        return None
    parts = normalized.split("/")
    return tuple(part.strip()[:10] for part in parts)

def binary_stats(pairs):
    tp = fp = tn = fn = 0
    for gold, ai in pairs:
        if gold and ai:
            tp += 1
        elif (not gold) and ai:
            fp += 1
        elif (not gold) and (not ai):
            tn += 1
        else:
            fn += 1
    return {
        "tp": tp, "fp": fp, "tn": tn, "fn": fn,
        "recall": safe_div(tp, tp + fn),
        "precision": safe_div(tp, tp + fp),
        "fn_rate": safe_div(fn, tp + fn),
        "fp_rate": safe_div(fp, fp + tn),
    }

def importance_score(ai, gold):
    if ai not in IMPORTANCE_LEVEL or gold not in IMPORTANCE_LEVEL:
        return 0.0
    d = abs(IMPORTANCE_LEVEL[ai] - IMPORTANCE_LEVEL[gold])
    if d == 0:
        return 1.0
    if d == 1:
        return 0.5
    return 0.0

def main():
    ai_results = load_json(AI_RESULTS_FILE)
    gold_labels = load_json(GOLD_FILE)

    gold_map = {
        normalize_subject(x["subject"]): x
        for x in gold_labels
        if x.get("evaluation", {}).get("include", True)
    }

    matched = []
    unmatched_ai = []
    for item in ai_results:
        gold = gold_map.get(normalize_subject(item.get("subject")))
        if gold is None:
            unmatched_ai.append(item.get("subject"))
        else:
            matched.append((item, gold))

    matched_subjects = {normalize_subject(x.get("subject")) for x, _ in matched}
    missing_gold = [g["subject"] for k, g in gold_map.items() if k not in matched_subjects]

    category_strict_correct = 0
    category_tolerant_correct = 0
    importance_scores = []
    importance_exact = 0
    action_pairs = []
    reply_pairs = []
    action_type_e2e_correct = 0
    action_type_e2e_total = 0

    deadline_pairs = []
    deadline_date_correct = deadline_date_total = 0
    deadline_precision_correct = deadline_precision_total = 0
    deadline_exact_correct = deadline_exact_total = 0

    event_pairs = []
    event_date_correct = event_date_total = 0
    event_precision_correct = event_precision_total = 0
    event_exact_correct = event_exact_total = 0
    context_required_total = context_required_safe = 0

    details = []

    for ai_item, gold in matched:
        subject = ai_item["subject"]
        pred = ai_item.get("analysis") or {}
        row = {"subject": subject, "issues": []}

        # Category: strict + tolerant
        ai_cat = pred.get("category")
        preferred, acceptable = get_category_schema(gold.get("category"))
        strict_ok = ai_cat == preferred
        tolerant_ok = ai_cat in acceptable
        category_strict_correct += int(strict_ok)
        category_tolerant_correct += int(tolerant_ok)
        if not tolerant_ok:
            row["issues"].append({"field": "category", "ai": ai_cat, "preferred": preferred, "acceptable": sorted(acceptable)})

        # Importance: exact + ordinal partial credit
        ai_imp = pred.get("importance")
        gold_imp = gold.get("importance")
        imp_score = importance_score(ai_imp, gold_imp)
        importance_scores.append(imp_score)
        importance_exact += int(ai_imp == gold_imp)
        if imp_score < 1.0:
            row["issues"].append({"field": "importance", "ai": ai_imp, "gold": gold_imp, "partial_score": imp_score})

        # Action detection: false negatives are critical
        gold_action = bool(gold.get("requires_action"))
        ai_action = bool(pred.get("requires_action"))
        action_pairs.append((gold_action, ai_action))
        if gold_action != ai_action:
            row["issues"].append({"field": "requires_action", "ai": ai_action, "gold": gold_action, "severity": "critical" if gold_action and not ai_action else "minor"})

        # Reply detection: false negatives are more costly
        gold_reply = bool(gold.get("requires_reply"))
        ai_reply = bool(pred.get("requires_reply"))
        reply_pairs.append((gold_reply, ai_reply))
        if gold_reply != ai_reply:
            row["issues"].append({"field": "requires_reply", "ai": ai_reply, "gold": gold_reply, "severity": "high" if gold_reply and not ai_reply else "minor"})

        # Action type end-to-end (only where Gold requires action)
        if gold_action:
            action_type_e2e_total += 1
            gold_type = get_action_type(gold.get("action"))
            ai_type = get_action_type(pred.get("action"))
            type_ok = ai_action and ai_type == gold_type
            action_type_e2e_correct += int(type_ok)
            if not type_ok:
                row["issues"].append({"field": "action_type", "ai": ai_type, "gold": gold_type, "ai_requires_action": ai_action})

        # User deadline: detection + date + precision + exact normalized
        gold_has_deadline = has_time_field(gold, "user_deadline")
        ai_has_deadline = has_time_field(pred, "user_deadline")
        deadline_pairs.append((gold_has_deadline, ai_has_deadline))
        if gold_has_deadline and ai_has_deadline:
            gold_norm = get_normalized_time(gold, "user_deadline")
            ai_norm = get_normalized_time(pred, "user_deadline")
            gold_date = date_signature(gold_norm)
            ai_date = date_signature(ai_norm)
            deadline_date_total += 1
            date_ok = gold_date is not None and ai_date is not None and gold_date == ai_date
            deadline_date_correct += int(date_ok)
            deadline_precision_total += 1
            precision_ok = get_precision(pred, "user_deadline") == get_precision(gold, "user_deadline")
            deadline_precision_correct += int(precision_ok)
            if gold_norm is not None:
                deadline_exact_total += 1
                exact_ok = ai_norm == gold_norm
                deadline_exact_correct += int(exact_ok)
            if not date_ok or not precision_ok:
                row["issues"].append({
                    "field": "user_deadline_quality",
                    "ai_normalized": ai_norm, "gold_normalized": gold_norm,
                    "date_match": date_ok,
                    "ai_precision": get_precision(pred, "user_deadline"),
                    "gold_precision": get_precision(gold, "user_deadline"),
                    "precision_match": precision_ok,
                })
        elif gold_has_deadline != ai_has_deadline:
            row["issues"].append({"field": "user_deadline_detection", "ai_has_deadline": ai_has_deadline, "gold_has_deadline": gold_has_deadline, "severity": "critical" if gold_has_deadline and not ai_has_deadline else "minor"})

        # Expected event: softer metric
        gold_has_event = has_time_field(gold, "expected_event")
        ai_has_event = has_time_field(pred, "expected_event")
        event_pairs.append((gold_has_event, ai_has_event))

        gold_event = gold.get("expected_event") if gold_has_event else None
        context_required = bool(gold_event and gold_event.get("depends_on_context"))
        if context_required:
            context_required_total += 1

        if gold_has_event and ai_has_event:
            ai_event = pred["expected_event"]
            if context_required:
                # Current single-email benchmark: keep the event/raw text,
                # but do not invent an absolute date without thread context.
                if ai_event.get("normalized") is None:
                    context_required_safe += 1
                else:
                    row["issues"].append({"field": "context_required_event", "ai_normalized": ai_event.get("normalized"), "gold_normalized": None, "severity": "medium"})
            else:
                gold_norm = gold_event.get("normalized")
                ai_norm = ai_event.get("normalized")
                if gold_norm is not None:
                    event_date_total += 1
                    date_ok = date_signature(gold_norm) == date_signature(ai_norm) and date_signature(gold_norm) is not None
                    event_date_correct += int(date_ok)
                    event_precision_total += 1
                    precision_ok = ai_event.get("precision") == gold_event.get("precision")
                    event_precision_correct += int(precision_ok)
                    event_exact_total += 1
                    exact_ok = ai_norm == gold_norm
                    event_exact_correct += int(exact_ok)
                    if not date_ok or not precision_ok:
                        row["issues"].append({
                            "field": "expected_event_quality",
                            "ai_normalized": ai_norm, "gold_normalized": gold_norm,
                            "date_match": date_ok,
                            "ai_precision": ai_event.get("precision"),
                            "gold_precision": gold_event.get("precision"),
                            "precision_match": precision_ok,
                        })
        elif gold_has_event != ai_has_event:
            row["issues"].append({"field": "expected_event_detection", "ai_has_event": ai_has_event, "gold_has_event": gold_has_event, "severity": "medium" if gold_has_event and not ai_has_event else "low"})

        row["ai_target"] = get_action_target(pred.get("action"))
        row["gold_target"] = get_action_target(gold.get("action"))
        details.append(row)

    total = len(matched)
    action_stats = binary_stats(action_pairs)
    reply_stats = binary_stats(reply_pairs)
    deadline_stats = binary_stats(deadline_pairs)
    event_stats = binary_stats(event_pairs)

    category_strict = safe_div(category_strict_correct, total)
    category_tolerant = safe_div(category_tolerant_correct, total)
    importance_exact_acc = safe_div(importance_exact, total)
    importance_soft = sum(importance_scores) / len(importance_scores) if importance_scores else 0.0
    action_type_e2e = safe_div(action_type_e2e_correct, action_type_e2e_total)
    deadline_date_acc = safe_div(deadline_date_correct, deadline_date_total)
    deadline_precision_acc = safe_div(deadline_precision_correct, deadline_precision_total)
    deadline_exact_acc = safe_div(deadline_exact_correct, deadline_exact_total)
    event_date_acc = safe_div(event_date_correct, event_date_total)
    event_precision_acc = safe_div(event_precision_correct, event_precision_total)
    event_exact_acc = safe_div(event_exact_correct, event_exact_total)
    context_safe_rate = safe_div(context_required_safe, context_required_total)

    # Asymmetric safety components: recall matters more than precision.
    action_safety = 0.80 * action_stats["recall"] + 0.20 * action_stats["precision"]
    reply_safety = 0.75 * reply_stats["recall"] + 0.25 * reply_stats["precision"]
    deadline_safety = 0.80 * deadline_stats["recall"] + 0.20 * deadline_stats["precision"]
    event_f1 = safe_div(2 * event_stats["precision"] * event_stats["recall"], event_stats["precision"] + event_stats["recall"])

    # Transparent product-risk score, not a generic model accuracy.
    risk_score = (
        0.25 * action_safety
        + 0.15 * reply_safety
        + 0.20 * deadline_safety
        + 0.15 * deadline_date_acc
        + 0.10 * action_type_e2e
        + 0.05 * category_tolerant
        + 0.05 * importance_soft
        + 0.05 * event_f1
    )

    report = {
        "matched_samples": total,
        "unmatched_ai_subjects": unmatched_ai,
        "missing_gold_subjects": missing_gold,
        "critical_task_detection": {"action": action_stats, "reply": reply_stats},
        "deadline": {
            "detection": deadline_stats,
            "date_accuracy_when_detected": deadline_date_acc,
            "precision_accuracy_when_detected": deadline_precision_acc,
            "exact_normalized_accuracy_when_detected": deadline_exact_acc,
        },
        "semantic_understanding": {
            "category_strict_accuracy": category_strict,
            "category_tolerant_accuracy": category_tolerant,
            "importance_exact_accuracy": importance_exact_acc,
            "importance_soft_score": importance_soft,
            "action_type_end_to_end_accuracy": action_type_e2e,
        },
        "expected_event": {
            "detection": event_stats,
            "date_accuracy_when_detected": event_date_acc,
            "precision_accuracy_when_detected": event_precision_acc,
            "exact_normalized_accuracy_when_detected": event_exact_acc,
            "context_required_safe_rate": context_safe_rate,
            "context_required_total": context_required_total,
        },
        "risk_weighted_score": risk_score,
        "risk_weighted_score_definition": {
            "action_safety": "0.80*recall + 0.20*precision",
            "reply_safety": "0.75*recall + 0.25*precision",
            "deadline_safety": "0.80*recall + 0.20*precision",
            "overall_weights": {
                "action_safety": 0.25,
                "reply_safety": 0.15,
                "deadline_detection_safety": 0.20,
                "deadline_date_accuracy": 0.15,
                "action_type_end_to_end": 0.10,
                "category_tolerant": 0.05,
                "importance_soft_score": 0.05,
                "event_detection_f1": 0.05,
            },
        },
        "details": details,
    }

    print("\n" + "=" * 68)
    print("MAILMATE EVALUATION V3")
    print("=" * 68)
    print(f"Matched samples: {total}")

    if unmatched_ai:
        print(f"AI results without Gold: {len(unmatched_ai)}")
        for s in unmatched_ai:
            print(f"  - {s}")
    if missing_gold:
        print(f"Gold samples missing from AI results: {len(missing_gold)}")
        for s in missing_gold:
            print(f"  - {s}")

    print("\n[Critical Task Detection]")
    print(f"Action  Recall={pct(action_stats['recall'])}  Precision={pct(action_stats['precision'])}  FN Rate={pct(action_stats['fn_rate'])}  FP Rate={pct(action_stats['fp_rate'])}  (TP={action_stats['tp']}, FN={action_stats['fn']}, FP={action_stats['fp']}, TN={action_stats['tn']})")
    print(f"Reply   Recall={pct(reply_stats['recall'])}  Precision={pct(reply_stats['precision'])}  FN Rate={pct(reply_stats['fn_rate'])}  FP Rate={pct(reply_stats['fp_rate'])}  (TP={reply_stats['tp']}, FN={reply_stats['fn']}, FP={reply_stats['fp']}, TN={reply_stats['tn']})")

    print("\n[Deadline]")
    print(f"Detection Recall:     {pct(deadline_stats['recall'])}")
    print(f"Detection Precision:  {pct(deadline_stats['precision'])}")
    print(f"Date Accuracy:        {pct(deadline_date_acc)}")
    print(f"Precision Accuracy:   {pct(deadline_precision_acc)}")
    print(f"Exact Time Accuracy:  {pct(deadline_exact_acc)}")

    print("\n[Semantic Understanding]")
    print(f"Category Strict:      {pct(category_strict)}")
    print(f"Category Tolerant:    {pct(category_tolerant)}")
    print(f"Importance Exact:     {pct(importance_exact_acc)}")
    print(f"Importance Soft:      {pct(importance_soft)}")
    print(f"Action Type E2E:      {pct(action_type_e2e)}")

    print("\n[Expected Event]")
    print(f"Detection Recall:     {pct(event_stats['recall'])}")
    print(f"Detection Precision:  {pct(event_stats['precision'])}")
    print(f"Date Accuracy:        {pct(event_date_acc)}")
    print(f"Precision Accuracy:   {pct(event_precision_acc)}")
    print(f"Context-safe:         {pct(context_safe_rate)} ({context_required_safe}/{context_required_total})")

    print("\n" + "-" * 68)
    print(f"Risk-weighted Score:  {pct(risk_score)}")
    print("-" * 68)

    problems = [r for r in details if r["issues"]]
    print(f"\nSamples with at least one issue: {len(problems)}/{total}")
    for row in problems:
        print("\n" + row["subject"])
        for issue in row["issues"]:
            print("  -", json.dumps(issue, ensure_ascii=False))

    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\nDetailed report: {REPORT_FILE}")

if __name__ == "__main__":
    main()
