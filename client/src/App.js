import React, { useState } from 'react';
import ChatInterface from './components/ChatInterface';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState('chat');

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1>Radio Quoting AI Assistant</h1>
          <p>AI-powered quoting for two-way radio and surveillance systems</p>
        </div>
      </header>

      <main className="main-content">
        <ChatInterface />
      </main>

      <footer className="App-footer">
        <p>Two-Way Radio Quoting System - Prototype Version 1.0</p>
      </footer>
    </div>
  );
}

export default App;