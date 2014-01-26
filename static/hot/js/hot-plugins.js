"use strict";

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
			var pluginEnabled = !!(instance.getSettings().removeRowPlugin);
			var func = instance.getSettings().removeRowPlugin;
			var newRowHeader = function(row, elem) {
				var child, div;
				while ( child = elem.lastChild) {
					elem.removeChild(child);
				}
				elem.className = 'htNoFrame htRemoveRow';
				if (row > -1 && !instance.isEmptyRow(row)) {
					div = document.createElement('div');
					div.className = 'btn';
					div.appendChild(document.createTextNode('x'));
					elem.appendChild(div);
					$(div).on('mouseup', function() {
						func(row);
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
