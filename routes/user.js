var express = require('express');
var router = express.Router();
var md5 = require('crypto-md5');
var async = require('async');
var passport = require('passport');
var flash = require('connect-flash');

/* Login sayfasını getirir. */
router.get('/login', function(req, res, next) {
    if (req.isAuthenticated()) return res.redirect('/user/account');

    res.render('user/login', {
        message: req.flash('error'),
        title: 'Login'
    });
});

router.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/user/login',
    failureFlash: true
}));

/* Kayıt sayfasını getirir. */
router.get('/register', function(req, res, next) {
    if (req.isAuthenticated()) return res.redirect('/user/account');

    res.render('user/register', { title: 'Register' });
});

/* POST Kullanıcı Hesabı Oluştur. */
router.post('/register/create', function(req, res, next) {
    var db = req.db;
    users = db.get('users');

    async.parallel([
        function(callback) {
            users.count({ 'email': req.body.email }, function(error, count) {
                user_exists = count;
                callback();
            });
        }
    ], function(err) {
        if (req.body.email == '' || req.body.password == '') {
            res.send({
                'status': 0,
                'message': 'Please fill-up all required fields'
            });
        } else if (req.body.password != req.body.password2) {
            res.send({
                'status': 0,
                'message': 'Passwords do not match'
            });
        } else if (user_exists) {
            res.send({
                'status': 0,
                'message': 'User ' + req.body.email + ' already exists'
            });
        } else {
            users.insert({
                'email': req.body.email,
                'password': md5(req.body.password),
                'first_name': req.body.first_name,
                'last_name': req.body.last_name,
                'phone_number': req.body.phone_number

            }, function(err, user) {
                if (err) {
                    res.send({
                        'status': 0,
                        'message': err
                    });
                } else {
                    /* Kullanıcıya giriş yapın */
                    req.login(user, function(err) {
                        if (err) {
                            res.send({
                                'status': 0,
                                'message': err
                            });
                        } else {
                            res.send({
                                'status': 1
                            });
                        }
                    });
                }
            });
        }
    });
});

/* Kullanıcının hesap sayfasını getirir. */
router.get('/account', function(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/user/login');

    var db = req.db;
    users = db.get('users');

    async.parallel([
        function(callback) {
            users.findOne(req.user._id.toString()).then((doc) => {
                user = doc;
                callback();
            });
        }
    ], function(err) {
        res.render('user/account', {
            title: 'Account | ' + user.email,
            user: user
        });
    });
});

/* Kullanıcı hesabı bilgilerini güncelle. */
router.post('/account/update', function(req, res, next) {

    var db = req.db;
    users = db.get('users');
    posted_data = req.body;
    post_fields_array = {};

    if (posted_data.old_password != '' || posted_data.password_confirm != '' || posted_data.password != '') {
        if (posted_data.password_confirm != posted_data.password) {
            return res.send({
                'status': 0,
                'message': 'New password do not match.'
            });
        } else if (md5(posted_data.old_password) != req.user.password) {
            return res.send({
                'status': 0,
                'message': 'Incorrect old password.'
            });
        }
    }

    async.parallel([
        function(callback) {
            /* Gönderilen mevcut değerlerden bir dizi oluşturalım */
            for (key in posted_data) {
                if (key != 'email' && key != 'old_password' && key != 'password_confirm' && key != 'password') {
                    post_fields_array[key] = posted_data[key];
                }
            }

            /* Güncellememize dahil etmek için bir şifremiz olup olmadığını kontrol edin */
            if (posted_data.password != '') {
                post_fields_array['password'] = md5(posted_data.password);
            }

            callback();
        },
        function(callback) {
            /* Kullanıcı profilini güncelleme */
            users.update(req.user._id, {
                '$set': post_fields_array
            });

            callback();
        }
    ], function(err) {
        if (err) {
            return res.send({
                'status': 0,
                'message': 'Update failed, please try again.'
            });
        }
        res.send({
            'status': 1,
            'message': 'Account successfully updated'
        });
    });
});

/* Çıkış Yap */
router.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

module.exports = router;