const db = require("../models"); 
const auth = require("../middleware/auth")
const fs = require("fs");
const path = require("path");


// ----------------------------------------------------------------------- //
// ------------------------------ POSTS ---------------------------------- //
// ----------------------------------------------------------------------- //

exports.createPost = async (req, res) => {
    try {
        const userId = auth.getUserID(req);
        const user = await db.User.findOne({ where: { id: userId } });
        if(user !== null) { 
            if (req.file === null && Object.keys(req.body.content).length <= 2 ) {
                return res.status(403).json({message : "Vous ne pouvez pas poster un message vide ou trop court !"})
            }
            const newPost = {
                content : '',
                UserId: userId,
                imageUrl: null
            }
            if(req.file) {
                newPost.imageUrl = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`
            }
            if(req.body.content) {
                newPost.content = req.body.content
            }
            const sendNewPost = await db.Post.create({
                content: newPost.content,
                UserId: newPost.UserId,
                imageUrl: newPost.imageUrl
            });
            res.status(201).json({ post: sendNewPost, message: "Post créé avec succès !" });
        } else {
            res.status(401).json({message : "Erreur lors de l'identification de l'utilisateur"})
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
        where : {UserId : user.id},
        limit: 50, order: [["id", "DESC"]], 
        attributes : ["id", "content", "imageUrl", "modifiedBy", "createdAt"],
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
        const adminCheck = await db.User.findOne({ where: { id: userId } });
        const thisPost = await db.Post.findOne({ where: { id: req.params.id } });
        if (userId === thisPost.UserId || adminCheck.isAdmin === true) {
            if (thisPost.imageUrl) {
              const filename = thisPost.imageUrl.split("/images")[1];
              fs.unlink(`images/${filename}`, () => {
                db.Post.destroy({ where: { id: thisPost.id } });
                res.status(200).json({ message: "Le Post et l'image ont été supprimés" });
              });
            } else {
              db.Post.destroy({ where: { id: thisPost.id } }, { truncate: true });
              res.status(200).json({ message: "Le post a été supprimé avec succès" });
            }
          } else {
            res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce post" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la suppression d'un post" });
    }
};

exports.modifyPost = async (req, res) => {
    try {
        let newImageUrl;
        const userId = auth.getUserID(req);
        const adminCheck = await db.User.findOne({ where: { id: userId } });
        const hasModified = await db.User.findOne({ where: { id: userId } });
        const thisPost = await db.Post.findOne({ where: { id: req.params.id } });
        if (userId === thisPost.UserId || adminCheck.isAdmin === true) {
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
            res.status(200).json({ newPost: newPost, message: "Le post a été modifié avec succès !" });
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


exports.createComment = async (req, res) => {    
    try {
        const userId = auth.getUserID(req);
        const user = await db.User.findOne({ where: { id: userId } });
        if (user !== null) { 
            if(!req.body.comment){
                return res.status(403).json({ error: "Veuillez renseigner un commentaire valide" });
            } else {
                const myComment = await db.Comment.create({
                    comment: req.body.comment,
                    UserId: user.id,
                    PostId: req.params.id,
                }); 
                res.status(200).json({ post: myComment, message: "Le commentaire a été ajouté avec succès !" });
            }
        }
        else {
            return res.status(403).json({ error: "Le commentaire n'a pas pu être ajouté" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la création d'un commentaire" });
    }
};

exports.getOneComment = async (req, res) => {
    try {
        const comment = await db.Comment.findOne({ 
            include: [
                {model: db.User, attributes: ["id", "username", "imageUrl"]},
            ],
            where: { id: req.params.id } 
        });
        res.status(200).json(comment);
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de l'affichage d'un commentaire" });
    }
};

exports.getAllCommentsFromPost = async (req, res) => {
    try {
        const post = await db.Post.findOne({where: { id: req.params.id }})
        const comment = await db.Comment.findAll({ 
            include: [
                {model: db.User, attributes: ["id", "username", "imageUrl"]},
            ],
            where: { PostId : post.id } 
        });
        res.status(200).json(comment);
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de l'affichage de tous les commentaires du post" });
    }
};

exports.deleteComment = async (req, res) => {
    try {
        const userId = auth.getUserID(req);
        const isAdmin = await db.User.findOne({ where: { id: userId } });
        const thisComment = await db.Comment.findOne({ where: { id: req.params.id } });
        if (userId === thisComment.UserId || isAdmin.isAdmin === true) {
              db.Comment.destroy({ where: { id: thisComment.id } }, { truncate: true });
              res.status(200).json({ message: "Le commentaire a été supprimé avec succès" });
            }
        else {
            res.status(403).json({ message: "Vous n'êtes pas autorisé à supprimer ce commentaire" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la suppression d'un commentaire" });
    }
};

exports.modifyComment = async (req, res) => {
    try {
        const userId = auth.getUserID(req);
        const isAdmin = await db.User.findOne({ where: { id: userId } });
        const hasModified = await db.User.findOne({ where: { id: userId } });
        const thisComment = await db.Comment.findOne({ where: { id: req.params.id } });
        if (userId === thisComment.UserId || isAdmin.isAdmin === true) {
            if (req.body.comment) {
                thisComment.comment = req.body.comment;
            }
            thisComment.modifiedBy = hasModified.username;
            const newComment = await thisComment.save({
                fields: ["comment", "modifiedBy"],
            });
            res.status(200).json({ newComment: newComment, message: "Le commentaire a été modifié avec succès !" });
          } 
          else {
            res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier ce commentaire" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur lors de la modification d'un commentaire" });
    }
};