# Phase 4: Frontend Integration - High-Level Plan

## 1. Goal

Integrate the backend `AggregatedCapacityImpactService` API endpoint into the frontend to visualize the daily capacity impacts. This primarily involves creating or updating UI components (likely charts) on the dashboard and potentially the maintenance requests page.

## 2. Prerequisites

- [ ] Completion of Phase 3: The backend service and its API endpoint (`GET /api/capacity/impact-analysis` or similar) are fully functional and tested.
- [ ] API documentation for the new endpoint is available and clear.
- [ ] Frontend development environment is set up, and there's a clear understanding of which pages/components will display this information.
- [ ] A charting library (e.g., Chart.js, Recharts, Nivo) is available in the frontend stack, or a decision has been made on which one to use.

## 3. Task Breakdown (High-Level)

### 3.1. API Client Integration (Frontend)

- [ ] **Create/Update API Client Function:**
    - [ ] In the frontend's API utility/service layer (e.g., `frontend/src/api/capacityApi.js` or a new `dashboardApi.js`), add a function to call the new backend endpoint.
    - [ ] This function should accept `startDate` and `endDate` as parameters.
    - [ ] It should handle the API request and response, including error handling.
    ```javascript
    // Example in frontend API client
    // async getCapacityImpactData(startDate, endDate) {
    //   const response = await apiClient.get('/capacity/impact-analysis', {
    //     params: { startDate, endDate }
    //   });
    //   return response.data; 
    // }
    ```

### 3.2. Data Fetching and State Management in Components

- [ ] **Identify/Create Container Components:** Determine which React components (e.g., `DashboardPage.jsx`, `MaintenanceOverview.jsx`) will be responsible for fetching and managing this data.
- [ ] **Date Range Selection:**
    - [ ] Implement UI elements (e.g., date pickers, predefined range selectors like "Next 7 Days", "Next 30 Days", "Month", "Quarter") to allow users to select the `startDate` and `endDate`.
    - [ ] Manage the selected date range in the component's state (e.g., using `useState` or a state management library like Redux/Zustand).
- [ ] **Data Fetching Logic:**
    - [ ] Use `useEffect` hook (or equivalent in class components/state management) to trigger data fetching when the selected date range changes.
    - [ ] Call the API client function created in step 3.1.
    - [ ] Manage loading states (e.g., `isLoading`) and error states.
    - [ ] Store the fetched array of daily impact data in the component's state.

### 3.3. Charting Component Implementation

- [ ] **Choose/Design Chart Type:** Based on the user story, a stacked bar chart seems appropriate for each day in the selected time horizon.
    *   Each bar represents a day.
    *   The y-axis represents capacity (number of movements).
    *   The x-axis represents days in the selected period.
    *   **Stacking:**
        *   Base segment: `finalNetCapacity` (after all impacts).
        *   Middle segment (optional, if `finalNetCapacity` is used as the base): `maintenanceImpacts.potential.reduction` (grey overlay).
        *   Top segment: `maintenanceImpacts.definite.reduction` (red overlay).
        *   The total height of the bar up to the `potential` segment would represent `capacityAfterDefiniteImpact`.
        *   The total height of the bar (including all segments) would represent `originalDailyCapacity`.
        *   Alternatively, start with `originalDailyCapacity` and subtract, but overlaying on `finalNetCapacity` might be more direct for showing *what remains* and what is *lost*.
- [ ] **Data Transformation for Charting Library:**
    - [ ] Transform the array of daily impact data (received from the API) into the specific format required by the chosen charting library.
    - [ ] This will involve iterating through the daily data and extracting values for `originalDailyCapacity`, `capacityAfterDefiniteImpact`, `finalNetCapacity`, and the reduction amounts for `definite` and `potential` impacts (broken down by narrow/wide body if the chart is to show that level of detail within stacks).
- [ ] **Implement the Chart Component:**
    - [ ] Use the chosen charting library to render the stacked bar chart.
    - [ ] Configure axes, labels, legends, and colors (e.g., grey for potential impact, red for definite impact).
    - [ ] **Tooltips/Popovers:** On hover over the "reduction" segments of a bar:
        - [ ] Display a tooltip/popover showing the list of maintenance requests contributing to that reduction for that day (from `maintenanceImpacts.definite.requests` or `maintenanceImpacts.potential.requests`).
        - [ ] Include key details like request title, stand code, status, and start/end times.
        - [ ] Provide a link within the tooltip/popover to navigate to the full maintenance request details page (e.g., `/maintenance/requests/:id`).
- [ ] **Responsiveness:** Ensure the chart is responsive to different screen sizes.

### 3.4. Integration into Pages

- [ ] Place the new charting component(s) into the designated pages (e.g., Dashboard, Maintenance Requests page).
- [ ] Ensure the date range selection mechanism is well-integrated and user-friendly.

### 3.5. Frontend Testing

- [ ] **Component Tests:** Unit/integration tests for the data fetching logic and charting component (mocking API calls).
- [ ] **End-to-End Tests (Manual or Automated):**
    - [ ] Verify correct data display for different date ranges.
    - [ ] Test interactions: date selection, chart hover/tooltips, links in tooltips.
    - [ ] Check behavior with no maintenance requests, and with various combinations of definite/potential requests.
    - [ ] Test loading and error states.
    - [ ] Cross-browser and cross-device compatibility checks for the chart visualization.

### 3.6. User Feedback and Iteration

- [ ] Gather feedback from users/stakeholders on the visualization's clarity and usefulness.
- [ ] Iterate on the chart design, tooltips, or data presentation based on feedback.

## 4. Definition of Done for Phase 4 (High-Level)

- [ ] Frontend components can successfully fetch and process data from the new backend API endpoint.
- [ ] A visual representation (e.g., stacked bar chart) of daily capacity impacts is implemented on the relevant frontend pages.
- [ ] Users can select a date range to view the capacity impact analysis.
- [ ] Tooltips or similar interactivity provide details about the contributing maintenance requests.
- [ ] Basic frontend tests are in place for the new functionality.
- [ ] The feature is deployed and accessible to users. 