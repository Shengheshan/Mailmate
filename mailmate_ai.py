import json
import requests
from time_normalizer import normalize_time
from consistency_validator import validate_and_repair



from outlook_test import (
    get_access_token,
    get_recent_messages,
    normalize_email,
)


OLLAMA_URL = "http://localhost:11434/api/chat"

MODEL = "qwen3.5:4b"


SYSTEM_PROMPT = """
你是 Mailmate，一个邮件语义理解助手。

你的任务是从邮件中提取结构化信息。

重要：
- 你只负责语义理解和时间原文抽取。
- 不要计算绝对日期。
- tomorrow、Friday、next Monday 等只保留原文到 raw_text。
- 不要编造邮件中不存在的信息。
- 只输出合法 JSON。


1. category

只能选择：

course
research
project
career
administration
other

根据邮件主要目的分类。
如果邮件同时涉及多个领域，选择最主要的一个。


2. importance

只能选择：

high
medium
low

high：
错过可能造成明显损失，或者存在重要且紧迫的任务。

medium：
值得关注或需要处理，但没有明显紧急风险。

low：
普通通知、可选信息，错过通常影响较小。


3. requires_action

表示用户当前是否需要主动完成某个任务。

true / false

只有存在明确或合理推断出的用户任务时才为 true。

可选事项不视为必须行动。

条件性要求只有当条件已经成立时，
才视为当前需要行动。


4. requires_reply

表示用户当前是否需要通过邮件回复发送者。

true / false

只有明确需要用户回复、确认、发送信息时才为 true。

条件性回复不默认视为必须回复。


5. user_deadline

表示用户必须在什么时候之前完成自己的任务。

如果没有：

"user_deadline": null

如果有：

"user_deadline": {
    "raw_text": "邮件中的原始时间表达"
}

不要计算日期。


6. expected_event

表示未来预计会发生的事件，例如：

meeting
interview
tutorial
presentation
system maintenance
application outcome

如果没有：

"expected_event": null

如果有：

"expected_event": {
    "event": "简短事件描述",
    "raw_text": "邮件中的原始时间表达"
}

即使时间依赖历史上下文、当前无法计算，
也仍然保留 raw_text。

user_deadline 和 expected_event 可以同时存在。


7. action

格式：

{
    "type": "...",
    "target": "..."
}

type 只能选择：

none
submit
reply_confirm
reply_availability
reply_interest
send
review
revise
check
read
download
register
attend
complete
confirm
save

如果 requires_action = false：

{
    "type": "none",
    "target": null
}


最终输出格式：

{
    "category": "...",
    "importance": "...",
    "requires_action": true,
    "requires_reply": false,

    "user_deadline": {
        "raw_text": "..."
    },

    "expected_event": {
        "event": "...",
        "raw_text": "..."
    },

    "action": {
        "type": "...",
        "target": "..."
    }
}

不存在的字段使用 null。
"""

def analyze_with_qwen(email):

    for attempt in range(2):

        response = requests.post(
            OLLAMA_URL,
            json=payload,
            timeout=120
        )

        response.raise_for_status()

        data = response.json()

        content = (
            data["message"]
            .get(
                "content",
                ""
            )
            .strip()
        )

        if not content:

            if attempt == 0:
                print(
                    "Qwen 返回空内容，自动重试..."
                )
                continue

            raise ValueError(
                "Qwen 连续两次返回空内容"
            )

        try:
            raw_analysis = json.loads(
                content
            )

        except json.JSONDecodeError:

            if attempt == 0:
                print(
                    "Qwen JSON 非法，自动重试..."
                )
                continue

            print(
                "\nQwen 返回的不是合法 JSON："
            )
            print(
                repr(content)
            )
            raise

        # ==========================
        # Schema + Consistency
        # ==========================

        analysis, validation, needs_retry = (
            validate_and_repair(
                raw_analysis
            )
        )

        if needs_retry:

            print(
                f"\nSchema 校验失败 "
                f"(attempt {attempt + 1})"
            )

            for error in validation[
                "hard_errors"
            ]:
                print(
                    "  -",
                    error
                )

            if attempt == 0:
                print(
                    "自动重新调用 Qwen..."
                )
                continue

            raise ValueError(
                "Qwen 连续两次未通过 Schema 校验"
            )

        # ==========================
        # 时间归一化
        # ==========================

        analysis = apply_time_normalization(
            analysis,
            email
        )

        # ==========================
        # Debug 信息
        # ==========================

        if validation[
            "repair_count"
        ] > 0:

            print(
                f"Validator 修复 "
                f"{validation['repair_count']} 项"
            )

        if validation[
            "warning_count"
        ] > 0:

            print(
                f"Validator 警告 "
                f"{validation['warning_count']} 项"
            )

        return analysis

    raise RuntimeError(
        "Mailmate AI 分析失败"
    )


def apply_time_normalization(analysis, email):
    received_at = email.get("received_at")

    # user_deadline
    deadline = analysis.get("user_deadline")

    if deadline and deadline.get("raw_text"):
        analysis["user_deadline"] = normalize_time(
            raw_text=deadline["raw_text"],
            received_at=received_at
        )

    # expected_event
    expected_event = analysis.get("expected_event")

    if expected_event and expected_event.get("raw_text"):
        event_name = expected_event.get("event")

        normalized = normalize_time(
            raw_text=expected_event["raw_text"],
            received_at=received_at
        )

        normalized["event"] = event_name

        analysis["expected_event"] = normalized

    return analysis


def main():
    print("正在登录 Outlook...")

    access_token = get_access_token()

    print("登录成功。")
    print("正在读取邮箱...\n")

    messages = get_recent_messages(
        access_token,
        top=30
    )

    emails = [
        normalize_email(message)
        for message in messages
    ]

    results = []

    total = len(emails)

    for index, email in enumerate(
        emails,
        start=1
    ):
        print(
            f"[{index}/{total}] "
            f"{email['subject']}"
        )

        try:
            analysis = analyze_with_qwen(
                email
            )

            print(
                json.dumps(
                    analysis,
                    ensure_ascii=False,
                    indent=2
                )
            )

            results.append({
                "message_id":
                    email["message_id"],

                "subject":
                    email["subject"],

                "received_at":
                    email["received_at"],

                "analysis":
                    analysis
            })

        except Exception as e:
            print(
                "分析失败：",
                e
            )

        print(
            "-" * 60
        )

    with open(
        "ai_results.json",
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            results,
            f,
            ensure_ascii=False,
            indent=2
        )

    print(
        "\n分析完成。"
    )

    print(
        "结果已保存到 ai_results.json"
    )



if __name__ == "__main__":
    main()