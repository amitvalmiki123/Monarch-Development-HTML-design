const express = require('express');
const auth = require('../middleware/auth');
const sessionService = require('../services/sessionService');

const router = express.Router();

router.get('/', auth, (req, res) => {
  const sessions = sessionService.listSessions(req.user.id).map((s) => ({ ...s, current: s.id === req.sessionId }));
  res.json({ sessions });
});

router.delete('/others', auth, (req, res) => {
  sessionService.revokeOtherSessions(req.user.id, req.sessionId);
  res.json({ ok: true });
});

router.delete('/:sessionId', auth, (req, res) => {
  if (req.params.sessionId === req.sessionId) {
    return res.status(400).json({ error: 'Use Log Out to end your current session' });
  }
  try {
    sessionService.revokeSession(req.params.sessionId, req.user.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(404).json({ error: 'Session not found' });
  }
});

module.exports = router;
