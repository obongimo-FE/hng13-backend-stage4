def backoff_delay(attempt: int, base: int = 2, cap: int = 60) -> int:
    delay = min(cap, base ** attempt)
    return int(delay)
