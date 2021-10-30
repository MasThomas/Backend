const pwValidator = require('password-validator');
const submitedPw = new pwValidator;

submitedPw
.is().min(8)
.is().max(55)
.has().uppercase(1)
.has().lowercase(1)
.has().digits(1)

module.exports = (req, res, next) => {
    if (!submitedPw.validate(req.body.password)) {
        res.status(401).json({error : 'Mot de passe incorrect. Le mot de passe doit contenir 8 caractères minimum dont une majuscule, une minuscule et un chiffre minimum.'})
    } else {
        next();
    }
}