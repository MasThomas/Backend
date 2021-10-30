const express = require('express');
const router = express.Router();

const postCtrl = require("../controllers/post");
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config')

router.post("/create", auth.signin, multer, postCtrl.createPost);
router.get("/", auth.signin, postCtrl.getAllPosts);
router.get("/:id", auth.signin, postCtrl.getOnePost);
router.delete("/:id", auth.signin, multer, postCtrl.deletePost);
router.put("/:id", auth.signin, multer, postCtrl.modifyPost);

router.post("/:id/comment", auth.signin, postCtrl.createComment);
router.delete("/comment/:id", auth.signin, postCtrl.deleteComment);
router.put("/comment/:id", auth.signin, postCtrl.modifyComment);
router.get("/comment/:id", auth.signin, postCtrl.getOneComment);

module.exports = router;