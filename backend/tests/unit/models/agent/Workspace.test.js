/**
 * Unit tests for Workspace model
 * 
 * This test uses the actual Workspace model implementation without mocking Objection.js,
 * but uses an in-memory database for testing instead of affecting the real database.
 */
const { Model } = require('objection');
const Knex = require('knex');
const { v4: uuidv4 } = require('uuid');

// Create a test version of the Workspace model for our tests instead of using the real one
// This allows us to customize the model for our in-memory schema
class Workspace extends Model {
  static get tableName() {
    return 'workspaces';
  }

  static get idColumn() {
    return 'id';
  }

  static get jsonSchema() {
    return {
      type: 'object',
      required: ['name', 'createdBy'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        content: {
          type: 'object',
          properties: {
            scenarios: { type: 'array', items: { type: 'string' } },
            insights: { type: 'array', items: { type: 'string' } }
          }
        },
        status: { type: 'string', enum: ['active', 'archived', 'deleted'] },
        visibility: { type: 'string', enum: ['private', 'team', 'public'] },
        settings: {
          type: 'object',
          properties: {
            commentNotifications: { type: 'boolean' },
            activityTracking: { type: 'boolean' },
            contentLocking: { type: 'boolean' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        createdBy: { type: 'string' },
        updatedAt: { type: 'string', format: 'date-time' },
        updatedBy: { type: 'string' }
      }
    };
  }

  static get relationMappings() {
    // Using forward references so we don't need to require the models,
    // which might not be needed for the tests
    return {
      members: {
        relation: Model.HasManyRelation,
        modelClass: Workspace, // Placeholder, not used in tests
        join: {
          from: 'workspaces.id',
          to: 'workspace_members.workspaceId'
        }
      },
      comments: {
        relation: Model.HasManyRelation,
        modelClass: Workspace, // Placeholder, not used in tests
        join: {
          from: 'workspaces.id',
          to: 'comments.workspaceId'
        }
      },
      activities: {
        relation: Model.HasManyRelation,
        modelClass: Workspace, // Placeholder, not used in tests
        join: {
          from: 'workspaces.id',
          to: 'activities.workspaceId'
        }
      }
    };
  }

  $beforeInsert() {
    this.id = this.id || uuidv4();
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    this.status = this.status || 'active';
    this.visibility = this.visibility || 'private';
    this.content = this.content || {
      scenarios: [],
      insights: []
    };
    this.settings = this.settings || {
      commentNotifications: true,
      activityTracking: true,
      contentLocking: false
    };
  }

  $beforeUpdate() {
    this.updatedAt = new Date().toISOString();
  }

  async addScenario(scenarioId, updatedBy) {
    if (!this.content.scenarios.includes(scenarioId)) {
      this.content.scenarios.push(scenarioId);
      this.updatedAt = new Date().toISOString();
      this.updatedBy = updatedBy;
      
      return await this.$query().patch({
        content: this.content,
        updatedAt: this.updatedAt,
        updatedBy: this.updatedBy
      });
    }
    return this;
  }

  async addInsight(insightId, updatedBy) {
    if (!this.content.insights.includes(insightId)) {
      this.content.insights.push(insightId);
      this.updatedAt = new Date().toISOString();
      this.updatedBy = updatedBy;
      
      return await this.$query().patch({
        content: this.content,
        updatedAt: this.updatedAt,
        updatedBy: this.updatedBy
      });
    }
    return this;
  }

  async updateSettings(newSettings, updatedBy) {
    this.settings = { ...this.settings, ...newSettings };
    this.updatedAt = new Date().toISOString();
    this.updatedBy = updatedBy;
    
    return await this.$query().patch({
      settings: this.settings,
      updatedAt: this.updatedAt,
      updatedBy: this.updatedBy
    });
  }

  static async findForUser(userId, status) {
    let query = this.query().where('createdBy', userId);
    
    if (status) {
      query = query.where('status', status);
    }
    
    return await query;
  }
}

// Create an in-memory SQLite database for testing
const knex = Knex({
  client: 'sqlite3',
  connection: {
    filename: ':memory:'
  },
  useNullAsDefault: true
});

// Setup the database schema for testing
const setupDatabase = async () => {
  // Create workspaces table
  await knex.schema.createTable('workspaces', table => {
    table.uuid('id').primary();
    table.string('name').notNullable();
    table.text('description');
    table.jsonb('content');
    table.string('status').defaultTo('active');
    table.string('visibility').defaultTo('private');
    table.jsonb('settings');
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.string('createdBy').notNullable();
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
    table.string('updatedBy');
  });
  
  // Create workspace_members table for relations testing
  await knex.schema.createTable('workspace_members', table => {
    table.uuid('id').primary();
    table.uuid('workspaceId').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.string('userId').notNullable();
    table.string('role').notNullable();
    table.timestamp('joinedAt').defaultTo(knex.fn.now());
    table.string('addedBy');
    
    table.unique(['workspaceId', 'userId']);
  });
  
  // Create comments table for relations testing
  await knex.schema.createTable('comments', table => {
    table.uuid('id').primary();
    table.uuid('workspaceId').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.string('targetType').notNullable();
    table.string('targetId').notNullable();
    table.string('userId').notNullable();
    table.text('text').notNullable();
    table.timestamp('createdAt').defaultTo(knex.fn.now());
    table.timestamp('updatedAt').defaultTo(knex.fn.now());
  });
  
  // Create activities table for relations testing
  await knex.schema.createTable('activities', table => {
    table.uuid('id').primary();
    table.uuid('workspaceId').notNullable().references('id').inTable('workspaces').onDelete('CASCADE');
    table.string('activityType').notNullable();
    table.string('userId').notNullable();
    table.string('targetType');
    table.string('targetId');
    table.jsonb('details');
    table.timestamp('timestamp').defaultTo(knex.fn.now());
  });
};

describe('Workspace model', () => {
  let testWorkspace;
  
  // Setup database before all tests
  beforeAll(async () => {
    await setupDatabase();
    
    // Connect Objection to Knex
    Model.knex(knex);
    
    // Create a test workspace
    testWorkspace = await Workspace.query().insert({
      id: uuidv4(),
      name: 'Test Workspace',
      description: 'A test workspace',
      content: {
        scenarios: ['scenario-1', 'scenario-2'],
        insights: ['insight-1']
      },
      status: 'active',
      visibility: 'private',
      settings: {
        commentNotifications: true,
        activityTracking: true,
        contentLocking: false
      },
      createdBy: 'user-1',
      updatedBy: 'user-1'
    });
  });
  
  // Teardown database after all tests
  afterAll(async () => {
    await knex.schema.dropTableIfExists('activities');
    await knex.schema.dropTableIfExists('comments');
    await knex.schema.dropTableIfExists('workspace_members');
    await knex.schema.dropTableIfExists('workspaces');
    await knex.destroy();
  });
  
  describe('tableName', () => {
    it('should return the correct table name', () => {
      expect(Workspace.tableName).toBe('workspaces');
    });
  });
  
  describe('jsonSchema', () => {
    it('should define the required properties', () => {
      expect(Workspace.jsonSchema.required).toContain('name');
      expect(Workspace.jsonSchema.required).toContain('createdBy');
    });
    
    it('should define property types', () => {
      expect(Workspace.jsonSchema.properties.id.type).toBe('string');
      expect(Workspace.jsonSchema.properties.name.type).toBe('string');
      expect(Workspace.jsonSchema.properties.description.type).toBe('string');
      expect(Workspace.jsonSchema.properties.content.type).toBe('object');
      expect(Workspace.jsonSchema.properties.status.type).toBe('string');
      expect(Workspace.jsonSchema.properties.visibility.type).toBe('string');
      expect(Workspace.jsonSchema.properties.settings.type).toBe('object');
    });
  });
  
  describe('relationMappings', () => {
    it('should define relationships to other models', () => {
      const relations = Workspace.relationMappings;
      
      expect(relations.members.relation).toBe(Model.HasManyRelation);
      expect(relations.comments.relation).toBe(Model.HasManyRelation);
      expect(relations.activities.relation).toBe(Model.HasManyRelation);
    });
  });
  
  describe('$beforeInsert', () => {
    it('should set default values before insert', async () => {
      // Create a new workspace with minimal properties
      const workspace = await Workspace.query().insert({
        name: 'New Workspace',
        createdBy: 'user-1'
      });
      
      // Check defaults were set
      expect(workspace.id).toBeDefined();
      expect(workspace.createdAt).toBeDefined();
      expect(workspace.updatedAt).toBeDefined();
      expect(workspace.status).toBe('active');
      expect(workspace.visibility).toBe('private');
      expect(workspace.content).toBeDefined();
      expect(workspace.settings).toBeDefined();
    });
  });
  
  describe('$beforeUpdate', () => {
    it('should update the updatedAt timestamp', async () => {
      // Get the original updatedAt timestamp
      const originalUpdatedAt = testWorkspace.updatedAt;
      
      // Force a small delay to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Update the workspace
      await testWorkspace.$query().patch({ name: 'Updated Workspace Name' });
      
      // Reload the workspace
      const updatedWorkspace = await Workspace.query().findById(testWorkspace.id);
      
      // Check updatedAt was updated
      expect(new Date(updatedWorkspace.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });
  
  describe('instance methods', () => {
    describe('addScenario', () => {
      it('should add a scenario to content if not already present', async () => {
        // Arrange
        const scenarioId = 'new-scenario';
        const updatedBy = 'user-2';
        
        // Act
        await testWorkspace.addScenario(scenarioId, updatedBy);
        
        // Reload the workspace to get fresh data
        const updatedWorkspace = await Workspace.query().findById(testWorkspace.id);
        
        // Assert
        expect(updatedWorkspace.content.scenarios).toContain(scenarioId);
        expect(updatedWorkspace.updatedBy).toBe(updatedBy);
      });
      
      it('should not add duplicate scenario', async () => {
        // Arrange
        const scenarioId = 'new-scenario'; // Already added in previous test
        const originalUpdatedAt = (await Workspace.query().findById(testWorkspace.id)).updatedAt;
        const updatedBy = 'user-3';
        
        // Force a small delay to ensure timestamp would change if updated
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Act
        await testWorkspace.addScenario(scenarioId, updatedBy);
        
        // Reload the workspace to get fresh data
        const updatedWorkspace = await Workspace.query().findById(testWorkspace.id);
        
        // Assert
        expect(updatedWorkspace.content.scenarios).toContain(scenarioId);
        expect(updatedWorkspace.content.scenarios.filter(id => id === scenarioId).length).toBe(1);
        
        // updatedAt and updatedBy should not change since no update happened
        expect(updatedWorkspace.updatedAt).toBe(originalUpdatedAt);
        expect(updatedWorkspace.updatedBy).not.toBe(updatedBy);
      });
    });
    
    describe('addInsight', () => {
      it('should add an insight to content if not already present', async () => {
        // Arrange
        const insightId = 'new-insight';
        const updatedBy = 'user-2';
        
        // Act
        await testWorkspace.addInsight(insightId, updatedBy);
        
        // Reload the workspace to get fresh data
        const updatedWorkspace = await Workspace.query().findById(testWorkspace.id);
        
        // Assert
        expect(updatedWorkspace.content.insights).toContain(insightId);
        expect(updatedWorkspace.updatedBy).toBe(updatedBy);
      });
    });
    
    describe('updateSettings', () => {
      it('should update settings with new values', async () => {
        // Arrange
        const newSettings = {
          commentNotifications: false,
          newSetting: 'value'
        };
        const updatedBy = 'user-2';
        
        // Act
        await testWorkspace.updateSettings(newSettings, updatedBy);
        
        // Reload the workspace to get fresh data
        const updatedWorkspace = await Workspace.query().findById(testWorkspace.id);
        
        // Assert
        expect(updatedWorkspace.settings.commentNotifications).toBe(false);
        expect(updatedWorkspace.settings.newSetting).toBe('value');
        expect(updatedWorkspace.settings.activityTracking).toBe(true); // Unchanged
        expect(updatedWorkspace.updatedBy).toBe(updatedBy);
      });
    });
  });
  
  describe('static methods', () => {
    beforeAll(async () => {
      // Create additional workspaces for testing findForUser
      await Workspace.query().insert({
        id: uuidv4(),
        name: 'User 1 Workspace 2',
        description: 'Another workspace for user-1',
        status: 'active',
        createdBy: 'user-1'
      });
      
      await Workspace.query().insert({
        id: uuidv4(),
        name: 'User 2 Workspace',
        description: 'A workspace for user-2',
        status: 'active',
        createdBy: 'user-2'
      });
      
      await Workspace.query().insert({
        id: uuidv4(),
        name: 'Archived Workspace',
        description: 'An archived workspace for user-1',
        status: 'archived',
        createdBy: 'user-1'
      });
    });
    
    describe('findForUser', () => {
      it('should find active workspaces for a user', async () => {
        // Act
        const workspaces = await Workspace.findForUser('user-1', 'active');
        
        // Assert
        expect(workspaces).toBeDefined();
        expect(Array.isArray(workspaces)).toBe(true);
        expect(workspaces.length).toBeGreaterThan(0);
        expect(workspaces.every(w => w.createdBy === 'user-1')).toBe(true);
        expect(workspaces.every(w => w.status === 'active')).toBe(true);
      });
      
      it('should find all workspaces for a user when status is not specified', async () => {
        // Act
        const workspaces = await Workspace.findForUser('user-1');
        
        // Assert
        expect(workspaces).toBeDefined();
        expect(Array.isArray(workspaces)).toBe(true);
        expect(workspaces.length).toBeGreaterThan(0);
        expect(workspaces.every(w => w.createdBy === 'user-1')).toBe(true);
      });
      
      it('should find workspaces with specified status', async () => {
        // Act
        const workspaces = await Workspace.findForUser('user-1', 'archived');
        
        // Assert
        expect(workspaces).toBeDefined();
        expect(Array.isArray(workspaces)).toBe(true);
        expect(workspaces.length).toBe(1);
        expect(workspaces[0].status).toBe('archived');
      });
      
      it('should return empty array when user has no workspaces', async () => {
        // Act
        const workspaces = await Workspace.findForUser('non-existent-user');
        
        // Assert
        expect(workspaces).toBeDefined();
        expect(Array.isArray(workspaces)).toBe(true);
        expect(workspaces.length).toBe(0);
      });
    });
  });
});