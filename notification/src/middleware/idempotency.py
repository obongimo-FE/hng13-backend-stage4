from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import redis as aioredis


class IdempotencyMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str):
        super().__init__(app)
        self.redis_url = redis_url
        self.redis = None

    async def dispatch(self, request: Request, call_next):
        if self.redis is None:
            self.redis = await aioredis.from_url(self.redis_url)

        if request.method == 'POST' and request.url.path.startswith('/api/v1/notifications'):
            body = await request.json()
            request_id = body.get('request_id')
            if not request_id:
                return JSONResponse(status_code=400, content={"success":False, "message":"missing request_id", "meta":{}})

            key = f"idem:{request_id}"
            acquired = await self.redis.setnx(key, '1')

            if not acquired:
                return JSONResponse(status_code=409, content={"success":False, "message":"duplicate request", "meta":{}})

            await self.redis.expire(key, 60*60)
        response = await call_next(request)
        return response
