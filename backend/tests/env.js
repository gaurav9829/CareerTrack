// Loaded via setupFiles BEFORE any app module - guarantees the env the app
// expects exists during tests (the real secret lives only in backend/.env).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-secret-never-use-in-production';
process.env.JWT_EXPIRES_IN = '1d';
process.env.COOKIE_NAME = 'careertrack_token';
process.env.COOKIE_SAMESITE = 'lax';
process.env.MAX_RESUME_MB = '4';
process.env.UPLOAD_DIR = 'uploads/resumes';
