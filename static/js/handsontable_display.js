var $table_container = $("#the-table");
var $message = $("#message");
var $error = $("#error");
var handsontable;
var big_fields = ['description', 'comment'];
var row_count;
var max_id;

// var save_timer = 2000;

$(document).ready(function() {
	$table_container.handsontable({
		colHeaders : column_names,
		columns : columns,
		contextMenu : false,
		afterChange : changed,
		minSpareRows: 5,
	});
	handsontable = $table_container.data('handsontable');
	load_data();
	$table_container.show();
}); 

$('#savebtn').click(function(){save_changes('Nothing to save');});

function generate_column_info(item){
	var info = {};
	info.data = item.name;
	if (item.name == 'id'){
		info.readOnly = true;
	}
	if (item.type == 'long'){
		info.type = {renderer : long_renderer};
	}
	else if (item.type == 'foreign_key'){
		info.type = {renderer: foreign_key_renderer, editor: Handsontable.AutocompleteEditor};
		info.source = extra_models[item.model];
		info.strict = true;
	}
	return info;
} 

function long_renderer(instance, td, row, col, prop, value, cellProperties) {
  var value = Handsontable.helper.stringify(value);
  td.innerHTML = '<div class="large_item">' + value + '</div>';
  return td;
};

function foreign_key_renderer(instance, td, row, col, prop, value, cellProperties) {
  Handsontable.AutocompleteCell.renderer.apply(this, arguments);
  // td.style.fontStyle = 'italic';
  td.title = 'Type to show the list of options';
}

function load_data() {
	$.ajax({
		url : main_json_url,
		dataType : 'json',
		type : 'GET',
		success : function(data) {
			row_count = data.length;
			max_id = _.max(data, 'id').id;
			handsontable.loadData(data);
		}
	});
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

var autosave_timeout;
var changes = [];
var new_rows = [];
function changed(new_changes, source) {
	clearInterval(change_timeout);
	if (source === 'loadData' || source === 'id_update') {return;}
	if (!('length' in new_changes)) {return;}
	var to_delete = [];
	for(var i = 0; i < new_changes.length; i++){
		var row = new_changes[i][0];
		if (_.contains(new_rows, row) && row_is_empty(row)){
			to_delete.push(row);
			continue;
		}
		if (_.contains(changes, row)){
			continue;
		}
		changes.push(row);
		if (row >= row_count){
			new_rows.push(row);
			max_id += 1;
			row_count = row + 1;
			handsontable.setDataAtRowProp(row, 'id', max_id, 'id_update');
		}
	}
	delete_rows(to_delete);
	change_timeout = setTimeout(auto_save, 1000);
	
	function row_is_empty(row_no){
		var row = handsontable.getDataAtRow(row_no);
		delete row.id;
		return _.pull(_.toArray(row), null, "").length == 0; 
	}
}
	
function delete_rows(rows){
	for(var r=0; r < rows.length; r++){
		var row = rows[r];
		handsontable.alter('remove_row', row);
		_.pull(new_rows, row);
		_.pull(changes, row);
		for(var i = 0; i < changes.length; i++){
			if (changes[i] > row){
				changes[i] -=1;
			}
			if (i < new_rows.length && new_rows[i] > row){
				new_rows[i] -=1;
			}			
		}
	}
}
  
var change_timeout;
function auto_save(){
    if ($('#autosavecheckbox').is(':checked')) {
    	save_changes('');
	}
}

function save_changes(empty_msg){
    if (changes.length == 0){
    	if (empty_msg != ''){
    		message.text(empty_msg);
			setTimeout('$message.fadeOut()', 1500);
			$error.fadeOut();
    	}
    	return;
    }
    var changed = _.toArray(_.pick(handsontable.getData(), changes));
	
	$message.show();
    $message.text('Saving ' + changes.length + ' changes to the server....');
    
    var changes_before = changes;
    var new_rows_before = new_rows;
    changes = [];
    new_rows = [];
	$.ajax({
		url : main_json_url,
		contentType: 'application/json',
		dataType: 'json',
		type: 'PATCH',
		data: JSON.stringify(changed),
		success: process_success,
		error: process_errors,
		complete: always
	});
		
	function process_success(data) {
		$message.text('Data Saved');
		var json_str = JSON.stringify(data, undefined, 4);
		$error.fadeOut();
		setTimeout('$message.fadeOut()', 1500);
	}
	
	function process_errors(jqXHR, status, error_msg){
		$message.text('ERROR occurred: ' + error_msg);
		var response = JSON.parse(jqXHR.responseText);
		if (response.STATUS == 'PARTIAL ERROR'){
			$message.text('Error Occured Saving some rows');
			var e_msg = '';
			for (var id in response.IDS){
				if (_.contains([200, 201], response.IDS[id].status)){
					changes_before = _.without(changes_before, id);
					new_rows_before = _.without(new_rows_before, id);
				}
				else{
					e_msg += 'ID ' + id + ': ';
					for (var col_name in response.IDS[id].data){
						colour_cells(id, col_name);
						e_msg += col_name + ': ' + response.IDS[id].data[col_name] + ', ';
					}
					e_msg += '\n';
				}
			}
			
			$error.text(e_msg);
		}
		else{
			$error.text('response text: ' + jqXHR.responseText);
			$message.append(', stopping autosave');
			$('#autosavecheckbox').prop('checked', false);
		}
		_.extend(changes, changes_before);
		_.extend(new_rows, new_rows_before);
		$error.show();
	}
	
	function always(){
	}
	
	function colour_cells(id, col_name){
		var col = _.findIndex(columns, {data: col_name});
		var row = _.findIndex(handsontable.getData(), {id: parseInt(id)});
		var cell = handsontable.getCell(row, col);
		if (cell == null){return;}
		$(cell).addClass('error-cell');
	}
}

function highlight_json(json) {
    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
        var cls = 'number';
        if (/^"/.test(match)) {
            if (/:$/.test(match)) {
                cls = 'key';
            } else {
                cls = 'string';
            }
        } else if (/true|false/.test(match)) {
            cls = 'boolean';
        } else if (/null/.test(match)) {
            cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
    });
}

var columns = column_info.map(generate_column_info);
var column_names = column_info.map(function(item){ return item.header;});

// change_timeout = setTimeout(auto_save, save_timer);



