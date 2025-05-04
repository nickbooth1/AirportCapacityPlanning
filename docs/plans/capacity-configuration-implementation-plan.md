# Capacity Configuration Module Implementation Plan

## Overview
This document outlines the implementation plan for the Capacity Configuration module as specified in the CapaCity MVP. The module will manage operational parameters, rules, and settings used by the Stand Capacity Engine to perform calculations, including turnaround times for different aircraft types, buffer times between stand usages, and airport operating hours.

## Implementation Phases

### Phase 1: Database Schema Setup
- [x] Create `operational_settings` table migration with constraints to ensure only one row exists
- [x] Create `turnaround_rules` table migration with foreign key to aircraft_types
- [x] Add necessary indexes to the tables
- [x] Implement initial seed data for default settings (default gap time: 15 minutes, operating hours: 06:00 - 23:59)
- [x] Validate schema integrity with existing tables (especially aircraft_types)

### Phase 2: Backend Models and Services
- [x] Implement `OperationalSettings` model
- [x] Implement `TurnaroundRule` model with proper relationships
- [x] Create `ConfigService` for encapsulating database interactions
- [x] Implement methods for:
  - [x] Fetching and updating operational settings
  - [x] Managing (CRUD) turnaround rules
  - [x] Validation logic for both settings and rules
- [x] Handle the single-row constraint for operational settings
- [x] Add error handling for foreign key violations

### Phase 3: API Endpoints Implementation
- [x] Set up API route structure for configuration endpoints
- [x] Implement Settings API endpoints:
  - [x] `GET /api/config/settings`
  - [x] `PUT /api/config/settings`
- [x] Implement Turnaround Rules API endpoints:
  - [x] `GET /api/config/turnaround-rules`
  - [x] `POST /api/config/turnaround-rules`
  - [x] `PUT /api/config/turnaround-rules/:aircraft_type_code`
  - [x] `DELETE /api/config/turnaround-rules/:aircraft_type_code`
- [x] Add proper request validation middleware
- [x] Register routes in the main Express app
- [x] Document API endpoints in API documentation

### Phase 4: Frontend Implementation - Settings
- [x] Create API client functions in frontend for settings endpoints
- [x] Build settings management page component 
- [x] Implement form components for editing operational settings
  - [x] Gap time input (minutes)
  - [x] Operating hours (time range picker)
- [x] Implement validation and error handling on the frontend
- [x] Add settings page to navigation menu

### Phase 5: Frontend Implementation - Turnaround Rules
- [x] Create API client functions for turnaround rules endpoints
- [x] Build turnaround rules list view page
- [x] Implement form components for creating/editing turnaround rules
  - [x] Aircraft type selector (dropdown using existing types)
  - [x] Turnaround time input (minutes)
- [x] Add validation and error handling
- [x] Create confirmation dialog for rule deletion
- [x] Add turnaround rules page to navigation menu

### Phase 6: Testing and Integration
- [ ] Write unit tests for models and services
- [ ] Write API endpoint tests
- [ ] Test integration with the existing aircraft_types table
- [ ] Verify frontend form validation
- [ ] Test error handling scenarios
- [ ] Validate that the system prevents multiple operational settings records
- [ ] Perform end-to-end testing of the configuration workflow

### Phase 7: Stand Capacity Engine Integration
- [ ] Modify Stand Capacity Engine to use configuration data
- [ ] Implement service method to fetch all required configuration at once
- [ ] Update capacity calculation logic to incorporate:
  - [ ] Aircraft-specific turnaround times
  - [ ] Default gap times between aircraft
  - [ ] Airport operating hours for time slot generation
- [ ] Test that capacity calculations correctly reflect configuration changes
- [ ] Add UI elements to show which configuration settings affect capacity calculations

## Integration Considerations
- **Aircraft Types Dependency**: Ensure aircraft types are available before implementing turnaround rules
- **Database Consistency**: Maintain referential integrity with the aircraft_types table
- **UI Consistency**: Follow existing UI patterns for form inputs, validation, and error handling
- **API Patterns**: Maintain consistent API response formats and error handling
- **Single-Row Constraint**: Implement proper handling of the operational_settings table's unique constraint

## Risk Assessment
- Ensuring aircraft type codes in turnaround rules remain valid if aircraft types are updated or removed
- Handling the unique constraint for operational settings requires careful implementation
- Changes to configuration may have significant impact on capacity calculation results
- Integration with the Stand Capacity Engine requires coordination with that component's development

## Progress Tracking
- Phase 1: Completed (100%)
- Phase 2: Completed (100%)
- Phase 3: Completed (100%)
- Phase 4: Completed (100%)
- Phase 5: Completed (100%)
- Phase 6: Not Started (0%)
- Phase 7: Not Started (0%) 