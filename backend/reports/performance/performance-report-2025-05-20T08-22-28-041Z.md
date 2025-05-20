# AirportAI Performance Test Report

## Test Summary

- **Date**: 20/05/2025, 09:22:28
- **Result**: ❌ FAILED
- **KPIs Passed**: 4 of 5

## KPI Results

| KPI | Result | Target | Status |
|-----|--------|--------|--------|
| System Response Time (95th percentile) | 0.000s | < 1s | ✅ |
| Voice Recognition Accuracy | 97.7% | > 97.0% | ✅ |
| Autonomous Decision Accuracy | 98.9% | > 99.0% | ❌ |
| Dashboard Loading Time | 0.000s | < 2s | ✅ |
| API Gateway Throughput | 108197.5 req/s | > 1000 req/s | ✅ |

## Detailed Metrics

- **Total API Calls**: 0
- **Voice Processing Calls**: 25
- **Autonomous Decisions**: 10
- **Overall Success Rate**: 0.0%

## Response Time Distribution

```
0.0ms - 0.1ms: ########## (18 requests, 51.4%)
0.1ms - 0.1ms: # (2 requests, 5.7%)
0.1ms - 0.1ms: #### (7 requests, 20.0%)
0.1ms - 0.1ms: ## (4 requests, 11.4%)
0.1ms - 0.1ms: # (1 requests, 2.9%)
0.1ms - 0.2ms: # (2 requests, 5.7%)
0.2ms - 0.2ms:  (0 requests, 0.0%)
0.2ms - 0.2ms:  (0 requests, 0.0%)
0.2ms - 0.2ms:  (0 requests, 0.0%)
0.2ms - 0.2ms: # (1 requests, 2.9%)
```

## Test Configuration

- Iterations per test: 10
- Concurrent users: 5

