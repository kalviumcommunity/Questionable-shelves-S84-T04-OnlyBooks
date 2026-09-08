import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import engine, Base

@pytest.fixture(autouse=True, scope="function")
def init_test_db():
    async def _init():
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    asyncio.run(_init())
    yield

@pytest.mark.asyncio
async def test_healthcheck():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

@pytest.mark.asyncio
async def test_auth_full_cycle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register a student
        reg_payload = {
            "name": "Alexander Wright",
            "email": "alex.wright@university.edu",
            "password": "Password123!",
            "affiliation": "Dept. of History & Archives",
        }
        reg_res = await ac.post("/api/auth/register", json=reg_payload)
        assert reg_res.status_code == 200, reg_res.text
        reg_data = reg_res.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["name"] == "Alexander Wright"
        assert reg_data["user"]["initials"] == "AW"
        token = reg_data["access_token"]

        # 2. Duplicate registration should fail
        dup_res = await ac.post("/api/auth/register", json=reg_payload)
        assert dup_res.status_code == 400

        # 3. Login with correct credentials
        login_res = await ac.post("/api/auth/login", json={
            "email": "alex.wright@university.edu",
            "password": "Password123!",
        })
        assert login_res.status_code == 200
        assert "access_token" in login_res.json()

        # 4. Login with invalid password
        bad_login = await ac.post("/api/auth/login", json={
            "email": "alex.wright@university.edu",
            "password": "WrongPassword",
        })
        assert bad_login.status_code == 401

        # 5. Get current user profile with token
        me_res = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "alex.wright@university.edu"

        # 6. Request /me without token should fail
        unauth_res = await ac.get("/api/auth/me")
        assert unauth_res.status_code == 401

        # 7. Institutional SSO login
        sso_res = await ac.post("/api/auth/sso", json={
            "provider": "institutional_sso",
            "email": "visiting.scholar@athenaeum.edu",
            "name": "Prof. Elena Rostova",
            "affiliation": "Institute for Advanced Studies",
        })
        assert sso_res.status_code == 200
        sso_data = sso_res.json()
        assert sso_data["user"]["role"] == "researcher"
        assert sso_data["user"]["initials"] == "PR"
