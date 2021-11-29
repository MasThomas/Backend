const auth = require('./auth')
const db = require("../models"); 

module.exports = (req, res, next) => {
    const hasRightsToModify = async function(req) {
        const userId = await auth.getUserID(req); // On récupère l'utilisateur qui souhaite effectuer la modification
        const userRole = await db.User.findOne({ where: { id: userId } }); // On récupère le rôle de l'utilisateur qui modifie

        if (req.params.id === userId || userRole.role === true) { 
            next()
        } else {
            return res.status(403).json({ error: "Vous n'êtes pas autorisé à modifier ce profil" });
        }
    }
    hasRightsToModify(req);
}