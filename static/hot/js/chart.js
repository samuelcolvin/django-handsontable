$.ajax({
	url : 'customers.json',
	dataType : 'json',
	type : 'GET',
	success : build_chart,
	error: process_errors,
});
	
function process_errors(jqXHR, status, error_msg){
	$('.alert-danger').show();
	$('.alert-danger').html('<p>ERROR occurred: ' + error_msg + '</p>');
	$('.alert-danger').append('<p>' + jqXHR.responseText + '</p>');
}

function build_chart(data){
	var colors = d3.scale.category20();
	keyColor = function(d, i) {return colors(d.key);};
	
	var chart;
	nv.addGraph(function() {
		
	    var width = 1150, height = 700;
	  chart = nv.models.stackedAreaChart()
	  				.width(width)
	                .height(height)
	                .useInteractiveGuideline(true)
	                .x(function(d) { return d[0] })
	                .y(function(d) { return d[1] })
	                .color(keyColor)
	                .transitionDuration(300);
	                //.clipEdge(true);
	
	// chart.stacked.scatter.clipVoronoi(false);
	
	  chart.xAxis
	      .tickFormat(function(d) { return d3.time.format('%x')(new Date(d)) });
	
	  chart.yAxis
	      .tickFormat(d3.format(',.2f'));
	
	  d3.select('#chart svg')
	    .attr('width', width)
	    .attr('height', height)
	    .datum(data)
	    .transition().duration(1000)
	    .call(chart)
	    // .transition().duration(0)
	    .each('start', function() {
	        setTimeout(function() {
	            d3.selectAll('#chart1 *').each(function() {
	              console.log('start',this.__transition__, this);
	              // while(this.__transition__)
	              if(this.__transition__)
	                this.__transition__.duration = 1;
	            });
	          }, 0);
	      });
	    // .each('end', function() {
	    //         d3.selectAll('#chart1 *').each(function() {
	    //           console.log('end', this.__transition__, this)
	    //           // while(this.__transition__)
	    //           if(this.__transition__)
	    //             this.__transition__.duration = 1;
	    //         })});
	
	  nv.utils.windowResize(chart.update);
	
	  // chart.dispatch.on('stateChange', function(e) { nv.log('New State:', JSON.stringify(e)); });
	
	  return chart;
	});
	
	nv.addGraph(function() {
	  var chart = nv.models.stackedAreaChart()
	                .x(function(d) { return d[0] })
	                .y(function(d) { return d[1] })
	                .color(keyColor)
	                ;
	                //.clipEdge(true);
	
	  chart.xAxis
	      .tickFormat(function(d) { return d3.time.format('%x')(new Date(d)) });
	
	  chart.yAxis
	      .tickFormat(d3.format(',.2f'));
	
	  // d3.select('#chart2')
	    // .datum(histcatexpshort)
	    // .transition()
	      // .call(chart);
	
	  nv.utils.windowResize(chart.update);
	
	  return chart;
	});
}

