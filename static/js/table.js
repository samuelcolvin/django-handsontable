"use strict";

function HandsontableDisplay(S){
	var max_id, original_max_id, original_data;//, row_count_original;
	S.$table_container = $(S.table);
	S.$inner_container = S.$table_container.find('#table-btn-container');
	S.$table = S.$table_container.find('#hot-table');
	S.$save = S.$table_container.find('#savebtn');
	S.$load = S.$table_container.find('#loadbtn');
	S.$message = $(S.message);
	S.$error = S.$table_container.find('#error');
	S.$save.click(save_changes);
	S.$load.click(ask_load);
	var handsontable, column_info;
	var nonselect=[];
	
	var handsontable_settings = {
		contextMenu: false,
		minSpareRows: 5,
		stretchH: 'all',
		beforeChange: b4change,
		afterChange: changed,
		removeRowPlugin: remove_row,
	  	onSelection: on_select,
		height: 700,
	};
	
	if (_.has(S, 'height'))
		handsontable_settings.height = S.height;

	this.load_table = function() {
		load_msg = 'Loaded Data'
		get_data();
	};
	
	function get_data() {
		$.ajax({
			url : S.url,
			dataType : 'json',
			type : 'GET',
			success : insert_data,
			error: process_errors,
		});
		
		function process_errors(jqXHR, status, error_msg){
			message_fade('ERROR occurred: ' + error_msg, 0);
			S.$error.show();
			S.$error.text('response text: ' + jqXHR.responseText);
			var response = JSON.parse(jqXHR.responseText);
			console.log(response);
		}
	}
	
	var load_msg;
	function insert_data(data_headings) {
		column_info = data_headings.HEADINGS;
		var data = data_headings.DATA;
		max_id = _.max(data, 'id').id;
		if (_.isUndefined(max_id)) max_id=0;
		original_max_id = max_id;
		if (_.has(S, 'filter_on')){
			_.remove(column_info, function(col){ return col.name == S.filter_on;});
			data = _.filter(data, function(row){return row[S.filter_on] == S.filter_value;});
		}
		handsontable_settings.columns = column_info.map(generate_column_info);
		handsontable_settings.colHeaders = column_info.map(function(item){ return item.heading;});
		
		S.$inner_container.show();
		S.$table.handsontable(handsontable_settings);
		handsontable = S.$table.data('handsontable');
		
		original_data = _.cloneDeep(data);
		handsontable.loadData(data);
		if (load_msg != null){
			var msg = load_msg;
			load_msg = null;
		} else{
			var msg = 'Reloaded Data';
		}
		message_fade(msg, 2000);
		S.$error.hide();
		S.$save.prop('disabled', true);
	}
	
	function ask_load(){
		var q = 'Are you sure you want to reload data from the server? <strong>All unsaved changes will be lost.</strong>';
		$('#prompt-content').html(q);
		$('#prompt-do').text('Reload');
		$('#prompt-do').one('click', msg_get_data);
		$('#prompt').unbind();
		$('#prompt').modal('show');
	}
		
	function msg_get_data(){
		message_fade('Reloading data from server...', 0);
		$('#prompt').unbind();
		$('#prompt').modal('hide');
		get_data();
	}
	
	function generate_column_info(item){
		var info = {};
		info.data = item.name;
		if (item.name == 'id'){
			info.readOnly = true;
		}
		if (item.type == 'TextField'){
			info.type = {renderer : long_renderer};
		}
		else if (item.type == 'ForeignKey'){
			info.type = {renderer: foreign_key_renderer, editor: Handsontable.AutocompleteEditor};
			info.source = item.fk_items;
			info.strict = true;
		}
		else if (item.type == 'ManyToManyField'){
			info.type = {renderer: M2M_renderer};
			info.readOnly = true;
		}
		else if (item.type == 'RelatedObject'){
			info.type = {renderer: RelatedObject_renderer};
			info.readOnly = true;
		}
		else if(item.type == 'DecimalField'){
			info.type = 'numeric';
			info.format = '$0,0.00';
			info.language = 'en-gb';
		}
		return info;
	} 

	function long_renderer(instance, td, row, col, prop, value, cellProperties) {
		var value = Handsontable.helper.stringify(value);
		td.innerHTML = '<div class="large_item">' + value + '</div>';
		return td;
	};
	
	function M2M_renderer(instance, td, row, col, prop, value, cellProperties) {
		return extra_renderer(instance, td, row, col, prop, value, cellProperties, false);
	}
	
	function RelatedObject_renderer(instance, td, row, col, prop, value, cellProperties) {
		var id = instance.getDataAtRowProp(row, 'id');
		var disabled = _.findIndex(original_data, function(row){return id == row.id;}) == -1;
		return extra_renderer(instance, td, row, col, prop, value, cellProperties, disabled);
	}

	function extra_renderer(instance, td, row, col, prop, value, cellProperties, disabled) {
		if (value == null){
			$(td).find('.btn').remove();
			return td;
		}
		else{
			var btn = document.createElement('button');
			var text = value == null ? 'Empty' : value.length + ' items';
			$(btn).addClass('btn btn-default cell-button').text(text);
			$(btn).prop('disabled', disabled);
			$(btn).on('mouseup', function() { load_extra_table(row, prop);});
			$(td).html($(btn));
			$(td).addClass('button-cell');
			if (!_.contains(nonselect, prop))
				nonselect.push(prop);
			return td;
		}
	}
	
	function on_select(row, col, row2, col2) {
		var meta = handsontable.getCellMeta( row2, col2);
		if (_.contains(nonselect, meta.prop)) {
			handsontable.deselectCell();
		}
	}
	
	var fadeout_msg = "$('#" + S.$message.attr('id') + "').fadeOut()";
	function message_fade(msg, timeout){
		S.$message.show();
		S.$message.text(msg);
		if (timeout != 0){
			setTimeout(fadeout_msg, timeout);
		}
	}

	var row_count;
	function b4change(new_changes, source) {
		if (source === 'loadData' || source === 'ignore') {return;}
		row_count = handsontable.countRows() - handsontable.countEmptyRows();
	}
	
	function changed(new_changes, source) {
		if (source === 'loadData' || source === 'ignore') {return;}
		if (!('length' in new_changes)) {return;}
		S.$save.prop('disabled', false);
		for(var i = 0; i < new_changes.length; i++){
			var row = new_changes[i][0];
			if (row_is_empty(row) && row_count > 0){
				var id = handsontable.getDataAtRowProp(row, 'id');
				if (id == max_id && id > original_max_id){
					max_id -= 1;
				}
				remove_row(row);
			}
			else if (row >= row_count)
				add_row(row);
		}
	
		function row_is_empty(row_no){
			var row = handsontable.getDataAtRow(row_no);
			return _.pull(_.toArray(_.omit(row, 'id')), null, "").length == 0; 
		}
	}
	
	function add_row(row_no){
		max_id += 1;
		handsontable.setDataAtRowProp(row_no, 'id', max_id, 'ignore');
		_.forEach(_.filter(column_info, {type:'ManyToManyField'}), function(col){
			handsontable.setDataAtRowProp(row_no, col.name, [], 'ignore');
		});
		_.forEach(_.filter(column_info, {type:'RelatedObject'}), function(col){
			handsontable.setDataAtRowProp(row_no, col.name, [], 'ignore');
		});
	}
	
	function remove_row(row){
		handsontable.alter("remove_row", row);
		S.$save.prop('disabled', false);
	}
	
	function load_extra_table(row, prop){
		var column = _.find(column_info, {name:prop});
		if (column.type == 'ManyToManyField'){
			var second_table_settings = {
				table: '#extra-table',
				height: 300,
				row: row,
				prop: prop,
				heading: _.find(column_info, {name: prop}).heading,
				options: column.fk_items
			};
			var data = handsontable.getDataAtRowProp(row, prop);
			var second_table = new SimpleHandsontableDisplay(second_table_settings, data, extra_small_table_callback);
			$('#extra-table').modal('show');
		} else if(column.type == 'RelatedObject'){
			var extra_table_settings = {
				table: '#extra-table-big',
				message: '#extra-message',
				url: column.url,
				filter_on: column.filter,
				filter_value: handsontable.getDataAtRowProp(row, 'id'),
				callback: msg_get_data
			};
			
			var extra_table = new HandsontableDisplay(extra_table_settings);
			extra_table.load_table();
			$('#extra-table-big').modal('show');
		}
	
		function extra_small_table_callback(row, col, data){
			handsontable.setDataAtRowProp(row, col, data, 'ignore');
			S.$save.prop('disabled', false);
			message_fade('Save Required', 2000);
		}
	}

	function save_changes(){
		// set changed to all rows
		var changed = _.clone(handsontable.getData());
		if (_.has(S, 'filter_on')){
			changed = _.map(changed, function(row){
				if (row.id != null)
					row[S.filter_on] = S.filter_value;
				return row;
			});
		};
		// removed unchanged rows from changed
	    _.remove(changed, function(row){ 
	    	return _.findIndex(original_data, function(row2){ return _.isEqual(row2, row);}) != -1;
	    });
	    // remove null rows from changed
		_.remove(changed, function(row){
			return _.every(_.toArray(row), function(v){return v == null;});
		});
		// set deleted to all original rows
		var deleted = _.map(original_data, function(row){
			return row.id;
		});
		// remove all rows which still exist from deleted
		var all = handsontable.getData();
	    _.remove(deleted, function(id){ 
	    	return _.findIndex(all, function(row){return id == row.id;}) != -1;
	    });
	    // set added to all the changed rows' id
	    var added = _.pluck(changed, 'id');
		// remove all existing ids
	    _.remove(added, function(id){ 
	    	return _.findIndex(original_data, function(row){return id == row.id;}) != -1;
	    });
		
		if (changed.length == 0 && deleted.length == 0){
			message_fade('Nothing to Save', 2000);
			S.$error.hide();
			return;
		}
		if (_.has(S, 'callback'))
			S.$table_container.on('hidden.bs.modal',  S.callback);
		ask_question(changed, deleted, added.length);
		
		function ask_question(changed, deleted, no_added){
			var q = 'Are you sure you wish to ';
			if (no_added > 0){
				q += 'add ' + no_added + ' row' + (no_added==1?'':'s');
			}
			var no_mod = changed.length - no_added;
			if (no_mod > 0){
				if (no_added > 0){
					q += deleted.length > 0 ? ', ' : ' and ';
				}
				q += 'modify ' + no_mod + ' row' + (no_mod==1?'':'s');
			}
			if (deleted.length > 0){
				if (no_added > 0 || no_mod > 0){
					q += ' and ';
				}
				q += 'delete ' + deleted.length + ' row' + (deleted.length==1?'':'s');
			}
			q += '?';
			$('#prompt-content').text(q);
			$('#prompt-do').text('Save Changes');
			$('#prompt-do').one('click', modify_delete);
			$('#prompt').on('hidden.bs.modal', cancel);
			$('#prompt').modal('show');
		}
		
		function modify_delete(){
			$('#prompt').unbind();
			$('#prompt').modal('hide');
			message_fade('Saving ' + (changed.length + deleted.length) + ' changes to the server....', 0);
			var to_send = JSON.stringify({'MODIFY': changed, 'DELETE': deleted});
			$.ajax({
				url : S.url,
				contentType: 'application/json',
				dataType: 'json',
				type: 'PATCH',
				data: to_send,
				success: process_success,
				error: process_errors,
			});
		 }
		 
		 function cancel(){
			message_fade('Not Saving Changes', 2000);
		}
		
		function process_success(data) {
			S.$save.prop('disabled', true);
			load_msg = 'Data Saved & Reloaded';
			insert_data(data);
		}
		
		function process_errors(jqXHR, status, error_msg){
			message_fade('ERROR occurred: ' + error_msg, 0);
			var response = JSON.parse(jqXHR.responseText);
			S.$error.show();
			console.log(response);
			if (_.has(response, 'DELETED') && _.has(response, 'MODIFIED')){
				message_fade('Error Occured Saving some rows', 0);
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
		
		function colour_cells(id, col_name){
			var col = _.findIndex(column_info, {name: col_name});
			var row = _.findIndex(handsontable.getData(), {id: parseInt(id)});
			var cell = handsontable.getCell(row, col);
			if (cell == null){return;}
			$(cell).addClass('error-cell');
		}
	}
}

function SimpleHandsontableDisplay(S, data_in, callback){
	var max_id, original_data;
	S.$table_container = $(S.table);
	S.$table = S.$table_container.find('#hot-table');
	var handsontable;
	var data = _.map(data_in, function(row){return [row];});

	var columns = [{
		type : {
			renderer : foreign_key_renderer,
			editor : Handsontable.AutocompleteEditor
		},
		source : S.options,
		strict : true
	}]; 

	var column_names = [S.heading];
	$(S.table).find('.modal-title').text(S.heading);

	var handsontable_settings = {
		data: data,
		colHeaders: column_names,
		columns: columns,
		contextMenu: false,
		minSpareRows: 1,
		removeRowPlugin: remove_row,
	};
	
	if (_.has(S, 'height'))
		handsontable_settings.height = S.height;
	
	S.$table.handsontable(handsontable_settings);
	handsontable = S.$table.data('handsontable');
	
	$(S.table).on('hidden.bs.modal',  done);
	S.$table_container.show();
	
	function done(){
		var data_out = _.compact(_.map(handsontable.getData(), function(row){return row[0];}));
		callback(S.row, S.prop, data_out);
	}
	
	function remove_row(row){
		handsontable.alter("remove_row", row);
	}
}


function foreign_key_renderer(instance, td, row, col, prop, value, cellProperties) {
	Handsontable.AutocompleteCell.renderer.apply(this, arguments);
	// td.style.fontStyle = 'italic';
	td.title = 'Type to show the list of options';
}
