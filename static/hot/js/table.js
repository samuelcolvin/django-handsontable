"use strict";

function HandsontableDisplay(S){
	var max_id, original_max_id, original_data;//, row_count_original;
	S.$table_container = $(S.table);
	S.$start_hidden = S.$table_container.find('.start-hidden');
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
		stretchH: 'all',
		beforeChange: b4change,
		afterChange: changed,
	  	onSelection: on_select,
		height: 700,
	};
	
	if (_.has(S, 'height'))
		handsontable_settings.height = S.height;
	
	this.set_height = function(h){
		handsontable_settings.height = h;
	};

	this.load_table = function() {
		// console.log('height',handsontable_settings.height);
		load_msg = 'Loaded Data';
		get_data();
	};
	
	function get_data() {
		var qurl = query_url(S.url);
		$.ajax({
			url : qurl,
			dataType : 'json',
			type : 'GET',
			success : insert_data,
			error: process_errors,
		});
		
		function process_errors(jqXHR, status, error_msg){
			console.log('got error');
			message_fade('ERROR occurred: ' + error_msg, 0);
			S.$error.show();
			S.$error.text('response text: ' + jqXHR.responseText);
			var response = JSON.parse(jqXHR.responseText);
			console.log(response);
		}
	}
	
	function query_url(url){
		var qurl = url;
		if (_.has(S, 'filter_on')){
			qurl += '?' + S.filter_on + '__id=' + S.filter_value;
		}
		return qurl;
	}
	
	var load_msg;
	function insert_data(data_headings) {
		try{
			column_info = data_headings.HEADINGS;
			var add_delete = data_headings.SETTINGS.add_delete;
			var data = data_headings.DATA;
			max_id = _.max(data, 'id').id;
			if (_.isUndefined(max_id)) max_id=0;
			original_max_id = max_id;
			if (_.has(S, 'filter_on')){
				_.remove(column_info, function(col){ return col.name == S.filter_on;});
				// data = _.filter(data, function(row){return row[S.filter_on] == S.filter_value;});
			}
			
			if (add_delete){
				handsontable_settings.removeRowPlugin = remove_row;
				handsontable_settings.minSpareRows = 5;
			}

			handsontable_settings.columns = column_info.map(generate_column_info);
			handsontable_settings.colHeaders = column_info.map(function(item){ return item.heading;});
			
			S.$start_hidden.show();
			S.$table.removeData().empty();
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
		catch(err){
			message_fade('Error occured while inserting data' , 0);
			S.$error.text(err);
			S.$error.show();
		}
	}
	
	function ask_load(){
		var q = 'Are you sure you want to reload data from the server? <strong>All unsaved changes will be lost.</strong>';
		$('#prompt-content').html(q);
		$('#prompt-do').text('Reload');
		$('#prompt').unbind();
		$('#prompt-do').one('click', msg_get_data);
		$('#prompt').modal('show');
	}

	function msg_get_data(){
		$('#prompt').modal('hide');
		message_fade('Reloading data from server...', 0);
		get_data();
	}
	
	function generate_column_info(item){
		var info = {};
		info.data = item.name;
		info.readOnly = item.readonly;
		if (item.type == 'TextField'){
			info.renderer = long_renderer;
		}
		else if (item.type == 'ForeignKey'){
			info.type = 'dropdown';
			info.source = item.fk_items;
			info.strict = true;
		}
		else if (item.type == 'ManyToManyField'){
			info.renderer = M2M_renderer;
			info.readOnly = true;
		}
		else if (item.type == 'RelatedObject'){
			info.renderer = RelatedObject_renderer;
			info.readOnly = true;
		}
		else if (_.has(item, 'choices')){
			info.type = 'dropdown';
			info.source = item.choices;
			info.strict = true;
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
		var main_row = row;
		var main_col = prop;
		if (column.type == 'ManyToManyField'){
			var data = handsontable.getDataAtRowProp(row, prop);
			var headings = _.find(column_info, {name: prop}).heading;
			load_simple_hot_display(headings, column.fk_items, data, extra_small_table_callback);
		} else if(column.type == 'RelatedObject'){
			var filter_value = handsontable.getDataAtRowProp(row, 'id');
			load_extra_hot_display(column.heading, column.url, column.filter_on, filter_value, msg_get_data);
		}
	
		function extra_small_table_callback(data){
			handsontable.setDataAtRowProp(main_row, main_col, data, 'ignore');
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
	    // take the added rows out of changed and put them in added
	    var added = _.remove(changed, function(row){ 
	    	return _.findIndex(original_data, function(orig_row){return row.id == orig_row.id;}) == -1;
	    });
		
		if (changed.length == 0 && deleted.length == 0 && added.length == 0){
			message_fade('Nothing to Save', 2000);
			S.$save.prop('disabled', true);
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
			$('#prompt').unbind();
			$('#prompt-content').text(q);
			$('#prompt-do').text('Save Changes');
			$('#prompt-do').one('click', modify_delete);
			$('#prompt').on('hidden.bs.modal', cancel);
			$('#prompt').modal('show');
		}
		
		var cancelling = true;
		function modify_delete(){
			cancelling = false;
			message_fade('Saving ' + (changed.length + deleted.length) + ' changes to the server....', 0);
			var to_send = JSON.stringify({'ADD': added, 'MODIFY': changed, 'DELETE': deleted});
			$.ajax({
				url : query_url(S.url),
				contentType: 'application/json',
				dataType: 'json',
				type: 'PATCH',
				data: to_send,
				success: process_success,
				error: process_errors,
			});
		 }
		 
		 function cancel(){
		 	if (cancelling){
				message_fade('Not Saving Changes', 2000);
				S.$save.prop('disabled', true);
				S.$error.hide();
		 	}
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

function load_extra_hot_display(title, url, filter_on, filter_value, callback){
	$('#extra-table-big').find('.modal-title').text(title);
	$('#extra-table-big').modal('show');
	$('#extra-table-big').on('shown.bs.modal', function(){
		var extra_table_settings = {
			table: '#extra-table-big',
			message: '#extra-message',
			url: url,
			filter_on: filter_on,
			filter_value: filter_value,
			callback: callback,
			height: $('#extra-table-big').find('.modal-body').height() - 50
		};
		var extra_table = new HandsontableDisplay(extra_table_settings);
		extra_table.load_table();
	});
}

function load_simple_hot_display(heading, options, data, callback){
	$('#extra-table').modal('show');
	$('#extra-table').on('shown.bs.modal', function(){
		var second_t = {
			table: '#extra-table',
			height: 300,
			options: options,
			heading: heading,
		};
		var second_table = new SimpleHandsontableDisplay(second_t, data, callback);
	});
}

function SimpleHandsontableDisplay(S, data_in, callback){
	var max_id, original_data;
	S.$table_container = $(S.table);
	S.$table = S.$table_container.find('#hot-table');
	var handsontable;
	var data = _.map(data_in, function(row){return [row];});

	var columns = [{
		type : 'dropdown',
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

	handsontable_settings.height = S.height;
	
	S.$table.handsontable(handsontable_settings);
	handsontable = S.$table.data('handsontable');
	
	// $(S.table).on('hidden.bs.modal',  done);
	S.$table_container.find('#done').click(done);
	S.$table_container.show();
	
	function done(){
		var data_out = _.compact(_.map(handsontable.getData(), function(row){return row[0];}));
		console.log('callback');
		callback(data_out);
	}
	
	function remove_row(row){
		handsontable.alter("remove_row", row);
	}
}
