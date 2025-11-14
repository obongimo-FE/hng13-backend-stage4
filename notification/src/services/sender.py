import aiosmtplib
import httpx
from email.message import EmailMessage
from src.core.config import settings


async def send_email(payload: dict):
    """
    payload expected to include:
    - variables.email (recipient)
    - metadata.subject (optional)
    - rendered_body OR variables.body
    """
    variables = payload.get("variables", {})
    to_addr = variables.get("email")
    if not to_addr:
        raise ValueError("recipient missing: variables.email")

    subject = (payload.get("metadata") or {}).get("subject", "Notification")
    body = payload.get("rendered_body") or variables.get("body") or ""

    msg = EmailMessage()
    msg["From"] = settings.sender_email
    msg["To"] = to_addr
    msg["Subject"] = subject
    msg.set_content(body)

    await aiosmtplib.send(
        msg,
        hostname=settings.smtp_host,
        port=settings.smtp_port,
        username=settings.smtp_user,
        password=settings.smtp_pass,
        start_tls=True,
    )


async def send_push(payload: dict):
    """
    Expects payload with:
      variables.token (device FCM token)
      metadata.title / metadata.body
    """
    variables = payload.get("variables", {})
    fcm_token = variables.get("token")
    if not fcm_token:
        raise ValueError("missing FCM token")

    metadata = payload.get("metadata") or {}
    data = {
        "to": fcm_token,
        "notification": {
            "title": metadata.get("title", "Notification"),
            "body": metadata.get("body", "You have a new message."),
        },
        "data": variables.get("data", {}),
    }

    headers = {
        "Authorization": f"key={settings.push_server_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(settings.push_api_url, json=data, headers=headers)
        if resp.status_code not in (200, 201):
            raise RuntimeError(f"Push send failed: {resp.status_code}, {resp.text}")
