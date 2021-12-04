const db = require("../models"); 
const auth = require("../middleware/auth")
const fs = require("fs");


// ----------------------------------------------------------------------- //
// ------------------------------ POSTS ---------------------------------- //
// ----------------------------------------------------------------------- //

exports.createPost = async (req, res) => {
    try {
        let imageUrl = "";
        const userId = auth.getUserID(req);
        const user = await db.User.findOne({ where: { id: userId } });
        if(user !== null) { 
            if (!req.file && !req.body.content) {
                return res.status(403).json({message : "Vous ne pouvez pas poster un message vide"})
            }
            if (req.file) {
                imageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
            } else {
                imageUrl = null;
            }
            const newPost = await db.Post.create({
                content: req.body.content,
                imageUrl: imageUrl,
                UserId: userId,
            });
            res.status(201).json({ post: newPost, message: "Post créé" });
        } else {
            res.status(403).json({message : "Erreur lors de l'identification de l'utilisateur"})
        }
        
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la création du post" });
    }
};

exports.getOnePost = async (req, res) => {
    try {
        const post = await db.Post.findOne({ 
            include: [
                {model: db.User, attributes: ["id", "username", "email", "imageUrl"]},
                {model: db.Comment, 
                    limit: 100, order: [["id", "DESC"]], 
                    attributes: ["id", "comment", "modifiedBy"],
                    include: [ {model: db.User, attributes: ["id", "username", "email", "imageUrl"]} ]
                }, 
            ],
            where: { id: req.params.id } 
        });
        res.status(200).json(post);
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de l'affichage d'un post" });
    }
};

exports.getAllPosts = async (req, res) => {
  try {
    const posts = await db.Post.findAll({ 
        limit: 50, order: [["id", "DESC"]], 
        include: [
            {model: db.User, attributes: ["id", "username", "email", "imageUrl"]},
            {model: db.Comment, 
                attributes: ["id", "comment", "modifiedBy"],
                include: [ {model: db.User, attributes: ["id", "username", "email", "imageUrl"]}  ] 
            },
        ],
    });
    res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ error: "Erreur Serveur lors de l'affiche de tous les posts" });
  }
};

exports.getAllPostsFromUser = async (req, res) => {
    try {
      const user = await db.User.findOne({ where : {username: req.params.username}})
      const posts = await db.Post.findAll({
        where : {userId : user.id},
        limit: 50, order: [["id", "DESC"]], 
        attributes : ["id", "content", "imageUrl", "modifiedBy"],
        include: [
            {model: db.User, attributes: ["id", "username", "email", "imageUrl"]},
            {model: db.Comment, 
                attributes: ["id", "comment", "modifiedBy"],
                include: [ {model: db.User, attributes: ["id", "username", "email", "imageUrl"]}  ] 
            },
        ],
      });
      res.status(200).json(posts);
    } catch (error) {
      return res.status(500).json({ error: "Erreur Serveur lors de l'affichage de tous les posts d'un utilisateur" });
    }
};

exports.deletePost = async (req, res) => {
    try {
        const userId = auth.getUserID(req);
        const isAdmin = await db.User.findOne({ where: { id: userId } });
        const thisPost = await db.Post.findOne({ where: { id: req.params.id } });
        if (userId === thisPost.UserId || isAdmin.role === true) {
            if (thisPost.imageUrl) {
              const filename = thisPost.imageUrl.split("/images")[1];
              fs.unlink(`images/${filename}`, () => {
                db.Post.destroy({ where: { id: thisPost.id } });
                res.status(200).json({ message: "Le Post et l'image ont été supprimés" });
              });
            } else {
              db.Post.destroy({ where: { id: thisPost.id } }, { truncate: true });
              res.status(200).json({ message: "Le Post a été supprimé" });
            }
          } else {
            res.status(403).json({ message: "Vous n'êtes pas autotisé à supprimer ce Post" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la suppression d'un post" });
    }
};

//Vérifier la modification de fichier côté front
exports.modifyPost = async (req, res) => {
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
            res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce post" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la modification d'un post" });
    }
};

// ----------------------------------------------------------------------- //
// ------------------------- COMMENTAIRES -------------------------------- //
// ----------------------------------------------------------------------- //


// Pas testable pour l'instant
exports.createComment = async (req, res) => {    
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

// Pas testable pour l'instant
exports.getOneComment = async (req, res) => {
    try {
        const comment = await db.Comment.findOne({ 
            attributes: ["id", "comment", "modifiedBy"], 
            include: [
                {model: db.User, attributes: ["id", "username", "email", "imageUrl"]},
            ],
            where: { id: req.params.id } 
        });
        res.status(200).json(comment);
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de l'affichage d'un commentaire" });
    }
};

// Pas testable pour l'instant
exports.deleteComment = async (req, res) => {
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

// Pas testable pour l'instant
exports.modifyComment = async (req, res) => {
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