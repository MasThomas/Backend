const express = require('express'); 
const router = express.Router();

const userCtrl = require("../controllers/user");

const pwValidator = require('../middleware/pwValidator');
const mailRegex = require('../middleware/mailRegex');
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config')

router.post("/signup", pwValidator, mailRegex, userCtrl.signup);
router.post("/login", userCtrl.login);
router.get("/profils", auth.signin, userCtrl.getAllUsers);
router.get("/profils/:id", auth.signin, userCtrl.getOneUser);
router.put("/profils/:id", auth.signin, multer ,userCtrl.modifyAccount);
router.delete("/profils/:id", auth.signin, multer ,userCtrl.deleteAccount);

module.exports = router;