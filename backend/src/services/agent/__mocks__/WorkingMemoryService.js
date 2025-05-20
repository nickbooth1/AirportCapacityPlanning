/**
 * WorkingMemoryService.js mock for testing
 */

class WorkingMemoryService {
  constructor() {
    this.memory = new Map();
    this.defaultTTL = 30 * 60 * 1000; // 30 minutes
  }

  storeSessionContext(sessionId, context) {
    this.memory.set(`${sessionId}:context`, context);
    return true;
  }

  getSessionContext(sessionId) {
    return this.memory.get(`${sessionId}:context`) || null;
  }

  storeQueryPlan(sessionId, queryId, plan) {
    this.memory.set(`${sessionId}:plans:${queryId}`, plan);
    return true;
  }

  getQueryPlan(sessionId, queryId) {
    return this.memory.get(`${sessionId}:plans:${queryId}`) || null;
  }

  storeStepResult(sessionId, queryId, stepId, result) {
    this.memory.set(`${sessionId}:steps:${queryId}-${stepId}`, result);
    return true;
  }

  getStepResult(sessionId, queryId, stepId) {
    return this.memory.get(`${sessionId}:steps:${queryId}-${stepId}`) || null;
  }

  storeFinalResult(sessionId, queryId, result) {
    this.memory.set(`${sessionId}:results:${queryId}`, result);
    return true;
  }

  getFinalResult(sessionId, queryId) {
    return this.memory.get(`${sessionId}:results:${queryId}`) || null;
  }

  storeEntityMentions(sessionId, queryId, entities) {
    const key = `${sessionId}:entities`;
    const existingEntities = this.memory.get(key) || [];
    this.memory.set(key, [...entities, ...existingEntities]);
    return true;
  }

  getEntityMentions(sessionId) {
    return this.memory.get(`${sessionId}:entities`) || [];
  }

  storeRetrievedKnowledge(sessionId, queryId, knowledgeItems, metadata) {
    this.memory.set(`${sessionId}:knowledge:${queryId}`, {
      items: knowledgeItems,
      metadata: metadata || { timestamp: Date.now() }
    });
    return true;
  }

  getRetrievedKnowledge(sessionId, queryId) {
    return this.memory.get(`${sessionId}:knowledge:${queryId}`) || null;
  }

  updateRetrievalHistory(sessionId, queryId, metadata) {
    const key = `${sessionId}:retrievalHistory`;
    const history = this.memory.get(key) || [];
    history.unshift({
      queryId,
      timestamp: Date.now(),
      ...metadata
    });
    this.memory.set(key, history);
    return true;
  }

  getRetrievalHistory(sessionId, limit) {
    let history = this.memory.get(`${sessionId}:retrievalHistory`) || [];
    if (limit) {
      history = history.slice(0, limit);
    }
    return history;
  }

  clearSessionData(sessionId) {
    for (const key of this.memory.keys()) {
      if (key.startsWith(`${sessionId}:`)) {
        this.memory.delete(key);
      }
    }
    return true;
  }
}

module.exports = WorkingMemoryService;