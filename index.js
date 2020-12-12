const cookieParser = require("cookie-parser");
const csrf = require("csurf");
const bodyParser = require("body-parser");
const express = require("express");


const csrfMiddleware = csrf({ cookie: true });

const PORT = process.env.PORT || 5000;
const app = express();

//********************************************* */
//var express = require('express')
//var bodyParser = require('body-parser')
var cors = require('cors')
var routeSaya = require('./route/route')

//var app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(routeSaya)
//********************************************* */


app.engine("html", require("ejs").renderFile);
app.use(express.static("static"));

app.use(bodyParser.json());
app.use(cookieParser());
app.use(csrfMiddleware);

app.all("*", (req, res, next) => {
  res.cookie("XSRF-TOKEN", req.csrfToken());
  next();
});

app.get("/", function (req, res) {
  res.render("index.ejs");
});


//Handle Production
if(process.env.NODE_ENV === 'production'){
  // Static folder
  app.use(express.static(__dirname+'/views/'+'/static/'+'/route/'+'/paytm/'));

  //Handle SPA
  app.get(/.*/, (req,res)=> res.sendFile(__dirname+'/views/index.ejs'));
}

app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
