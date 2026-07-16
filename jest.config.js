module.exports = {
  testEnvironment: 'node',
  maxWorkers: 1, // Run tests sequentially to avoid database state interference
  testTimeout: 15000 // Allow up to 15 seconds for network/DB requests
};
