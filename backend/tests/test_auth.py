import asyncio
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.database import Base
from conftest import test_engine

@pytest.fixture(autouse=True)
def setup_db():
    async def _reset():
        async with test_engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
    asyncio.run(_reset())
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
        assert reg_data["user"]["role"] == "student"
        token = reg_data["access_token"]

        # 2. Duplicate registration should fail with 400
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

        # 5. Login with non-existent email
        no_user = await ac.post("/api/auth/login", json={
            "email": "unknown.scholar@university.edu",
            "password": "Password123!",
        })
        assert no_user.status_code == 401

        # 6. Get current user profile with token
        me_res = await ac.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert me_res.status_code == 200
        assert me_res.json()["email"] == "alex.wright@university.edu"

        # 7. Request /me without token should fail
        unauth_res = await ac.get("/api/auth/me")
        assert unauth_res.status_code == 401

        # 8. Request /me with malformed token should fail
        bad_token_res = await ac.get("/api/auth/me", headers={"Authorization": "Bearer invalid.token.value"})
        assert bad_token_res.status_code == 401

        # 9. Institutional SSO login (auto-provisioning)
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

        # 10. Repeat SSO login for same user returns existing user
        sso_repeat = await ac.post("/api/auth/sso", json={
            "provider": "institutional_sso",
            "email": "visiting.scholar@athenaeum.edu",
        })
        assert sso_repeat.status_code == 200
        assert sso_repeat.json()["user"]["name"] == "Prof. Elena Rostova"

@pytest.mark.asyncio
async def test_auth_otp_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Reject disposable domains
        disposable_res = await ac.post("/api/auth/send-otp", json={"email": "scam@mailinator.com"})
        assert disposable_res.status_code == 400
        assert "disposable email" in disposable_res.json()["detail"].lower()

        # 2. Send valid OTP
        send_res = await ac.post("/api/auth/send-otp", json={"email": "new.scholar@oxford.ac.uk"})
        assert send_res.status_code == 200
        otp_data = send_res.json()
        assert "otp" in otp_data
        assert len(otp_data["otp"]) == 6
        otp_code = otp_data["otp"]

        # 3. Verify with wrong OTP
        wrong_res = await ac.post("/api/auth/verify-otp", json={"email": "new.scholar@oxford.ac.uk", "otp": "000000"})
        assert wrong_res.status_code == 400
        assert "invalid" in wrong_res.json()["detail"].lower()

        # 4. Verify with correct OTP
        verify_res = await ac.post("/api/auth/verify-otp", json={"email": "new.scholar@oxford.ac.uk", "otp": otp_code})
        assert verify_res.status_code == 200
        assert verify_res.json()["verified"] is True

