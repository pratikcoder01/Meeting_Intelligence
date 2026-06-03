import request from 'supertest';
import { createApp } from '../../src/app';

const app = createApp();

describe('Auth Endpoint Flows (Integration)', () => {
  const registerPayload = {
    name: 'Integrator Bob',
    email: 'bob.integrator@example.com',
    password: 'Password123!',
  };

  it('should successfully register a new user and login, returning access tokens', async () => {
    // 1. Register new user
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send(registerPayload);

    expect(regRes.status).toBe(201);
    expect(regRes.body.success).toBe(true);
    expect(regRes.body.data.user.email).toBe(registerPayload.email);
    expect(regRes.body.data.accessToken).toBeDefined();
    expect(regRes.body.data.refreshToken).toBeDefined();

    // 2. Try registering duplicate email — should throw conflict
    const dupRes = await request(app)
      .post('/api/v1/auth/register')
      .send(registerPayload);

    expect(dupRes.status).toBe(409);
    expect(dupRes.body.success).toBe(false);
    expect(dupRes.body.error.code).toBe('CONFLICT');

    // 3. Login with correct credentials
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();

    // 4. Try logging in with wrong password
    const badLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: registerPayload.email,
        password: 'wrong-password',
      });

    expect(badLoginRes.status).toBe(401);
    expect(badLoginRes.body.success).toBe(false);
    expect(badLoginRes.body.error.code).toBe('UNAUTHORIZED');

    // 5. Query auth profile route
    const profileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

    expect(profileRes.status).toBe(200);
    expect(profileRes.body.success).toBe(true);
    expect(profileRes.body.data.email).toBe(registerPayload.email);
  });

  it('should block unauthorized requests to private routes', async () => {
    const res = await request(app).get('/api/v1/meetings');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
