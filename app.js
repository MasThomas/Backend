require('dotenv').config();
const express = require('express'); 
const helmet = require('helmet');
const app = express();
const path = require("path");
app.use(helmet());


// SEQUELIZE
const db = require("./models/index")
db.sequelize.sync({alter:true, /* force:true */}).then(function () {
  require("./config/createFirstUserAdmin");
})


// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
});


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/images", express.static(path.join(__dirname, "images")));
app.use('/api/users', require('./routes/user'));
app.use('/api/posts', require('./routes/posts'));

module.exports = app;