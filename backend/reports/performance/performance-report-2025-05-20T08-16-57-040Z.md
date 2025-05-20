# AirportAI Performance Test Report

## Test Summary

- **Date**: 20/05/2025, 09:16:57
- **Result**: ❌ FAILED
- **KPIs Passed**: 4 of 5

## KPI Results

| KPI | Result | Target | Status |
|-----|--------|--------|--------|
| System Response Time (95th percentile) | 0.003s | < 1s | ✅ |
| Voice Recognition Accuracy | 98.4% | > 97.0% | ✅ |
| Autonomous Decision Accuracy | 98.6% | > 99.0% | ❌ |
| Dashboard Loading Time | 0.001s | < 2s | ✅ |
| API Gateway Throughput | 77601.4 req/s | > 1000 req/s | ✅ |

## Detailed Metrics

- **Total API Calls**: 0
- **Voice Processing Calls**: 25
- **Autonomous Decisions**: 10
- **Overall Success Rate**: 0.0%

## Response Time Distribution

```
0.2ms - 0.8ms: ############## (24 requests, 68.6%)
0.8ms - 1.4ms: ##### (8 requests, 22.9%)
1.4ms - 2.0ms: # (1 requests, 2.9%)
2.0ms - 2.7ms:  (0 requests, 0.0%)
2.7ms - 3.3ms: # (1 requests, 2.9%)
3.3ms - 3.9ms:  (0 requests, 0.0%)
3.9ms - 4.5ms:  (0 requests, 0.0%)
4.5ms - 5.1ms:  (0 requests, 0.0%)
5.1ms - 5.7ms:  (0 requests, 0.0%)
5.7ms - 6.3ms: # (1 requests, 2.9%)
```

## Test Configuration

- Iterations per test: 10
- Concurrent users: 5

