# Stand Capacity Tool Consolidation Plan

## Overview
This plan outlines the steps required to consolidate the two competing stand capacity tool implementations (original and new) into a single, robust implementation. The goal is to avoid user confusion, fix existing bugs, and ensure all required features are available in the consolidated tool.

## Current Issues Identified
- Two separate implementations: `/capacity` and `/new-capacity`
- Missing `_filterStandsByLocation` function in `standCapacityService.js`
- JSON parsing error in `getLatestCapacityResults()` function
- Inconsistent navigation and user experience

## Consolidation Tasks

### 1. Backend Fixes
- [x] Fix the `_filterStandsByLocation` function in `standCapacityService.js` 
- [x] Fix JSON parsing error in `getLatestCapacityResults()`
- [x] Ensure database table `capacity_results` exists for storing results

### 2. Remove Original Capacity Pages
- [x] Delete `/frontend/src/pages/capacity/index.js`
- [x] Archive or delete original components under `/frontend/src/components/capacity/`

### 3. Update Navigation
- [x] Update `NavigationSidebar.js` to link to `/new-capacity` instead of `/capacity`
- [x] Consider renaming the URL path from `/new-capacity` to just `/capacity` for better UX

### 4. Update New Capacity Tool with Required Features
- [x] Auto-calculate capacity on page load
- [x] Always use time slots from configuration (remove user option)
- [x] Default to chart view
- [x] Save results to database

### 5. Set Up URL Redirection
- [x] Configure a redirect from `/capacity` to `/new-capacity` (or vice versa)

### 6. Clean Up API and Code
- [x] Review and clean up redundant API endpoints in `capacity.js`
- [x] Remove unused functions/methods
- [x] Update comments and documentation

### 7. Testing
- [x] Test the consolidated tool end-to-end
- [x] Verify database storage and retrieval
- [x] Ensure charts display correctly
- [x] Check that capacity is calculated on page load

## Implementation Notes
1. The backend already has an endpoint `/api/capacity/stand-capacity/latest` for retrieving latest results
2. ✓ Fixed JSON parsing errors when trying to convert objects that are already objects
3. ✓ Fixed missing `_filterStandsByLocation` function causes calculation failures
4. ✓ Backed up and completely removed the old capacity components to avoid confusion
5. ✓ Updated the redirect page to handle the transition gracefully

## Timeline
- **Priority 1:** Fix backend issues (#1) ✓
- **Priority 2:** Update new capacity tool with required features (#4) ✓
- **Priority 3:** Remove old pages and update navigation (#2, #3) ✓
- **Priority 4:** Testing and cleanup (#7, #6) ✓
- **Priority 5:** Set up URL redirection (#5) ✓ 