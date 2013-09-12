var $container = $("#hands-table");
var $console = $("#table-console");
var handsontable;
var big_fields = ['description', 'comment'];

$(document).ready(function() {
	$container.handsontable({
		colHeaders : ['ID', 'name', 'description', 'comment', 'order group'],
		columns : [
			{
				data : 'id', 
				readOnly: true
			}, 
			{
				data : 'name'
			}, 
			{
				data : 'description', 
				type : {renderer : long_renderer}
			},
			{
				data : 'comment', 
				type : {renderer : long_renderer}
			}, 
			{
				data : 'order_group',
			    type: {renderer: foreign_key_renderer, editor: Handsontable.AutocompleteEditor},
			    source: ["BMW", "Chrysler", "Nissan", "Suzuki", "Toyota", "Volvo", ""],
			    strict: true
			}, 
		],
		// contextMenu : true,
		afterChange : autosave_data,
	});
	handsontable = $container.data('handsontable');
	load_data();
}); 


$('#loadbtn').click(load_data);

$('#savebtn').click(save_data);

$('#autosavecheckbox').click(function() {
	if ($(this).is(':checked')) {
		$console.text('Changes will be autosaved');
	} else {
		$console.text('Changes will not be autosaved');
	}
});

function load_data() {
	$.ajax({
		url : "/restful/components.json",
		dataType : 'json',
		type : 'GET',
		success : function(data) {
			handsontable.loadData(data);
			$console.text('Data loaded');
			$container.show();
		}
	});
}

var long_renderer = function (instance, td, row, col, prop, value, cellProperties) {
  var value = Handsontable.helper.stringify(value);
  td.innerHTML = '<div class="large_item">' + value + '</div>';
  return td;
};

function foreign_key_renderer(instance, td, row, col, prop, value, cellProperties) {
  Handsontable.AutocompleteCell.renderer.apply(this, arguments);
  // td.style.fontStyle = 'italic';
  td.title = 'Type to show the list of options';
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