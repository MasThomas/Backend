const db = require("../models"); 
const auth = require("../middleware/auth")
const fs = require("fs");

// CREATION d'un POST
exports.createPost = async (req, res, next) => {
    try {
        let imageUrl = "";
        const userId = auth.getUserID(req);
        const user = await db.User.findOne({ where: { id: userId } });
        if(user !== null) { 
            if (req.file) {
                imageUrl = `${req.protocol}://${req.get('host')}/images/${req.file.filename}`;
            } else {
                imageUrl = null;
            }
            if(!req.body.title || !req.body.content){
                fs.unlink(`images/${req.file.filename}`, () => {
                  res.status(403).json({ message: "Merci de renseigner le titre et le corps du message" });
                }); //Si une image est ajouté et que la requête est en erreur, l'image sera quand même dans le folder, donc on évite cela
                res.status(403).json({ message: "Merci de renseigner le titre et le corps du message" });
            } else {
                const myPost = await db.Post.create({
                    title: xss(req.body.title),
                    content: xss(req.body.content),
                    imageUrl: imageUrl,
                    UserId: user.id,
                }); 
                res.status(200).json({ post: myPost, message: "Post ajouté" });
            }
        }
        else {
            return res.status(403).json({ error: "Le post n'a pas pu être ajouté" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur" });
    }
};

// AFFICHER un POST
exports.getOnePost = async (req, res, next) => {
    try {
        const post = await db.Post.findOne({ 
            attributes: ["id", "title", "content", "imageUrl", "modifiedBy"], 
            include: [
                {model: db.User, attributes: ["id", "username", "email", "avatar"]},
                /*{model: db.Like, 
                    attributes: ["UserId"],
                    include: [ {model: db.User, attributes: ["username"]}  ] 
                },*/
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
        return res.status(500).json({ error: "Erreur Serveur" });
    }
};

// AFFICHER TOUS les POSTS
exports.getAllPosts = async (req, res, next) => {
  try {
    const posts = await db.Post.findAll({ 
        limit: 50, order: [["id", "DESC"]], 
        attributes: ["id", "title", "content", "imageUrl", "modifiedBy"],
        include: [
            {model: db.User, attributes: ["id", "username", "email", "avatar"]},
            /*{model: db.Like, 
                attributes: ["UserId"],
                order: [["id", "DESC"]],
                include: [ {model: db.User, attributes: ["username"]}  ] 
            },*/
            {model: db.Comment, 
                attributes: ["id", "comment", "modifiedBy"],
                include: [ {model: db.User, attributes: ["id", "username", "email", "avatar"]}  ] 
            },
        ],
    });
    res.status(200).json(posts);
  } catch (error) {
    return res.status(500).json({ error: "Erreur Serveur" });
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
        return res.status(500).json({ error: "Erreur Serveur" });
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
            if (req.body.title) {
                thisPost.title = xss(req.body.title);
            }
            if (req.body.content) {
                thisPost.content = xss(req.body.content);
            }
            thisPost.modifiedBy = hasModified.username;
            thisPost.imageUrl = newImageUrl;
            const newPost = await thisPost.save({
                fields: ["title", "content", "imageUrl", "modifiedBy"],
            });
            res.status(200).json({ newPost: newPost, message: "Le Post a été modifié" });
          } 
          else {
            res.status(400).json({ message: "Vous n'êtes pas autorisé à modifier ce post" });
          }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur" });
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
                    comment: xss(req.body.comment),
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
        return res.status(500).json({ error: "Erreur Serveur" });
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
        return res.status(500).json({ error: "Erreur Serveur" });
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
        return res.status(500).json({ error: "Erreur Serveur" });
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
                thisComment.comment = xss(req.body.comment);
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
        return res.status(500).json({ error: "Erreur Serveur" });
    }
};

// AIMER un POST
/* exports.addLike = async (req, res, next) => {
    try {
        const userId = auth.getUserID(req);
        const postId = req.params.id;
        const userLiked = await db.Like.findOne({ where: { UserId: userId, PostId: postId }, });
        if (userLiked) {
            await db.Like.destroy(
                { where: { UserId: userId, PostId: postId } },
                { truncate: true, restartIdentity: true }                
            );
            res.status(200).json({ message: "Vous n'aimez plus ce post :(" });
        } else {
            await db.Like.create({
                UserId: userId,
                PostId: postId,
            });
            res.status(200).json({ message: "Vous aimez ce post !" });
        }
    } catch (error) {
        return res.status(500).json({ error: "Erreur Serveur" });
    }
}; */