const express = require('express');
const router = express.Router();

const postCtrl = require("../controllers/post");
const auth = require('../middleware/auth');
const multer = require('../middleware/multer-config')

router.post("/", auth.signin, multer, postCtrl.createPost);
router.get("/:id", auth.signin, postCtrl.getOnePost);
router.get("/", auth.signin, postCtrl.getAllPosts);
router.get("/wall/:username", auth.signin, postCtrl.getAllPostsFromUser);
router.put("/:id", auth.signin, multer, postCtrl.modifyPost);
router.delete("/:id", auth.signin, multer, postCtrl.deletePost);

router.post("/:id/comment", auth.signin, postCtrl.createComment);
router.get("/comment/:id", auth.signin, postCtrl.getOneComment);
router.put("/comment/:id", auth.signin, postCtrl.modifyComment);
router.delete("/comment/:id", auth.signin, postCtrl.deleteComment);

module.exports = router;