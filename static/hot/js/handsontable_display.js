"use strict";

function edit_related(field_name){
	var info = extra_urls[field_name];
	load_extra_hot_display(info.url, info.filter_on, info.filter_value, reload_page);
}

function edit_m2m(field_name){
	var info = extra_urls[field_name];
	$.ajax({
		url : field_url(info.url),
		dataType : 'json',
		type : 'GET',
		success : insert_data,
		error: process_errors,
	});
	
	function insert_data(return_data){
		load_simple_hot_display(info.field, return_data.options, return_data.values, simple_callback);
	}

	function simple_callback(data_back){
		console.log(data_back);
		console.log(info.update_url);
		$.ajax({
			url : field_url(info.update_url),
			contentType: 'application/json',
			dataType: 'json',
			type: 'POST',
			data: JSON.stringify(data_back),
			success: reload_page,
			error: process_errors,
		});
	}
	
	function field_url(url){
		return url + '?field=' + info.field;
	}
		
	function process_errors(jqXHR, status, error_msg){
		console.log('ERROR occurred: ' + error_msg);
		var response = JSON.parse(jqXHR.responseText);
		console.log(response);
	}
}

function reload_page(response){
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