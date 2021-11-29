const db = require("../models"); 
const Sequelize = require("sequelize")
const { Op } = Sequelize;
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth")
const bcrypt = require("bcrypt");
require("dotenv").config();
const fs = require("fs");
const mailRegex = require("../middleware/mailRegex");
const pwValidator = require('../middleware/pwValidator')


exports.signup = async (req, res) => {
  if (req.body.username && req.body.email && req.body.password) {
    try {
      const user = await db.User.findOne({
        where: { [Op.or]: [{username: req.body.username}, {email: req.body.email}] },
      });

      if (user !== null) {
          return res.status(401).json({ error: "Ce nom d'utilisateur ou cet email est déjà utilisé" });
      } else { 
            const hash = await bcrypt.hash(req.body.password, 10)
            db.User.create({
            username: req.body.username,
            email: req.body.email,
            password: hash,
            role: false,
            avatar: `${req.protocol}://${req.get("host")}/imagesdefault/defaultuseravatar.png`
          });
          res.status(201).json({ message: "Votre compte est créé. Vous pouvez vous connecter avec votre identifiant et mot de passe !" });
      }
    } catch (error) {
      return res.status(500).json({ error: "Erreur Serveur" });
    }
  } else {
    return res.status(401).json({ error: "Vous devez renseigner tous les champs pour vous inscrire !" });
  }
};

exports.login = async (req, res) => {
  try {
    const user = await db.User.findOne({
      where: {email: req.body.email},
    });
    if (user === null) {
      return res.status(401).json({ error: "Connexion impossible, merci de vérifier votre login" });
    } else {
      const hashed = await bcrypt.compare(req.body.password, user.password);
      if (!hashed) {
        return res.status(401).json({ error: "Le mot de passe est incorrect !" });
      } else {
        res.status(200).json({
          username: user.username,
          email: user.email,
          role: user.role,
          userId: user.id,
          token: jwt.sign({userId: user.id}, process.env.SECRET_JWT, {expiresIn: '24h'})
        })
      }
    }
  } catch (error) {
    return res.status(500).json({ error: "Erreur Serveur" });
  }
};

exports.getOneUser = async (req, res) => {
  const username = req.params.username;

  try {
    await db.User.findOne({where: { username: username }})
    .then((user) => res.status(200).json(user))
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur lors de la demande " });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await db.User.findAll({ attributes: ["id", "username", "email", "avatar", "role"]});
    res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: "Erreur Serveur" });
  }
};

// Vérifier le bon fonctionnement via le front ?
exports.modifyAccountProfilePicture = async (req, res) => {
  const userToUpdate = await db.User.findOne({ where: { username: req.params.username } }); // On récupère l'utilisateur à modifier
  try {
    
    if (req.file && userToUpdate.avatar) {
      updatedAvatar = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
      const filename = userToUpdate.avatar.split("/images")[1];
      fs.unlink(`images/${filename}`, (err) => {
        err ? console.log(err) : console.log(`Image Supprimée: images/${filename}`);});
    
      } else if (req.file) {
        updatedAvatar = `${req.protocol}://${req.get("host")}/images/${req.file.filename}`;
      }

    if (updatedAvatar) {
    userToUpdate.avatar = updatedAvatar;
    }
    const newUser = await userToUpdate.save({ fields: ["avatar"] }); 
    return res.status(200).json("Votre avatar a bien été mis à jour!");
  } catch {
      return res.status(500).json({ error: "Erreur Serveur lors de la modification de la photo de profil" });
  }

};

exports.modifyAccountUsername = async (req, res) => {
  const userToUpdate = await db.User.findOne({ where: { id: req.params.id } }); // On récupère l'utilisateur à modifier
  try {
      userToUpdate.username = req.body.username;
      const newUser = await userToUpdate.save({ fields: ["username"]});
      res.status(200).json("Votre nom d'utilisateur a bien été mis à jour!")
  } catch {
    return res.status(500).json({ error: "Erreur Serveur lors de la modification du nom d'utilisateur" });
  }
};

exports.modifyAccountEmail = async (req, res) => {
  const userToUpdate = await db.User.findOne({ where: { id: req.params.id } }); // On récupère l'utilisateur à modifier
  try {
    userToUpdate.email = req.body.email;;
    const newUser = await userToUpdate.save({ fields: ["email"]});
    res.status(200).json("Votre email a bien été mis à jour!")
    
  } catch {
    return res.status(500).json({ error: "Erreur Serveur lors de la modification de l'email" });
  }
};

exports.modifyAccountPassword = async (req, res) => {
  const userToUpdate = await db.User.findOne({ where: { id: req.params.id } }); // On récupère l'utilisateur à modifier
  try {
    let updatedPassword = req.body.password;
    const hash = await bcrypt.hash(updatedPassword, 10)
    userToUpdate.password = hash;
    const newUser = await userToUpdate.save({ fields: ["password"]});
    res.status(200).json("Votre mot de passe a bien été mis à jour!")
  } catch {
    return res.status(500).json({ error: "Erreur Serveur lors de la modification du mot de passe" });
  }
};

exports.deleteAccount = async (req, res) => {
  try {
      const userId = auth.getUserID(req);
      const isAdmin = await db.User.findOne({ where: { id: userId } }); 
      const user = await db.User.findOne({ where: { id: req.params.id } });
      if (req.params.id === userId || isAdmin.role === true){
      if (user.avatar !== null) {
        const filename = user.avatar.split("/images")[1];
        fs.unlink(`images/${filename}`, () => {
          db.User.destroy({ where: { id: req.params.id } });
          res.status(200).json({ message: "Le compte a été supprimé" });
        });
        } else {
          db.User.destroy({ where: { id: req.params.id } });
          res.status(200).json({ message: "Le compte a été supprimé" });
        }
    } else {
      return res.status(403).json({ error: "Vous n'êtes pas administrateur et ne pouvez donc pas supprimer ce compte" });
    } 
  } catch (error) {
    return res.status(500).json({ error: "Erreur serveur" });
  }
};