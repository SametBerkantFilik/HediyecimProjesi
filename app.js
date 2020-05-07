var express = require('express');
var session = require('express-session');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var flash = require('connect-flash');
var md5 = require('crypto-md5');

/* MongoDB connection */
var mongo = require('mongodb');
var monk = require('monk');
var db = monk('localhost:27017/Hediyecim'); // 
var users = db.get('users');

var routes = require('./routes/index');

var app = express();

/* Socket.io ve express'i aynı bağlantı noktasında çalışacak şekilde ayarlayın (3100) */
var server = require('http').Server(app);
var io = require('socket.io')(server);

server.listen(3100);

/* Realtime trigger */
io.sockets.on('connection', function(socket) {
    socket.on('send', function(data) {
        io.sockets.emit('message', data);
    });
});

/* Tüm uygulama boyunca erişilebilir hale getirilecek bazı globalleri tanımlayın */
global.root_dir = path.resolve(__dirname);
global.uploads_dir = root_dir + '/public/images/uploads/';

/* view engine kurulumu */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

/* Yanıtı sıkıştırılmamış hale getirme */
app.locals.pretty = true;

/* uncomment after placing your favicon in /public */
/* app.use(favicon(path.join(__dirname, 'public', 'favicon.ico'))); */
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use(session({
    secret: 'secret cat',
    resave: true,
    saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy({
        /* Pasaport için özel alanlar tanımlama */
        usernameField: 'email',
        passwordField: 'password'
    },
    function(email, password, done) {
        /* e-postayı ve şifreyi doğrula */
        users.findOne({ email: email }, function(err, user) {
            if (err) { return done(err); }
            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }
            if (user.password != md5(password)) {
                return done(null, false, { message: 'Incorrect password.' });
            }
            /* Her şey doğruysa, kullanıcı neslimizi passport.serializeUser öğesine geçirelim. */
            return done(null, user);
        });
    }
));

passport.serializeUser(function(user, done) {
    /* Oturuma req.session.passport.user = {email: 'test@test.com'} olarak ekleyin. */
    /* E-posta anahtarı daha sonra passport.deserializeUser işlevimizde kullanılacaktır. */
    done(null, user.email);
});

passport.deserializeUser(function(email, done) {
    users.findOne({ email: email }, function(err, user) {
        /* Getirilen "kullanıcı" nesnesi istek nesnesine req.user olarak eklenir. */
        done(err, user);
    });
});


app.use(function(req, res, next) {
    req.db = db; /* Db'yi yönlendiricimize erişilebilir hale getirin. */
    res.locals.user = req.user; /* Kullanıcı nesnemize tüm şablonlarımızdan erişilebilir olmasını sağlayın. */
    next();
});

app.use('/', routes);

/* 404'ü yakala ve hata gidericiye ilet */
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

/* error işleyicileri */

/* geliştirme hatası işleyici */
/* stacktrace yazdıracak */
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

/* üretim hatası giderici */
/* kullanıcıya yığın takibi yapılmadı */
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;