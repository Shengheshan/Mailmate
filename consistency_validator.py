from copy import deepcopy


VALID_CATEGORIES = {
    "course",
    "research",
    "project",
    "career",
    "administration",
    "other",
}

VALID_IMPORTANCE = {
    "low",
    "medium",
    "high",
}

VALID_ACTION_TYPES = {
    "none",
    "submit",
    "reply_confirm",
    "reply_availability",
    "reply_interest",
    "send",
    "review",
    "revise",
    "check",
    "read",
    "download",
    "register",
    "attend",
    "complete",
    "confirm",
    "save",
}

REPLY_ACTION_TYPES = {
    "reply_confirm",
    "reply_availability",
    "reply_interest",
}


def validate_and_repair(analysis):
    """
    Validator v1

    目标：
    1. 拦截 schema 非法输出
    2. 修复确定性的逻辑矛盾
    3. 删除无证据的时间/事件字段
    4. 不替模型重新判断邮件语义

    返回：
        repaired_analysis
        validation_report
        needs_retry
    """

    result = deepcopy(analysis)

    report = {
        "hard_errors": [],
        "repairs": [],
        "warnings": [],
    }

    # ==================================================
    # 1. 顶层结构检查
    # ==================================================

    required_fields = {
        "category",
        "importance",
        "requires_action",
        "requires_reply",
        "user_deadline",
        "expected_event",
        "action",
    }

    missing_fields = (
        required_fields
        - set(result.keys())
    )

    if missing_fields:
        report["hard_errors"].append({
            "rule": "missing_required_fields",
            "fields": sorted(missing_fields),
        })

    # ==================================================
    # 2. Enum 强校验
    # ==================================================

    category = result.get("category")

    if category not in VALID_CATEGORIES:
        report["hard_errors"].append({
            "rule": "invalid_category",
            "value": category,
            "allowed": sorted(
                VALID_CATEGORIES
            ),
        })

    importance = result.get(
        "importance"
    )

    if importance not in VALID_IMPORTANCE:
        report["hard_errors"].append({
            "rule": "invalid_importance",
            "value": importance,
            "allowed": sorted(
                VALID_IMPORTANCE
            ),
        })

    # ==================================================
    # 3. Boolean 强校验
    # ==================================================

    for field in [
        "requires_action",
        "requires_reply",
    ]:
        value = result.get(field)

        if not isinstance(value, bool):
            report["hard_errors"].append({
                "rule": "invalid_boolean",
                "field": field,
                "value": value,
            })

    # ==================================================
    # 4. Action Schema
    # ==================================================

    action = result.get("action")

    if not isinstance(action, dict):

        report["hard_errors"].append({
            "rule": "invalid_action_object",
            "value": action,
        })

        action = {
            "type": "none",
            "target": None,
        }

        result["action"] = action

    action_type = (
        action.get("type")
        if isinstance(action, dict)
        else "none"
    )

    if action_type not in VALID_ACTION_TYPES:
        report["hard_errors"].append({
            "rule": "invalid_action_type",
            "value": action_type,
            "allowed": sorted(
                VALID_ACTION_TYPES
            ),
        })

    # ==================================================
    # 5. 时间字段必须有原文证据
    # ==================================================

    deadline = result.get(
        "user_deadline"
    )

    if deadline is not None:

        if not isinstance(
            deadline,
            dict
        ):
            report["hard_errors"].append({
                "rule":
                    "invalid_user_deadline_object",
                "value": deadline,
            })

        elif not deadline.get(
            "raw_text"
        ):
            result[
                "user_deadline"
            ] = None

            report["repairs"].append({
                "rule":
                    "deadline_without_evidence_removed"
            })

    expected_event = result.get(
        "expected_event"
    )

    if expected_event is not None:

        if not isinstance(
            expected_event,
            dict
        ):
            report["hard_errors"].append({
                "rule":
                    "invalid_expected_event_object",
                "value": expected_event,
            })

        elif not expected_event.get(
            "raw_text"
        ):
            # 没有原文证据的未来事件，
            # 不允许进入最终状态。
            result[
                "expected_event"
            ] = None

            report["repairs"].append({
                "rule":
                    "event_without_evidence_removed",
                "event":
                    expected_event.get(
                        "event"
                    ),
            })

    # ==================================================
    # 6. 确定性一致性修复
    # ==================================================

    action = result.get("action") or {
        "type": "none",
        "target": None,
    }

    action_type = (
        action.get("type")
        or "none"
    )

    # 有具体 action
    # => 一定需要行动
    if (
        action_type != "none"
        and result.get(
            "requires_action"
        ) is False
    ):
        report["repairs"].append({
            "rule":
                "action_implies_requires_action",
            "before": False,
            "after": True,
            "evidence": action_type,
        })

        result[
            "requires_action"
        ] = True

    # requires_reply
    # => 一定也是 action
    if (
        result.get(
            "requires_reply"
        ) is True
        and result.get(
            "requires_action"
        ) is False
    ):
        report["repairs"].append({
            "rule":
                "reply_implies_action",
            "before": False,
            "after": True,
        })

        result[
            "requires_action"
        ] = True

    # reply_* action
    # => reply + action
    if action_type in REPLY_ACTION_TYPES:

        if result.get(
            "requires_reply"
        ) is not True:

            report["repairs"].append({
                "rule":
                    "reply_action_implies_reply",
                "before":
                    result.get(
                        "requires_reply"
                    ),
                "after": True,
                "evidence": action_type,
            })

            result[
                "requires_reply"
            ] = True

        if result.get(
            "requires_action"
        ) is not True:

            report["repairs"].append({
                "rule":
                    "reply_action_implies_action",
                "before":
                    result.get(
                        "requires_action"
                    ),
                "after": True,
                "evidence": action_type,
            })

            result[
                "requires_action"
            ] = True

    # none action 不允许带 target
    if (
        action_type == "none"
        and action.get(
            "target"
        ) is not None
    ):
        report["repairs"].append({
            "rule":
                "none_action_target_removed",
            "before":
                action.get("target"),
            "after": None,
        })

        result[
            "action"
        ][
            "target"
        ] = None

    # ==================================================
    # 7. 只报警、不自动修
    # ==================================================

    if (
        result.get(
            "requires_action"
        ) is True
        and action_type == "none"
    ):
        report["warnings"].append({
            "rule":
                "action_required_but_type_none"
        })

    if (
        result.get(
            "user_deadline"
        ) is not None
        and result.get(
            "requires_action"
        ) is False
    ):
        # 可能是模型把 event 错放到了 deadline。
        # 不允许 validator 武断改语义。
        report["warnings"].append({
            "rule":
                "deadline_without_action"
        })

    report[
        "hard_error_count"
    ] = len(
        report["hard_errors"]
    )

    report[
        "repair_count"
    ] = len(
        report["repairs"]
    )

    report[
        "warning_count"
    ] = len(
        report["warnings"]
    )

    needs_retry = (
        report[
            "hard_error_count"
        ] > 0
    )

    return (
        result,
        report,
        needs_retry,
    )