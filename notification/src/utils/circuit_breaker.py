import time


class CircuitBreaker:
    def __init__(self, fail_max: int = 5, reset_timeout: int = 30):
        self.fail_max = fail_max
        self.reset_timeout = reset_timeout
        self.fail_count = 0
        self.opened_at: float | None = None

    def _is_open(self) -> bool:
        if self.opened_at is None:
            return False
        if time.time() - self.opened_at > self.reset_timeout:
            self.opened_at = None
            self.fail_count = 0
            return False
        return True

    async def call(self, func, *args, **kwargs):
        if self._is_open():
            raise RuntimeError("circuit_open")
        try:
            return await func(*args, **kwargs)
        except Exception:
            self.fail_count += 1
            if self.fail_count >= self.fail_max:
                self.opened_at = time.time()
            raise
