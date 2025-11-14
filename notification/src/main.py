from fastapi import FastAPI, HTTPException, status
import aio_pika
from src.core.config import settings
from src.core.redis_client import redis_client

app = FastAPI(title=settings.service_name)


@app.get("/health")
async def health():
    try:
        await redis_client.ping()
        redis_ok = True
    except Exception as e:
        redis_ok = False
        print(f"Redis health check failed: {e}")

    rabbitmq_ok = False
    try:
        connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        if connection.is_closed is False:
            rabbitmq_ok = True
        await connection.close()
    except Exception as e:
        rabbitmq_ok = False
        print(f"RabbitMQ health check failed: {e}")

    status = "ok" if redis_ok and rabbitmq_ok else "degraded"

    return {
        "status": status,
        "redis": redis_ok,
        "rabbitmq": rabbitmq_ok,
    }


@app.get("/status/{notification_id}")
async def notification_status(notification_id: str):
    try:
        status_ = await redis_client.get(f"notification_status:{notification_id}")
        if not status_:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notification not found"
            )
        return {
            "success": True,
            "data": {"notification_id": notification_id, "status": status_}
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {e}"
        ) from e


@app.post("/test-email")
async def test_email(payload: dict):
    from src.services.sender import send_email
    try:
        is_sent = await send_email(payload)
        if not is_sent:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Email failed (test mode)"
            )
        return {"success": True, "message": "Email sent (test mode)"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {e}"
        ) from e


@app.post("/test-push")
async def test_push(payload: dict):
    from src.services.sender import send_push
    try:
        is_sent = await send_push(payload)
        if not is_sent:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Push failed (test mode)"
            )
        return {"success": True, "message": "Push sent (test mode)"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Server error: {e}"
        ) from e


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8001, reload=True)
