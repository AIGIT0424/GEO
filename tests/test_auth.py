import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    register_payload = {
        "email": "alice@example.com",
        "password": "correct horse battery staple",
        "full_name": "Alice",
    }
    r = await client.post("/api/v1/auth/register", json=register_payload)
    assert r.status_code == 201
    assert r.json()["email"] == "alice@example.com"

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": register_payload["email"], "password": register_payload["password"]},
    )
    assert login.status_code == 200
    body = login.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["refresh_token"]


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await client.post(
        "/api/v1/auth/register",
        json={"email": "bob@example.com", "password": "hunter2", "full_name": "Bob"},
    )
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "bob@example.com", "password": "wrong"},
    )
    assert r.status_code == 401
