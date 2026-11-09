// TC-AU01..TC-AU07: auth endpoints + login rate limiting.
// NOTE: the rate-limit test must run LAST - it deliberately exhausts the
// login limiter (max 5 in test env).
const request = require('supertest');
const app = require('../src/app');
const env = require('../src/config/env');
const { startTestDB, stopTestDB, createAdmin } = require('./helpers');

let mongo;
let cookie;

beforeAll(async () => {
  mongo = await startTestDB();
  await createAdmin();
});

afterAll(() => stopTestDB(mongo));

describe('POST /api/auth/login', () => {
  test('TC-AU01: success sets an httpOnly cookie and returns the admin', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.dev', password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('admin@test.dev');

    const setCookie = res.headers['set-cookie'][0];
    expect(setCookie).toContain(env.COOKIE_NAME);
    expect(setCookie).toContain('HttpOnly');
    cookie = setCookie.split(';')[0]; // keep for /me test
  });

  test('TC-AU02: wrong password returns 401 with generic message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.dev', password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
    expect(res.body.message).not.toMatch(/password/i);
  });

  test('TC-AU03: unknown email returns the same generic 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@test.dev', password: 'Password123!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  test('TC-AU04: validation failure returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  test('TC-AU05: without a cookie returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('TC-AU06: with the login cookie returns the current admin', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('admin@test.dev');
    expect(res.body.data).not.toHaveProperty('passwordHash');
  });
});

describe('POST /api/auth/logout', () => {
  test('TC-AU07: clears the auth cookie', async () => {
    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(200);
    const setCookie = res.headers['set-cookie'][0];
    // The cookie is emptied on the client. (The JWT itself is stateless and
    // stays technically valid until expiry - a documented trade-off; see
    // docs/VIVA_NOTES.md. A token blocklist would be needed for true revocation.)
    expect(setCookie).toMatch(/careertrack_token=;/);
  });
});

describe('login rate limiting', () => {
  test('TC-AU08: too many login attempts eventually returns 429', async () => {
    let hit429 = false;
    for (let i = 0; i < 15; i += 1) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ratelimit@test.dev', password: 'nope' });
      if (res.status === 429) {
        hit429 = true;
        expect(res.body.message).toMatch(/too many login attempts/i);
        break;
      }
    }
    expect(hit429).toBe(true);
  });
});
