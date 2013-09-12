var $container = $("#hands-table");
var $console = $("#table-console");
var handsontable;
var big_fields = ['description', 'comment'];

$(document).ready(function() {
	$container.handsontable({
		colHeaders : column_names,
		columns : columns,
		contextMenu : true,
		afterChange : autosave_data,
		minSpareRows: 20,
	});
	handsontable = $container.data('handsontable');
	load_data();
	$container.show();
}); 

$container.hide();
$('#loadbtn').click(load_data);

$('#savebtn').click(save_data);

$('#autosavecheckbox').click(function() {
	if ($(this).is(':checked')) {
		$console.text('Changes will be autosaved');
	} else {
		$console.text('Changes will not be autosaved');
	}
});

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
			handsontable.loadData(data);
			$console.text('Data loaded');
			$container.show();
		}
	});
}

function save_data() {
	$.ajax({
		url : "json/save.json",
		data : handsontable.getData(),
		dataType : 'json',
		type : 'POST',
		success : function(res) {
			if (res.result === 'ok') {
				$console.text('Data saved');
			} else {
				$console.text('Save error');
			}
		},
		error : function() {
			$console.text('Save error. POST method is not allowed on GitHub Pages. Run this example on your own server to see the success message.');
		}
	});
}


var autosave_timeout;
function autosave_data(change, source) {
	if (source === 'loadData') {
		return;
		//don't save this change
	}
	if ($('#autosavecheckbox').is(':checked')) {
		clearTimeout(autosave_timeout);
		$.ajax({
			url : "json/save.json",
			dataType : "json",
			type : "POST",
			data : change, //contains changed cells' data
			complete : function(data) {
				$console.text('Autosaved (' + change.length + ' cell' + (change.length > 1 ? 's' : '') + ')');
				autosave_timeout = setTimeout(function() {
					$console.text('Changes will be autosaved');
				}, 1000);
			}
		});
	}
}



var columns = column_info.map(generate_column_info);
var column_names = column_info.map(function(item){ return item.header;});