const db = require("../models"); 
const auth = require("../middleware/auth")
const fs = require("fs");

// CREATION d'un POST
exports.createPost = async (req, res, next) => {
    try {
        let imageUrl = "";
        const userId = auth.getUserID(req);
        const user = await db.User.findOne({ where: { id: userId } });
        console.log("user", userId)
        if(user !== null) { 
            if (req.file) {
                imageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
            } else {
                imageUrl = null;
            }
            if(!req.body.content){
                fs.unlink(`images/${req.file.filename}`, () => {
                  res.status(403).json({ message: "Veuillez renseigner le titre et le contenu du message" });
                }); 
                res.status(403).json({ message: "Veuillez renseigner le titre et le contenu du message" });
            } else {
                const newPost = await db.Post.create({
                    content: req.body.content,
                    imageUrl: imageUrl,
                    UserId: userId,
                }); 
                res.status(200).json({ post: newPost, message: "Post créé" });
            }
        }
        else {
            return res.status(403).json({ error: "Le post n'a pas pu être créé" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la création du post" });
    }
};

// AFFICHER un POST
exports.getOnePost = async (req, res, next) => {
    try {
        const post = await db.Post.findOne({ 
            attributes: ["id", "content", "imageUrl", "modifiedBy"], 
            include: [
                {model: db.User, attributes: ["id", "username", "email", "avatar"]},
                {model: db.Comment, 
                    limit: 100, order: [["id", "DESC"]], 
                    attributes: ["id", "comment", "modifiedBy"],
                    include: [ {model: db.User, attributes: ["id", "username", "email", "avatar"]} ]
                }, 
            ],
            where: { id: req.params.id } 
        });
        res.status(200).json(post);
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de l'affichage d'un post" });
    }
};

// AFFICHER TOUS LES POSTS
exports.getAllPosts = async (req, res, next) => {
  try {
    const posts = await db.Post.findAll({ 
        limit: 50, order: [["id", "DESC"]], 
        attributes: ["id", "content", "imageUrl", "modifiedBy"],
        include: [
            {model: db.User, attributes: ["id", "username", "email", "avatar"]},
            {model: db.Comment, 
                attributes: ["id", "comment", "modifiedBy"],
                include: [ {model: db.User, attributes: ["id", "username", "email", "avatar"]}  ] 
            },
        ],
    });
    res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ error: "Erreur Serveur lors de l'affiche de tous les posts" });
  }
};

// SUPPRIMER un POST
exports.deletePost = async (req, res, next) => {
    try {
        const userId = auth.getUserID(req);
        const isAdmin = await db.User.findOne({ where: { id: userId } });
        const thisPost = await db.Post.findOne({ where: { id: req.params.id } });
        if (userId === thisPost.UserId || isAdmin.role === true) {
            if (thisPost.imageUrl) {
              const filename = thisPost.imageUrl.split("/images")[1];
              fs.unlink(`images/${filename}`, () => {
                db.Post.destroy({ where: { id: thisPost.id } });
                res.status(200).json({ message: "Le Post a été supprimé" });
              });
            } else {
              db.Post.destroy({ where: { id: thisPost.id } }, { truncate: true });
              res.status(200).json({ message: "Le Post a été supprimé" });
            }
          } else {
            res.status(400).json({ message: "Vous n'êtes pas autotisé à supprimer ce Post" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la suppression d'un post" });
    }
};

// MODIFIER un POST
exports.modifyPost = async (req, res, next) => {
    try {
        let newImageUrl;
        const userId = auth.getUserID(req);
        const isAdmin = await db.User.findOne({ where: { id: userId } });
        const hasModified = await db.User.findOne({ where: { id: userId } });
        const thisPost = await db.Post.findOne({ where: { id: req.params.id } });
        if (userId === thisPost.UserId || isAdmin.role === true) {
            if (req.file) {
                newImageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
                if (thisPost.imageUrl) {
                    const filename = thisPost.imageUrl.split("/images")[1];
                    fs.unlink(`images/${filename}`, (err) => {
                    if (err) console.log(err);
                    else { console.log(`image supprimée: images/${filename}`); }
                    });
                }
            }
            
            if (req.body.content) {
                thisPost.content = req.body.content;
            }
            thisPost.modifiedBy = hasModified.username;
            thisPost.imageUrl = newImageUrl;
            const newPost = await thisPost.save({
                fields: ["content", "imageUrl", "modifiedBy"],
            });
            res.status(200).json({ newPost: newPost, message: "Le Post a été modifié" });
          } 
          else {
            res.status(400).json({ message: "Vous n'êtes pas autorisé à modifier ce post" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la modificaiton d'un post" });
    }
};

// AFFICHER tous les POSTS d'un utilisateur

exports.getAllPostsFromUser = async (req, res, next) => {
    try {
      const user = await db.user.findOne({username: req.params.username})
      const posts = await db.Post.findAll({
        where : {userId : req.user},
        limit: 50, order: [["id", "DESC"]], 
        attributes : ["id", "content", "imageUrl", "modifiedBy"],
        include: [
            {model: db.User, attributes: ["id", "username", "email", "avatar"]},
            {model: db.Comment, 
                attributes: ["id", "comment", "modifiedBy"],
                include: [ {model: db.User, attributes: ["id", "username", "email", "avatar"]}  ] 
            },
        ],
      });
      res.status(200).json(posts);
    } catch (error) {
      return res.status(500).json({ error: "Erreur Serveur lors de l'affichage de tous les posts d'un utilisateur" });
    }
  };


// CREATION d'un COMMENTAIRE
exports.createComment = async (req, res, next) => {    
    try {
        const userId = auth.getUserID(req);
        const user = await db.User.findOne({ where: { id: userId } });
        if (user !== null) { 
            if(!req.body.comment){
                return res.status(403).json({ error: "Merci de renseigner le corps du message" });
            } else {
                const myComment = await db.Comment.create({
                    comment: req.body.comment,
                    UserId: user.id,
                    PostId: req.params.id,
                }); 
                res.status(200).json({ post: myComment, message: "Le Commentaire a été ajouté" });
            }
        }
        else {
            return res.status(403).json({ error: "Le commentaire n'a pas pu être ajouté" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la création d'un commentaire" });
    }
};

// AFFICHER un COMMENTAIRE
exports.getOneComment = async (req, res, next) => {
    try {
        const comment = await db.Comment.findOne({ 
            attributes: ["id", "comment", "modifiedBy"], 
            include: [
                {model: db.User, attributes: ["id", "username", "email", "avatar"]},
            ],
            where: { id: req.params.id } 
        });
        res.status(200).json(comment);
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de l'affichage d'un commentaire" });
    }
};

// SUPPRIMER un COMENTAIRE
exports.deleteComment = async (req, res, next) => {
    try {
        const userId = auth.getUserID(req);
        const isAdmin = await db.User.findOne({ where: { id: userId } });
        const thisComment = await db.Comment.findOne({ where: { id: req.params.id } });
        if (userId === thisComment.UserId || isAdmin.role === true) {
              db.Comment.destroy({ where: { id: thisComment.id } }, { truncate: true });
              res.status(200).json({ message: "Le Commentaire a été supprimé" });
            }
        else {
            res.status(400).json({ message: "Vous n'êtes pas autotisé à supprimer ce commentaire" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la suppression d'un commentaire" });
    }
};

// MODIFIER un COMMENTAIRE
exports.modifyComment = async (req, res, next) => {
    try {
        const userId = auth.getUserID(req);
        const isAdmin = await db.User.findOne({ where: { id: userId } });
        const hasModified = await db.User.findOne({ where: { id: userId } });
        const thisComment = await db.Comment.findOne({ where: { id: req.params.id } });
        if (userId === thisComment.UserId || isAdmin.role === true) {
            if (req.body.comment) {
                thisComment.comment = req.body.comment;
            }
            thisComment.modifiedBy = hasModified.username;
            const newComment = await thisComment.save({
                fields: ["comment", "modifiedBy"],
            });
            res.status(200).json({ newComment: newComment, message: "Le Commentaire a été modifié" });
          } 
          else {
            res.status(400).json({ message: "Vous n'êtes pas autorisé à modifier ce commentaire" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la modification d'un commentaire" });
    }
};