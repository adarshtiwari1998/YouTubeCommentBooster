// Quick test to verify API key rotation is working
const { ApiKeyManager } = require('./server/services/apiKeyManager.ts');

// Test with the actual API keys from environment
const apiKeyString = process.env.YOUTUBE_API_KEY || '';
console.log('Testing API key rotation with:', apiKeyString);

const manager = new ApiKeyManager(apiKeyString);

// Test getting current API key multiple times
for (let i = 0; i < 5; i++) {
  const key = manager.getCurrentApiKey();
  console.log(`Attempt ${i + 1}: ${key.substring(0, 15)}...`);
  
  // Simulate quota exhaustion
  manager.markKeyAsExhausted(key);
}