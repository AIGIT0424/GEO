from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import settings

ALGORITHM = "HS256"

try:
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def hash_password(password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

except Exception:
    import hashlib
    import hmac
    import os

    def hash_password(password: str) -> str:  # type: ignore[misc]
        salt = os.urandom(16).hex()
        h = hmac.new(password.encode(), salt.encode(), hashlib.sha256).hexdigest()
        return f"{salt}${h}"

    def verify_password(plain_password: str, hashed_password: str) -> bool:  # type: ignore[misc]
        salt, h = hashed_password.split("$", 1)
        return hmac.compare_digest(
            hmac.new(plain_password.encode(), salt.encode(), hashlib.sha256).hexdigest(), h
        )


def create_access_token(subject: Any) -> str:
    expire = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(subject), "exp": expire},
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def create_refresh_token(subject: Any) -> str:
    expire = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    return jwt.encode(
        {"sub": str(subject), "exp": expire, "type": "refresh"},
        settings.secret_key,
        algorithm=ALGORITHM,
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return {}
