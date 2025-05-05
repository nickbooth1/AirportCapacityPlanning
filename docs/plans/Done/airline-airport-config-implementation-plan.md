# AirlineAirportConfig Implementation Plan

## Overview
This plan outlines the steps required to implement the AirlineAirportConfig component, which will enable users to configure their base airport, allocate airlines to terminals, and associate ground handling agents (GHAs) with airlines. The implementation will be divided into phases, with navigation menu adjustments as a separate final phase.

## Phase 1: Data Model Design & Backend Setup (Days 1-2)

### 1.1 Database Schema Design
- [x] Create migration file for `airport_configuration` table:
  - `id` (primary key)
  - `base_airport_id` (foreign key to airports table)
  - `created_at` timestamp
  - `updated_at` timestamp

- [x] Create migration file for `airline_terminal_allocations` table:
  - `id` (primary key)
  - `airline_id` (foreign key to airlines table)
  - `terminal_id` (foreign key to terminals table)
  - `gha_id` (foreign key to ground_handling_agents table, nullable)
  - `created_at` timestamp
  - `updated_at` timestamp

### 1.2 Backend API Design
- [x] Create new controller `AirportConfigController.js`:
  - [x] `getAirportConfig()` - Get current configuration
  - [x] `updateAirportConfig()` - Update configuration
  - [x] `getAirlineTerminalAllocations()` - Get all allocations
  - [x] `addAirlineTerminalAllocation()` - Add allocation
  - [x] `updateAirlineTerminalAllocation()` - Update allocation
  - [x] `deleteAirlineTerminalAllocation()` - Delete allocation

### 1.3 Backend Service Layer Implementation
- [x] Create `AirportConfigService.js` with methods:
  - [x] `getConfig()` - Retrieve current configuration
  - [x] `updateConfig()` - Update base airport
  - [x] `getAllocations()` - Get all airline-terminal allocations
  - [x] `addAllocation()` - Add new allocation
  - [x] `updateAllocation()` - Update existing allocation
  - [x] `deleteAllocation()` - Remove allocation

### 1.4 API Routes Configuration
- [x] Create routes in `airportConfig.js`:
  - [x] `GET /api/airport-config` - Get configuration
  - [x] `PUT /api/airport-config` - Update configuration
  - [x] `GET /api/airport-config/allocations` - Get allocations
  - [x] `POST /api/airport-config/allocations` - Create allocation
  - [x] `PUT /api/airport-config/allocations/:id` - Update allocation
  - [x] `DELETE /api/airport-config/allocations/:id` - Delete allocation

## Phase 2: Frontend Infrastructure & Context (Days 3-4)

### 2.1 API Client Implementation
- [x] Add methods to API client for accessing new endpoints:
  - [x] `getAirportConfig()`
  - [x] `updateAirportConfig(data)`
  - [x] `getAirlineTerminalAllocations()`
  - [x] `addAirlineTerminalAllocation(data)`
  - [x] `updateAirlineTerminalAllocation(id, data)`
  - [x] `deleteAirlineTerminalAllocation(id)`

### 2.2 Context Provider Implementation
- [x] Create `AirportConfigContext.js`:
  - [x] State for airport configuration data
  - [x] Loading and error states
  - [x] Methods for CRUD operations
  - [x] Context provider component

### 2.3 Context Integration with App
- [x] Update `_app.js` to wrap application with `AirportConfigProvider`
- [x] Ensure context is properly initialized on application startup

## Phase 3: Base Component Implementation (Days 5-7)

### 3.1 Base Airport Selection Component
- [x] Create component for selecting base airport:
  - [x] Airport search/autocomplete dropdown
  - [x] Display of currently selected airport
  - [x] Error handling for invalid selection

### 3.2 Airline Terminal Allocation Table
- [x] Implement table component for displaying allocations:
  - [x] Columns for airline, terminal, and GHA
  - [x] Sort and filter functionality
  - [x] Pagination for large datasets
  - [x] Action buttons for edit/delete

### 3.3 Allocation Dialog Component
- [x] Create dialog for adding/editing allocations:
  - [x] Form fields for airline, terminal, and GHA
  - [x] Validation logic
  - [x] Save and cancel actions

### 3.4 Main Configuration Page
- [x] Create main container component:
  - [x] Layout and structure
  - [x] Integration of all subcomponents
  - [x] Page-level state management
  - [x] Error and loading states

## Phase 4: Page Integration & Routes (Day 8)

### 4.1 Next.js Page Creation
- [x] Create `frontend/pages/config/airport-configuration.js`:
  - [x] Import and use main component
  - [x] Apply common layout

### 4.2 Configuration Index Update
- [x] Update `frontend/src/pages/config/index.js`:
  - [x] Add card for Airport Configuration
  - [x] Create link to new configuration page

### 4.3 Route Testing
- [x] Test all routes and navigation paths
- [x] Ensure correct loading of components

## Phase 5: Context Integration & Data Flow (Days 9-10)

### 5.1 Connect Components to Context
- [x] Update components to use `useAirportConfig` hook:
  - [x] Base airport selection
  - [x] Allocation table
  - [x] Allocation dialog

### 5.2 Implement CRUD Operations
- [x] Connect UI actions to context methods:
  - [x] Save base airport changes
  - [x] Add/edit/delete allocations
  - [x] Form validation and error handling

### 5.3 Optimistic Updates
- [x] Implement optimistic UI updates:
  - [x] Update UI immediately on user action
  - [x] Roll back changes if API calls fail
  - [x] Error recovery mechanisms

## Phase 6: Testing & Refinement (Days 11-12)

### 6.1 Unit Testing
- [x] Write tests for individual components:
  - [x] Base airport selection
  - [x] Allocation table
  - [x] Allocation dialog
  - [x] Context provider

### 6.2 Integration Testing
- [x] Test full workflow scenarios:
  - [x] Complete configuration process
  - [x] Error conditions and recovery
  - [x] Edge cases (e.g., no allocations)

### 6.3 UX Refinements
- [x] Implement feedback mechanisms:
  - [x] Success messages
  - [x] Error notifications
  - [x] Loading indicators
  - [x] Confirmation dialogs

## Phase 7: Documentation & Deployment (Day 13)

### 7.1 Code Documentation
- [x] Add JSDoc comments to all components and functions
- [x] Update implementation details in component documentation

### 7.2 User Documentation
- [x] Create user guide for the configuration tool
- [x] Add tooltips and help text to UI elements

### 7.3 Deployment Preparation
- [x] Feature flagging (if needed)
- [x] Staging environment testing

## Phase 8: Navigation Menu Adjustments (Days 14-15)

### 8.1 Navigation Design Review
- [x] Analyze current navigation structure
- [x] Design consolidated configuration section
- [x] Get stakeholder approval for changes

### 8.2 Layout Component Update
- [x] Modify `frontend/components/Layout.js`:
  - [x] Remove individual configuration items (Airports, Airlines, GHAs, etc.)
  - [x] Keep only "Configuration" entry in main navigation
  - [x] Update icons and styling

### 8.3 Configuration Landing Page Enhancement
- [x] Expand config landing page with cards for all configuration items:
  - [x] Add section for data configuration
  - [x] Create cards for Airports, Airlines, GHAs, Aircraft Types, Size Categories
  - [x] Implement consistent styling and navigation

### 8.4 Testing Navigation Changes
- [x] Verify all links work correctly
- [x] Test responsive behavior
- [x] Ensure backward compatibility with existing bookmarks

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
- [x] Users can set their base airport
- [x] Airlines can be allocated to specific terminals
- [x] GHAs can be optionally assigned to airlines
- [x] Configuration data is persisted and accessible to other components
- [x] Navigation menu is simplified with consolidated configuration section
- [x] All existing functionality remains accessible in the new structure 