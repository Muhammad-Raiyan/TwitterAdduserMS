const express       = require('express');
const path          = require('path');
const favicon       = require('serve-favicon');
const logger        = require('morgan');
const cookieParser  = require('cookie-parser');
const bodyParser    = require('body-parser');
const session       = require('express-session');
const passport      = require('passport');
const createError = require('http-errors');
require('./config/passport');

const index = require('./routes/index');

// Connect to Users DB
const mongoose  = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGO_DB_URI)  //130.245.168.204
    .catch((err) => console.log(err));

let db = mongoose.connection;
db.once('open', function () {
    console.log('Connected to Usersdb mongodb')
});
db.on('error', function (error) {
    console.log(error)
});

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    cookie 				: {
        maxAge : 24 * 60 * 60 * 1000,
        httpOnly : true,
        secure : false
    },
    secret 				: 'itsasecret',
    saveUninitialized 	: false,
    resave 				: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
