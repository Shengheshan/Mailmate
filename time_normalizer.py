import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from dateutil.relativedelta import relativedelta


DEFAULT_TIMEZONE = "Australia/Sydney"


WEEKDAYS = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


MONTHS = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}


def parse_received_at(
    received_at,
    timezone=DEFAULT_TIMEZONE
):
    """
    Graph 返回：
    2026-09-29T11:45:52Z

    转成 Sydney 本地时间。
    """

    dt = datetime.fromisoformat(
        received_at.replace(
            "Z",
            "+00:00"
        )
    )

    return dt.astimezone(
        ZoneInfo(timezone)
    )


def next_weekday(
    base_date,
    target_weekday,
    force_next=False
):
    current = base_date.weekday()

    days_ahead = (
        target_weekday - current
    ) % 7

    if force_next and days_ahead == 0:
        days_ahead = 7

    return (
        base_date
        + timedelta(days=days_ahead)
    )


def add_business_days(
    date_value,
    number
):
    result = date_value

    added = 0

    while added < number:
        result += timedelta(days=1)

        # Monday-Friday
        if result.weekday() < 5:
            added += 1

    return result


def parse_time_of_day(text):

    pattern = re.search(
        r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)",
        text,
        re.IGNORECASE
    )

    if not pattern:
        return None

    hour = int(
        pattern.group(1)
    )

    minute = int(
        pattern.group(2) or 0
    )

    am_pm = (
        pattern.group(3)
        .lower()
    )

    if am_pm == "pm" and hour != 12:
        hour += 12

    if am_pm == "am" and hour == 12:
        hour = 0

    return hour, minute


def format_date(dt):
    return dt.strftime(
        "%Y-%m-%d"
    )


def format_datetime(dt):
    return dt.strftime(
        "%Y-%m-%dT%H:%M:%S"
    )


def normalize_time(
    raw_text,
    received_at,
    timezone=DEFAULT_TIMEZONE,
    context=None,
):
    """
    raw_text:
        tomorrow at 6 PM
        next Monday
        this Friday afternoon
        within three business days

    received_at:
        Outlook Graph received_at

    context:
        用于跨邮件信息，比如 interview 日期
    """

    if not raw_text:
        return None

    text = (
        raw_text
        .strip()
        .lower()
    )

    base = parse_received_at(
        received_at,
        timezone
    )

    base_date = base.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )

    result = {
        "raw_text": raw_text,
        "normalized": None,
        "precision": None,
    }

    # =====================================
    # tomorrow
    # =====================================

    if "tomorrow" in text:

        target = (
            base_date
            + timedelta(days=1)
        )

        clock = parse_time_of_day(
            text
        )

        if clock:
            hour, minute = clock

            target = target.replace(
                hour=hour,
                minute=minute
            )

            result["normalized"] = (
                format_datetime(target)
            )

            result["precision"] = (
                "datetime"
            )

        else:
            result["normalized"] = (
                format_date(target)
            )

            result["precision"] = "date"

            if "morning" in text:
                result["time_hint"] = (
                    "morning"
                )

            elif "afternoon" in text:
                result["time_hint"] = (
                    "afternoon"
                )

        return result

    # =====================================
    # within N business days
    # =====================================

    business_match = re.search(
        r"within\s+(\w+|\d+)\s+business\s+days?",
        text
    )

    if business_match:

        number_text = (
            business_match.group(1)
        )

        words = {
            "one": 1,
            "two": 2,
            "three": 3,
            "four": 4,
            "five": 5,
        }

        number = words.get(
            number_text
        )

        if number is None:
            number = int(
                number_text
            )

        target = add_business_days(
            base_date,
            number
        )

        result["normalized"] = (
            format_date(target)
        )

        result["precision"] = "date"

        return result

    # =====================================
    # end of next week
    # =====================================

    if (
        "end of next week"
        in text
    ):

        # 找本周 Monday
        monday = (
            base_date
            - timedelta(
                days=base_date.weekday()
            )
        )

        # 下周 Sunday
        target = (
            monday
            + timedelta(days=13)
        )

        result["normalized"] = (
            format_date(target)
        )

        result["precision"] = "date"

        return result

    # =====================================
    # one day before interview
    # =====================================

    if (
        "one day before"
        in text
        and "interview" in text
    ):

        if (
            context
            and context.get(
                "interview"
            )
        ):

            interview = (
                datetime.fromisoformat(
                    context["interview"]
                )
            )

            target = (
                interview
                - timedelta(days=1)
            )

            result["normalized"] = (
                format_date(target)
            )

            result["precision"] = (
                "date"
            )

            result[
                "resolution_basis"
            ] = "cross_email_context"

        else:
            result[
                "depends_on_context"
            ] = True

        return result

    # =====================================
    # Sunday range:
    # between 1 AM and 3 AM this Sunday
    # =====================================

    range_match = re.search(
        r"between\s+"
        r"(\d{1,2}(?::\d{2})?\s*(?:am|pm))"
        r"\s+and\s+"
        r"(\d{1,2}(?::\d{2})?\s*(?:am|pm))"
        r".*?"
        r"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)",
        text,
        re.IGNORECASE
    )

    if range_match:

        weekday_text = (
            range_match
            .group(3)
            .lower()
        )

        target = next_weekday(
            base_date,
            WEEKDAYS[
                weekday_text
            ],
            force_next=False
        )

        start_clock = (
            parse_time_of_day(
                range_match.group(1)
            )
        )

        end_clock = (
            parse_time_of_day(
                range_match.group(2)
            )
        )

        start = target.replace(
            hour=start_clock[0],
            minute=start_clock[1]
        )

        end = target.replace(
            hour=end_clock[0],
            minute=end_clock[1]
        )

        result["normalized"] = (
            f"{format_datetime(start)}"
            f"/"
            f"{format_datetime(end)}"
        )

        result["precision"] = (
            "datetime_range"
        )

        return result

    # =====================================
    # weekday
    #
    # Friday
    # this Thursday
    # next Monday
    # Wednesday at 2 PM
    # =====================================

    weekday_match = re.search(
        r"\b"
        r"(monday|tuesday|wednesday|thursday|friday|saturday|sunday)"
        r"\b",
        text
    )

    if weekday_match:

        weekday_text = (
            weekday_match
            .group(1)
            .lower()
        )

        force_next = bool(
            re.search(
                r"\bnext\s+"
                + weekday_text
                + r"\b",
                text
            )
        )

        target = next_weekday(
            base_date,
            WEEKDAYS[
                weekday_text
            ],
            force_next=force_next
        )

        clock = parse_time_of_day(
            text
        )

        if clock:

            target = target.replace(
                hour=clock[0],
                minute=clock[1]
            )

            result["normalized"] = (
                format_datetime(target)
            )

            result["precision"] = (
                "datetime"
            )

        else:

            result["normalized"] = (
                format_date(target)
            )

            result["precision"] = (
                "date"
            )

            if "afternoon" in text:
                result["time_hint"] = (
                    "afternoon"
                )

            elif "morning" in text:
                result["time_hint"] = (
                    "morning"
                )

        return result

    # =====================================
    # Explicit date:
    # 14 October at 10 AM
    # 20 October
    # =====================================

    explicit_match = re.search(
        r"\b(\d{1,2})\s+"
        r"(january|february|march|april|may|june|"
        r"july|august|september|october|november|december)"
        r"\b",
        text
    )

    if explicit_match:

        day = int(
            explicit_match.group(1)
        )

        month = MONTHS[
            explicit_match
            .group(2)
            .lower()
        ]

        year = base.year

        target = base_date.replace(
            year=year,
            month=month,
            day=day,
        )

        # 已经过了的话认为是下一年
        if target.date() < base.date():
            target = target.replace(
                year=year + 1
            )

        clock = parse_time_of_day(
            text
        )

        if clock:

            target = target.replace(
                hour=clock[0],
                minute=clock[1]
            )

            result["normalized"] = (
                format_datetime(target)
            )

            result["precision"] = (
                "datetime"
            )

        else:

            result["normalized"] = (
                format_date(target)
            )

            result["precision"] = (
                "date"
            )

        return result

    # =====================================
    # 无法确定
    # =====================================

    result["unresolved"] = True

    return result


if __name__ == "__main__":

    received_at = (
        "2026-09-29T11:45:52Z"
    )

    tests = [
        "tomorrow at 6 PM",
        "by Friday",
        "this Sunday at 11:59 PM",
        "next Monday",
        "this Thursday at 4 PM",
        "next Tuesday",
        "within three business days",
        "by the end of next week",
        "this Friday afternoon",
        "tomorrow morning",
        "14 October at 10 AM",
        "between 1 AM and 3 AM this Sunday",
    ]

    for item in tests:

        print(
            item,
            "=>",
            normalize_time(
                item,
                received_at
            )
        )