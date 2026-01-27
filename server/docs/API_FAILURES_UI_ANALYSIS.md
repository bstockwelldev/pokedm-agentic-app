# API Failures & UI Mapping Analysis

## Executive Summary

Analysis of HAR file from `agentic-app-eta.vercel.app` reveals:
1. **API is correctly returning data** - `/recap` endpoint returns proper `narration`, `intent`, `choices`, and `session`
2. **UI is not displaying the data** - Frontend shows "Tool Execution / No tool execution data available" instead of narration
3. **Multiple API errors** - Rate limiting, invalid model names, and 404/500 errors

## API Response Analysis

### ✅ Successful `/recap` Response (Status 200)

**Request:**
```json
POST /api/agent
{
  "userInput": "/recap",
  "sessionId": "d54c243a-2fa1-426d-93ab-91470a1bb731",
  "model": "gemini-2.5-flash"
}
```

**Response (Line 1275):**
```json
{
  "intent": "recap",
  "narration": "No recap data available yet. Start your adventure to build up session history!",
  "choices": [],
  "session": {
    "schema_version": "1.1.0",
    "dex": {...},
    "session": {
      "session_id": "8b2430db-a6ad-4729-a23a-2175331be349",
      ...
    },
    ...
  },
  "sessionId": "8b2430db-a6ad-4729-a23a-2175331be349",
  "steps": [],
  "customPokemon": null
}
```

**Analysis:**
- ✅ API correctly returns `intent: "recap"`
- ✅ API correctly returns `narration` with message text
- ✅ API correctly returns `choices: []`
- ✅ API correctly returns `steps: []` (empty array)
- ✅ API correctly returns updated `session` state

**UI Behavior:**
- ❌ UI shows "System: Tool Execution / No tool execution data available"
- ❌ Narration text is NOT displayed
- ❌ Intent is NOT displayed
- ❌ Session state may not be updating properly

**Root Cause:**
The frontend `messageMapper.js` was routing ALL messages with `steps` (even empty arrays) to `ToolRunMessage` component, instead of checking for narration/choices first. This has been fixed in the codebase but may not be deployed yet.

---

## API Error Analysis

### 1. Rate Limit Error (Status 500)

**Request (Line 1495):**
```json
POST /api/agent
{
  "userInput": "test",
  "sessionId": "8b2430db-a6ad-4729-a23a-2175331be349",
  "model": "gemini-2.5-flash"
}
```

**Response (Line 1560):**
```json
{
  "error": "Agent error",
  "details": "Failed after 3 attempts. Last error: You exceeded your current quota, please check your plan and billing details. For more information on this error, head to: https://ai.google.dev/gemini-api/docs/rate-limits. To monitor your current usage, head to: https://ai.dev/rate-limit. \n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20, model: gemini-2.5-flash\nPlease retry in 8.943346821s.",
  "requestId": "f7195536-651b-4937-996f-15a1b0f7e28c",
  "timestamp": "2026-01-27T23:14:51.113Z",
  "endpoint": "/api/agent",
  "method": "POST"
}
```

**Analysis:**
- ✅ Error handling is working correctly
- ✅ Error response includes helpful details and retry information
- ⚠️ Free tier quota limit reached (20 requests)
- ⚠️ No automatic retry with backoff (though error suggests retry time)

**Recommendations:**
1. Implement exponential backoff retry logic
2. Add rate limit detection and user-friendly messaging
3. Consider switching to paid tier or alternative models when quota exceeded

---

### 2. Invalid Model Name Error (Status 500)

**Request (Line 1780):**
```json
POST /api/agent
{
  "userInput": "go",
  "sessionId": "8b2430db-a6ad-4729-a23a-2175331be349",
  "model": "gemini-1.5-flash-latest"
}
```

**Response (Line 1845):**
```json
{
  "error": "Agent error",
  "details": "models/gemini-1.5-flash-latest is not found for API version v1beta, or is not supported for generateContent. Call ListModels to see the list of available models and their supported methods.",
  "requestId": "a861e966-a44d-4b53-934e-9d10aba7891d",
  "timestamp": "2026-01-27T23:15:43.061Z",
  "endpoint": "/api/agent",
  "method": "POST"
}
```

**Analysis:**
- ✅ Error handling is working correctly
- ❌ Invalid model name `gemini-1.5-flash-latest` was used
- ⚠️ Model validation should happen before API call

**Recommendations:**
1. Validate model names against available models list
2. Update model dropdown to only show valid models
3. Add model name normalization (e.g., `gemini-1.5-flash-latest` → `gemini-1.5-flash`)

---

### 3. 404 Error

**Location:** Line 713

**Analysis:**
- Unknown endpoint or resource not found
- Need to check what resource was requested

---

## UI Mapping Issues

### Problem: Narration Not Displayed

**Expected Behavior:**
- `/recap` response should display narration text in `DmNarration` component
- Intent should be visible
- Session state should update

**Actual Behavior:**
- Shows "Tool Execution / No tool execution data available"
- Narration text is hidden
- Intent is not displayed

**Root Cause:**
The `messageMapper.js` was checking for `message.steps` before checking for `message.content` (narration), causing all messages with steps (even empty arrays) to be routed to `ToolRunMessage`.

**Fix Status:**
✅ Fixed in codebase (`client/src/lib/messageMapper.js`)
- Reordered component selection to prioritize narration/choices
- Added `hasToolCalls()` helper to check for actual tool-call steps
- Only routes to `ToolRunMessage` when actual tool calls exist
- Supports displaying both narration and tool executions when both exist

**Deployment Status:**
⚠️ Fix may not be deployed to Vercel yet - needs deployment

---

## Recommendations

### Immediate Actions

1. **Deploy Frontend Fix**
   - Deploy updated `messageMapper.js` to Vercel
   - Verify narration/choices display correctly after deployment

2. **Error Handling Improvements**
   - Add rate limit detection and user-friendly error messages
   - Implement automatic retry with exponential backoff for rate limits
   - Add model name validation before API calls

3. **Model Management**
   - Validate model names against `/api/models` endpoint
   - Update model dropdown to filter invalid models
   - Add model name normalization/mapping

### Long-term Improvements

1. **Rate Limiting**
   - Implement client-side rate limit tracking
   - Show quota usage to users
   - Automatically switch to alternative models when quota exceeded

2. **Error Recovery**
   - Add retry logic with exponential backoff
   - Implement fallback models when primary model fails
   - Cache successful responses to reduce API calls

3. **UI Enhancements**
   - Add loading states for API calls
   - Show error details in user-friendly format
   - Display session state updates in real-time

---

## Summary

| Issue | Status | Impact | Priority |
|-------|--------|--------|----------|
| Narration not displayed | ✅ Fixed (not deployed) | High | P0 - Deploy fix |
| Rate limit errors | ⚠️ Needs handling | Medium | P1 - Add retry logic |
| Invalid model names | ⚠️ Needs validation | Medium | P1 - Validate models |
| 404 errors | ⚠️ Unknown cause | Low | P2 - Investigate |

**Next Steps:**
1. Deploy frontend fix to resolve narration display issue
2. Add rate limit handling and retry logic
3. Implement model name validation
4. Monitor API errors and improve error handling
