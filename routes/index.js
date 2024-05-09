const express = require('express');
const router = express.Router();
const indexController = require('../controllers/indexController.js');

router.get('/', indexController.homeGET);
router.get('/signup', indexController.signupGET);
router.post('/signup', indexController.signupPOST);
router.get('/login', indexController.loginGET);
router.post('/login', indexController.loginPOST);
router.get('/requests', indexController.contactRequestsGET);
router.post('/requests', indexController.contactRequestsPOST);
//need a route to handle sending contact request.. how to do?
router.get('/messages/:id', indexController.idMessagesGET);
router.post('/messages/:id', indexController.idMessagesPOST);

module.exports = router;
