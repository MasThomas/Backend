const db = require("../models");
const bcrypt = require("bcrypt");
require('dotenv').config();

function firstAdmin(req, res) {
  db.User.findOne({ where: { email: "admin@admin.fr" } || { pseudo: "admin" } })
    .then((user) => {
      if (!user) {
        bcrypt.hash(process.env.ADMINPASSWORD, 10)
          .then((hash) => {
            const admin = db.User.create({
              username: "admin",
              email: "admin@admin.fr",
              avatar: `${process.env.SERVERADDRESS}imagesdefault/defaultuseravatar.png`,
              password: hash,
              isAdmin: true,
            })
              .then((admin) => {
                console.log({ message: `Le compte ${admin.username} a été créé!`,});
              })
              .catch((error) => { 
                res.status(400).json({ error });
              });
          })
          .catch((error) => {
            res.status(500).send({ error });
          });
      } else {
        console.log({ message: "le compte existe déjà" });
      }
    })
    .catch((error) => {
      console.log({ error });
    });
}
module.exports = firstAdmin();