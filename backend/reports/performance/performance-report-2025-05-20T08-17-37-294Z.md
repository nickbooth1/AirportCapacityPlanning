# AirportAI Performance Test Report

## Test Summary

- **Date**: 20/05/2025, 09:17:37
- **Result**: ❌ FAILED
- **KPIs Passed**: 4 of 5

## KPI Results

| KPI | Result | Target | Status |
|-----|--------|--------|--------|
| System Response Time (95th percentile) | 0.000s | < 1s | ✅ |
| Voice Recognition Accuracy | 97.7% | > 97.0% | ✅ |
| Autonomous Decision Accuracy | 98.7% | > 99.0% | ❌ |
| Dashboard Loading Time | 0.001s | < 2s | ✅ |
| API Gateway Throughput | 45499.6 req/s | > 1000 req/s | ✅ |

## Detailed Metrics

- **Total API Calls**: 0
- **Voice Processing Calls**: 25
- **Autonomous Decisions**: 10
- **Overall Success Rate**: 0.0%

## Response Time Distribution

```
0.0ms - 0.0ms: ############ (21 requests, 60.0%)
0.0ms - 0.1ms: ## (3 requests, 8.6%)
0.1ms - 0.1ms: # (1 requests, 2.9%)
0.1ms - 0.1ms:  (0 requests, 0.0%)
0.1ms - 0.1ms:  (0 requests, 0.0%)
0.1ms - 0.1ms:  (0 requests, 0.0%)
0.1ms - 0.1ms: ### (6 requests, 17.1%)
0.1ms - 0.1ms: # (1 requests, 2.9%)
0.1ms - 0.1ms: # (2 requests, 5.7%)
0.1ms - 0.1ms: # (1 requests, 2.9%)
```

## Test Configuration

- Iterations per test: 10
- Concurrent users: 5

