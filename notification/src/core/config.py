from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    rabbitmq_url: str
    redis_url: str
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_pass: str | None = None
    sender_email: str
    exchange: str = "notifications.direct"
    email_queue: str = "email.queue"
    dead_letter_routing_key: str = "failed"
    prefetch_count: int = 10
    max_retries: int = 5
    service_name: str = "email_service"
    push_api_url: str = "https://fcm.googleapis.com/fcm/send"
    push_server_key: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
