# Phase 5 Database Schema Specification

## 1. Overview

This document outlines the database schema required to support the Phase 5 Autonomous Airport Platform implementation. The schema extends the existing database structure with new tables and relationships needed for autonomous orchestration, passenger experience integration, sustainability optimization, and human-AI collaboration.

## 2. Database Technology

The system will continue to use PostgreSQL as the primary relational database, with the following enhancements:

- **TimescaleDB Extension**: For time-series data management (metrics, historical states)
- **PostGIS Extension**: For spatial data management (passenger movement, resource locations)
- **JSON/JSONB Columns**: For flexible data structures and rapid prototyping
- **Redis**: As a complementary cache and pub/sub system for real-time operations
- **Partitioning**: For large tables with historical data (events, metrics, states)

## 3. Schema Design Principles

1. **Progressive Enhancement**: Build on existing schema without breaking compatibility
2. **Domain Separation**: Organize tables by functional domains
3. **Appropriate Normalization**: Balance normalization with query performance
4. **Consistent Naming**: Follow established naming conventions
5. **Soft Deletion**: Use deletion flags rather than removing data
6. **Audit Support**: Include created/updated timestamps and user references
7. **Version Control**: Include schema version in migrations

## 4. Core Schema Components

### 4.1 Autonomous Orchestration Schema

#### 4.1.1 operating_modes

Stores configuration for different operating modes of the autonomous system.

```sql
CREATE TABLE operating_modes (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority_weights JSONB NOT NULL,
    decision_thresholds JSONB NOT NULL,
    activation_criteria JSONB,
    constraints JSONB,
    is_active BOOLEAN DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Index for active mode queries
CREATE INDEX idx_operating_modes_active ON operating_modes(is_active);
```

#### 4.1.2 decisions

Stores the decision records for the autonomous system.

```sql
CREATE TABLE decisions (
    id UUID PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    description TEXT,
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    confidence NUMERIC(5,4) NOT NULL,
    risk NUMERIC(5,4) NOT NULL,
    impact_assessment JSONB NOT NULL,
    domain_details JSONB,
    operating_mode_id UUID REFERENCES operating_modes(id),
    correlation_id UUID,
    requested_by VARCHAR(100),
    tags TEXT[],
    notes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_type ON decisions(type);
CREATE INDEX idx_decisions_correlation_id ON decisions(correlation_id);
CREATE INDEX idx_decisions_initiated_at ON decisions(initiated_at);
```

#### 4.1.3 actions

Stores the individual actions that make up decisions.

```sql
CREATE TABLE actions (
    id UUID PRIMARY KEY,
    decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    domain VARCHAR(50) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL,
    status VARCHAR(20) NOT NULL,
    execution_order INTEGER NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    retry_policy JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_actions_decision_id ON actions(decision_id);
CREATE INDEX idx_actions_status ON actions(status);
CREATE INDEX idx_actions_domain ON actions(domain);
```

#### 4.1.4 decision_dependencies

Stores the dependencies between decisions.

```sql
CREATE TABLE decision_dependencies (
    id UUID PRIMARY KEY,
    dependent_decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    dependency_decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dependent_decision_id, dependency_decision_id)
);

-- Indexes for dependency traversal
CREATE INDEX idx_decision_dependencies_dependent ON decision_dependencies(dependent_decision_id);
CREATE INDEX idx_decision_dependencies_dependency ON decision_dependencies(dependency_decision_id);
```

#### 4.1.5 action_dependencies

Stores the dependencies between actions.

```sql
CREATE TABLE action_dependencies (
    id UUID PRIMARY KEY,
    dependent_action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    dependency_action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(dependent_action_id, dependency_action_id)
);

-- Indexes for dependency traversal
CREATE INDEX idx_action_dependencies_dependent ON action_dependencies(dependent_action_id);
CREATE INDEX idx_action_dependencies_dependency ON action_dependencies(dependency_action_id);
```

#### 4.1.6 approvals

Stores approval records for decisions that require human authorization.

```sql
CREATE TABLE approvals (
    id UUID PRIMARY KEY,
    decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for decision lookup
CREATE INDEX idx_approvals_decision_id ON approvals(decision_id);
```

#### 4.1.7 system_states

Stores the historical record of system states.

```sql
CREATE TABLE system_states (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    operating_mode_id UUID REFERENCES operating_modes(id),
    autonomy_levels JSONB NOT NULL,
    key_metrics JSONB NOT NULL,
    active_processes JSONB,
    situational_assessment JSONB NOT NULL,
    resource_status JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('system_states', 'timestamp');
```

#### 4.1.8 orchestration_events

Stores events related to the orchestration system.

```sql
CREATE TABLE orchestration_events (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    related_entity_id UUID,
    related_entity_type VARCHAR(50),
    correlation_id UUID,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('orchestration_events', 'timestamp');

-- Indexes for event querying
CREATE INDEX idx_orchestration_events_type ON orchestration_events(event_type);
CREATE INDEX idx_orchestration_events_entity ON orchestration_events(related_entity_id, related_entity_type);
CREATE INDEX idx_orchestration_events_correlation ON orchestration_events(correlation_id);
```

### 4.2 Passenger Experience Schema

#### 4.2.1 passenger_journeys

Stores information about passenger journeys through the airport.

```sql
CREATE TABLE passenger_journeys (
    id UUID PRIMARY KEY,
    passenger_id UUID,
    journey_status VARCHAR(50) NOT NULL,
    passenger_type VARCHAR(50),
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    current_location VARCHAR(100),
    current_stage VARCHAR(50),
    personalization_profile JSONB,
    associated_flights JSONB,
    satisfaction_metrics JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for journey queries
CREATE INDEX idx_passenger_journeys_status ON passenger_journeys(journey_status);
CREATE INDEX idx_passenger_journeys_active ON passenger_journeys(is_active);
CREATE INDEX idx_passenger_journeys_times ON passenger_journeys(start_time, end_time);
```

#### 4.2.2 journey_touchpoints

Stores individual touchpoints within a passenger journey.

```sql
CREATE TABLE journey_touchpoints (
    id UUID PRIMARY KEY,
    journey_id UUID REFERENCES passenger_journeys(id) ON DELETE CASCADE,
    touchpoint_type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_seconds INTEGER,
    outcome VARCHAR(50),
    satisfaction_score NUMERIC(3,2),
    metrics JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('journey_touchpoints', 'timestamp');

-- Index for journey lookup
CREATE INDEX idx_journey_touchpoints_journey_id ON journey_touchpoints(journey_id);
```

#### 4.2.3 journey_interventions

Stores interventions made to improve passenger journeys.

```sql
CREATE TABLE journey_interventions (
    id UUID PRIMARY KEY,
    intervention_type VARCHAR(50) NOT NULL,
    description TEXT,
    affected_journeys UUID[],
    execution_method JSONB NOT NULL,
    priority VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    expected_impact JSONB,
    actual_impact JSONB,
    notes TEXT
);

-- Indexes for intervention queries
CREATE INDEX idx_journey_interventions_status ON journey_interventions(status);
CREATE INDEX idx_journey_interventions_type ON journey_interventions(intervention_type);
CREATE INDEX idx_journey_interventions_scheduled ON journey_interventions(scheduled_for);
```

#### 4.2.4 experience_metrics

Stores aggregated metrics about passenger experience.

```sql
CREATE TABLE experience_metrics (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    passenger_type VARCHAR(50),
    value NUMERIC(10,4) NOT NULL,
    sample_size INTEGER,
    aggregation_period VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('experience_metrics', 'timestamp');

-- Indexes for metric queries
CREATE INDEX idx_experience_metrics_type ON experience_metrics(metric_type);
CREATE INDEX idx_experience_metrics_location ON experience_metrics(location);
```

### 4.3 Sustainability Schema

#### 4.3.1 sustainability_metrics

Stores environmental and sustainability metrics.

```sql
CREATE TABLE sustainability_metrics (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    value NUMERIC(15,5) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    source VARCHAR(100),
    comparison_to_baseline NUMERIC(5,4),
    trend VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('sustainability_metrics', 'timestamp');

-- Indexes for metric queries
CREATE INDEX idx_sustainability_metrics_type ON sustainability_metrics(metric_type);
CREATE INDEX idx_sustainability_metrics_location ON sustainability_metrics(location);
```

#### 4.3.2 resource_consumption

Stores detailed resource usage data.

```sql
CREATE TABLE resource_consumption (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    location VARCHAR(100) NOT NULL,
    consumption_value NUMERIC(15,5) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    associated_activity VARCHAR(100),
    carbon_equivalent NUMERIC(15,5),
    cost NUMERIC(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('resource_consumption', 'timestamp');

-- Indexes for consumption queries
CREATE INDEX idx_resource_consumption_type ON resource_consumption(resource_type);
CREATE INDEX idx_resource_consumption_location ON resource_consumption(location);
```

#### 4.3.3 sustainability_optimizations

Stores sustainability optimization initiatives.

```sql
CREATE TABLE sustainability_optimizations (
    id UUID PRIMARY KEY,
    optimization_type VARCHAR(50) NOT NULL,
    target_area VARCHAR(100) NOT NULL,
    target_resource VARCHAR(50) NOT NULL,
    target_reduction NUMERIC(5,4) NOT NULL,
    status VARCHAR(20) NOT NULL,
    constraints JSONB,
    allowed_interventions TEXT[],
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    estimated_impact JSONB,
    actual_impact JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimization queries
CREATE INDEX idx_sustainability_optimizations_status ON sustainability_optimizations(status);
CREATE INDEX idx_sustainability_optimizations_type ON sustainability_optimizations(optimization_type);
CREATE INDEX idx_sustainability_optimizations_area ON sustainability_optimizations(target_area);
```

#### 4.3.4 carbon_accounting

Stores carbon emissions data and offsets.

```sql
CREATE TABLE carbon_accounting (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    location VARCHAR(100),
    emissions_value NUMERIC(15,5) NOT NULL,
    calculation_method VARCHAR(100),
    offset_amount NUMERIC(15,5) DEFAULT 0,
    net_emissions NUMERIC(15,5) NOT NULL,
    verification_status VARCHAR(20),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('carbon_accounting', 'timestamp');

-- Indexes for emissions queries
CREATE INDEX idx_carbon_accounting_source ON carbon_accounting(source_type);
CREATE INDEX idx_carbon_accounting_location ON carbon_accounting(location);
```

### 4.4 Predictive Airport Twin Schema

#### 4.4.1 simulation_scenarios

Stores simulation scenarios for the predictive twin.

```sql
CREATE TABLE simulation_scenarios (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    parameters JSONB NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_template BOOLEAN DEFAULT false
);

-- Indexes for scenario queries
CREATE INDEX idx_simulation_scenarios_status ON simulation_scenarios(status);
CREATE INDEX idx_simulation_scenarios_template ON simulation_scenarios(is_template);
```

#### 4.4.2 simulation_states

Stores state snapshots from simulation runs.

```sql
CREATE TABLE simulation_states (
    id UUID PRIMARY KEY,
    scenario_id UUID REFERENCES simulation_scenarios(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    simulation_time TIMESTAMP WITH TIME ZONE NOT NULL,
    state_data JSONB NOT NULL,
    metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('simulation_states', 'simulation_time');

-- Indexes for state queries
CREATE INDEX idx_simulation_states_scenario ON simulation_states(scenario_id);
```

#### 4.4.3 simulation_interventions

Stores interventions tested in simulation scenarios.

```sql
CREATE TABLE simulation_interventions (
    id UUID PRIMARY KEY,
    scenario_id UUID REFERENCES simulation_scenarios(id) ON DELETE CASCADE,
    intervention_type VARCHAR(50) NOT NULL,
    description TEXT,
    parameters JSONB NOT NULL,
    simulation_time TIMESTAMP WITH TIME ZONE NOT NULL,
    impact_assessment JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for intervention queries
CREATE INDEX idx_simulation_interventions_scenario ON simulation_interventions(scenario_id);
CREATE INDEX idx_simulation_interventions_type ON simulation_interventions(intervention_type);
```

#### 4.4.4 prediction_models

Stores metadata about prediction models used in the twin.

```sql
CREATE TABLE prediction_models (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL,
    version VARCHAR(20) NOT NULL,
    description TEXT,
    parameters JSONB,
    training_data_range TSTZRANGE,
    accuracy_metrics JSONB,
    last_updated TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for model queries
CREATE INDEX idx_prediction_models_type ON prediction_models(model_type);
CREATE INDEX idx_prediction_models_active ON prediction_models(is_active);
```

#### 4.4.5 prediction_accuracy

Stores records comparing predictions to actual outcomes.

```sql
CREATE TABLE prediction_accuracy (
    id UUID PRIMARY KEY,
    model_id UUID REFERENCES prediction_models(id) ON DELETE CASCADE,
    prediction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    prediction_target VARCHAR(100) NOT NULL,
    predicted_value JSONB NOT NULL,
    actual_value JSONB,
    error_metrics JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('prediction_accuracy', 'prediction_timestamp');

-- Indexes for accuracy queries
CREATE INDEX idx_prediction_accuracy_model ON prediction_accuracy(model_id);
CREATE INDEX idx_prediction_accuracy_target ON prediction_accuracy(prediction_target);
```

### 4.5 Human-AI Collaboration Schema

#### 4.5.1 collaboration_sessions

Stores information about human-AI collaboration sessions.

```sql
CREATE TABLE collaboration_sessions (
    id UUID PRIMARY KEY,
    session_type VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    initiated_by VARCHAR(100),
    participants JSONB,
    metrics JSONB,
    workspace_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for session queries
CREATE INDEX idx_collaboration_sessions_status ON collaboration_sessions(status);
CREATE INDEX idx_collaboration_sessions_type ON collaboration_sessions(session_type);
CREATE INDEX idx_collaboration_sessions_times ON collaboration_sessions(started_at, ended_at);
```

#### 4.5.2 collaboration_artifacts

Stores artifacts created during collaboration sessions.

```sql
CREATE TABLE collaboration_artifacts (
    id UUID PRIMARY KEY,
    session_id UUID REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    artifact_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    content JSONB NOT NULL,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes for artifact queries
CREATE INDEX idx_collaboration_artifacts_session ON collaboration_artifacts(session_id);
CREATE INDEX idx_collaboration_artifacts_type ON collaboration_artifacts(artifact_type);
```

#### 4.5.3 ai_explanations

Stores explanations provided by AI for decisions and recommendations.

```sql
CREATE TABLE ai_explanations (
    id UUID PRIMARY KEY,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    explanation_format VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    audience_level VARCHAR(20) DEFAULT 'general',
    confidence_score NUMERIC(5,4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for explanation queries
CREATE INDEX idx_ai_explanations_entity ON ai_explanations(entity_id, entity_type);
CREATE INDEX idx_ai_explanations_format ON ai_explanations(explanation_format);
```

#### 4.5.4 human_feedback

Stores feedback provided by humans on AI actions and recommendations.

```sql
CREATE TABLE human_feedback (
    id UUID PRIMARY KEY,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,
    rating INTEGER,
    comments TEXT,
    provided_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for feedback queries
CREATE INDEX idx_human_feedback_entity ON human_feedback(entity_id, entity_type);
CREATE INDEX idx_human_feedback_type ON human_feedback(feedback_type);
```

### 4.6 Crisis Management Schema

#### 4.6.1 crisis_scenarios

Stores information about crisis scenarios.

```sql
CREATE TABLE crisis_scenarios (
    id UUID PRIMARY KEY,
    scenario_type VARCHAR(50) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL,
    affected_systems TEXT[],
    duration_estimate JSONB,
    passenger_impact JSONB,
    status VARCHAR(20) NOT NULL,
    is_simulation BOOLEAN DEFAULT false,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for scenario queries
CREATE INDEX idx_crisis_scenarios_status ON crisis_scenarios(status);
CREATE INDEX idx_crisis_scenarios_type ON crisis_scenarios(scenario_type);
CREATE INDEX idx_crisis_scenarios_simulation ON crisis_scenarios(is_simulation);
```

#### 4.6.2 crisis_actions

Stores actions taken during crisis scenarios.

```sql
CREATE TABLE crisis_actions (
    id UUID PRIMARY KEY,
    scenario_id UUID REFERENCES crisis_scenarios(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    description TEXT,
    urgency VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL,
    owner VARCHAR(100),
    assigned_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for action queries
CREATE INDEX idx_crisis_actions_scenario ON crisis_actions(scenario_id);
CREATE INDEX idx_crisis_actions_status ON crisis_actions(status);
CREATE INDEX idx_crisis_actions_type ON crisis_actions(action_type);
```

#### 4.6.3 crisis_communications

Stores communications sent during crisis scenarios.

```sql
CREATE TABLE crisis_communications (
    id UUID PRIMARY KEY,
    scenario_id UUID REFERENCES crisis_scenarios(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    channels TEXT[],
    audience VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    sent_by VARCHAR(100),
    effectiveness_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for communication queries
CREATE INDEX idx_crisis_communications_scenario ON crisis_communications(scenario_id);
CREATE INDEX idx_crisis_communications_status ON crisis_communications(status);
CREATE INDEX idx_crisis_communications_type ON crisis_communications(communication_type);
```

#### 4.6.4 crisis_resources

Stores information about resources available during crisis scenarios.

```sql
CREATE TABLE crisis_resources (
    id UUID PRIMARY KEY,
    resource_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(100),
    status VARCHAR(20) NOT NULL,
    availability JSONB,
    capacity JSONB,
    contact_info JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for resource queries
CREATE INDEX idx_crisis_resources_type ON crisis_resources(resource_type);
CREATE INDEX idx_crisis_resources_status ON crisis_resources(status);
CREATE INDEX idx_crisis_resources_location ON crisis_resources(location);
```

### 4.7 Learning Transfer Schema

#### 4.7.1 knowledge_items

Stores formalized knowledge items for transfer between domains.

```sql
CREATE TABLE knowledge_items (
    id UUID PRIMARY KEY,
    item_type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    content JSONB NOT NULL,
    source_domain VARCHAR(50),
    source_context JSONB,
    applicable_domains TEXT[],
    confidence_score NUMERIC(5,4),
    validation_status VARCHAR(20) DEFAULT 'unvalidated',
    tags TEXT[],
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1
);

-- Indexes for knowledge item queries
CREATE INDEX idx_knowledge_items_type ON knowledge_items(item_type);
CREATE INDEX idx_knowledge_items_validation ON knowledge_items(validation_status);
CREATE INDEX idx_knowledge_items_source ON knowledge_items(source_domain);
```

#### 4.7.2 knowledge_applications

Stores records of knowledge item applications to new contexts.

```sql
CREATE TABLE knowledge_applications (
    id UUID PRIMARY KEY,
    knowledge_item_id UUID REFERENCES knowledge_items(id),
    target_domain VARCHAR(50) NOT NULL,
    target_context JSONB NOT NULL,
    application_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success_rating INTEGER,
    adaptation_details JSONB,
    metrics JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for application queries
CREATE INDEX idx_knowledge_applications_item ON knowledge_applications(knowledge_item_id);
CREATE INDEX idx_knowledge_applications_domain ON knowledge_applications(target_domain);
CREATE INDEX idx_knowledge_applications_timestamp ON knowledge_applications(application_timestamp);
```

#### 4.7.3 knowledge_sources

Stores metadata about sources of knowledge.

```sql
CREATE TABLE knowledge_sources (
    id UUID PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    reliability_score NUMERIC(5,4),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for source queries
CREATE INDEX idx_knowledge_sources_type ON knowledge_sources(source_type);
```

#### 4.7.4 learning_metrics

Stores metrics about knowledge acquisition and application effectiveness.

```sql
CREATE TABLE learning_metrics (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    domain VARCHAR(50),
    value NUMERIC(10,4) NOT NULL,
    context JSONB,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('learning_metrics', 'timestamp');

-- Indexes for metrics queries
CREATE INDEX idx_learning_metrics_type ON learning_metrics(metric_type);
CREATE INDEX idx_learning_metrics_domain ON learning_metrics(domain);
```

### 4.8 Ethics & Governance Schema

#### 4.8.1 ethical_principles

Stores defined ethical principles for the autonomous system.

```sql
CREATE TABLE ethical_principles (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER,
    category VARCHAR(50),
    implementation_rules JSONB,
    metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- Indexes for principle queries
CREATE INDEX idx_ethical_principles_active ON ethical_principles(is_active);
CREATE INDEX idx_ethical_principles_category ON ethical_principles(category);
```

#### 4.8.2 governance_policies

Stores governance policies for autonomous operations.

```sql
CREATE TABLE governance_policies (
    id UUID PRIMARY KEY,
    policy_type VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    policy_rules JSONB NOT NULL,
    affected_domains TEXT[],
    implementation_level VARCHAR(20) NOT NULL,
    override_conditions JSONB,
    audit_requirements JSONB,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- Indexes for policy queries
CREATE INDEX idx_governance_policies_active ON governance_policies(is_active);
CREATE INDEX idx_governance_policies_type ON governance_policies(policy_type);
```

#### 4.8.3 decision_audits

Stores detailed audit records for autonomous decisions.

```sql
CREATE TABLE decision_audits (
    id UUID PRIMARY KEY,
    decision_id UUID NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    audit_type VARCHAR(50) NOT NULL,
    audited_by VARCHAR(100),
    compliance_status VARCHAR(20) NOT NULL,
    ethical_assessment JSONB,
    governance_assessment JSONB,
    recommendations TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit queries
CREATE INDEX idx_decision_audits_decision ON decision_audits(decision_id);
CREATE INDEX idx_decision_audits_timestamp ON decision_audits(timestamp);
CREATE INDEX idx_decision_audits_compliance ON decision_audits(compliance_status);
```

#### 4.8.4 fairness_metrics

Stores metrics related to fairness and bias evaluation.

```sql
CREATE TABLE fairness_metrics (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    domain VARCHAR(50),
    affected_group VARCHAR(100),
    value NUMERIC(10,4) NOT NULL,
    baseline_comparison NUMERIC(10,4),
    threshold_status VARCHAR(20),
    sample_size INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert to TimescaleDB hypertable for time-series optimization
SELECT create_hypertable('fairness_metrics', 'timestamp');

-- Indexes for metrics queries
CREATE INDEX idx_fairness_metrics_type ON fairness_metrics(metric_type);
CREATE INDEX idx_fairness_metrics_domain ON fairness_metrics(domain);
CREATE INDEX idx_fairness_metrics_group ON fairness_metrics(affected_group);
```

## 5. Database Migration Approach

### 5.1 Migration Sequence

1. **Preparation Phase**:
   - Backup existing database
   - Create migration scripts
   - Establish test database for validation

2. **Core Infrastructure (Month 1)**:
   - Add TimescaleDB and PostGIS extensions
   - Create orchestration schema tables
   - Add system state tracking tables

3. **Domain-Specific Schema (Months 2-3)**:
   - Add passenger experience tables
   - Add sustainability tables
   - Add predictive twin tables

4. **Advanced Features (Months 4-6)**:
   - Add human-AI collaboration tables
   - Add crisis management tables
   - Add learning transfer tables
   - Add ethics & governance tables

5. **Integration Phase (Month 7)**:
   - Add cross-domain relationships
   - Create views for integrated queries
   - Optimize indexing strategy
   - Implement partitioning for large tables

### 5.2 Migration Script Structure

Each migration will follow a consistent structure:

1. **Metadata Header**:
   - Migration version
   - Dependencies
   - Description
   - Author
   - Creation date

2. **Validation Checks**:
   - Current database version check
   - Required extension checks
   - Dependency validation

3. **Transaction Wrapping**:
   - Begin transaction
   - Apply changes
   - Commit or rollback on failure

4. **Reversion Support**:
   - Down migration scripts for rollback
   - State verification checks

5. **Logging and Notification**:
   - Detailed logging of operations
   - Completion notification

### 5.3 Example Migration Script

```sql
-- Migration: 20250601000001_create_orchestration_schema.js

/**
 * AirportAI Phase 5 - Orchestration Schema Migration
 * 
 * This migration creates the core orchestration schema tables
 * for the Autonomous Airport Platform.
 * 
 * Author: Development Team
 * Date: 2025-06-01
 * Version: 1.0.0
 * Dependencies: TimescaleDB extension
 */

-- Validate environment
DO $$
BEGIN
  -- Check for required extensions
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'timescaledb'
  ) THEN
    RAISE EXCEPTION 'TimescaleDB extension is required but not installed';
  END IF;
  
  -- Check for version compatibility
  IF current_setting('server_version_num')::integer < 130000 THEN
    RAISE EXCEPTION 'PostgreSQL 13.0 or higher is required';
  END IF;
END
$$;

-- Start transaction
BEGIN;

-- Create tables
CREATE TABLE operating_modes (
    id UUID PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    priority_weights JSONB NOT NULL,
    decision_thresholds JSONB NOT NULL,
    activation_criteria JSONB,
    constraints JSONB,
    is_active BOOLEAN DEFAULT false,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

-- Additional tables...

-- Create indexes
CREATE INDEX idx_operating_modes_active ON operating_modes(is_active);

-- Additional indexes...

-- Create TimescaleDB hypertables
SELECT create_hypertable('system_states', 'timestamp');
SELECT create_hypertable('orchestration_events', 'timestamp');

-- Set permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON operating_modes TO app_user;
GRANT SELECT, INSERT ON system_states TO app_user;
GRANT SELECT, INSERT ON orchestration_events TO app_user;

-- Record migration
INSERT INTO schema_migrations (version, applied_at, description)
VALUES ('20250601000001', NOW(), 'Create orchestration schema');

-- Commit transaction
COMMIT;
```

## 6. Data Migration Considerations

### 6.1 Historical Data

1. **Selective Migration**:
   - Identify critical historical data for migration
   - Define transformation rules for legacy data
   - Implement data cleaning procedures

2. **Aggregation Strategy**:
   - Pre-aggregate historical data where appropriate
   - Define time-based retention policies
   - Create summarized views of historical trends

3. **Phased Loading**:
   - Migrate recent data first for immediate functionality
   - Backfill historical data in off-peak hours
   - Create temporary staging tables for transformation

### 6.2 Data Volume Management

1. **Partitioning Strategy**:
   - Time-based partitioning for event and metric tables
   - Function-based partitioning for large entity tables
   - Automated partition management procedures

2. **Archiving Policy**:
   - Define data lifecycle stages (hot, warm, cold)
   - Implement automated archiving to cold storage
   - Create data retrieval procedures for archived data

3. **Compression Techniques**:
   - Row compression for infrequently accessed data
   - JSON compression for document-style data
   - Column-oriented storage for analytical tables

### 6.3 Performance Optimization

1. **Index Strategy**:
   - Implement covering indexes for common queries
   - Use partial indexes for filtered queries
   - Create expression indexes for computed values

2. **Materialized Views**:
   - Identify frequently accessed aggregations
   - Create materialized views with refresh schedules
   - Implement incremental refresh where possible

3. **Query Optimization**:
   - Analyze common query patterns
   - Create optimized query paths
   - Implement server-side functions for complex operations

## 7. Conclusion

This database schema provides the foundation for the Phase 5 Autonomous Airport Platform. It extends the existing database structure to support new capabilities while maintaining compatibility with earlier components. The implementation follows a phased approach, allowing for progressive enhancement of the system while minimizing disruption to existing operations.

Key considerations in the design include:

1. **Scalability**: Support for large-scale time-series data and real-time operations
2. **Flexibility**: JSON/JSONB columns for evolving data structures
3. **Performance**: Appropriate indexes and partitioning for query optimization
4. **Integration**: Relationships between domains for holistic operations
5. **Governance**: Comprehensive audit and tracking capabilities
6. **Extensibility**: Design patterns that allow for future enhancements

The migration approach ensures a smooth transition from the current schema to the enhanced Phase 5 structure, with appropriate validation, testing, and rollback capabilities.