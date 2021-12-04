const express = require('express'); 
const router = express.Router();

const userCtrl = require("../controllers/user");

const pwValidator = require('../middleware/pwValidator');
const mailRegex = require('../middleware/mailRegex');
const hasRightsToModify = require('../middleware/hasRights')
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config')

router.post("/signup", pwValidator, mailRegex, userCtrl.signup);
router.post("/login", userCtrl.login);
router.get("/profils", auth.signin, userCtrl.getAllUsers);
router.get("/profils/:username", auth.signin, userCtrl.getOneUserByUsername);
router.get("/profils/id/:id", auth.signin, userCtrl.getOneUserById);


router.put("/profils/profilepicture/:id", auth.signin, hasRightsToModify , multer , userCtrl.modifyAccountProfilePicture);
router.put("/profils/username/:id", auth.signin, hasRightsToModify , userCtrl.modifyAccountUsername);
router.put("/profils/email/:id", auth.signin, hasRightsToModify , mailRegex , userCtrl.modifyAccountEmail);
router.put("/profils/password/:id", auth.signin, hasRightsToModify , pwValidator , userCtrl.modifyAccountPassword);

router.delete("/profils/:id", auth.signin, multer ,userCtrl.deleteAccount);

module.exports = router;