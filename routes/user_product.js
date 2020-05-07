var express = require('express');
var router = express.Router();
var async = require('async');
var fs = require('fs');
var path = require('path');
var multer = require('multer');
var crypto = require('crypto');
var storage = multer.diskStorage({
    destination: './public/images/uploads/',
    /* upload path */
    filename: function(req, file, cb) {
        /* Biçim: crypto + image uzantısı kullanarak rastgele onaltılı */
        crypto.pseudoRandomBytes(16, function(err, raw) {
            cb(null, raw.toString('hex') + path.extname(file.originalname));
        });
    }
});
var upload_image = multer({
    storage: storage,
    fileFilter: function(req, file, cb) {
        var allowed_extensions = ['.jpg', '.png', '.gif', '.bmp', '.jpeg'];
        var file_extension = path.extname(file.originalname);
        /* Dosya uzantısının geçerli olup olmadığını kontrol edin */
        if (allowed_extensions.indexOf(file_extension) == -1) {
            console.log(file.originalname + ' geçerli bir dosya türü değil');
            /* Dosya bir resim değilse yükleme */
            return cb(null, false);
        }
        cb(null, true);
    }
});

/* Kullanıcı ürünleri sayfasını getir. */
router.get('/', function(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/user/login');

    res.render('user/products', {
        title: 'My Products'
    });
});



/* Ürünleri sunun. */
router.post('/view', function(req, res) {

    /* Dahili DB değişkenimizi ayarlayın */
    var db = req.db;

    /* Koleksiyonumuzu ayarlayın */
    products = db.get('products');

    pag_content = '';
    pag_navigation = '';

    page = parseInt(req.body.data.page); /* Şu anda bulunduğumuz sayfa */
    name = req.body.data.th_name; /* Sıralamak istediğimiz sütun adının adı */
    sort = req.body.data.th_sort == 'ASC' ? 1 : -1; /* Sıralamamızın sırası (DESC veya ASC) */
    max = parseInt(req.body.data.max); /* Sayfa başına görüntülenecek öğe sayısı */
    search = req.body.data.search; /* Arama kutumuzda verilen anahtar kelime */

    cur_page = page;
    page -= 1;
    per_page = max ? max : 16;
    previous_btn = true;
    next_btn = true;
    first_btn = true;
    last_btn = true;
    start = page * per_page;

    where_search = {};

    /* Arama kutusuna girilmiş bir dize olup olmadığını kontrol edin */
    if (search != '') {
        /* Bir dize girilirse, sonuçları filtrelemek için ana sorgumuza ek bir sorgu mantığı ekleyin*/
        var filter = new RegExp(search, 'i');
        where_search = {
            '$or': [{
                    'name': filter
                },
                {
                    'price': filter
                },
            ]
        };
    }

    /* Yalnızca şu anda oturum açmış kullanıcının sahip olduğu öğeleri sorgula */
    var where_author = {
        '$and': [{
            'author': req.user._id.toString()
        }]
    };

    var where = {};
    for (var attrname in where_author) {
        where[attrname] = where_author[attrname];
    }
    for (var attrname in where_search) {
        where[attrname] = where_search[attrname];
    }

    var all_items = '';
    var count = '';
    var sort_query = {};

    /* async yalnızca tüm sorgular başarıyla tamamlandığında veri döndürdüğümüzden emin olmak için kullanırız */
    async.parallel([
        function(callback) {
            /* Alan adları olarak ad kullanın ve değişkenleri sıralayın */
            sort_query[name] = sort;

            /* Tüm mesajları al */
            products.find(where, {
                limit: per_page,
                skip: start,
                sort: sort_query

            }, function(err, docs) {
                if (err) throw err;
                // console.log(docs);
                all_items = docs;
                callback();

            });
        },
        function(callback) {
            products.count(where, function(err, doc_count) {
                if (err) throw err;
                // console.log(count);
                count = doc_count;
                callback();
            });
        }
    ], function(err) { //Burası son callback
        /* Sorgumuzun bir şey döndürüp döndürmediğini kontrol edin. */
        if (count) {
            for (var key in all_items) {
                pag_content += '<tr>' +
                    '<td><img src="/images/uploads/' + all_items[key].featured_image + '" width="100" /></td>' +
                    '<td>' + all_items[key].name + '</td>' +
                    '<td>₺' + all_items[key].price + '</td>' +
                    '<td>' + all_items[key].status + '</td>' +
                    '<td>' + all_items[key].date + '</td>' +
                    '<td>' + all_items[key].stock + '</td>' +
                    '<td>' +
                    '<a href="/user/products/edit/' + all_items[key]._id + '" class="text-success"><span class="glyphicon glyphicon-pencil" title="Edit"></span></a> &nbsp; &nbsp;' +
                    '<a href="#_" class="text-danger delete-product" item_id="' + all_items[key]._id + '"><span class="glyphicon glyphicon-remove" title="Delete"></span></a>' +
                    '</td>' +
                    '</tr>';
            }
        } else {
            pag_content += '<td colspan="7" class="p-d bg-danger">Ürün Bulunamadı</td>';
        }

        pag_content = pag_content + "<br class = 'clear' />";

        no_of_paginations = Math.ceil(count / per_page);

        if (cur_page >= 7) {
            start_loop = cur_page - 3;
            if (no_of_paginations > cur_page + 3)
                end_loop = cur_page + 3;
            else if (cur_page <= no_of_paginations && cur_page > no_of_paginations - 6) {
                start_loop = no_of_paginations - 6;
                end_loop = $no_of_paginations;
            } else {
                end_loop = no_of_paginations;
            }
        } else {
            start_loop = 1;
            if (no_of_paginations > 7)
                end_loop = 7;
            else
                end_loop = no_of_paginations;
        }

        pag_navigation += "<ul>";

        if (first_btn && cur_page > 1) {
            pag_navigation += "<li p='1' class='active'>İlk</li>";
        } else if (first_btn) {
            pag_navigation += "<li p='1' class='inactive'>İlk</li>";
        }

        if (previous_btn && cur_page > 1) {
            pre = cur_page - 1;
            pag_navigation += "<li p='" + pre + "' class='active'>Önceki</li>";
        } else if (previous_btn) {
            pag_navigation += "<li class='inactive'>Önceki</li>";
        }
        for (i = start_loop; i <= end_loop; i++) {

            if (cur_page == i)
                pag_navigation += "<li p='" + i + "' class = 'selected' >" + i + "</li>";
            else
                pag_navigation += "<li p='" + i + "' class='active'>" + i + "</li>";
        }

        if (next_btn && cur_page < no_of_paginations) {
            nex = cur_page + 1;
            pag_navigation += "<li p='" + nex + "' class='active'>İleri</li>";
        } else if (next_btn) {
            pag_navigation += "<li class='inactive'>İleri</li>";
        }

        if (last_btn && cur_page < no_of_paginations) {
            pag_navigation += "<li p='" + no_of_paginations + "' class='active'>Son</li>";
        } else if (last_btn) {
            pag_navigation += "<li p='" + no_of_paginations + "' class='inactive'>Son</li>";
        }

        pag_navigation = pag_navigation + "</ul>";

        var response = {
            'content': pag_content,
            'navigation': pag_navigation
        };

        res.send(response);

    });

});

/* Kullanıcı ürünlerini sayfaya ekle. */
router.get('/add', function(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/user/login');

    res.render('user/products-add', {
        title: 'Add Product'
    });
});

/* Öğe Eklemek için POST isteğini işleme */
router.post('/create', function(req, res) {

    /* Dahili DB değişkenimizi ayarlayın */
    var db = req.db;
    products = db.get('products');

    /* DB'ye gönderir */
    products.insert({
        'name': req.body.name,
        'author': req.user._id.toString(),
        'content': req.body.content,
        'excerpt': req.body.excerpt,
        'price': parseFloat(req.body.price),
        'status': req.body.status,
        'stock': parseInt(req.body.stock),
        'date': req.body.date
    }, function(err, doc) {
        if (err) {
            res.send(0); /* Başarısız olursa, return 0 (error) */
        } else {
            res.send(doc._id); /* Ekleme başarılı olduysa belge kimliğini döndür */
        }
    });
});

/* Kullanıcı Ürünlerini Düzenle sayfasını getir. */
router.get('/edit/:id', function(req, res, next) {
    if (!req.isAuthenticated()) return res.redirect('/user/login');

    var db = req.db;
    item_id = req.params.id;
    item_id_check = item_id.match(/^[0-9a-fA-F]{24}$/);
    products = db.get('products');
    item_details = '';

    /* Nesne kimliğinin geçerli olup olmadığını kontrol edin */
    if (item_id_check) {
        async.parallel([
            function(callback) {
                products.findOne(item_id).then((doc) => {
                    item_details = doc;
                    callback();
                });
            }
        ], function(err) {
            /* Geçerli kullanıcının öğeye sahip olduğundan emin olun */
            if (req.user._id.toString() == item_details.author) {
                res.render('user/products-edit', {
                    title: 'Edit Product',
                    item: item_details
                });
            } else {
                res.status(404).send('Bu öğeyi düzenleme izniniz yok');
            }
        });

    } else {
        res.status(404).send('Geçersiz Öğe Kimliği');
    }
});

router.post('/update', upload_image.array('images'), function(req, res, next) {
    /* Dahili DB değişkenimizi ayarla */
    var db = req.db;
    products = db.get('products');

    products.update(req.body.id, {
        '$set': {
            'name': req.body.name,
            'content': req.body.content,
            'excerpt': req.body.excerpt,
            'price': parseFloat(req.body.price),
            'status': req.body.status,
            'stock': parseInt(req.body.stock),
            'date': req.body.date
        }
    }, function(err, doc) {
        if (err) {
            /* Başarısız olursa, hata döndür */
            res.send({
                'status': 0,
                'message': 'Veritabanındaki bilgiler güncellenirken bir sorun oluştu.'
            });
        } else {
            if (req.files) {
                var uploads = req.files;
                var uploaded_images = [];

                /* Görüntüleri veritabanına kaydet */
                for (var key in uploads) {
                    if (uploads.hasOwnProperty(key)) {
                        products.update(req.body.id, {
                            '$addToSet': {
                                'images': uploads[key].filename
                            }
                        });
                        uploaded_images.push(uploads[key].filename);
                    }
                }
            }

            /* Ve başarı sayfasına ilerleyin */
            res.send({
                'status': 1,
                'images': uploaded_images,
                'message': 'Item successfully updated'
            });
        }
    });

    console.log(req.files);

});

/* Öğe Silme POST isteğini işleme */
router.post('/delete', function(req, res) {
    /* Dahili DB değişkenimizi ayarlayın */
    var db = req.db;
    item_id = req.body.item_id;
    item_id_check = item_id.match(/^[0-9a-fA-F]{24}$/);
    products = db.get('products');
    item_images = '';

    /* Nesne kimliğinin geçerli olup olmadığını kontrol edin */
    if (item_id_check) {
        async.parallel([
            function(callback) {
                products.findOne(item_id).then((doc) => {
                    /* Varsa bu ürünün tüm resimlerini sil */
                    if (doc.hasOwnProperty('images')) {
                        var item_images = doc.images;
                        for (var i = 0; i < item_images.length; i++) {
                            fs.unlink(uploads_dir + item_images[i], (err) => {
                                if (err) throw err;
                            });
                        }
                    }
                    callback();
                });

            }
        ], function(err) {
            /* Veritabanından öğe verilerini silme */
            products.remove({
                '_id': item_id
            }, function(err, response) {
                if (response.result.n == 1) {
                    res.send('1');
                } else {
                    res.send('0');
                }
            });
        });

    } else {
        res.status(404).send('Invalid Item ID');
    }

});

/* Öne çıkan resim olarak ayarla */
router.post('/image/set-featured', function(req, res) {
    /* Dahili DB değişkenimizi ayarlayın */
    var db = req.db;
    products = db.get('products');

    products.update(req.body.item_id, {
        '$set': {
            'featured_image': req.body.image
        }
    }, function(err, doc) {
        if (doc) {
            res.send({
                'status': 1,
                'message': 'Image successfully set as featured'
            });
        } else {
            res.send({
                'status': 0,
                'message': err
            });
        }
    });
});

/* Resmi Sil */
router.post('/image/unset', function(req, res) {

    fs.unlink(uploads_dir + req.body.image, (err) => {
        if (err) throw err;

        /* Dahili DB değişkenimizi ayarlayın */
        var db = req.db;
        products = db.get('products');

        products.update(req.body.item_id, {
            '$pull': {
                'images': req.body.image
            }
        }, function(err, doc) {
            if (doc) {
                res.send({
                    'status': 1,
                    'message': 'Image successfully deleted'
                });
            } else {
                res.send({
                    'status': 0,
                    'message': err
                });
            }
        });
    });

});


module.exports = router;