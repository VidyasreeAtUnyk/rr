const express = require('express');
const { generatePaintings, getPaintings } = require('../controllers/paintingController');
const authMiddleware = require('../middleware/auth');
const { addClient, removeClient } = require('../services/eventBus');
const { pool } = require('../database');

const router = express.Router();

// All routes are protected
router.use(authMiddleware);

router.post('/generate', generatePaintings);
router.get('/:titleId', getPaintings);

// Server-Sent Events for live painting updates for a specific title
router.get('/:titleId/stream', async (req, res) => {
	const user = req.user;
	const { titleId } = req.params;
	if (!user || !user.id) {
		return res.status(401).json({ error: 'Authentication required' });
	}
	if (!titleId) {
		return res.status(400).json({ error: 'Title ID is required' });
	}

	try {
		// Verify title belongs to user
		const [rows] = await pool.execute('SELECT id FROM titles WHERE id = ? AND user_id = ?', [titleId, user.id]);
		if (rows.length === 0) {
			return res.status(404).json({ error: 'Title not found' });
		}
		res.setHeader('Content-Type', 'text/event-stream');
		res.setHeader('Cache-Control', 'no-cache');
		res.setHeader('Connection', 'keep-alive');
		res.flushHeaders && res.flushHeaders();
		res.write(`event: init\ndata: {"ok":true}\n\n`);

		addClient(user.id, titleId, res);

		req.on('close', () => {
			removeClient(user.id, titleId, res);
		});
	} catch (err) {
		console.error('Error establishing SSE stream:', err);
		return res.status(500).json({ error: 'Failed to establish stream' });
	}
});

module.exports = router; 