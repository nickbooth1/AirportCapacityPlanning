/**
 * Mock implementation of LongTermMemory for testing
 */

const whereInMock = jest.fn().mockReturnThis();
const whereMock = jest.fn().mockReturnThis();
const joinMock = jest.fn().mockReturnThis();
const selectMock = jest.fn().mockReturnThis();
const orderByMock = jest.fn().mockReturnThis();
const limitMock = jest.fn().mockReturnThis();
const offsetMock = jest.fn().mockReturnThis();
const firstMock = jest.fn().mockResolvedValue(null);
const insertMock = jest.fn().mockResolvedValue([{ id: 1 }]);
const updateMock = jest.fn().mockResolvedValue(1);
const deleteMock = jest.fn().mockResolvedValue(1);

const mockResults = [
  { 
    id: 'memory-1', 
    content: 'Memory 1 content', 
    category: 'PREFERENCE', 
    importance: 8,
    similarity: 0.94
  },
  { 
    id: 'memory-2', 
    content: 'Memory 2 content', 
    category: 'FACT', 
    importance: 6,
    similarity: 0.85
  },
  { 
    id: 'memory-3', 
    content: 'Memory 3 content', 
    category: 'BEHAVIOR', 
    importance: 7,
    similarity: 0.80
  }
];

const LongTermMemory = {
  query: jest.fn().mockReturnValue({
    where: whereMock,
    whereIn: whereInMock,
    join: joinMock,
    select: selectMock,
    orderBy: orderByMock,
    limit: limitMock,
    offset: offsetMock,
    first: firstMock,
    insert: insertMock,
    update: updateMock,
    delete: deleteMock,
    then: jest.fn().mockImplementation(callback => Promise.resolve(callback(mockResults)))
  }),
  
  // Static methods directly on the model
  where: whereMock,
  whereIn: whereInMock,
  join: joinMock,
  select: selectMock,
  orderBy: orderByMock,
  limit: limitMock,
  offset: offsetMock,
  first: firstMock,
  insert: insertMock,
  update: updateMock,
  delete: deleteMock
};

module.exports = LongTermMemory;