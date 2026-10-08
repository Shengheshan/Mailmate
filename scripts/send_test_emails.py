import os
import ssl
import time
import random
import smtplib

from email.mime.text import MIMEText
from email.header import Header
from email.utils import formataddr
from dotenv import load_dotenv


load_dotenv()

QQ_EMAIL = os.getenv("QQ_EMAIL")
QQ_AUTH_CODE = os.getenv("QQ_SMTP_AUTH_CODE")
TARGET_EMAIL = os.getenv("TARGET_EMAIL")

SMTP_HOST = "smtp.qq.com"
SMTP_PORT = 465


emails = [
    {
        "subject": "COMP9444 Assignment 2 Released",
        "body": """Hi,

Assignment 2 has now been released on Moodle.

The submission deadline is Friday, 16 October at 11:59 PM.

Please make sure to read the specification carefully before starting.

Best,
Course Team"""
    },
    {
        "subject": "Reminder: Tutorial Tomorrow",
        "body": """Hi,

This is a reminder that your tutorial will take place tomorrow at 11:00 AM.

Please complete the preparation exercises before attending.

Regards,
Teaching Team"""
    },
    {
        "subject": "Research Meeting Rescheduled",
        "body": """Hi,

Our research meeting has been moved to Wednesday at 2:00 PM.

Please let me know if the new time does not work for you.

Best,
Dr. Chen"""
    },
    {
        "subject": "Project Proposal Feedback",
        "body": """Hi,

I reviewed your project proposal.

The overall direction looks good, but the evaluation section needs more detail.

Please send me an updated version by next Monday.

Regards,
Alex"""
    },
    {
        "subject": "Lab Access Approved",
        "body": """Hi,

Your access request for the AI laboratory has been approved.

Your access will become active from tomorrow morning.

Regards,
Faculty Administration"""
    },
    {
        "subject": "Scholarship Application Reminder",
        "body": """Dear Student,

This is a reminder that scholarship applications close on 20 October.

Please submit all supporting documents before the deadline.

Regards,
Scholarships Office"""
    },
    {
        "subject": "COMP9311 Quiz Results",
        "body": """Hi,

Quiz 2 results are now available.

You can view your mark and feedback through Moodle.

Best,
COMP9311 Team"""
    },
    {
        "subject": "Meeting Request: AI Project",
        "body": """Hi,

Would you be available for a short meeting this Friday afternoon to discuss the AI project?

Please reply with a suitable time.

Thanks,
Jason"""
    },
    {
        "subject": "Action Required: Confirm Enrolment",
        "body": """Dear Student,

Please confirm your enrolment details before 5 PM this Thursday.

No action is required if all information is already correct.

Regards,
Student Services"""
    },
    {
        "subject": "Guest Lecture Next Week",
        "body": """Hi everyone,

We will have a guest lecture next Tuesday on large language model evaluation.

Attendance is optional but strongly recommended.

Best,
Course Convenor"""
    },
    {
        "subject": "Dataset Access Request",
        "body": """Hi,

Your request to access the research dataset is currently under review.

We expect to provide an update within three business days.

Regards,
Research Support"""
    },
    {
        "subject": "Presentation Schedule",
        "body": """Hi,

Your group presentation is scheduled for 22 October at 3:30 PM.

Please arrive ten minutes early.

Best,
Tutor"""
    },
    {
        "subject": "Assignment Extension Approved",
        "body": """Hi,

Your extension request has been approved.

The new submission deadline is 19 October at 11:59 PM.

Regards,
Course Administration"""
    },
    {
        "subject": "Group Project Update",
        "body": """Hi team,

I have finished the data preprocessing section.

Could someone review it before our meeting tomorrow?

Thanks,
Michael"""
    },
    {
        "subject": "Invitation to Research Seminar",
        "body": """Dear Student,

You are invited to attend our research seminar this Thursday at 4 PM.

The topic will be retrieval-augmented generation.

Regards,
AI Research Group"""
    },
    {
        "subject": "Feedback Available",
        "body": """Hi,

Feedback for your recent report is now available.

Please review the comments before beginning the next task.

Best,
Tutor"""
    },
    {
        "subject": "Course Survey",
        "body": """Hi,

The end-of-term course survey is now open.

It should take approximately five minutes to complete.

Regards,
Course Team"""
    },
    {
        "subject": "Internship Information Session",
        "body": """Dear Students,

An internship information session will be held on Monday at 1 PM.

Registration is required.

Regards,
Careers Team"""
    },
    {
        "subject": "Server Maintenance Notice",
        "body": """Hi,

The faculty computing servers will be unavailable from 1 AM to 3 AM this Sunday.

Please save your work before the maintenance window.

Regards,
IT Support"""
    },
    {
        "subject": "Request for Updated CV",
        "body": """Hi,

Could you please send me your latest CV before our meeting on Thursday?

PDF format is preferred.

Best,
Sarah"""
    },
    {
        "subject": "Office Hours Cancelled",
        "body": """Hi,

Today's office hours have been cancelled due to illness.

A replacement session will be announced later.

Regards,
Tutor"""
    },
    {
        "subject": "Exam Timetable Released",
        "body": """Dear Student,

The final examination timetable has been released.

Please check your exam date and location through the student portal.

Regards,
Examinations Team"""
    },
    {
        "subject": "Project Milestone Due",
        "body": """Hi team,

Milestone 2 is due this Sunday at 11:59 PM.

Please make sure the GitHub repository is updated before submission.

Best,
Project Coordinator"""
    },
    {
        "subject": "Ethics Form Requires Revision",
        "body": """Hi,

Your ethics application requires a minor revision.

Please update section 4 and resubmit by Friday.

Regards,
Research Office"""
    },
    {
        "subject": "Tutorial Room Change",
        "body": """Hi,

Tomorrow's tutorial has been moved to Room K17-204.

The start time remains unchanged.

Best,
Teaching Team"""
    },
    {
        "subject": "Research Assistant Opportunity",
        "body": """Hi,

We are looking for a student research assistant for a small NLP project.

Please let me know if you are interested.

Regards,
Dr. Wang"""
    },
    {
        "subject": "Reminder: Submit Peer Review",
        "body": """Hi,

Your peer review is due tomorrow at 6 PM.

Please submit it through Moodle.

Best,
Course Team"""
    },
    {
        "subject": "Application Received",
        "body": """Dear Applicant,

We have received your application successfully.

No further action is required at this stage.

Regards,
Recruitment Team"""
    },
    {
        "subject": "Interview Invitation",
        "body": """Hi,

We would like to invite you to an online interview next Wednesday at 10 AM.

Please reply to confirm your attendance.

Best,
Recruitment Team"""
    },
    {
        "subject": "Interview Confirmation",
        "body": """Hi,

Thank you for confirming your interview.

The meeting link will be sent one day before the interview.

Regards,
Recruitment Team"""
    },
    {
        "subject": "Application Update",
        "body": """Hi,

Your application is still under review.

We expect to provide an outcome by the end of next week.

Best,
Recruitment Team"""
    },
    {
        "subject": "Document Submission Required",
        "body": """Hi,

Please submit a copy of your transcript and proof of enrolment by 18 October.

Reply to this email once the documents have been uploaded.

Regards,
HR Team"""
    },
    {
        "subject": "Weekly Research Update",
        "body": """Hi,

Please send me a short update on your progress before Friday afternoon.

A few bullet points will be enough.

Best,
Supervisor"""
    },
    {
        "subject": "Reading List for Next Week",
        "body": """Hi,

The reading list for next week's seminar is now available.

Please read the first two papers before class.

Regards,
Course Convenor"""
    },
    {
        "subject": "Database Assignment Clarification",
        "body": """Hi everyone,

A clarification has been added to Question 3 of the assignment specification.

Please download the latest version.

Best,
COMP9311 Team"""
    },
    {
        "subject": "Team Meeting Notes",
        "body": """Hi team,

I have attached the notes from today's project meeting.

Our next action is to finish the evaluation section by Monday.

Thanks,
Daniel"""
    },
    {
        "subject": "Cloud Credits Activated",
        "body": """Hi,

Your student cloud credits have been activated successfully.

The credits will expire at the end of the semester.

Regards,
IT Services"""
    },
    {
        "subject": "Late Submission Warning",
        "body": """Hi,

Our records indicate that your submission has not yet been received.

Please submit it before the late penalty increases tomorrow.

Regards,
Course Team"""
    },
    {
        "subject": "Academic Workshop Registration",
        "body": """Dear Student,

Registration is open for next month's academic writing workshop.

Places are limited and will be allocated on a first-come basis.

Regards,
Student Development"""
    },
    {
        "subject": "Supervisor Meeting Follow-up",
        "body": """Hi,

Thanks for today's discussion.

Please revise the experiment plan and send it to me before our next meeting.

Best,
Supervisor"""
    },
]


def send_email(server, index, email_data):
    subject = email_data["subject"]
    body = email_data["body"]

    message = MIMEText(
        body,
        "plain",
        "utf-8"
    )

    message["From"] = formataddr(
        (
            str(Header("UNSW Academic Test", "utf-8")),
            QQ_EMAIL
        )
    )

    message["To"] = TARGET_EMAIL
    message["Subject"] = Header(
        subject,
        "utf-8"
    )

    server.sendmail(
        QQ_EMAIL,
        [TARGET_EMAIL],
        message.as_string()
    )

    print(
        f"[{index:02d}/40] 已发送：{subject}"
    )


def main():
    if not QQ_EMAIL:
        raise RuntimeError(
            "缺少 QQ_EMAIL"
        )

    if not QQ_AUTH_CODE:
        raise RuntimeError(
            "缺少 QQ_SMTP_AUTH_CODE"
        )

    if not TARGET_EMAIL:
        raise RuntimeError(
            "缺少 TARGET_EMAIL"
        )

    context = ssl.create_default_context()

    print("正在连接 QQ SMTP...")

    with smtplib.SMTP_SSL(
        SMTP_HOST,
        SMTP_PORT,
        context=context
    ) as server:

        server.login(
            QQ_EMAIL,
            QQ_AUTH_CODE
        )

        print("QQ 邮箱登录成功。\n")

        for index, email_data in enumerate(
            emails,
            start=1
        ):
            send_email(
                server,
                index,
                email_data
            )

            # 不要瞬间连发，稍微像真实一点
            time.sleep(
                random.uniform(15, 30)
            )

    print("\n40 封测试邮件全部发送完成。")


if __name__ == "__main__":
    main()