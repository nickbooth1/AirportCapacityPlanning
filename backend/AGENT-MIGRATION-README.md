# Agent Migration Guide

This document provides information about the database migrations for the Agent component of the Airport Capacity Planner system.

## Overview

The Agent component uses several tables to store conversation contexts, user queries, agent responses, and action proposals. These tables need to match the Objection.js model definitions in the codebase. The migration scripts in this directory ensure that the database schema matches the model definitions.

## Tables

The following tables are used by the Agent component:

1. **conversation_contexts**: Stores the conversation context between users and the agent
2. **agent_queries**: Stores user queries to the agent
3. **agent_responses**: Stores agent responses to user queries
4. **action_proposals**: Stores proposed actions that require user approval

## Migration Scripts

This directory contains several migration scripts:

- **fix-agent-tables.js**: Combined script that creates or recreates all four tables with the correct schema
- **test-agent-migrations.js**: Test script that verifies the migrations work correctly
- **test-nlp-service.js**: Test script that verifies the StubNLPService works correctly

### Individual Table Scripts

There are also individual scripts for each table:

- **fix-agent-queries-table.js** and **fix-agent-queries-table-updated.js**: Migrations for the agent_queries table
- **fix-agent-responses-table.js** and **fix-agent-responses-table-updated.js**: Migrations for the agent_responses table
- **fix-action-proposals-table.js**: Migration for the action_proposals table
- **fix-context-migration.js** and **fix-context-migration-camelcase.js**: Migrations for the conversation_contexts table

## Schema Changes

The following schema changes were made:

### agent_queries

- Changed `processing` from a boolean to a JSONB object with `startTime`, `endTime`, `status`, and `error` fields
- Added `parsedIntent` and `confidence` fields

### agent_responses

- Renamed `content` to `text`
- Removed `status`, `sources`, and `metadata` fields
- Renamed `rating` and `feedback` to `feedbackRating` and `feedbackComment`
- Added `visualizations` and `rawData` fields

### action_proposals

- No significant changes, just ensuring the schema matches the model

### conversation_contexts

- No significant changes, just ensuring the schema matches the model

## Running the Migrations

To run the combined migration script:

```bash
node fix-agent-tables.js
```

This will drop and recreate all four tables with the correct schema.

To test the migrations:

```bash
node test-agent-migrations.js
```

To test the StubNLPService:

```bash
node test-nlp-service.js
```

## Precautions

Before running these migrations in a production environment:

1. **Backup your database**: Always back up your database before running migrations
2. **Check for existing data**: These migrations will drop and recreate the tables, which will delete any existing data
3. **Data migration**: If you have existing data, you should create a data migration script to preserve it

## StubNLPService Integration

The StubNLPService has been integrated to replace the OpenAI service for testing purposes. This allows for running tests without relying on external APIs. The service provides the following functionality:

- Query processing to detect intent, confidence, and entities
- Intent-to-action mapping
- Time expression processing

The StubNLPService can be tested using the `test-nlp-service.js` script.

## Troubleshooting

Common issues and solutions:

- **Table already exists**: The migration scripts drop tables before creating them, but if you encounter errors, you may need to manually drop the tables
- **Permission denied**: Make sure the database user has the necessary permissions to create and drop tables
- **Data loss**: If you need to preserve existing data, you'll need to create a data migration script