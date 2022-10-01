require('dotenv').config()
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

// require mongoose
const mongoose = require("mongoose");

// requires for level 5
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const passportLocal = require("passport-local");
const session = require("express-session");

var GoogleStrategy = require('passport-google-oauth20').Strategy;
var findOrCreate = require('mongoose-findorcreate')

// middlewares
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

// setup session
app.use(
  session({
    secret: "this is top secret",
    resave: false,
    saveUninitialized: false,
  })
);

// intialize passport and tell it to use session
app.use(passport.initialize());
app.use(passport.session());

// mongoose.connect
mongoose.connect(`mongodb+srv://aryan123:${process.env.ADMIN_PASS}@cluster0.gvij2mt.mongodb.net/aryansecretsDB`);

// schema = > email  password
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  googleId: String
});

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    require: true,
  },
  content: {
    type: String,
    required: true,
    // minLength: 200,
  },
});

// add passport local mongoose as a plugin
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// model
var User = new mongoose.model("User", userSchema);

var Blog = new mongoose.model("Blog", blogSchema);

// create strategy
passport.use(User.createStrategy());

// // serialize and deserialize
// passport.serializeUser(function (user, done) {
//   done(null, user);
// });

// passport.deserializeUser(function (user, done) {
//   done(null, user);
// });
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "https://aryan-secrets-app.herokuapp.com/auth/google/secrets"
},
  function (accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



// routes
// home
app.get("/", (req, res) => {
  res.render("home");
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    res.redirect("/login");
  }
});

// signup
app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/compose", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("compose");
  } else {
    res.redirect("/login");
  }
});

app.post("/signup", (req, res) => {
  console.log(req.body.password);
  User.register(
    { username: req.body.username },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/signup");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/secrets");
        });
      }
    }
  );
});

app.post("/compose", (req, res) => {
  const title = req.body.title;
  const content = req.body.content;
  const blog = new Blog({
    title: title,
    content: content,
  });
  blog.save((err) => {
    if (!err) {
      res.redirect("/blogs");
    } else {
      console.log(err);
    }
  });
});

app.get("/blogs", (req, res) => {
  Blog.find({}, (err, blogs) => {
    if (!err) {
      res.render("blogs", {
        blogs: blogs,
      });
    } else {
      console.log(err);
    }
  });
});

// login
app.get("/login", (req, res) => {
  res.render("login");
});

// login
app.post("/login", function (req, res) {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });

  req.login(user, function (err) {
    if (err) {
      console.log(err);
      res.redirect("/login")
    } else {
      passport.authenticate("local")(req, res, function () {
        res.redirect("/secrets");
      });
    }
  });
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (!err) {
      res.redirect("/")
    } else {
      console.log(err);
    }
  })
})
// setupServer
app.listen( process.env.PORT || 3000, () => {
  console.log(`Server started on port : 3000`);
});
