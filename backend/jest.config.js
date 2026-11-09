module.exports = {
  testEnvironment: 'node',
  setupFiles: ['./tests/env.js'],
  setupFilesAfterEnv: ['./tests/setup.js'],
  testTimeout: 180000,
  clearMocks: true,
};
