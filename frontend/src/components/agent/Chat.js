import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  List, 
  Avatar, 
  Typography, 
  Divider, 
  Spin,
  Empty 
} from 'antd';
import { 
  SendOutlined, 
  UserOutlined, 
  RobotOutlined,
  SaveOutlined,
  SyncOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import axios from 'axios';
import { getAuthToken } from '../../utils/auth';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Chat component for AI Agent interaction
 */
const Chat = ({ placeholderText = "Ask me anything...", initialContext = {} }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextId, setContextId] = useState(null);
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Send message to the API
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    // Add user message to chat
    const userMessage = {
      content: input,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);
    
    try {
      const token = getAuthToken();
      
      // Send query to API
      const response = await axios.post(`${API_URL}/api/agent/query`, {
        query: input,
        contextId,
        initialContext
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Extract response data
      const { response: agentResponse, contextId: newContextId } = response.data;
      
      // Update context ID
      if (newContextId) {
        setContextId(newContextId);
      }
      
      // Add agent response to chat
      const agentMessage = {
        content: agentResponse.text,
        sender: 'agent',
        timestamp: new Date(),
        visualizations: agentResponse.visualizations || [],
        responseId: agentResponse.id
      };
      
      setMessages(prevMessages => [...prevMessages, agentMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage = {
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        sender: 'agent',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle input submission
  const handleSubmit = (e) => {
    e?.preventDefault();
    sendMessage();
  };
  
  // Handle keypress in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  // Save an insight from a response
  const saveInsight = async (responseId, index) => {
    if (!responseId) return;
    
    try {
      const token = getAuthToken();
      
      // Show prompt for title/category
      const title = prompt('Enter a title for this insight:');
      if (!title) return;
      
      // Save the insight
      const response = await axios.post(`${API_URL}/api/agent/insights/save`, {
        responseId,
        title,
        category: 'scenario-analysis'
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Mark message as saved
      const updatedMessages = [...messages];
      updatedMessages[index] = {
        ...updatedMessages[index],
        isSaved: true
      };
      
      setMessages(updatedMessages);
      
      alert('Insight saved successfully!');
    } catch (error) {
      console.error('Error saving insight:', error);
      alert('Failed to save insight. Please try again.');
    }
  };
  
  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', marginBottom: 16 }}>
          {messages.length === 0 ? (
            <Empty 
              description="No messages yet" 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={messages}
              renderItem={(message, index) => (
                <List.Item 
                  style={{ 
                    padding: '12px 0',
                    borderBottom: messages.length - 1 === index ? 'none' : '1px solid #f0f0f0'
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      message.sender === 'user' ? (
                        <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
                      ) : (
                        <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#52c41a' }} />
                      )
                    }
                    title={
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>
                          {message.sender === 'user' ? 'You' : 'AirportAI Assistant'}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </Text>
                      </div>
                    }
                    description={
                      <div>
                        <Paragraph 
                          style={{ 
                            whiteSpace: 'pre-wrap',
                            color: message.isError ? '#ff4d4f' : 'inherit'
                          }}
                        >
                          {message.content}
                        </Paragraph>
                        
                        {/* Visualizations */}
                        {message.visualizations && message.visualizations.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            {message.visualizations.map((viz, vizIndex) => (
                              <div key={vizIndex} style={{ marginBottom: 16 }}>
                                {viz.type === 'chart' && (
                                  <div>
                                    <Text strong>{viz.title}</Text>
                                    <div 
                                      style={{ 
                                        border: '1px solid #f0f0f0', 
                                        borderRadius: 4,
                                        padding: 16,
                                        marginTop: 8 
                                      }}
                                    >
                                      <img 
                                        src={`data:${viz.format};base64,${viz.data}`} 
                                        alt={viz.title}
                                        style={{ maxWidth: '100%' }}
                                      />
                                    </div>
                                  </div>
                                )}
                                
                                {viz.type === 'table' && (
                                  <div>
                                    <Text strong>{viz.title}</Text>
                                    <div 
                                      style={{ 
                                        border: '1px solid #f0f0f0', 
                                        borderRadius: 4, 
                                        padding: 8,
                                        marginTop: 8,
                                        overflowX: 'auto'
                                      }}
                                    >
                                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                          <tr>
                                            {viz.data.headers.map((header, i) => (
                                              <th 
                                                key={i}
                                                style={{ 
                                                  padding: '8px 12px', 
                                                  borderBottom: '1px solid #f0f0f0',
                                                  textAlign: 'left'
                                                }}
                                              >
                                                {header}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {viz.data.rows.map((row, rowIndex) => (
                                            <tr key={rowIndex}>
                                              {row.map((cell, cellIndex) => (
                                                <td 
                                                  key={cellIndex}
                                                  style={{ 
                                                    padding: '8px 12px', 
                                                    borderBottom: '1px solid #f0f0f0' 
                                                  }}
                                                >
                                                  {cell}
                                                </td>
                                              ))}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Action buttons for agent messages */}
                        {message.sender === 'agent' && !message.isError && (
                          <div style={{ marginTop: 8, textAlign: 'right' }}>
                            {message.responseId && (
                              <Button 
                                type="link"
                                size="small"
                                icon={<SaveOutlined />}
                                onClick={() => saveInsight(message.responseId, index)}
                                disabled={message.isSaved}
                              >
                                {message.isSaved ? 'Saved' : 'Save Insight'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input area */}
        <div>
          <Divider style={{ margin: '0 0 16px 0' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start' }}>
            <TextArea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholderText}
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
              style={{ flex: 1, marginRight: 16 }}
            />
            <Button
              type="primary"
              icon={loading ? <SyncOutlined spin /> : <SendOutlined />}
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Chat;