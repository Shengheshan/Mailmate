import os
import json
import time
import random

import msal
import requests
from dotenv import load_dotenv


load_dotenv()

CLIENT_ID = os.getenv("MS_CLIENT_ID")
TARGET_EMAIL = os.getenv("TARGET_EMAIL")

AUTHORITY = "https://login.microsoftonline.com/common"

SCOPES = [
    "Mail.Read",
    "Mail.Send",
]

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


# ============================================================
# 40 封固定测试邮件
#
# gold 字段是我们以后给 Mailmate 做自动评测用的标准答案。
# ============================================================

TEST_EMAILS = [

    {
        "subject": "COMP9444 Assignment 2 Released",
        "body": """
Hi,

Assignment 2 has now been released.

The submission deadline is 16 October at 11:59 PM.

Please read the specification carefully before starting.

Best,
COMP9444 Course Team
""",
        "gold": {
            "category": "course",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": "2026-10-16",
            "action": "Submit Assignment 2"
        }
    },

    {
        "subject": "Tutorial Tomorrow",
        "body": """
Hi,

Your tutorial will take place tomorrow at 11 AM.

Please complete the preparation exercises before attending.

Regards,
Tutor
""",
        "gold": {
            "category": "course",
            "importance": "medium",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Complete tutorial preparation"
        }
    },

    {
        "subject": "Research Meeting Rescheduled",
        "body": """
Hi,

Our research meeting has been moved to Wednesday at 2 PM.

Please let me know if the new time does not work for you.

Best,
Dr Chen
""",
        "gold": {
            "category": "research",
            "importance": "medium",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Project Proposal Feedback",
        "body": """
Hi,

I reviewed your project proposal.

The overall direction looks good, but the evaluation section needs more detail.

Please send an updated version by next Monday.

Regards,
Alex
""",
        "gold": {
            "category": "project",
            "importance": "high",
            "requires_action": True,
            "requires_reply": True,
            "deadline": None,
            "action": "Revise evaluation section and send updated proposal"
        }
    },

    {
        "subject": "Lab Access Approved",
        "body": """
Hi,

Your access request for the AI laboratory has been approved.

Your access will become active tomorrow morning.

Regards,
Faculty Administration
""",
        "gold": {
            "category": "administration",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Scholarship Application Reminder",
        "body": """
Dear Student,

Scholarship applications close on 20 October.

Please submit all supporting documents before the deadline.

Regards,
Scholarships Office
""",
        "gold": {
            "category": "administration",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": "2026-10-20",
            "action": "Submit scholarship application documents"
        }
    },

    {
        "subject": "Quiz Results Available",
        "body": """
Hi,

Quiz 2 results are now available.

You can view your mark and feedback through Moodle.

Best,
Course Team
""",
        "gold": {
            "category": "course",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Meeting Request: AI Project",
        "body": """
Hi,

Would you be available for a short meeting this Friday afternoon?

Please reply with a suitable time.

Thanks,
Jason
""",
        "gold": {
            "category": "project",
            "importance": "high",
            "requires_action": True,
            "requires_reply": True,
            "deadline": None,
            "action": "Reply with available meeting time"
        }
    },

    {
        "subject": "Action Required: Confirm Enrolment",
        "body": """
Dear Student,

Please confirm your enrolment details before 5 PM this Thursday.

Regards,
Student Services
""",
        "gold": {
            "category": "administration",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Confirm enrolment details"
        }
    },

    {
        "subject": "Guest Lecture Next Week",
        "body": """
Hi everyone,

We will have a guest lecture next Tuesday on large language model evaluation.

Attendance is optional.

Best,
Course Convenor
""",
        "gold": {
            "category": "course",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Dataset Access Request Update",
        "body": """
Hi,

Your request to access the research dataset is under review.

We expect to provide an update within three business days.

Regards,
Research Support
""",
        "gold": {
            "category": "research",
            "importance": "medium",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Presentation Schedule",
        "body": """
Hi,

Your group presentation is scheduled for 22 October at 3:30 PM.

Please arrive ten minutes early.

Best,
Tutor
""",
        "gold": {
            "category": "course",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": "2026-10-22",
            "action": "Attend group presentation"
        }
    },

    {
        "subject": "Assignment Extension Approved",
        "body": """
Hi,

Your extension request has been approved.

The new submission deadline is 19 October at 11:59 PM.

Regards,
Course Administration
""",
        "gold": {
            "category": "course",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": "2026-10-19",
            "action": "Submit assignment"
        }
    },

    {
        "subject": "Group Project Update",
        "body": """
Hi team,

I have finished the data preprocessing section.

Could someone review it before our meeting tomorrow?

Thanks,
Michael
""",
        "gold": {
            "category": "project",
            "importance": "medium",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Review data preprocessing"
        }
    },

    {
        "subject": "Research Seminar Invitation",
        "body": """
Dear Student,

You are invited to attend our seminar this Thursday at 4 PM.

The topic is retrieval-augmented generation.

Regards,
AI Research Group
""",
        "gold": {
            "category": "research",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Report Feedback Available",
        "body": """
Hi,

Feedback for your recent report is now available.

Please review the comments before beginning the next task.

Best,
Tutor
""",
        "gold": {
            "category": "course",
            "importance": "medium",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Review report feedback"
        }
    },

    {
        "subject": "Course Survey",
        "body": """
Hi,

The end-of-term course survey is now open.

Participation is optional.

Regards,
Course Team
""",
        "gold": {
            "category": "course",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Internship Information Session",
        "body": """
Dear Students,

An internship information session will be held on Monday at 1 PM.

Registration is required if you wish to attend.

Regards,
Careers Team
""",
        "gold": {
            "category": "career",
            "importance": "medium",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Register for internship session"
        }
    },

    {
        "subject": "Server Maintenance Notice",
        "body": """
Hi,

Faculty computing servers will be unavailable between 1 AM and 3 AM this Sunday.

Please save your work beforehand.

Regards,
IT Support
""",
        "gold": {
            "category": "administration",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Request for Updated CV",
        "body": """
Hi,

Could you send me your latest CV before our meeting on Thursday?

PDF format is preferred.

Best,
Sarah
""",
        "gold": {
            "category": "career",
            "importance": "high",
            "requires_action": True,
            "requires_reply": True,
            "deadline": None,
            "action": "Send updated CV"
        }
    },

    {
        "subject": "Office Hours Cancelled",
        "body": """
Hi,

Today's office hours have been cancelled due to illness.

A replacement session will be announced later.

Regards,
Tutor
""",
        "gold": {
            "category": "course",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Exam Timetable Released",
        "body": """
Dear Student,

The final examination timetable has been released.

Please check your exam date and location through the student portal.

Regards,
Examinations Team
""",
        "gold": {
            "category": "course",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Check exam timetable"
        }
    },

    {
        "subject": "Project Milestone Due",
        "body": """
Hi team,

Milestone 2 is due this Sunday at 11:59 PM.

Please make sure the GitHub repository is updated before submission.

Best,
Project Coordinator
""",
        "gold": {
            "category": "project",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Complete and submit project milestone"
        }
    },

    {
        "subject": "Ethics Form Requires Revision",
        "body": """
Hi,

Your ethics application requires a minor revision.

Please update section 4 and resubmit by Friday.

Regards,
Research Office
""",
        "gold": {
            "category": "research",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Revise and resubmit ethics form"
        }
    },

    {
        "subject": "Tutorial Room Change",
        "body": """
Hi,

Tomorrow's tutorial has been moved to Room K17-204.

The start time remains unchanged.

Best,
Teaching Team
""",
        "gold": {
            "category": "course",
            "importance": "medium",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Research Assistant Opportunity",
        "body": """
Hi,

We are looking for a student research assistant for a small NLP project.

Please let me know if you are interested.

Regards,
Dr Wang
""",
        "gold": {
            "category": "career",
            "importance": "medium",
            "requires_action": True,
            "requires_reply": True,
            "deadline": None,
            "action": "Reply if interested in RA position"
        }
    },

    {
        "subject": "Submit Peer Review",
        "body": """
Hi,

Your peer review is due tomorrow at 6 PM.

Please submit it through Moodle.

Best,
Course Team
""",
        "gold": {
            "category": "course",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Submit peer review"
        }
    },

    {
        "subject": "Application Received",
        "body": """
Dear Applicant,

We have received your internship application successfully.

No further action is required at this stage.

Regards,
Recruitment Team
""",
        "gold": {
            "category": "career",
            "importance": "medium",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Interview Invitation",
        "body": """
Hi,

We would like to invite you to an online interview on 14 October at 10 AM.

Please reply to confirm your attendance.

Best,
Recruitment Team
""",
        "gold": {
            "category": "career",
            "importance": "high",
            "requires_action": True,
            "requires_reply": True,
            "deadline": "2026-10-14",
            "action": "Confirm interview attendance"
        }
    },

    {
        "subject": "Interview Confirmation",
        "body": """
Hi,

Thank you for confirming your interview.

The meeting link will be sent one day before the interview.

Regards,
Recruitment Team
""",
        "gold": {
            "category": "career",
            "importance": "medium",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Application Still Under Review",
        "body": """
Hi,

Your application is still under review.

We expect to provide an outcome by the end of next week.

Best,
Recruitment Team
""",
        "gold": {
            "category": "career",
            "importance": "medium",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Documents Required",
        "body": """
Hi,

Please submit your transcript and proof of enrolment by 18 October.

Reply once the documents have been uploaded.

Regards,
HR Team
""",
        "gold": {
            "category": "career",
            "importance": "high",
            "requires_action": True,
            "requires_reply": True,
            "deadline": "2026-10-18",
            "action": "Upload transcript and proof of enrolment"
        }
    },

    {
        "subject": "Weekly Research Update",
        "body": """
Hi,

Please send me a short progress update before Friday afternoon.

A few bullet points will be enough.

Best,
Supervisor
""",
        "gold": {
            "category": "research",
            "importance": "high",
            "requires_action": True,
            "requires_reply": True,
            "deadline": None,
            "action": "Send weekly research update"
        }
    },

    {
        "subject": "Reading List for Next Week",
        "body": """
Hi,

The reading list for next week's seminar is available.

Please read the first two papers before class.

Regards,
Course Convenor
""",
        "gold": {
            "category": "course",
            "importance": "medium",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Read first two papers"
        }
    },

    {
        "subject": "Assignment Clarification",
        "body": """
Hi everyone,

A clarification has been added to Question 3 of the assignment.

Please download the latest specification.

Best,
Course Team
""",
        "gold": {
            "category": "course",
            "importance": "medium",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Download updated assignment specification"
        }
    },

    {
        "subject": "Team Meeting Notes",
        "body": """
Hi team,

I have attached notes from today's project meeting.

Our next action is to finish the evaluation section by Monday.

Thanks,
Daniel
""",
        "gold": {
            "category": "project",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Finish evaluation section"
        }
    },

    {
        "subject": "Cloud Credits Activated",
        "body": """
Hi,

Your student cloud credits have been activated.

The credits expire at the end of the semester.

Regards,
IT Services
""",
        "gold": {
            "category": "administration",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Late Submission Warning",
        "body": """
Hi,

Our records indicate that your assignment has not yet been submitted.

Please submit it before the late penalty increases tomorrow.

Regards,
Course Team
""",
        "gold": {
            "category": "course",
            "importance": "high",
            "requires_action": True,
            "requires_reply": False,
            "deadline": None,
            "action": "Submit overdue assignment"
        }
    },

    {
        "subject": "Academic Writing Workshop",
        "body": """
Dear Student,

Registration is open for next month's academic writing workshop.

Places are limited.

Regards,
Student Development
""",
        "gold": {
            "category": "administration",
            "importance": "low",
            "requires_action": False,
            "requires_reply": False,
            "deadline": None,
            "action": None
        }
    },

    {
        "subject": "Supervisor Meeting Follow-up",
        "body": """
Hi,

Thanks for today's discussion.

Please revise the experiment plan and send it to me before our next meeting.

Best,
Supervisor
""",
        "gold": {
            "category": "research",
            "importance": "high",
            "requires_action": True,
            "requires_reply": True,
            "deadline": None,
            "action": "Revise and send experiment plan"
        }
    },
]


def get_access_token():

    if not CLIENT_ID:
        raise RuntimeError(
            "没有找到 MS_CLIENT_ID，请检查 .env"
        )

    app = msal.PublicClientApplication(
        client_id=CLIENT_ID,
        authority=AUTHORITY,
    )

    result = app.acquire_token_interactive(
        scopes=SCOPES
    )

    if "access_token" not in result:
        print(
            json.dumps(
                result,
                indent=2,
                ensure_ascii=False
            )
        )

        raise RuntimeError(
            "无法获得 access token"
        )

    return result["access_token"]


def send_email(
    access_token,
    subject,
    body
):

    url = f"{GRAPH_BASE_URL}/me/sendMail"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }

    payload = {
        "message": {
            "subject": subject,

            "body": {
                "contentType": "Text",
                "content": body.strip(),
            },

            "toRecipients": [
                {
                    "emailAddress": {
                        "address": TARGET_EMAIL
                    }
                }
            ],
        },

        # 不保存在 Sent Items，
        # 否则我们后面读最近邮件时可能出现发送副本。
        "saveToSentItems": False,
    }

    response = requests.post(
        url,
        headers=headers,
        json=payload,
        timeout=30,
    )

    if response.status_code != 202:

        print(
            "\n发送失败：",
            response.status_code
        )

        print(response.text)

        response.raise_for_status()


def save_gold_labels():

    labels = []

    for index, item in enumerate(
        TEST_EMAILS,
        start=1
    ):

        labels.append({
            "test_id": index,
            "subject": item["subject"],
            **item["gold"]
        })

    with open(
        "gold_labels.json",
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            labels,
            f,
            ensure_ascii=False,
            indent=2,
        )


def main():

    if not TARGET_EMAIL:
        raise RuntimeError(
            "没有找到 TARGET_EMAIL，请检查 .env"
        )

    print(
        f"目标邮箱：{TARGET_EMAIL}"
    )

    print(
        "正在登录 Microsoft..."
    )

    access_token = get_access_token()

    print(
        "\n登录成功。"
    )

    save_gold_labels()

    print(
        "已生成 gold_labels.json\n"
    )

    total = len(TEST_EMAILS)

    for index, item in enumerate(
        TEST_EMAILS,
        start=1
    ):

        try:

            send_email(
                access_token,
                item["subject"],
                item["body"],
            )

            print(
                f"[{index:02d}/{total}] "
                f"已发送："
                f"{item['subject']}"
            )

        except Exception as e:

            print(
                f"\n第 {index} 封发送失败："
            )

            print(e)

            print(
                "\n停止发送，避免重复产生大量邮件。"
            )

            break

        # Graph 也不要暴力连发
        time.sleep(
            random.uniform(
                2.0,
                4.0
            )
        )

    print(
        "\n测试邮件生成结束。"
    )


if __name__ == "__main__":
    main()