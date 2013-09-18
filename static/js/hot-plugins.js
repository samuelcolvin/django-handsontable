"use strict";


(function($) {
	// CallFunc button which calls func
	function init() {
		var instance = this;

		var pluginEnabled = !!(instance.getSettings().CallFuncPlugin);

		if (pluginEnabled) {
			bindMouseEvents();
			instance.rootElement.addClass('htCallFunc');
		} else {
			unbindMouseEvents();
			instance.rootElement.removeClass('htCallFunc');
		}

		function bindMouseEvents() {
			instance.rootElement.on('mouseover.CallFunc', 'tbody th, tbody td', function() {
				getButton(this).show();
			});
			instance.rootElement.on('mouseout.CallFunc', 'tbody th, tbody td', function() {
				getButton(this).hide();
			});
		}

		function unbindMouseEvents() {
			instance.rootElement.off('mouseover.CallFunc');
			instance.rootElement.off('mouseout.CallFunc');
		}

		function getButton(td) {
			return $(td).parent('tr').find('th.htCallFunc').eq(0).find('.btn');
		}

	}

	Handsontable.PluginHooks.add('beforeInitWalkontable', function(walkontableConfig) {
		if (typeof(this.getSettings().CallFuncPlugin) == 'undefined')
			return;
		var instance = this;
		var baseRowHeaders = walkontableConfig.rowHeaders;
		var func = instance.getSettings().CallFuncPlugin;
		walkontableConfig.rowHeaders = function() {
			var pluginEnabled = Boolean(instance.getSettings().CallFuncPlugin);
			var newRowHeader = function(row, elem) {
				var child, div;
				while ( child = elem.lastChild) {
					elem.removeChild(child);
				}
				elem.className = 'htNoFrame htCallFunc';
				if (row > -1) {
					div = document.createElement('div');
					div.className = 'btn';
					div.appendChild(document.createTextNode('>'));
					elem.appendChild(div);

					$(div).on('mouseup', function() {
						func(row, instance);
					});
				}
			};
			return pluginEnabled ? Array.prototype.concat.call([], newRowHeader, baseRowHeaders()) : baseRowHeaders();
		};
	});

	Handsontable.PluginHooks.add('beforeInit', function() {
		init.call(this);
	});

	Handsontable.PluginHooks.add('afterUpdateSettings', function() {
		init.call(this);
	});
})(jQuery);

(function($) {
	// removeRowPlugin straight from jquery
	function init() {
		var instance = this;

		var pluginEnabled = !!(instance.getSettings().removeRowPlugin);

		if (pluginEnabled) {
			bindMouseEvents();
			instance.rootElement.addClass('htRemoveRow');
		} else {
			unbindMouseEvents();
			instance.rootElement.removeClass('htRemoveRow');
		}

		function bindMouseEvents() {
			instance.rootElement.on('mouseover.removeRow', 'tbody th, tbody td', function() {
				getButton(this).show();
			});
			instance.rootElement.on('mouseout.removeRow', 'tbody th, tbody td', function() {
				getButton(this).hide();
			});
		}

		function unbindMouseEvents() {
			instance.rootElement.off('mouseover.removeRow');
			instance.rootElement.off('mouseout.removeRow');
		}

		function getButton(td) {
			return $(td).parent('tr').find('th.htRemoveRow').eq(0).find('.btn');
		}
	}

	Handsontable.PluginHooks.add('beforeInitWalkontable', function(walkontableConfig) {
		var instance = this;
		// rowHeaders is a function, so to alter the actual value we need to alter the result returned by this function
		var baseRowHeaders = walkontableConfig.rowHeaders;
		walkontableConfig.rowHeaders = function() {
			var pluginEnabled = Boolean(instance.getSettings().removeRowPlugin);
			var newRowHeader = function(row, elem) {
				var child, div;
				while ( child = elem.lastChild) {
					elem.removeChild(child);
				}
				elem.className = 'htNoFrame htRemoveRow';
				if (row > -1) {
					div = document.createElement('div');
					div.className = 'btn';
					div.appendChild(document.createTextNode('x'));
					elem.appendChild(div);
					$(div).on('mouseup', function() {
						instance.alter("remove_row", row);
					});
				}
			};
			return pluginEnabled ? Array.prototype.concat.call([], newRowHeader, baseRowHeaders()) : baseRowHeaders();
		};
	});

	Handsontable.PluginHooks.add('beforeInit', function() { 
		init.call(this);
	});

	Handsontable.PluginHooks.add('afterUpdateSettings', function() {
		init.call(this);
	});
})(jQuery);
