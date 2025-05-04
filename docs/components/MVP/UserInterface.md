# CapaCity Component: User Interface (UI)

## 1. Overview

This component is the frontend web application that users interact with directly. Built using the Next.js framework (based on React), it provides the visual interface for managing airport definitions, configuring capacity settings, triggering calculations, and viewing the results. It communicates with the backend via the API Layer to fetch and manipulate data.

## 2. Inputs

*   **User Actions:** Clicks, form submissions, navigation events performed by the user in their browser.
*   **API Responses:** Data received from the backend API Layer in response to requests initiated by the UI (e.g., lists of stands, configuration settings, calculated capacity results, error messages).

## 3. Outputs

*   **Rendered Web Pages:** HTML, CSS, and JavaScript delivered to the user's browser to display information and interactive elements.
*   **API Requests:** HTTP requests sent to the backend API Layer to fetch data, create/update resources, or trigger actions based on user interactions.
*   **Visual Feedback:** Updates to the display, loading indicators, confirmation messages, validation errors shown to the user.

## 4. Key Features / Responsibilities (MVP)

*   **Navigation:** Allow users to move between different sections of the application (e.g., Stand Management, Configuration, Capacity Results).
*   **Airport Definition Management:**
    *   Display lists of existing Terminals, Piers, Stands, and Aircraft Types.
    *   **Display stands visually on an interactive map.**
    *   Provide forms for adding new entities (Stands, Terminals, Piers, etc.), **including a map interface to select stand location.**
    *   (Potentially) Provide forms for editing existing entities, **including updating stand location via map.**
*   **Capacity Configuration Management:**
    *   Display current operational settings (gap time, operating hours) and allow editing.
    *   Display list of turnaround rules.
    *   Provide forms for adding/editing turnaround rules, linking them to aircraft types.
*   **Capacity Calculation Trigger:** Provide a button or mechanism to initiate the stand capacity calculation via an API call.
*   **Results Display:** Present the calculated capacity results received from the API in a clear and understandable format (e.g., tables, potentially basic charts later).
*   **State Management:** Manage the application's client-side state (e.g., fetched data, form inputs, loading status).
*   **API Interaction:** Handle fetching data from and sending data to the backend API, including managing loading states and errors.

## 5. Modules / Structure (Next.js)

A typical Next.js project structure might include:

*   **`pages/`:** Defines the application routes. Each file corresponds to a page.
    *   `pages/index.tsx`: Main dashboard/home page.
    *   `pages/definitions/stands/index.tsx`: Page to list stands.
    *   `pages/definitions/stands/new.tsx`: Page to add a new stand.
    *   `pages/definitions/terminals/index.tsx`: Page for terminals.
    *   `pages/configuration/settings.tsx`: Page for operational settings.
    *   `pages/configuration/turnaround-rules.tsx`: Page for turnaround rules.
    *   `pages/capacity/results.tsx`: Page to display capacity calculation results.
    *   `pages/api/...`: (Next.js API routes - handled by our separate Node.js backend in this architecture, so likely not used extensively here, but could be for frontend-specific helpers).
*   **`components/`:** Reusable UI elements.
    *   `components/layout/Layout.tsx`: Main application layout (navigation, header, footer).
    *   `components/ui/`: Generic UI elements (Buttons, Inputs, Tables, Modals).
    *   `components/map/`: **Components related to map display and interaction (e.g., `StandMapDisplay.tsx`, `LocationPickerInput.tsx`).**
    *   `components/stands/StandTable.tsx`, `components/stands/StandForm.tsx`: Components specific to stands.
    *   `components/config/SettingsForm.tsx`, `components/config/TurnaroundRuleList.tsx`: Components for configuration.
    *   `components/capacity/ResultsDisplay.tsx`: Component to show capacity results.
*   **`lib/` or `utils/`:** Helper functions, utility code.
    *   `lib/apiClient.ts`: Functions for making requests to the backend API (e.g., using `fetch` or `axios`).
    *   **(Potential) `lib/mapClient.ts` or similar: Configuration/wrappers for map library (e.g., Leaflet, Mapbox GL JS, react-map-gl).**
*   **`hooks/`:** Custom React hooks (e.g., for data fetching, state management).
*   **`styles/`:** Global styles, CSS modules.
*   **`store/` or `context/`:** (Optional) For more complex global state management if needed beyond component state or basic context (e.g., using Zustand, Redux Toolkit, or React Context).

## 6. Incremental Delivery Plan

This component is built incrementally, often slightly lagging the backend API development it consumes.

1.  **Basic Setup & Layout:**
    *   Initialize Next.js project.
    *   Set up basic application layout (`Layout.tsx`) with placeholder navigation.
    *   Establish basic styling approach.
2.  **Airport Definition UI (Stands First):**
    *   Create page (`pages/definitions/stands/index.tsx`) to fetch (using `apiClient.ts`) and display a list of stands from the `/api/stands` endpoint.
    *   Create page (`pages/definitions/stands/new.tsx`) with a form (`StandForm.tsx`) to add a new stand (calling `POST /api/stands`).
    *   Implement basic data display components (`StandTable.tsx`).
    *   **Integrate map library (e.g., Leaflet, Mapbox GL JS).**
    *   **Implement map component (`LocationPickerInput.tsx`) within `StandForm.tsx` to select/save latitude/longitude.**
    *   **Implement map component (`StandMapDisplay.tsx`) on the stand list or details page to show stand locations.**
    *   Add UI for other definition entities (Terminals, Piers, Aircraft Types) as their API endpoints become available.
3.  **Capacity Configuration UI:**
    *   Create page (`pages/configuration/settings.tsx`) to fetch and display operational settings, allowing updates via a form (`SettingsForm.tsx`) calling `PUT /api/config/settings`.
    *   Create page (`pages/configuration/turnaround-rules.tsx`) to fetch and display turnaround rules (`TurnaroundRuleList.tsx`), with forms/modals to add/edit rules (calling relevant API endpoints).
4.  **Capacity Calculation & Display:**
    *   Create page (`pages/capacity/results.tsx`).
    *   Add a button on this page (or elsewhere) to trigger the calculation by calling `GET /api/capacity/calculate`.
    *   Implement the `ResultsDisplay.tsx` component to fetch the results (potentially triggered after the calculation call) and display them (initially as a simple table).
5.  **Refinement:**
    *   Improve user experience (loading states, error handling, feedback messages).
    *   Enhance styling and visual presentation.
    *   Add client-side form validation.
    *   Refactor common UI elements into reusable components.
6.  **Testing:**
    *   Implement component tests (e.g., using React Testing Library) for key UI components.
    *   Implement end-to-end tests (e.g., using Cypress or Playwright) to simulate user flows.

The UI component brings together all the backend functionality into a usable application for the end-user. 