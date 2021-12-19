const db = require("../models");
const bcrypt = require("bcrypt");
require('dotenv').config();

function createFirstUserAdmin(req, res) {
  db.User.findOne({ where: { email: process.env.ADMINEMAIL } || { pseudo: process.env.ADMINUSERNAME } })
    .then((user) => {
      if (!user) {
        bcrypt.hash(process.env.ADMINPASSWORD, 10)
          .then((hash) => {
            const admin = db.User.create({
              username: process.env.ADMINUSERNAME,
              email: process.env.ADMINEMAIL,
              imageUrl: `${process.env.SERVER_ADRESSE}images/default.png`,
              password: hash,
              companyRole: process.env.COMPANY_ROLE ? process.env.COMPANY_ROLE : "Administrateur du réseau social",
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
        console.log({ message: "Le compte administrateur a déjà été créé !" });
      }
    })
    .catch((error) => {
      console.log({ error });
    });
}

module.exports = createFirstUserAdmin();