/**
 * AJAX ile gönderirken yükleme görüntüsünü mesaj kabına eklemek için yardımcı işlev
 * 
 * @param textarea, height
 */
function load_ckeditor(textarea, height) {
    CKEDITOR.config.allowedContent = true;
    CKEDITOR.replace(textarea, {
        toolbar: null,
        toolbarGroups: null,
        height: height
    });
}

/**
 * AJAX çağrısı yapmadan önce örneklerin güncellenmesi için CKEditor komutunu veren yardımcı işlevi.
 * Bu işlem gizli metin alanlarını CKEditor'dan gelen uygun değerlerle dolduracaktır
 *
 */
function update_ckeditor_instances() {
    for (instance in CKEDITOR.instances) {
        CKEDITOR.instances[instance].updateElement();
    }
}

/**
 * Güzel bir dalga animasyon efekti sağlar
 * 
 */
function wave_box_animate() {
    if ($('.wave-box-effect').length) {
        jQuery(".wave-box-effect").css("left", "0px");
        jQuery(".wave-box-effect").animate({ 'left': "99%" }, 1000, wave_box_animate);
    }
}

function wave_box(option) {
    if ($('.wave-box-wrapper').length) {
        if (option == 'on') {
            if ($(".wave-box-wrapper .wave-box").html('<div class="wave-box-effect"></div>').show()) {
                wave_box_animate();
            }
        } else if (option == 'off') {
            $(".wave-box-wrapper .wave-box").html('').fadeOut();
        }
    }
}

/* Bir URL'nin parametresini almak için kullanılır */
function get_url_value(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return pair[1]; }
    }
    return (false);
}

/* Nesne biçimindeki form verilerini almak için kullanılabilir */
$.fn.serializeObject = function() {
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};