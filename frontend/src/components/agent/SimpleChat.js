import React, { useState, useRef, useEffect } from 'react';
import { 
  Card, 
  Input, 
  Button, 
  List, 
  Avatar, 
  Typography, 
  Divider 
} from 'antd';
import { 
  SendOutlined, 
  UserOutlined, 
  RobotOutlined
} from '@ant-design/icons';

const { Text, Paragraph } = Typography;
const { TextArea } = Input;

/**
 * Simple Chat component that doesn't require API connections
 */
const SimpleChat = ({ placeholderText = "Ask me anything..." }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Mock sending a message
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
    
    // Simulate API response delay
    setTimeout(() => {
      // Add mock response
      const agentMessage = {
        content: `I received your message: "${input}"`,
        sender: 'agent',
        timestamp: new Date()
      };
      
      setMessages(prevMessages => [...prevMessages, agentMessage]);
      setLoading(false);
    }, 1000);
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
  
  return (
    <Card bordered={false}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '70vh' }}>
        {/* Messages area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px', marginBottom: 16 }}>
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
                    <Paragraph style={{ whiteSpace: 'pre-wrap' }}>
                      {message.content}
                    </Paragraph>
                  }
                />
              </List.Item>
            )}
            locale={{ emptyText: 'No messages yet' }}
          />
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
              icon={<SendOutlined />}
              onClick={handleSubmit}
              disabled={loading || !input.trim()}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SimpleChat;