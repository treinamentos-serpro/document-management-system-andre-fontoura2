const { Router } = require('express');
const documentController = require('../controllers/documentController');

const router = Router();

router.post('/upload', documentController.requireOwner, documentController.upload);
router.get('/documents', documentController.requireOwner, documentController.list);
router.get('/documents/:id/download', documentController.requireOwner, documentController.download);

module.exports = router;