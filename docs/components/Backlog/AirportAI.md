# AirportAI Agent - Design Document

## 1. Overview

The AirportAI Agent is an intelligent assistant integrated within the Airport Capacity Planner that enables users to interact with the system through natural language. It serves as an interface layer that translates user queries into actionable operations, leveraging existing system tools to answer questions, generate insights, and run what-if scenarios for capacity planning. The agent provides interactive visualizations and contextual recommendations to support decision-making processes for airport operations planning.

## 2. System Architecture

```
┌───────────────────────────────────────────────────────────────────┐
│                         User Interface Layer                       │
├───────────┬──────────────────────────────────┬───────────────────┤
│ Chat      │ Embedded Visualization Panels    │ Interactive       │
│ Interface │ (Results appear in context)      │ Dashboard         │
├───────────┴──────────────────────────────────┴───────────────────┤
│                    Dedicated AI Agent Hub Page                     │
└─────┬─────────────────────────────────────────────────┬──────────┘
      │                                                  │
      ▼                                                  ▼
┌─────────────────────────┐                   ┌────────────────────┐
│ Agent Interface Layer   │                   │ Visualization      │
├─────────────────────────┤                   │ Renderer           │
│ • Query Understanding   │◄──────────────────┤                    │
│ • Intent Recognition    │                   │                    │
│ • Context Management    │──────────────────►│                    │
└──────────┬──────────────┘                   └────────────────────┘
           │
           ▼
┌──────────────────────────┐                 ┌─────────────────────────┐
│ Agent Core               │                 │ Voice Processing Layer   │
├──────────────────────────┤                 ├─────────────────────────┤
│ • Natural Language       │                 │ • Speech Recognition     │
│   Processing             │◄────────────────┤ • Text-to-Speech         │
│ • Reasoning Engine       │                 │ • Voice Identity Mgmt    │
│ • Tool Orchestration     │─────────────────►│ • Noise Handling        │
│ • Knowledge Base         │                 │ • Multi-language Support │
└──────────┬───────────────┘                 └─────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Tool Integration Layer                        │
├────────────────┬───────────────────┬───────────────┬─────────────┤
│ Flight Upload  │ Scenario Creation │ Stand         │ Allocation   │
│ Tool           │ Tool              │ Capacity Tool │ Engine       │
└────────────────┴───────────────────┴───────────────┴─────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────────┐      ┌─────────────────────────────┐
│ External Data Sources    │      │ Existing System Components  │
├──────────────────────────┤      ├─────────────────────────────┤
│ • Historical Flight Data │      │ • Airport Definition        │
│ • Weather Forecasts      │      │ • Capacity Configuration    │
│ • Airline Growth Models  │      │ • Maintenance System        │
└──────────────────────────┘      └─────────────────────────────┘
```

## 3. Core Components

### 3.1 Agent Interface Layer

#### 3.1.1 ConversationPanel
- **ChatInput**: Captures user queries in natural language
- **MessageHistory**: Maintains conversation history and context
- **SuggestionChips**: Offers common questions and follow-up actions
- **ContextAwareness**: Tracks current user view and recent interactions
- **VoiceInputButton**: Allows users to speak queries instead of typing (future phase)
- **AudioOutputControls**: Enables text-to-speech for agent responses (future phase)

#### 3.1.2 InsightsDashboard
- **ScenarioComparison**: Visualizes differences between scenarios
- **CapacityVisualization**: Displays capacity data in various formats
- **TimelineView**: Shows temporal changes in capacity metrics
- **ExportControls**: Allows saving or sharing of analysis results

#### 3.1.3 AgentHubPage
- **ConversationHistory**: Complete searchable history of past interactions
- **SavedInsights**: Library of important visualizations and insights
- **AdvancedQueryInterface**: Full-screen interaction with rich input options
- **TeamCollaboration**: Ability to share and comment on agent outputs
- **InsightCategories**: Organized repository of agent-generated content
- **DataExplorer**: Advanced visualization exploration tools
- **VoicePreferences**: Settings for voice input/output configuration (future phase)

### 3.2 Agent Core

#### 3.2.1 NaturalLanguageProcessor
- **IntentRecognition**: Identifies the purpose of user queries
- **EntityExtraction**: Identifies key elements such as dates, airlines, terminals
- **ContextManager**: Maintains conversation state and previous references
- **QueryReformulation**: Refines ambiguous queries based on context
- **SpeechToIntent**: Processes spoken queries into structured intents (future phase)

#### 3.2.2 ReasoningEngine
- **LogicalInference**: Determines required steps to answer queries
- **PlanGeneration**: Creates execution plans for complex requests
- **UncertaintyHandling**: Manages ambiguous inputs with clarification
- **KnowledgeApplicationLogic**: Applies domain expertise to requests

#### 3.2.3 ToolOrchestrator
- **ToolSelector**: Chooses appropriate system tools for each task
- **ParameterMapper**: Translates natural language parameters to tool inputs
- **ExecutionMonitor**: Tracks progress of tool operations
- **ResultsCollector**: Gathers outputs from tool executions

#### 3.2.4 KnowledgeBase
- **DomainOntology**: Structured representation of airport operations concepts
- **ReferenceData**: Standard values for aircraft types, turnaround times, etc.
- **PreviousScenarios**: Repository of past analyses and their outcomes
- **BusinessRules**: Operational constraints and best practices
- **AcousticTerminology**: Domain-specific airport terms pronunciation guide (future phase)

### 3.3 Voice Processing Layer

#### 3.3.1 SpeechRecognitionService
- **AudioCapture**: Processes microphone input from user devices
- **NoiseFiltering**: Filters out background noise common in airport environments
- **SpeechTranscription**: Converts spoken audio to text with high accuracy
- **DomainAdaptation**: Specialized recognition for airport terminology
- **MultispeakerHandling**: Distinguishes between different speakers in multi-user settings

#### 3.3.2 TextToSpeechService
- **VoiceSynthesis**: Generates natural-sounding speech from text responses
- **VoiceIdentity**: Maintains consistent agent voice personality
- **ProsodyControl**: Manages speech rhythm, stress, and intonation
- **MultilingualSpeech**: Supports multiple languages for diverse airport users
- **PronunciationCustomization**: Correctly pronounces airport-specific terminology

#### 3.3.3 VoiceIdentityManager
- **VoiceProfile**: Maintains consistent agent voice characteristics
- **PersonalityAttributes**: Configures voice tone to match brand personality
- **AdaptiveEQ**: Adjusts audio quality for different environments
- **UserVoiceProfiles**: Stores and recognizes returning users by voice (future phase)

### 3.4 Tool Integration Layer

#### 3.4.1 FlightUploadTool
- Connects to `/api/flights/upload` endpoint
- Handles file selection and upload for flight schedules
- Processes validation results

#### 3.4.2 ScenarioCreationTool
- Creates new scenarios based on user parameters
- Modifies existing scenarios for what-if analysis
- Manages scenario metadata

#### 3.4.3 StandCapacityTool
- Interfaces with the Stand Capacity Engine
- Configures parameters for capacity calculations
- Processes capacity results for visualization

#### 3.4.4 AllocationEngineTool
- Triggers the allocation algorithm 
- Sets allocation parameters and constraints
- Collects and interprets allocation results

### 3.5 Visualization Layer

#### 3.5.1 ScenarioComparator
- **BeforeAfterView**: Side-by-side comparison of scenarios
- **DifferenceHighlighter**: Visualization of key changes
- **ParameterAdjuster**: Interactive controls to modify scenarios

#### 3.5.2 CapacityInsightsView
- **HeatmapRenderer**: Time-based visualization of capacity constraints
- **UtilizationGraphs**: Usage patterns across stands and terminals
- **BottleneckIdentifier**: Visual indicators of capacity limitations

#### 3.5.3 StandAllocationVisualizer
- **InteractiveAirportMap**: Spatial view of stand allocations
- **FlightScheduleTimeline**: Temporal view of stand usage
- **ConflictHighlighter**: Visualization of allocation conflicts

## 4. User Interaction Flows

### 4.1 Capacity Query Flow

1. User asks a question about current capacity (e.g., "What's our peak capacity period next month?")
2. NLP component analyzes the query and identifies intent as a capacity information request
3. Entity extraction identifies the time period ("next month")
4. ToolOrchestrator selects the StandCapacityTool to retrieve capacity data
5. Results are formatted into an appropriate visualization (e.g., timeline or heatmap)
6. Agent responds with both a natural language summary and visualization
7. SuggestionChips offer follow-up questions like "Why is capacity constrained during that period?"

### 4.2 Voice-Based Query Flow (Future Phase)

1. User activates voice input mode by clicking the microphone icon
2. System begins capturing audio and displays listening indicator
3. User speaks a query about capacity or operations
4. SpeechRecognitionService processes audio and converts to text
5. The transcribed query is processed through the standard NLP pipeline
6. Agent generates a response with text and visualizations
7. If voice output is enabled, TextToSpeechService converts the text response to speech
8. System plays audio response while displaying text and visualizations
9. User can interrupt voice response at any time by clicking a button or speaking

### 4.3 What-If Scenario Flow

1. User requests a scenario analysis (e.g., "What if we add 3 more wide-body stands in Terminal 2?")
2. NLP identifies intent as a scenario creation and analysis request
3. Entity extraction identifies parameters (count: 3, stand type: wide-body, location: Terminal 2)
4. ToolOrchestrator creates workflow:
   - Use ScenarioCreationTool to establish baseline
   - Modify infrastructure configuration to add stands
   - Trigger capacity calculation and allocation simulation
5. Visualization layer presents comparative results between current and modified scenarios
6. Agent provides insights about the impact on capacity and utilization
7. User is offered options to refine the scenario or export the analysis

### 4.4 Decision Support Flow

1. User asks for recommendations (e.g., "How can we handle the expected 15% growth in Emirates flights?")
2. NLP identifies intent as a decision support request
3. Entity extraction identifies parameters (airline: Emirates, growth percentage: 15%)
4. KnowledgeBase is consulted for Emirates' current operations data
5. ToolOrchestrator creates multiple scenarios with different approaches:
   - Scenario 1: Allocate additional existing stands
   - Scenario 2: Modify stand usage schedules
   - Scenario 3: Infrastructure changes
6. ScenarioComparator presents multiple options with pros and cons
7. Agent provides recommendations based on predefined business rules and constraints

## 5. Data Requirements

### 5.1 Input Data

#### 5.1.1 User Queries
- Natural language questions and requests
- User selections and preferences
- Context from current view/page in the application
- Voice audio for speech-based queries (future phase)

#### 5.1.2 System State Data
- Current airport configuration
- Existing stand definitions and attributes
- Current operational settings
- Active maintenance schedules

#### 5.1.3 Flight Data
- Historical flight schedules
- Planned future operations
- Airline growth projections
- Seasonal variations in demand

### 5.2 Output Data

#### 5.2.1 Agent Responses
- Natural language answers to queries
- Explanations of capacity constraints
- Recommendations for capacity optimization
- Clarification questions when needed
- Synthesized speech for voice responses (future phase)

#### 5.2.2 Visualizations
- Capacity heatmaps by time period
- Stand utilization charts
- Comparative scenario visualizations
- Interactive airport maps with capacity indicators

#### 5.2.3 Analysis Results
- Capacity metrics by aircraft type and terminal
- Allocation efficiency statistics
- Bottleneck identification data
- Opportunity metrics for optimization

## 6. Technical Implementation

### 6.1 Backend Components

#### 6.1.1 AgentCoreService
- NodeJS service handling NLP, reasoning, and orchestration
- Maintains conversation context and user session data
- Integrates with OpenAI API using O4-Mini model
- Responsible for tool selection and execution

#### 6.1.2 KnowledgeBaseService
- Manages domain knowledge and reference data
- Indexes and retrieves relevant information for queries
- Updates with new learnings and scenario outcomes
- Provides domain-specific validation of LLM outputs

#### 6.1.3 VisualizationService
- Generates data visualizations based on query results
- Formats data for different visualization types
- Adapts visualizations for embedding in different UI contexts
- Provides interactive visualization specifications

#### 6.1.4 IntegrationService
- Handles authentication and authorization for system API calls
- Manages API request formatting and response handling
- Orchestrates multi-step processes across existing tools
- Provides abstraction layer for tool interactions

#### 6.1.5 VoiceProcessingService (Future Phase)
- Processes audio input for speech recognition
- Handles text-to-speech conversion
- Manages voice profiles and settings
- Implements noise filtering algorithms
- Supports multilingual processing

### 6.2 Frontend Components

#### 6.2.1 AgentUI
- React component for managing the agent interface
- Handles rendering of conversation threads
- Manages user input and suggestion chips
- Controls agent state and loading indicators
- Incorporates microphone and speaker controls (future phase)

#### 6.2.2 EmbeddedVisualizations
- React components for in-context visualization rendering
- Adapts to different container contexts
- Handles user interactions with visualizations
- Supports responsive design for different viewports

#### 6.2.3 ScenarioManager
- UI for creating, viewing, and comparing scenarios
- Provides interactive controls for scenario parameters
- Saves and restores scenario configurations
- Supports sharing and collaboration on scenarios

#### 6.2.4 AgentStateManager
- Manages the client-side state of the agent
- Handles WebSocket connections for real-time updates
- Caches recent queries and results for performance
- Synchronizes agent state across multiple tabs/views

#### 6.2.5 AgentHubUI
- Dedicated page for comprehensive agent interaction
- Conversation history management with search functionality
- Saved insights library with categorization and filtering
- Shared insights with team collaboration features
- Advanced query interface with templates and rich input

#### 6.2.6 VoiceInputUI (Future Phase)
- Microphone activation and status indicator
- Audio waveform visualization during recording
- Voice feedback indicators and confirmation
- Voice profile selection interface
- Language selection for multilingual interactions

### 6.3 API Endpoints

#### 6.3.1 Agent API
- `POST /api/agent/query`: Submit natural language queries
- `GET /api/agent/session/{sessionId}`: Retrieve conversation history
- `POST /api/agent/feedback`: Submit user feedback on responses
- `GET /api/agent/suggestions`: Get contextual suggestion chips
- `GET /api/agent/history`: Retrieve user's conversation history
- `POST /api/agent/insights/save`: Save important agent responses as insights
- `GET /api/agent/insights`: Retrieve saved insights with filtering
- `POST /api/agent/insights/share`: Share insights with team members

#### 6.3.2 Scenario API
- `POST /api/scenarios`: Create new scenario
- `GET /api/scenarios/{id}`: Retrieve scenario details
- `PUT /api/scenarios/{id}`: Update scenario parameters
- `POST /api/scenarios/{id}/run`: Execute scenario simulation
- `GET /api/scenarios/{id}/results`: Get scenario results

#### 6.3.3 Visualization API
- `POST /api/visualizations`: Generate visualization from data
- `GET /api/visualizations/templates`: Get available visualization templates
- `POST /api/visualizations/export`: Export visualization as image/PDF

#### 6.3.4 Voice API (Future Phase)
- `POST /api/voice/transcribe`: Convert audio to text
- `POST /api/voice/synthesize`: Convert text to speech audio
- `GET /api/voice/profiles`: Retrieve available voice profiles
- `POST /api/voice/settings`: Update voice interaction preferences
- `GET /api/voice/languages`: Get supported languages for voice interaction

## 7. Integration Points

### 7.1 Integration with UploadTool
- Agent can trigger uploads through the existing UploadTool API
- Retrieves validation results from uploads
- Can recommend fixes for upload validation issues
- Uses uploaded data for scenario analysis

### 7.2 Integration with Stand Capacity Engine
- Configures capacity calculation parameters
- Triggers capacity calculations
- Interprets capacity results for natural language responses
- Uses capacity data for visualizations and comparisons

### 7.3 Integration with Stand Allocation Algorithm
- Sets allocation parameters based on user requests
- Triggers allocation runs for what-if scenarios
- Interprets allocation results to identify bottlenecks
- Provides comparative analysis of allocation strategies

### 7.4 Integration with Maintenance System
- Queries upcoming maintenance schedules
- Analyzes maintenance impact on capacity
- Recommends maintenance scheduling to minimize impact
- Includes maintenance in what-if scenarios

### 7.5 Integration with Voice Platforms (Future Phase)
- Connects with device microphone and speakers
- Integrates with device audio systems
- Supports web audio standards
- Compatible with assistive technologies
- Adapts to different audio environments

## 8. Privacy and Security

### 8.1 Data Protection
- User conversations are stored securely
- Sensitive operational data is not sent to external LLM providers
- Local embedding models handle sensitive content
- Configurable data retention policies
- Voice recordings are processed securely and not stored longer than needed (future phase)

### 8.2 User Authentication
- Agent access requires proper authentication
- Tool actions respect user permission levels
- Results visibility follows existing access control model
- Scenario sharing has explicit permission controls
- Voice authentication options for enhanced security (future phase)

### 8.3 Input Validation
- All agent-triggered actions go through existing validation rules
- Potentially destructive operations require confirmation
- Rate limiting prevents abuse of the API
- All actions are logged for audit purposes
- Voice input undergoes additional validation to prevent misinterpretation (future phase)

## 9. Incremental Development Plan

### Phase 1: Foundational Capabilities (1-2 months)
- Basic NLP understanding of airport capacity terminology
- Integration with existing APIs for data retrieval
- Simple question-answering about current airport state
- Basic visualization of query results
- Initial user approval workflow for write operations

### Phase 2: What-If Analysis (2-3 months)
- Scenario creation from natural language
- Parameter extraction for scenario configuration
- Integration with capacity and allocation engines
- Basic comparative visualization of scenarios
- Initial voice interaction capabilities for queries

### Phase 3: Advanced Insights (3-4 months)
- Multi-step reasoning for complex queries
- Proactive insights and recommendations
- Advanced visualizations with interactive elements
- Knowledge base expansion with historical learning
- Enhanced voice capabilities with improved accuracy and natural speech

### Phase 4: Full UI Integration (2-3 months)
- Complete conversation interface with context awareness
- Embedded visualizations throughout the application
- Interactive dashboard for scenario management
- Collaboration features for sharing insights
- Full voice interaction with text-to-speech responses

### Phase 5: Optimization & Refinement (Ongoing)
- Performance optimization for large datasets
- Continuous improvement of NLP capabilities
- Expansion of domain knowledge and reasoning
- User feedback incorporation and model fine-tuning
- Noise-resistant voice recognition for airport environments

## 10. User Experience Design

### 10.1 Conversational Interface
- Clean, minimal chat interface with clear distinction between user and agent messages
- Support for rich text formatting in responses
- Embedded visualizations directly within conversation
- Typing indicators and progress indicators for long-running operations
- Dedicated hub page for comprehensive interaction history and saved insights
- Voice interaction controls with clear feedback indicators (future phase)

### 10.2 Result Visualization
- Consistent visual language across different visualization types
- Interactive elements for exploration of data
- Responsive design that adapts to different screen sizes
- Accessibility considerations for color, contrast, and screen readers

### 10.3 Integration Points
- Collapsible agent panel accessible from any page
- Contextual awareness of current user view
- Ability to "snap" result visualizations into main content area
- Seamless transitions between conversation and system views
- Natural switching between text and voice modalities (future phase)

### 10.4 User Controls
- Clear options to adjust agent behavior
- Ability to provide feedback on responses
- Controls to save, share, or export insights
- Settings for notification preferences
- Voice interaction preferences and settings (future phase)

## 11. Evaluation and Quality Metrics

### 11.1 Technical Performance Metrics
- Query response time (target: <2 seconds for simple queries)
- Tool execution success rate (target: >98%)
- Visualization rendering time (target: <1 second)
- API call efficiency (minimize redundant calls)
- Speech recognition accuracy (target: >95% in quiet environments, >90% in noisy environments) (future phase)

### 11.2 NLP Quality Metrics
- Intent recognition accuracy (target: >95%)
- Entity extraction precision and recall (target: >90%)
- Answer relevance to queries (measured through user feedback)
- Clarification rate (% of queries requiring clarification)
- Voice query understanding accuracy (target: >90%) (future phase)

### 11.3 User Experience Metrics
- User satisfaction ratings
- Task completion rate with agent vs. traditional interface
- Time to insight for common queries
- Adoption and retention metrics
- Voice interaction satisfaction (future phase)

## 12. Appendix

### 12.1 Example Queries
- "What's our peak capacity period during summer 2024?"
- "How many wide-body aircraft can we handle simultaneously at Terminal 2?"
- "What if Emirates adds 3 daily A380 flights next quarter?"
- "Show me the impact of closing stands A1-A5 for maintenance in October"
- "Which terminal has the most underutilized narrow-body capacity?"
- "What's the best way to accommodate a 20% increase in long-haul flights?"

### 12.2 LLM Integration Options
- **API-based integration**: Connect to OpenAI (O4-Mini model), Google Vertex AI, or other providers
- **Self-hosted models**: Deploy smaller models on-premises for sensitive data
- **Hybrid approach**: Use external APIs for general queries, local models for sensitive data
- **Fine-tuning**: Specialize models on airport operations terminology and concepts

### 12.3 Voice Processing Options (Future Phase)
- **Cloud-based services**: Leverage third-party APIs for speech recognition and synthesis
- **On-device processing**: Use browser-based technologies for privacy-sensitive processing
- **Custom wake words**: Implement airport-specific activation phrases
- **Ambient noise profiles**: Train with airport-specific background noise
- **Specialized terminology**: Optimize for aviation and airport terminology recognition

### 12.4 Compliance Considerations
- Ensure all data handling complies with relevant regulations
- Provide transparent documentation of AI capabilities and limitations
- Implement appropriate controls for sensitive operational data
- Maintain audit logs of all agent-initiated actions 