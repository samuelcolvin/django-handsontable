"use strict";

function edit_related(field_name){
	var info = extra_urls[field_name];
	load_extra_hot_display(info.url, info.filter_on, info.filter_value, reload_page);
}

function reload_page(){
	location.reload();
}

function getCookie(name) {
    var cookieValue = null;
    if (document.cookie && document.cookie != '') {
        var cookies = document.cookie.split(';');
        for (var i = 0; i < cookies.length; i++) {
            var cookie = jQuery.trim(cookies[i]);
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) == (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

var csrftoken = getCookie('csrftoken');

function csrfSafeMethod(method) {
    // these HTTP methods do not require CSRF protection
    return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
$.ajaxSetup({
    crossDomain: false, // obviates need for sameOrigin test
    beforeSend: function(xhr, settings) {
        if (!csrfSafeMethod(settings.type)) {
            xhr.setRequestHeader("X-CSRFToken", csrftoken);
        }
    }
});

$('#extra-table-big').on('show.bs.modal', function (e) {
  $(this).find('.modal-body').height($(window).height()-300);
});

$('#extra-table-big').on('hidden.bs.modal', function (e) {
  $(this).find('.start-hidden').hide();
  $(this).find('#extra-message').show().text('Loading...');
});

if (typeof(main_json_url) != 'undefined'){
	var main_table_settings = {
		table: '#main-table',
		message: '#message',
		url: main_json_url,
	};
	
	var main_table = new HandsontableDisplay(main_table_settings);
	$(document).ready(function() {
		main_table.set_height($(window).height() - $('#main-table').offset().top - 110);
		main_table.load_table();
	});
}