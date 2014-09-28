(function (global) {

   // "use strict";

    var visualization = {
        jsonData : {},
        chartType : 'gLineChart',

        init: function () {
            // Loads Google Visualization charts functions.
            visualization.charts.loadCharts();

            // Add all charts to the charts select.
            var optionsHTML = '';
            visualization.charts.all.forEach(function (chart) {
                optionsHTML += '<option value="'+chart.id+'">'+chart.title+'</option>';
            });
            $('#' + this.ui.chartSelect).append(optionsHTML);
        },

        refresh : function () {
            var query = new visualization.query();
            query.draw();
        },

        redraw : function (chart) {
            visualization.chartType = chart ? chart : visualization.chartType;

            visualization.refresh();
        },

        draw : function (json, chart) {
            visualization.jsonData = json;
            visualization.redraw(chart);

            $('#' + this.ui.chartSelect).val(query.chart);
        },

        option: {
            namespace: {
                'rdf' : "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
                'rdfs': "http://www.w3.org/2000/01/rdf-schema#",
                'owl' : "http://www.w3.org/2002/07/owl#",
                'xsd' : "http://www.w3.org/2001/XMLSchema#"
            }
        },
        chart: {},    // the set of user-defined rendering functions.
        charts: {},   // functions for handling rendering functions.
        parser: {},   // SPARQL results XML/JSON parser.
        ui: {}       // html get/set functions.
    };

    visualization.ui = {
        chartContainer:     'google-chart',
        chartSelect:    'chart-type-select'
    };




    visualization.query = function () {
        this.chart = visualization.chartType;

        this.chartOptions = {
            'chartArea': { left: '5%', top: '5%', width: '80%', height: '80%' },
            'gGeoMap': {'dataMode':'markers'},
            'gMap': {'dataMode': 'markers'}
        };
    };

    visualization.query.prototype.draw = function () {
        var that = this;
        // Retrieve the  function related to the given chart.
        var chartFunc = visualization.charts.getChart(this.chart);
        this.setChartSpecificOptions();

        // Draw the chart using the Google API.
        this.noRows = visualization.parser.countRowsSparqlJSON(visualization.jsonData);
        if (this.noRows) {
            chartFunc.draw(new google.visualization.DataTable(visualization.parser.SparqlJSON2GoogleJSON(visualization.jsonData)), this.chartOptions);
        }
    };

    // Goes through the chartOptions associative array and retrieves the chart options for the current chart.
    visualization.query.prototype.setChartSpecificOptions = function () {
        var level1;
        var level2;
        for (level1 in this.chartOptions) {
            if (this.chartOptions.hasOwnProperty(level1) &&
                    level1 === this.chart) {
                for (level2 in this.chartOptions[level1]) {
                    if (this.chartOptions[level1].hasOwnProperty(level2)) {
                        this.chartOptions[level2] = this.chartOptions[level1][level2];
                    }
                }
            }
        }
    };

    /**
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     */

    visualization.parser = {

        // variable notation: xtable, xcol(s), xrow(s) -- x is 's'(parql) or 'g'(oogle).

        defaultGDatatype: 'string',

        countRowsSparqlJSON: function (stable) {
            if (typeof stable.results.bindings !== 'undefined') {
                return stable.results.bindings.length;
            }
        },

        SparqlJSON2GoogleJSON: function (stable) {
            var c,
                r,
                srow,
                grow,
                gvalue,
                stype,
                sdatatype,
                gcols = [],
                grows = [],
                gdatatype = [], // for easy reference of datatypes
                scols = stable.head.vars,
                srows = stable.results.bindings;

            for (c = 0; c < scols.length; c += 1) {
                r = 0;
                stype = null;
                sdatatype = null;
                // find a row where there is a value for this column
                while (typeof srows[r][scols[c]] === 'undefined' && r + 1 < srows.length) { r += 1; }
                if (typeof srows[r][scols[c]] !== 'undefined') {
                    stype = srows[r][scols[c]].type;
                    sdatatype = srows[r][scols[c]].datatype;
                }
                gdatatype[c] = this.getGoogleJsonDatatype(stype, sdatatype);
                gcols[c] = {'id': scols[c], 'label': scols[c], 'type': gdatatype[c]};
            }

            // loop rows
            for (r = 0; r < srows.length; r += 1) {
                srow = srows[r];
                grow = [];
                // loop cells
                for (c = 0; c < scols.length; c += 1) {
                    gvalue = null;
                    if (typeof srow[scols[c]] !== 'undefined' &&
                            typeof srow[scols[c]].value !== 'undefined') {
                        gvalue = this.getGoogleJsonValue(srow[scols[c]].value, gdatatype[c], srow[scols[c]].type);
                    }
                    grow[c] = { 'v': gvalue };
                }
                grows[r] = {'c': grow};
            }
            return {'cols': gcols, 'rows': grows};
        },

        getGoogleJsonValue: function (value, gdatatype, stype) {
            var newvalue;
            if (gdatatype === 'number') {
                newvalue = Number(value);
            } else if (gdatatype === 'date') {
                //assume format yyyy-MM-dd
                newvalue = new Date(value.substr(0, 4),
                                value.substr(5, 2),
                                value.substr(8, 2));
            } else if (gdatatype === 'datetime') {
                //assume format yyyy-MM-ddZHH:mm:ss
                newvalue = new Date(value.substr(0, 4),
                                value.substr(5, 2),
                                value.substr(8, 2),
                                value.substr(11, 2),
                                value.substr(14, 2),
                                value.substr(17, 2));
            } else if (gdatatype === 'timeofday') {
                //assume format HH:mm:ss
                newvalue = [value.substr(0, 2),
                        value.substr(3, 2),
                        value.substr(6, 2)];
            } else { // datatype === 'string' || datatype === 'boolean'
                newvalue = value;
            }
            return newvalue;
        },

        getGoogleJsonDatatype: function (stype, sdatatype) {
            var gdatatype = this.defaultGDatatype,
                xsdns = visualization.option.namespace.xsd;
            if (typeof stype !== 'undefined' && (stype === 'typed-literal' || stype === 'literal')) {
                if (sdatatype === xsdns + "float"   ||
                        sdatatype === xsdns + "double"  ||
                        sdatatype === xsdns + "decimal" ||
                        sdatatype === xsdns + "int"     ||
                        sdatatype === xsdns + "long"    ||
                        sdatatype === xsdns + "integer") {
                    gdatatype =  'number';
                } else if (sdatatype === xsdns + "boolean") {
                    gdatatype =  'boolean';
                } else if (sdatatype === xsdns + "date") {
                    gdatatype =  'date';
                } else if (sdatatype === xsdns + "dateTime") {
                    gdatatype =  'datetime';
                } else if (sdatatype === xsdns + "time") {
                    gdatatype =  'timeofday';
                }
            }
            return gdatatype;
        }
    };


    /**
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     *
     */

    visualization.charts = {
        // Package for handling rendering functions.

        all: [],

        // Must be called only when Google Visualization has been loaded.
        loadCharts: function () {
            var googlecharts = [
                { 'id': "gLineChart",        'func': google.visualization.LineChart, 'title' : 'Line Chart'},
                { 'id': "gAreaChart",        'func': google.visualization.AreaChart, 'title' : 'Area Chart'},
                { 'id': "gSteppedAreaChart", 'func': google.visualization.SteppedAreaChart, 'title' : 'Stepped Area Chart'},
                { 'id': "gPieChart",         'func': google.visualization.PieChart, 'title' : 'Pie Chart'},
                { 'id': "gBubbleChart",      'func': google.visualization.BubbleChart, 'title' : 'Bubble Chart'},
                { 'id': "gColumnChart",      'func': google.visualization.ColumnChart, 'title' : 'Column Chart'},
                { 'id': "gBarChart",         'func': google.visualization.BarChart, 'title' : 'Bar Chart'},
                { 'id': "gScatterChart",     'func': google.visualization.ScatterChart, 'title' : 'Scatter Chart'},
                { 'id': "gTreeMap",          'func': google.visualization.TreeMap, 'title' : 'Tree Map'},
                { 'id': "gTimeline",         'func': google.visualization.AnnotatedTimeLine, 'title' : 'Annotated TimeLine'},
                { 'id': "gGeoChart",         'func': google.visualization.GeoChart, 'title' : 'Geo Chart'},
                { 'id': "gGeoMap",           'func': google.visualization.GeoMap, 'title' : 'Geo Map'},
                { 'id': "gMap",              'func': google.visualization.Map, 'title' : 'Map'},
                // This one is defined by us.
                { 'id': "dForceGraph",       'func': visualization.chart.dForceGraph, 'title' : 'D3 Force Graph'}
            ];
            $.merge(this.all, googlecharts);
        },

        getChart: function (chartId) {
            for (var i = 0; i < this.all.length; i += 1) {
                if (chartId === this.all[i].id) {
                    return new this.all[i].func(document.getElementById(visualization.ui.chartContainer));
                }
            }
        }
    };


    /** dForceGraph **
        D3 force directed graph.
    */
    visualization.chart.dForceGraph = function (container) { this.container = container; };
    visualization.chart.dForceGraph.prototype = {
        id:   "dForceGraph",
        draw: function (data, chartOpt) {
            var noColumns = data.getNumberOfColumns(),
                noRows = data.getNumberOfRows(),
                opt = {'maxnodesize': 15, 'minnodesize': 2 },
                colors = d3.scale.category20(),
                w = 800,
                h = 400,
                isNumber = function (n) {  return !isNaN(parseFloat(n)) && isFinite(n); },

                // build arrays of nodes and links.
                nodes = [],
                edges = [],
                t_color = {},
                t_size = {},
                t_maxnodesize = 0,

                r,
                source,
                target,

                nodesizeratio,
                i,
                color,
                size,

                vis,
                force,
                link,
                node,
                ticks;

            for (r = 0; r < noRows; r += 1) {
                source = data.getValue(r, 0);
                target = data.getValue(r, 1);
                // nodes
                if (source !== null && $.inArray(source, nodes) === -1) {
                    nodes.push(source);
                    t_size[source] = (noColumns > 2) ? Math.sqrt(data.getValue(r, 2)) : 0;
                    t_color[source] = (noColumns > 3) ? data.getValue(r, 3) : 0;
                    if (t_size[source] > t_maxnodesize) {
                        t_maxnodesize = t_size[source];
                    }
                }
                if (target !== null && $.inArray(target, nodes) === -1) {
                    nodes.push(target);
                }
                // edges
                if (source !== null && target !== null) {
                    edges.push({'source': $.inArray(source, nodes),
                                'target': $.inArray(target, nodes)
                            }
                        );
                }
            }
            if (t_maxnodesize === 0) {
                t_maxnodesize = 1;
            }
            nodesizeratio = opt.maxnodesize / t_maxnodesize;
            for (i = 0; i < nodes.length; i += 1) {
                color = typeof t_color[nodes[i]] !== 'undefined' ?
                        t_color[nodes[i]] :
                        1;
                size = isNumber(t_size[nodes[i]]) ?
                        opt.minnodesize + t_size[nodes[i]] * nodesizeratio :
                        opt.minnodesize;

                nodes[i] = {'name': nodes[i], 'color': color, 'size': size };
            }

            $(this.container).empty();

            vis = d3.select(this.container)
                .append("svg:svg")
                .attr("width", w)
                .attr("height", h)
                .attr("pointer-events", "all")
                .append('svg:g')
                .call(d3.behavior.zoom().on("zoom", function () {
                    vis.attr("transform", "translate(" + d3.event.translate + ")" +
                         " scale(" + d3.event.scale + ")");
                }))
                .append('svg:g');

            vis.append('svg:rect')
                .attr('width', w)
                .attr('height', h)
                .attr('fill', 'white');

            force = d3.layout.force()
                .gravity(0.05)
                .distance(100)
                .charge(-100)
                .nodes(nodes)
                .links(edges)
                .size([w, h])
                .start();

            link = vis.selectAll("line.link")
                .data(edges)
                .enter().append("svg:line")
                .attr("class", "link")
                //.style("stroke-width", function (d) { return Math.sqrt(d.value); })
                .attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            node = vis.selectAll("g.node")
                .data(nodes)
                .enter().append("svg:g")
                .attr("class", "node")
                .call(force.drag);

            node.append("svg:circle")
                .style("fill", function (d) { return colors(d.color); })
                .attr("class", "node")
                .attr("r", function (d) { return d.size; });

            node.append("svg:title")
                .text(function (d) { return d.name; });

            node.append("svg:text")
                .attr("class", "nodetext")
                .attr("dx", 12)
                .attr("dy", ".35em")
                .text(function (d) { return d.name.replace('http://sws.geonames.org/',''); });

            ticks = 0;
            force.on("tick", function () {
                ticks += 1;
                if (ticks > 250) {
                    force.stop();
                    force.charge(0)
                        .linkStrength(0)
                        .linkDistance(0)
                        .gravity(0)
                        .start();
                }

                link.attr("x1", function (d) { return d.source.x; })
                    .attr("y1", function (d) { return d.source.y; })
                    .attr("x2", function (d) { return d.target.x; })
                    .attr("y2", function (d) { return d.target.y; });

                node.attr("transform", function (d) {
                    return "translate(" + d.x + "," + d.y + ")";
                });
            });
        }
    };


    global.visualization = visualization;

}(window));
