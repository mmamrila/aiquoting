const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all parts
router.get('/', (req, res) => {
  db.all('SELECT * FROM parts ORDER BY category, name', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// GET part by ID
router.get('/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM parts WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Part not found' });
      return;
    }
    res.json(row);
  });
});

module.exports = router;