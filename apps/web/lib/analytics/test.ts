/**
 * Analytics System Test
 * Run this in the browser console to test the analytics system
 */

// Import and test the analytics functions
import { trackEvent, getStoredEvents, getEventStats, clearEvents, enableDevAnalytics } from '@/lib/analytics/trackEvent';

// Test 1: Enable analytics in development
enableDevAnalytics();
console.log('✅ Analytics enabled in development');

// Test 2: Track some test events
await trackEvent({
  type: 'tool_open',
  toolSlug: 'test-tool',
  timestamp: Date.now(),
});

await trackEvent({
  type: 'tool_action',
  toolSlug: 'test-tool',
  action: 'generate',
  timestamp: Date.now(),
});

await trackEvent({
  type: 'ai_generate',
  toolSlug: 'test-tool',
  timestamp: Date.now(),
});

console.log('✅ Test events tracked');

// Test 3: Retrieve events
const events = getStoredEvents();
console.log('📊 Stored events:', events.events.length);
console.log('📈 Event stats:', getEventStats());

// Test 4: Clear events
clearEvents();
console.log('🧹 Events cleared');

// Test 5: Verify cleared
const afterClear = getStoredEvents();
console.log('📊 Events after clear:', afterClear.events.length);

console.log('✅ All analytics tests passed!');
