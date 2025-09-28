const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET all quotes
router.get('/', (req, res) => {
  const query = `
    SELECT q.*, c.name as client_name, c.contact_person, c.email
    FROM quotes q
    LEFT JOIN clients c ON q.client_id = c.id
    ORDER BY q.created_at DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

module.exports = router;