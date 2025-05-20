# AirportAI Performance Test Report

## Test Summary

- **Date**: 20/05/2025, 09:22:36
- **Result**: ❌ FAILED
- **KPIs Passed**: 4 of 5

## KPI Results

| KPI | Result | Target | Status |
|-----|--------|--------|--------|
| System Response Time (95th percentile) | 0.000s | < 1s | ✅ |
| Voice Recognition Accuracy | 98.4% | > 97.0% | ✅ |
| Autonomous Decision Accuracy | 98.8% | > 99.0% | ❌ |
| Dashboard Loading Time | 0.000s | < 2s | ✅ |
| API Gateway Throughput | 128524.4 req/s | > 1000 req/s | ✅ |

## Detailed Metrics

- **Total API Calls**: 0
- **Voice Processing Calls**: 25
- **Autonomous Decisions**: 10
- **Overall Success Rate**: 0.0%

## Response Time Distribution

```
0.0ms - 0.0ms: ############# (23 requests, 65.7%)
0.0ms - 0.1ms:  (0 requests, 0.0%)
0.1ms - 0.1ms: # (1 requests, 2.9%)
0.1ms - 0.1ms: # (2 requests, 5.7%)
0.1ms - 0.1ms: ## (3 requests, 8.6%)
0.1ms - 0.1ms: ## (4 requests, 11.4%)
0.1ms - 0.1ms:  (0 requests, 0.0%)
0.1ms - 0.1ms:  (0 requests, 0.0%)
0.1ms - 0.1ms: # (1 requests, 2.9%)
0.1ms - 0.1ms: # (1 requests, 2.9%)
```

## Test Configuration

- Iterations per test: 10
- Concurrent users: 5

