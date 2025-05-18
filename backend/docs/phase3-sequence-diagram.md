# AirportAI Agent Phase 3 - Sequence Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API as API Routes
    participant PC as ProactiveInsightsController
    participant PAS as ProactiveAnalysisService
    participant SCS as StandCapacityService
    participant MS as MaintenanceService
    participant LTM as LongTermMemoryService
    participant WS as WebSocketService
    participant DB as Database

    %% Proactive Insights Flow
    Client->>API: GET /api/insights
    API->>PC: getInsights(req, res)
    PC->>PAS: generateInsights(options)
    PAS->>SCS: getCapacityData(options)
    SCS-->>PAS: capacityData
    PAS->>MS: getMaintenanceData(options)
    MS-->>PAS: maintenanceData
    PAS->>LTM: retrieveRelevantPatterns(context)
    LTM->>DB: query
    DB-->>LTM: patterns
    LTM-->>PAS: relevantPatterns
    PAS->>PAS: detectCapacityConstraints()
    PAS->>PAS: identifyOptimizationOpportunities()
    PAS->>PAS: assessMaintenanceImpact()
    PAS->>PAS: detectUnusualPatterns()
    PAS->>PAS: prioritizeInsights()
    PAS-->>PC: insights
    PC-->>API: response
    API-->>Client: JSON response

    %% Collaboration Flow
    Client->>API: POST /api/collaboration/workspaces
    API->>WS: broadcastToWorkspace(workspaceId, message)
    WS-->>Client: Real-time notification
    API-->>Client: JSON response

    %% Long-Term Memory Flow
    Client->>API: GET /api/insights/:id
    API->>PC: getInsightById(req, res)
    PC->>PAS: getInsightById(insightId)
    PAS->>LTM: buildEnhancedContext(userId, currentContext)
    LTM->>DB: retrieve user preferences
    DB-->>LTM: preferences
    LTM->>DB: retrieve conversation history
    DB-->>LTM: history
    LTM->>DB: retrieve patterns
    DB-->>LTM: patterns
    LTM-->>PAS: enhancedContext
    PAS-->>PC: insight with context
    PC-->>API: response
    API-->>Client: JSON response

    %% External Data Flow
    Client->>API: GET /api/external/weather/forecast
    API->>EDC: getWeatherForecast(options)
    EDC->>EDC: checkCache(key)
    EDC->>WeatherAPI: getForecast(lat, lon, date)
    WeatherAPI-->>EDC: forecast data
    EDC->>EDC: transformWeatherData(data)
    EDC->>DB: store in cache
    EDC-->>API: weather forecast
    API-->>Client: JSON response

    %% Feedback Flow
    Client->>API: POST /api/agent/feedback
    API->>FC: submitFeedback(req, res)
    FC->>CLS: submitFeedback(feedback)
    CLS->>DB: store feedback
    CLS->>LTM: updatePatterns(feedback)
    LTM->>DB: update patterns
    DB-->>LTM: success
    LTM-->>CLS: success
    CLS-->>FC: result
    FC-->>API: response
    API-->>Client: JSON response
```

Note: In this diagram:
- PC = ProactiveInsightsController
- PAS = ProactiveAnalysisService
- SCS = StandCapacityService
- MS = MaintenanceService
- LTM = LongTermMemoryService
- WS = WebSocketService
- EDC = ExternalDataConnectorService
- FC = FeedbackController
- CLS = ContinuousLearningService