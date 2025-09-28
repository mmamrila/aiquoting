const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize database
const db = require('./database/db');

// Routes
const partsRoutes = require('./routes/parts');
const clientsRoutes = require('./routes/clients');
const quotesRoutes = require('./routes/quotes');
const aiRoutes = require('./routes/ai');
const enhancedAiRoutes = require('./ai/enhanced-ai-routes');

app.use('/api/parts', partsRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/enhanced-ai', enhancedAiRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Radio Quoting API is running!' });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📡 Radio Quoting Tool API is ready!`);
  console.log(`🔗 Frontend should connect to: http://localhost:${PORT}`);
});