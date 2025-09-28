import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ChatInterface.css';

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setMessages([{
      id: 1,
      type: 'ai',
      content: "Hello! I'm your AI quoting assistant for two-way radio systems. I can help you with battery replacements, mobile radio installations, repeater systems, and complete radio solutions. What can I help you quote today?",
      timestamp: new Date(),
      suggestions: [
        'I need 3 new batteries for my Motorola XPR7550',
        'Mobile radio for forklift installation',
        '1 repeater and 25 radios for school'
      ]
    }]);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await axios.post('/api/ai/chat', {
        message: inputValue,
        session_id: sessionId
      });

      const aiMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: response.data.message,
        timestamp: new Date(),
        suggestions: response.data.suggestions
      };

      setMessages(prev => [...prev, aiMessage]);
      setSessionId(response.data.session_id);

    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: messages.length + 2,
        type: 'ai',
        content: "I'm having trouble connecting to the server. Make sure the backend is running on port 5000.",
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
  };

  const formatMessage = (content) => {
    return content.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>AI Quoting Assistant</h2>
        {sessionId && <span>Session: {sessionId.substring(0, 8)}...</span>}
      </div>

      <div className="messages-container">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.type}`}>
            <div className="message-content">
              <div className="message-text">
                {formatMessage(message.content)}
              </div>

              {message.suggestions && (
                <div className="suggestions">
                  <p>Try asking:</p>
                  <div className="suggestion-buttons">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="suggestion-btn"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="message-timestamp">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message ai">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <div className="input-container">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me about radio quotes... (e.g., 'I need 10 batteries for XPR radios')"
            disabled={isLoading}
            className="chat-input"
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="send-btn"
          >
            Send
          </button>
        </div>
      </form>

      <div className="example-queries">
        <h3>Try asking:</h3>
        <div className="example-buttons">
          <button
            className="example-btn"
            onClick={() => handleSuggestionClick('I need 3 new batteries for my Motorola XPR7550')}
          >
            Battery replacement
          </button>
          <button
            className="example-btn"
            onClick={() => handleSuggestionClick('Mobile radio installation for forklift')}
          >
            Mobile installation
          </button>
          <button
            className="example-btn"
            onClick={() => handleSuggestionClick('1 repeater and 25 radios for school district')}
          >
            Complete system
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;