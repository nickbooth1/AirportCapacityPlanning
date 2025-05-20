# AirportAI Performance Test Report

## Test Summary

- **Date**: 20/05/2025, 13:11:14
- **Result**: ✅ PASSED
- **KPIs Passed**: 5 of 5

## KPI Results

| KPI | Result | Target | Status |
|-----|--------|--------|--------|
| System Response Time (95th percentile) | 0.005s | < 1s | ✅ |
| Voice Recognition Accuracy | 98.4% | > 97.0% | ✅ |
| Autonomous Decision Accuracy | 99.4% | > 99.0% | ✅ |
| Dashboard Loading Time | 0.001s | < 2s | ✅ |
| API Gateway Throughput | 55023.5 req/s | > 1000 req/s | ✅ |

## Detailed Metrics

- **Total API Calls**: 0
- **Voice Processing Calls**: 25
- **Autonomous Decisions**: 10
- **Overall Success Rate**: 0.0%

## Response Time Distribution

```
0.2ms - 0.8ms: ###### (10 requests, 28.6%)
0.8ms - 1.4ms: ########### (19 requests, 54.3%)
1.4ms - 2.0ms: # (2 requests, 5.7%)
2.0ms - 2.5ms: # (2 requests, 5.7%)
2.5ms - 3.1ms:  (0 requests, 0.0%)
3.1ms - 3.7ms:  (0 requests, 0.0%)
3.7ms - 4.3ms:  (0 requests, 0.0%)
4.3ms - 4.8ms:  (0 requests, 0.0%)
4.8ms - 5.4ms: # (1 requests, 2.9%)
5.4ms - 6.0ms: # (1 requests, 2.9%)
```

## Test Configuration

- Iterations per test: 10
- Concurrent users: 5

