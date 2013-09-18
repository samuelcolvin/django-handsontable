"use strict";

function HandsontableDisplay(settings){
	var S = settings;
	var max_id, original_data, row_count_original;
	S.$save.click(save_changes);
	var handsontable;

	var columns = column_info.map(generate_column_info);
	var column_names = column_info.map(function(item){ return item.header;});
	
	var fadeout_msg = "$('#" + S.$message.attr('id') + "').fadeOut()";
	
	this.load_table = function() {
		S.$table.handsontable({
			colHeaders : column_names,
			columns : columns,
			contextMenu : false,
			minSpareRows: 5,
			beforeChange: b4change,
			afterChange: changed,
	  		removeRowPlugin: true,
	  		CallFuncPlugin: load_extra_table
		});
		handsontable = S.$table.data('handsontable');
		load_data();
		S.$table.show();
	};
	
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
				row_count_original = data.length;
				max_id = _.max(data, 'id').id;
				original_data = _.cloneDeep(data);
				handsontable.loadData(data);
			}
		});
	}

	var row_count;
	function b4change(new_changes, source) {
		if (source === 'loadData' || source === 'id_update') {return;}
		row_count = handsontable.countRows() - handsontable.countEmptyRows();
	}
	
	function changed(new_changes, source) {
		if (source === 'loadData' || source === 'id_update') {return;}
		if (!('length' in new_changes)) {return;}
		for(var i = 0; i < new_changes.length; i++){
			var row = new_changes[i][0];
			if (row >= row_count_original){
				if (row_is_empty(row)){
					if (handsontable.getDataAtRowProp(row, 'id') == max_id){
						max_id -= 1;
					}
					handsontable.alter('remove_row', row);
				}
				else if (row >= row_count){
					max_id += 1;
					handsontable.setDataAtRowProp(row, 'id', max_id, 'id_update');
				}
			}
		}
	
		function row_is_empty(row_no){
			var row = handsontable.getDataAtRow(row_no);
			return _.pull(_.rest(_.toArray(row)), null, "").length == 0; 
		}
	}
	
	function load_extra_table(row, hotable){
		var second_table_settings = {
			$table: $("#extra-table-table"),
			$message: $("#message"),
			$error: $("#error"),
			$save: $('#savebtn'),
			url: main_json_url
		};
		var second_table = new HandsontableDisplay(second_table_settings);
		second_table.load_table();
		$('#extra-table').modal('show');
	}

	function save_changes(){
		// var changed = _.clone(handsontable.getData());
		var changed = _.clone(handsontable.getData());
	    
	    _.remove(changed, function(row){ 
	    	return _.findIndex(original_data, row) != -1;
	    });
		_.remove(changed, function(row){
			return _.every(_.toArray(row), function(v){return v == null;});
		});
		
		var to_delete = _.map(original_data, function(row){
			return row.id;
		});
		var all = handsontable.getData();
	    _.remove(to_delete, function(id){ 
	    	return _.findIndex(all, function(row){return id == row.id;}) != -1;
	    });
		
		if (changed.length == 0 && to_delete.length == 0){
			S.$message.show();
			S.$message.text('Nothing to Save');
			setTimeout(fadeout_msg, 500);
			S.$error.hide();
			return;
		}
		var p1 = changed.length != 1 ? 's' : '';
		var p2 = to_delete.length != 1 ? 's' : '';
		var q = 'Are you sure you wish to modify ' + changed.length + ' row' + p1 + ' and delete ' + to_delete.length + ' row' + p2 + '?';
		$('#prompt-content').text(q);
		$('#prompt-save').one('click', modify_delete);
		$('#prompt-cancel').one('click', cancel);
		$('#prompt-x').one('click', cancel);
		$('#prompt').modal('show');
		
		function modify_delete(){
			S.$message.show();
			S.$message.text('Saving ' + (changed.length + to_delete.length) + ' changes to the server....');
			var to_send = JSON.stringify({'MODIFY': changed, 'DELETE': to_delete});
			$.ajax({
				url : main_json_url,
				contentType: 'application/json',
				dataType: 'json',
				type: 'PATCH',
				data: to_send,
				success: process_success,
				error: process_errors,
				complete: always
			});
		 }
		 
		 function cancel(){
			S.$message.show();
			S.$message.text('Not Saving Changes');
			setTimeout(fadeout_msg, 1000);
		}
		
		function process_success(data) {
			S.$message.text('Data Saved').fadeIn(500);
			S.$error.fadeOut();
			setTimeout(fadeout_msg, 2000);
			load_data();
		}
		
		function process_errors(jqXHR, status, error_msg){
			S.$message.text('ERROR occurred: ' + error_msg);
			var response = JSON.parse(jqXHR.responseText);
			S.$error.show();
			if (_.has(response, 'DELETED') && _.has(response, 'MODIFIED')){
				S.$message.text('Error Occured Saving some rows');
				S.$error.text('MODIFY ERRORS:');
				var mod = response.MODIFIED;
				for (var id in mod.IDS){
					if (!_.contains([200, 201], mod.IDS[id].status)){
						S.$error.append('    ID ' + id + ': ');
						if (id != 'unknown'){
							for (var col_name in mod.IDS[id].data){
									colour_cells(id, col_name);
									var msg = mod.IDS[id].data[col_name].toString().replace('.','');
									S.$error.append(col_name + ': ' + msg + ', ');
							}
						} else {
							S.$error.append(JSON.stringify(mod.IDS[id].data));
						}
						S.$error.append('\n');
					}
				}
				if (response.DELETED.STATUS != 'SUCCESS'){
					S.$error.append('DELETE ERRORS:');
					for (var id in response.DELETED.IDS){
						if (!_.contains([200, 201], response.DELETED.IDS[id].status))
							S.$error.append('    ID ' + id + ', ');
					}
					S.$error.append('\n');
				}
				
			}
			else{
				S.$error.text('response text: ' + jqXHR.responseText);
			}
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
}
