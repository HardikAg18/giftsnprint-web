const express = require('express');
const router = express.Router();
const db = require('../config/database');
const auth = require('../middleware/auth');

// GET /api/projects - List all projects (public)
router.get('/', async (req, res) => {
    try {
        const [projects] = await db.execute('SELECT * FROM projects ORDER BY created_at DESC');
        res.json({ success: true, data: projects });
    } catch (err) {
        console.error('Fetch projects error:', err);
        res.status(500).json({ success: false, message: 'Server error fetching projects.' });
    }
});

// POST /api/projects - Create project (admin only)
router.post('/', auth, async (req, res) => {
    try {
        const { title, description, image_url, category } = req.body;
        if (!title || !image_url || !category) {
            return res.status(400).json({ success: false, message: 'Title, image URL, and category are required.' });
        }

        const [result] = await db.execute(
            'INSERT INTO projects (title, description, image_url, category) VALUES (?, ?, ?, ?)',
            [title, description || null, image_url, category]
        );

        res.json({ success: true, message: 'Project created successfully.', projectId: result.insertId });
    } catch (err) {
        console.error('Create project error:', err);
        res.status(500).json({ success: false, message: 'Server error creating project.' });
    }
});

// DELETE /api/projects/:id - Delete project (admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        await db.execute('DELETE FROM projects WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Project deleted successfully.' });
    } catch (err) {
        console.error('Delete project error:', err);
        res.status(500).json({ success: false, message: 'Server error deleting project.' });
    }
});

module.exports = router;
