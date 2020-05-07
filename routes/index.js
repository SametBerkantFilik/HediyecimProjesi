var express = require('express');
var router = express.Router();
var fs = require('fs');

var Cart = require('../models/cart');

router.use('/products', require('./product'));
router.use('/user', require('./user'));
router.use('/user/products', require('./user_product'));

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('front/index', { title: 'Hediyecim' });
});

/*router.get('/cart', function(req, res, next) {
    res.render('front/cart', { title: 'Hediyecim' });
});*/

router.get('/', function(req, res, next) {
    res.render('index', {
        title: 'NodeJS Shopping Cart',
        products: products
    });
});

router.get('/add/:id', function(req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});
    var product = products.filter(function(item) {
        return item.id == productId;
    });
    cart.add(product[0], productId);
    req.session.cart = cart;
    res.redirect('/');
});

router.get('/cart', function(req, res, next) {
    if (!req.session.cart) {
        return res.render('cart', {
            products: null
        });
    }
    var cart = new Cart(req.session.cart);
    res.render('cart', {
        title: 'Hediyecim',
        products: cart.getItems(),
        totalPrice: cart.totalPrice
    });
});

router.get('/remove/:id', function(req, res, next) {
    var productId = req.params.id;
    var cart = new Cart(req.session.cart ? req.session.cart : {});

    cart.remove(productId);
    req.session.cart = cart;
    res.redirect('/cart');
});

module.exports = router;