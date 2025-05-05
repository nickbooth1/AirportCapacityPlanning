# AirlineAirportConfig Implementation Plan

## Overview
This plan outlines the steps required to implement the AirlineAirportConfig component, which will enable users to configure their base airport, allocate airlines to terminals, and associate ground handling agents (GHAs) with airlines. The implementation will be divided into phases, with navigation menu adjustments as a separate final phase.

## Phase 1: Data Model Design & Backend Setup (Days 1-2)

### 1.1 Database Schema Design
- [ ] Create migration file for `airport_configuration` table:
  - `id` (primary key)
  - `base_airport_id` (foreign key to airports table)
  - `created_at` timestamp
  - `updated_at` timestamp

- [ ] Create migration file for `airline_terminal_allocations` table:
  - `id` (primary key)
  - `airline_id` (foreign key to airlines table)
  - `terminal_id` (foreign key to terminals table)
  - `gha_id` (foreign key to ground_handling_agents table, nullable)
  - `created_at` timestamp
  - `updated_at` timestamp

### 1.2 Backend API Design
- [ ] Create new controller `AirportConfigController.js`:
  - [ ] `getAirportConfig()` - Get current configuration
  - [ ] `updateAirportConfig()` - Update configuration
  - [ ] `getAirlineTerminalAllocations()` - Get all allocations
  - [ ] `addAirlineTerminalAllocation()` - Add allocation
  - [ ] `updateAirlineTerminalAllocation()` - Update allocation
  - [ ] `deleteAirlineTerminalAllocation()` - Delete allocation

### 1.3 Backend Service Layer Implementation
- [ ] Create `AirportConfigService.js` with methods:
  - [ ] `getConfig()` - Retrieve current configuration
  - [ ] `updateConfig()` - Update base airport
  - [ ] `getAllocations()` - Get all airline-terminal allocations
  - [ ] `addAllocation()` - Add new allocation
  - [ ] `updateAllocation()` - Update existing allocation
  - [ ] `deleteAllocation()` - Remove allocation

### 1.4 API Routes Configuration
- [ ] Create routes in `airportConfig.js`:
  - [ ] `GET /api/airport-config` - Get configuration
  - [ ] `PUT /api/airport-config` - Update configuration
  - [ ] `GET /api/airport-config/allocations` - Get allocations
  - [ ] `POST /api/airport-config/allocations` - Create allocation
  - [ ] `PUT /api/airport-config/allocations/:id` - Update allocation
  - [ ] `DELETE /api/airport-config/allocations/:id` - Delete allocation

## Phase 2: Frontend Infrastructure & Context (Days 3-4)

### 2.1 API Client Implementation
- [ ] Add methods to API client for accessing new endpoints:
  - [ ] `getAirportConfig()`
  - [ ] `updateAirportConfig(data)`
  - [ ] `getAirlineTerminalAllocations()`
  - [ ] `addAirlineTerminalAllocation(data)`
  - [ ] `updateAirlineTerminalAllocation(id, data)`
  - [ ] `deleteAirlineTerminalAllocation(id)`

### 2.2 Context Provider Implementation
- [ ] Create `AirportConfigContext.js`:
  - [ ] State for airport configuration data
  - [ ] Loading and error states
  - [ ] Methods for CRUD operations
  - [ ] Context provider component

### 2.3 Context Integration with App
- [ ] Update `_app.js` to wrap application with `AirportConfigProvider`
- [ ] Ensure context is properly initialized on application startup

## Phase 3: Base Component Implementation (Days 5-7)

### 3.1 Base Airport Selection Component
- [ ] Create component for selecting base airport:
  - [ ] Airport search/autocomplete dropdown
  - [ ] Display of currently selected airport
  - [ ] Error handling for invalid selection

### 3.2 Airline Terminal Allocation Table
- [ ] Implement table component for displaying allocations:
  - [ ] Columns for airline, terminal, and GHA
  - [ ] Sort and filter functionality
  - [ ] Pagination for large datasets
  - [ ] Action buttons for edit/delete

### 3.3 Allocation Dialog Component
- [ ] Create dialog for adding/editing allocations:
  - [ ] Form fields for airline, terminal, and GHA
  - [ ] Validation logic
  - [ ] Save and cancel actions

### 3.4 Main Configuration Page
- [ ] Create main container component:
  - [ ] Layout and structure
  - [ ] Integration of all subcomponents
  - [ ] Page-level state management
  - [ ] Error and loading states

## Phase 4: Page Integration & Routes (Day 8)

### 4.1 Next.js Page Creation
- [ ] Create `frontend/pages/config/airport-configuration.js`:
  - [ ] Import and use main component
  - [ ] Apply common layout

### 4.2 Configuration Index Update
- [ ] Update `frontend/src/pages/config/index.js`:
  - [ ] Add card for Airport Configuration
  - [ ] Create link to new configuration page

### 4.3 Route Testing
- [ ] Test all routes and navigation paths
- [ ] Ensure correct loading of components

## Phase 5: Context Integration & Data Flow (Days 9-10)

### 5.1 Connect Components to Context
- [ ] Update components to use `useAirportConfig` hook:
  - [ ] Base airport selection
  - [ ] Allocation table
  - [ ] Allocation dialog

### 5.2 Implement CRUD Operations
- [ ] Connect UI actions to context methods:
  - [ ] Save base airport changes
  - [ ] Add/edit/delete allocations
  - [ ] Form validation and error handling

### 5.3 Optimistic Updates
- [ ] Implement optimistic UI updates:
  - [ ] Update UI immediately on user action
  - [ ] Roll back changes if API calls fail
  - [ ] Error recovery mechanisms

## Phase 6: Testing & Refinement (Days 11-12)

### 6.1 Unit Testing
- [ ] Write tests for individual components:
  - [ ] Base airport selection
  - [ ] Allocation table
  - [ ] Allocation dialog
  - [ ] Context provider

### 6.2 Integration Testing
- [ ] Test full workflow scenarios:
  - [ ] Complete configuration process
  - [ ] Error conditions and recovery
  - [ ] Edge cases (e.g., no allocations)

### 6.3 UX Refinements
- [ ] Implement feedback mechanisms:
  - [ ] Success messages
  - [ ] Error notifications
  - [ ] Loading indicators
  - [ ] Confirmation dialogs

## Phase 7: Documentation & Deployment (Day 13)

### 7.1 Code Documentation
- [ ] Add JSDoc comments to all components and functions
- [ ] Update implementation details in component documentation

### 7.2 User Documentation
- [ ] Create user guide for the configuration tool
- [ ] Add tooltips and help text to UI elements

### 7.3 Deployment Preparation
- [ ] Feature flagging (if needed)
- [ ] Staging environment testing

## Phase 8: Navigation Menu Adjustments (Days 14-15)

### 8.1 Navigation Design Review
- [ ] Analyze current navigation structure
- [ ] Design consolidated configuration section
- [ ] Get stakeholder approval for changes

### 8.2 Layout Component Update
- [ ] Modify `frontend/components/Layout.js`:
  - [ ] Remove individual configuration items (Airports, Airlines, GHAs, etc.)
  - [ ] Keep only "Configuration" entry in main navigation
  - [ ] Update icons and styling

### 8.3 Configuration Landing Page Enhancement
- [ ] Expand config landing page with cards for all configuration items:
  - [ ] Add section for data configuration
  - [ ] Create cards for Airports, Airlines, GHAs, Aircraft Types, Size Categories
  - [ ] Implement consistent styling and navigation

### 8.4 Testing Navigation Changes
- [ ] Verify all links work correctly
- [ ] Test responsive behavior
- [ ] Ensure backward compatibility with existing bookmarks

## Dependencies and Resources

### Team Requirements
- 1 Backend Developer (Phases 1, 2)
- 1 Frontend Developer (Phases 2-8)
- 1 QA Tester (Phases 6, 8)
- Project Manager (oversight throughout)

### External Dependencies
- Airport data API for airport selection
- Existing database tables for airlines, terminals, and GHAs
- Material UI components for UI elements

## Success Criteria
- [ ] Users can set their base airport
- [ ] Airlines can be allocated to specific terminals
- [ ] GHAs can be optionally assigned to airlines
- [ ] Configuration data is persisted and accessible to other components
- [ ] Navigation menu is simplified with consolidated configuration section
- [ ] All existing functionality remains accessible in the new structure 