import os, sys
import pytest
import asyncio, json
import aio_pika
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from src.services.sender import send_email


@pytest.mark.asyncio
async def test_send_email(monkeypatch):
    async def fake_send(msg):
        return {"status": "ok"}

    monkeypatch.setattr("app.sender.aio_pika", fake_send)

    payload = {
        "variables": {"email": "test@example.com"},
        "metadata": {"subject": "Test"},
    }

    await send_email(payload)


async def publish_test_message():
    connection = await aio_pika.connect_robust("amqp://guest:guest@localhost:5672/")
    channel = await connection.channel()
    exchange = await channel.declare_exchange("notifications.direct", aio_pika.ExchangeType.DIRECT)

    payload = {
        "request_id": "test123",
        "notification_type": "email",   # or "push"
        "user_id": "u001",
        "template_code": "welcome_email",
        "variables": {
            "email": "receiver@example.com",
            "name": "John Doe",
            "token": "YOUR_FCM_TEST_TOKEN"
        },
        "metadata": {
            "subject": "Welcome to our app!",
            "body": "Glad to have you."
        },
        "priority": 5,
    }

    await exchange.publish(
        aio_pika.Message(body=json.dumps(payload).encode()),
        routing_key="email"   # use "push" for push queue
    )

    await connection.close()

asyncio.run(publish_test_message())
