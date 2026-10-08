import os
import json

import msal
import requests
import atexit
from dotenv import load_dotenv


load_dotenv()

CLIENT_ID = os.getenv("MS_CLIENT_ID")

AUTHORITY = "https://login.microsoftonline.com/common"

SCOPES = [
    "Mail.Read",
    "Mail.Send",
]

GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0"


CACHE_FILE = "msal_token_cache.json"


def get_access_token():
    if not CLIENT_ID:
        raise RuntimeError("没有找到 MS_CLIENT_ID，请检查 .env")

    cache = msal.SerializableTokenCache()

    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r", encoding="utf-8") as f:
            cache.deserialize(f.read())

    def save_cache():
        if cache.has_state_changed:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                f.write(cache.serialize())

    atexit.register(save_cache)

    app = msal.PublicClientApplication(
        client_id=CLIENT_ID,
        authority=AUTHORITY,
        token_cache=cache,
    )

    accounts = app.get_accounts()

    result = None

    if accounts:
        result = app.acquire_token_silent(
            scopes=SCOPES,
            account=accounts[0],
        )

    if not result:
        result = app.acquire_token_interactive(
            scopes=SCOPES
        )

    if "access_token" not in result:
        print(json.dumps(
            result,
            indent=2,
            ensure_ascii=False
        ))
        raise RuntimeError("无法获得 access token")

    return result["access_token"]

def get_recent_messages(access_token, top=30):
    url = f"{GRAPH_BASE_URL}/me/mailFolders/inbox/messages"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Prefer": 'outlook.body-content-type="text"',
    }

    params = {
        "$top": top,
        "$orderby": "receivedDateTime DESC",
        "$select": ",".join([
            "id",
            "conversationId",
            "subject",
            "from",
            "toRecipients",
            "receivedDateTime",
            "body",
            "isRead",
            "hasAttachments",
        ]),
    }

    response = requests.get(
        url,
        headers=headers,
        params=params,
        timeout=30,
    )

    if not response.ok:
        print("\nGraph API 请求失败：")
        print(response.status_code)
        print(response.text)

    response.raise_for_status()

    return response.json().get("value", [])


def normalize_email(message):
    sender_info = (
        message.get("from", {})
        .get("emailAddress", {})
    )

    recipients = []

    for recipient in message.get("toRecipients", []):
        info = recipient.get("emailAddress", {})

        recipients.append({
            "name": info.get("name"),
            "email": info.get("address"),
        })

    return {
        "message_id": message.get("id"),
        "conversation_id": message.get("conversationId"),
        "subject": message.get("subject"),

        "sender": {
            "name": sender_info.get("name"),
            "email": sender_info.get("address"),
        },

        "recipients": recipients,

        "received_at": message.get("receivedDateTime"),

        "body_text": (
            message
            .get("body", {})
            .get("content")
        ),

        "is_read": message.get("isRead"),

        "has_attachments": message.get(
            "hasAttachments"
        ),
    }


def main():
    access_token = get_access_token()

    print("\n正在读取最近 30 封邮件...")

    messages = get_recent_messages(
        access_token,
        top=30,
    )

    emails = [
        normalize_email(message)
        for message in messages
    ]

    with open(
        "emails.json",
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            emails,
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(
        f"\n成功读取 {len(emails)} 封邮件。\n"
    )

    for index, email in enumerate(emails, start=1):
        print(
            f"{index:02d}. "
            f"{email['received_at']} | "
            f"{email['sender']['name']} | "
            f"{email['subject']}"
        )

    print("\n完整数据已保存到 emails.json")


if __name__ == "__main__":
    main()