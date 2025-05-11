# Stand Adjacency Feature: User Guide

## Overview

The Stand Adjacency feature in the Airport Capacity Planner allows you to model how stands at your airport affect each other's capacity. When one stand is in use, it may restrict or prevent the use of adjacent stands depending on various operational constraints.

## Understanding Best Case vs. Worst Case Capacity

The capacity calculator provides two different capacity scenarios:

### Best Case Capacity

The **Best Case** capacity calculation shows the theoretical maximum capacity of your stands, assuming no adjacency restrictions are in effect. This represents the absolute maximum throughput your stands could achieve in isolation.

### Worst Case Capacity

The **Worst Case** capacity calculation shows the realistic capacity of your stands when all adjacency restrictions are considered. This represents a more conservative and operationally realistic throughput that takes into account how stands interact with each other.

## Types of Adjacency Restrictions

The system supports three types of adjacency restrictions:

1. **No Use**: When a stand is occupied, an adjacent stand cannot be used at all.
2. **Size Limited**: When a stand is occupied, an adjacent stand can only accommodate aircraft up to a certain size category.
3. **Aircraft Type Limited**: When a stand is occupied, specific aircraft types cannot use an adjacent stand.

## How to Configure Stand Adjacencies

1. Navigate to **Stands Management** > **Stand Adjacencies**
2. Click **Add Adjacency Rule** to create a new rule
3. Fill in the form:
   - **Primary Stand**: The stand that, when occupied, affects another stand
   - **Adjacent Stand**: The stand that is affected by the primary stand's occupation
   - **Impact Direction**: The spatial relationship (left, right, behind, front)
   - **Restriction Type**: The type of restriction (no use, size limited, aircraft type limited)
   - **Maximum Aircraft Size** (for size limited): The largest aircraft size allowed
   - **Prohibited Aircraft Types** (for aircraft type limited): List of aircraft types not allowed
   - **Is Active**: Toggle to enable/disable the rule

## Interpreting Capacity Results

When viewing capacity results, pay attention to the differences between best and worst case:

- **Small difference**: Adjacency restrictions have minimal impact on your operation
- **Large difference**: Adjacency restrictions significantly reduce capacity, potentially creating bottlenecks

### Body Type Distribution

The capacity visualization also shows how capacity is distributed between narrow-body and wide-body aircraft:

- **Best Case Body Type Distribution**: Assumes no adjacency constraints
- **Worst Case Body Type Distribution**: Shows realistic distribution with adjacency constraints applied

### Example Interpretation

If you see:
- Best Case: 120 total movements (60 narrow-body, 60 wide-body)
- Worst Case: 100 total movements (70 narrow-body, 30 wide-body)

This indicates that adjacency constraints are reducing your total capacity by approximately 17%, with a particularly significant impact on wide-body operations (50% reduction compared to best case).

## Best Practices

1. **Focus on Critical Time Periods**: Pay special attention to capacity during your peak operational hours.
2. **Identify Bottlenecks**: Look for stands where the worst case capacity is significantly lower than best case.
3. **Optimize Stand Allocations**: Consider adjusting your stand allocation strategy to minimize adjacency impacts.
4. **Scenario Planning**: Use the capacity calculator to test different adjacency scenarios and optimize your airport layout.

## Troubleshooting

- **Zero Capacity in Worst Case**: Check if you have "no use" adjacency rules that may be overly restrictive.
- **No Difference Between Cases**: Verify that your adjacency rules are properly configured and active.
- **Unexpected Results**: Review the specific aircraft types and stands involved to ensure the rules apply as expected. 