from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Application
    app_env: str = "development"
    secret_key: str = "change-me-in-production"
    debug: bool = False
    allowed_origins: list[str] = ["http://localhost:3000"]

    # Database
    database_url: str = "postgresql://geo:geo@localhost:5432/geo"

    # Redis / Celery
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # Amazon SP-API
    amazon_refresh_token: str = ""
    amazon_lwa_app_id: str = ""
    amazon_lwa_client_secret: str = ""
    amazon_aws_access_key: str = ""
    amazon_aws_secret_key: str = ""
    amazon_role_arn: str = ""
    amazon_marketplace_id: str = "ATVPDKIKX0DER"
    # OAuth redirect URI registered in Amazon Developer Console
    amazon_oauth_redirect_uri: str = "http://localhost:8000/api/v1/amazon/oauth/callback"

    # Amazon Advertising API
    amazon_ads_client_id: str = ""
    amazon_ads_client_secret: str = ""
    amazon_ads_refresh_token: str = ""
    amazon_ads_profile_id: str = ""

    # AI
    anthropic_api_key: str = ""
    openai_api_key: str = ""

    # JWT
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
