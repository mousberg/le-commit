# Investigation & Debugging Improvements

## Summary
This commit implements comprehensive debugging and resilience improvements for the CV file processing pipeline based on analysis of the ~80-85% success rate achieved with sequential processing.

## Key Improvements

### 1. Explicit Timeouts ✅
- **AshbyClient requests**: 10 second default timeout
- **File URL fetches**: 15 second timeout (can be slow)
- **File downloads**: 30 second timeout
- **AbortController** implementation for proper timeout handling

### 2. Enhanced Error Classification ✅
Replaced generic "fetch failed" with specific error types:
- `TIMEOUT_ERROR`: Request timed out
- `NETWORK_ERROR`: Network connectivity issues
- `FILE_TOO_LARGE`: Files exceeding 10MB limit
- `SERVER_ERROR`: 5xx HTTP responses
- `DATABASE_ERROR`: Supabase database issues

### 3. File Size Management ✅
- **10MB file size limit** with early detection
- **Content-Length header checking** before download
- **File size logging** for all downloads (success and failure)

### 4. Retry Logic with Exponential Backoff ✅
- **Up to 3 attempts** for transient failures
- **1s, 2s exponential backoff** between retries
- **Smart retry logic**: Only retry timeouts, network errors, and 5xx responses
- **No retry for 4xx client errors** (permanent failures)

### 5. Detailed Timing Analysis ✅
- **Step-by-step timing breakdown**
- **Performance bottleneck identification**
- **Success logs include timing details** for optimization

## Expected Impact

### Error Reduction:
- **TIMEOUT_ERROR**: Should reduce 25-second timeouts
- **NETWORK_ERROR**: Better handling of transient network issues
- **FILE_TOO_LARGE**: Early rejection of oversized files
- **Retry logic**: ~10-15% improvement in success rate

### Debugging Improvements:
- **Clear error categorization** for faster diagnosis
- **Timing breakdowns** to identify bottlenecks
- **Retry attempt logging** for transparency

### Performance:
- **Early file size rejection** saves bandwidth
- **Proper timeout handling** prevents hanging requests
- **Timing analysis** enables optimization

## Testing Strategy

1. **Deploy changes** to investigation branch
2. **Run full sync** with 224 candidates
3. **Analyze new error categories** and timing data
4. **Compare success rate** to previous ~80-85%
5. **Identify remaining bottlenecks** from timing data

## Next Steps Based on Results

- If **TIMEOUT_ERROR** frequent: Increase timeouts or optimize downloads
- If **FILE_TOO_LARGE** common: Adjust size limits or add compression
- If **NETWORK_ERROR** persistent: Add more aggressive retry logic
- Use **timing data** to optimize slowest steps
