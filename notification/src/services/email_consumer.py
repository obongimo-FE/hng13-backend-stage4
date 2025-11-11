import asyncio
import json
import logging
from aio_pika import connect_robust, ExchangeType, Message
from aio_pika.abc import AbstractIncomingMessage
from src.core.config import settings
from src.core.redis_client import redis_client
from src.services.sender import send_email
from src.utils.circuit_breaker import CircuitBreaker
from src.utils.retry_backoff import backoff_delay

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("email_consumer")

circuit = CircuitBreaker()

async def handle_message(msg: AbstractIncomingMessage):
    async with msg.process(requeue=False):
        try:
            payload = json.loads(msg.body.decode())
        except Exception:
            logger.exception("Invalid message body, skipping")
            return

        request_id = payload.get("request_id")
        if not request_id:
            logger.warning("Missing request_id, acking")
            return

        status_key = f"notification_status:{request_id}"
        if await redis_client.get(status_key):
            logger.info("Already processed %s", request_id)
            return

        retries = (msg.headers or {}).get("x-retries", 0)
        try:
            await circuit.call(send_email, payload)
            await redis_client.set(status_key, "delivered", ex=86400)
            logger.info("Delivered %s", request_id)
        except Exception:
            logger.exception("Send failed")
            if retries < settings.max_retries:
                next_retries = retries + 1
                delay = backoff_delay(retries)
                logger.info("Retrying %s after %s seconds", request_id, delay)
                await asyncio.sleep(delay)
                await msg.channel.default_exchange.publish(
                    Message(body=msg.body, headers={"x-retries": next_retries}),
                    routing_key=settings.email_queue,
                )
            else:
                logger.error("Max retries reached. Moving %s to dead letter queue.", request_id)
                await msg.channel.default_exchange.publish(
                    Message(body=msg.body, headers={"x-retries": retries + 1}),
                    routing_key=settings.dead_letter_routing_key,
                )
            await redis_client.set(status_key, "failed", ex=86400)


async def main():
    connection = await connect_robust(settings.rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=settings.prefetch_count)
    exchange = await channel.declare_exchange(settings.exchange, ExchangeType.DIRECT)
    queue = await channel.declare_queue(settings.email_queue, durable=True)
    await queue.bind(exchange, routing_key="email")
    await queue.consume(handle_message, no_ack=False)
    logger.info("Email consumer started, listening on %s", settings.email_queue)
    await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())
