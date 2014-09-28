jQuery(document).ready(function($) {

 // "use strict";

  /**
   * Query
   * ---------------------------------------------------------------------
   */

  var jsonResult = {};
  var jqxhrSubmit;

  var $querySelect = $('#query-select');
  var environmentSelectClass = 'environment-select';
  var $queryNamespaces = $('.query-namespaces');

  // Triple Bench featherweight edition.
  var defaultQueries = {};

  // Creates the CodeMirror editor.
  var queryEditor = CodeMirror.fromTextArea(document.getElementById("query-editor"), {
    mode: "application/x-sparql-query",
    tabMode: "indent",
    matchBrackets: true,
    lineNumbers: true,
    lineWrapping: true,
    theme: "elegant"
  });

  // Plugin to match selected tokens.
  queryEditor.on("cursorActivity", function() {
    queryEditor.matchHighlight("CodeMirror-matchhighlight");
  });

  // At each query change, we must reload the editor with the new query and reload the namespaces.
  $querySelect.change(function(e){
    selected = $(this).find(':selected');
    queryEditor.setValue(selected.attr('data-query'));
    reloadReferencedNamespaces();
  });

  // Loads the queries from a JSON file.
  $.getJSON('conf/queries.json', function(data) {
    var firstQuery;

    defaultQueries = data;

    var query;
    for (var i = 0; i < data.queries.length; i++) {
      query = data.queries[i];
      firstQuery = firstQuery ? firstQuery : query;
      $querySelect.append('<option value="'+query.name+'" data-index="'+i+'" data-query="'+query.string+'">'+query.title+'</option>');
    }
    $querySelect.first().attr('selected', true);
    queryEditor.setValue($('<div/>').html(firstQuery.string).text());
    reloadReferencedNamespaces();
  });

  // Manages extracting namespace URIs from the query string.
  function extractNamespaces(queryString) {
    queryString = queryString.split('SELECT')[0];
    namespaces = queryString.match(/ (.*?): <(.*?)>/mg);
    return namespaces;
  }

  // Transforms namespace URIs into links pointing to documentations.
  function displayNamespacesURLs(queryString) {
    namespaces = extractNamespaces(queryString);
    $queryNamespaces.empty();
    for (var i = 0; i < namespaces.length; i++) {
      prefix = namespaces[i].replace(/>/,'').split(/: </);
      $queryNamespaces.append('<li>'+prefix[0]+': <a href="'+prefix[1]+'">'+prefix[1]+'</a></li>');
    }
  }

  function reloadReferencedNamespaces() {
    displayNamespacesURLs(queryEditor.getValue());
  }

  function prependToEditor(str) {
    queryEditor.setValue(str + queryEditor.getValue());
  }

  $('#prefix-button').click(function (e){
    e.preventDefault();
    callPrefixCCAPI();
  });

  $("#prefix-text").keypress(function (e) {
        var key = window.event ? e.keyCode : e.which;
        // Enter = 13.
        if (key == '13') {
            e.preventDefault();
            callPrefixCCAPI();
        }
    });

  // Calls the prefix.cc API to add namespaces to our query.
  function callPrefixCCAPI() {
    var prefixId = $('#prefix-text').val();
    // API Documentation : http://prefix.cc/about/api
    var prefixCallURL = 'http://prefix.cc/'+prefixId+'.file.json';

    $.getJSON(prefixCallURL, function(data) {
      $.each(data, function(key, val) {
        prependToEditor('PREFIX ' + prefixId + ': ' + '<' + val + '>\n');
      });
      reloadReferencedNamespaces();
    });
  }

  /**
   * Results
   * ---------------------------------------------------------------------
   */

  var $resultsColumns = $('.results-columns');
  var $resultsRows = $('.results-rows');

  var $queryResult;

  // Loads the results from a JSON file.
  // data/npd.json
  $.getJSON('data/npd.json', function(data) {
    handleQueryResults(data);
  });

  function handleQueryResults (data) {
    $queryResult = data;

    $resultsColumns.empty();
    $resultsRows.empty();

    $resultsColumns.append('<th>'+data.head.vars.join('</th><th>')+'</th>');

    $('.observation-table').dataTable();

    visualization.draw(data, 'gLineChart');

    // Then we retrieve the data itself.
    for (var j = 0; j < data.results.bindings.length; j++) {
      var currentCells = '';
      $.each(data.results.bindings[j], function (key, val) {
        currentCells += '<td>'+val.value+'</td>';
      });
      $resultsRows.append('<tr>'+currentCells+'</tr>');
    }

    // Create the data table with the right types.
    $('.observation-table').dataTable();
  }

  /**
   * Environment
   * ---------------------------------------------------------------------
   */

  $environmentSelection = $('.environment-selection');

  // Environment parameters are retrieved via JSON.
  $.getJSON('conf/environment.json', function(data) {
    var datasourceHTML = '';
    var environmentHTML = '';

    var datastores = {};
    var datastoreHTML = '';

    // For each datastore, we create a description inside span2s.
    for (var j = 0; j < data.datastores.length; j++) {
      datastores[data.datastores[j].name] = data.datastores[j];
      datastoreHTML += '<div class="span2"><h5>'+data.datastores[j].title+'</h5><p>'+data.datastores[j].description+'</p></div>';
    }

    // For each datasource, we create a fieldset with a select inside.
    for (var i = 0; i < data.datasources.length; i++) {
      datasourceHTML += '<fieldset class="span4"><legend>'+data.datasources[i].title+'<small class="pull-right"><i class="icon-hdd"></i> '+data.datasources[i].size+'Mo</small></legend><div class="control-group"><select name="'+data.datasources[i].name+'" id="'+data.datasources[i].name+'-select" form="query-form" class="environment-select" data-source="'+data.datasources[i].name+'">';

      // For each datastore bound to the datasource, we add an option to the select.
      for (var k = 0; k < data.datasources[i].locations.length; k++) {
        datasourceHTML += '<option value="'+data.datasources[i].locations[k]+'">'+datastores[data.datasources[i].locations[k]].title+'</option>';
      }

      // Add an help block which describes the data source.
      datasourceHTML += '</select><p class="help-block">'+data.datasources[i].description+'</p></div></fieldset>';
      // Jump line if necessary.
      if (i !== 0 && (i + 1) % 3 === 0) {
        environmentHTML += '<div class="row-fluid">'+datasourceHTML+'</div>';
        datasourceHTML = '';
      }
    }

    // Append everything.
    $environmentSelection.append(environmentHTML + '<hr/><div class="row-fluid">' + datastoreHTML + '</div>');
  });

  /**
   * Visualization
   * ---------------------------------------------------------------------
   */

  visualization.init();

  $('a[href="#visualization"]').on('shown', function(){
    visualization.refresh();
  });

  // Calls the chart function().draw()
  $("#chart-type-select").change(function (){
    visualization.redraw($(this).val());
  });

  /**
   * History
   * ---------------------------------------------------------------------
   */

  // localStorage JSON history object key.
  var historyKey = 'queryHistory';

  // Example of what could be inside localStorage.
  storageSetJSON(historyKey, {"items" : [{
    "timestamp" : "05:13:25",
    "query" : "PREFIX+a%3A+<http%3A%2F%2Fwww.w3.org%2F2000%2F10%2Fannotation-ns%23>%0D%0APREFIX+dc%3A+<http%3A%2F%2Fpurl.org%2Fdc%2Felements%2F1.1%2F>%0D%0APREFIX+foaf%3A+<http%3A%2F%2Fxmlns.com%2Ffoaf%2F0.1%2F>%0D%0A%0D%0A%23+Comment!%0D%0A%0D%0ASELECT+%3Fgiven+%3Ffamily%0D%0AWHERE+{%0D%0A++%3Fannot+a%3Aannotates+<http%3A%2F%2Fwww.w3.org%2FTR%2Frdf-sparql-query%2F>+.%0D%0A++%3Fannot+dc%3Acreator+%3Fc+.%0D%0A++OPTIONAL+{%3Fc+foaf%3Agiven+%3Fgiven+%3B%0D%0A+++++++++++++++foaf%3Afamily+%3Ffamily+}+.%0D%0A++FILTER+isBlank(%3Fc)%0D%0A+}",
    "environment" : {
      "inseecog" : "memory",
      "inseepop" : "tdb",
      "passim" : "sdb",
      "d2rq" : "memory",
      "isf" : "d2rq",
      "taweb" : "sesame"
    }
  }]});

  // By default, localStorage only accepts Strings / Arrays / booleans / ints.
  function storageGetJSON(key) {
    var retrievedObject = localStorage.getItem(key);
    return JSON.parse(retrievedObject);
  }

  function storageSetJSON(key, json) {
    // Stringify and parse allow us to store JSON as String (ie serialization).
    var storedObject = JSON.stringify(json);
    localStorage.setItem(key, storedObject);
  }

  // TODO. Here, history is combined with the json file and localStorage.
  $.getJSON('conf/history.json', function(data) {
    var storageData = storageGetJSON(historyKey);
    for (var i = storageData.items.length - 1; i >= Math.max(0, storageData.items.length - 6); i--) {
      addHistoryItem(storageData.items[i], i);
    }
    for (var j = data.items.length - 1; j >= Math.max(0, data.items.length - 6); j--) {
      addHistoryItem(data.items[j], j);
    }
  });

  // Take a history item and create its HTML (a big appended preppended textfield).
  function addHistoryItem(item, index) {
    var htmlHistoryItem = '';
    var itemEnvironment = JSON.stringify(item.environment);
    var displayQuery = decodeURIComponent(item.query).replace(/\+/g,' ').replace(/\n/g, ' ');
    displayQuery = displayQuery.substring(displayQuery.indexOf('SELECT'));

    htmlHistoryItem += '<time class="add-on history-timestamp">'+item.timestamp+'</time>';
    htmlHistoryItem += '<input type="text" data-query="'+item.query+'" data-env="'+itemEnvironment+'" value="'+displayQuery+'" id="history-item'+index+'" class="history-query span3" disabled/>';
    htmlHistoryItem += '<p class="add-on">'+itemEnvironment.replace(/"/g,'')+'</p>';
    htmlHistoryItem += '<button class="btn history-btn" type="button">Reuse</button>';

    $('.history-items').append('<div class="row-fluid"><div class="input-prepend input-append span12">'+htmlHistoryItem+'</div></div>');
  }

  /**
   * Benchmark
   * ---------------------------------------------------------------------
   */

  var jsonD3 = {
    'measures' : [
      {
        'time' : 50,
        'count' : 500
      },
      {
        'time' : 500,
        'count' : 100
      },
      {
        'time' : 1000,
        'count' : 500
      },
      {
        'time' : 1000,
        'count' : 2000
      }
    ]};

var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 800 - margin.left - margin.right,
    height = 350 - margin.top - margin.bottom;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .x(function(d) { return x(d.time); })
    .y(function(d) { return y(d.count); });

var svg = d3.select("#benchmark").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var data = jsonD3.measures.map(function(d) {
      return d;

  });

  x.domain(d3.extent(data, function(d) { return d.time; }));
  y.domain(d3.extent(data, function(d) { return d.count; }));

  // Draws the x axis.
  svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      // Draws the label.
    .append("text")
      .attr("y", -20)
      .attr("x", width)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Response time");

  // Draws the ordinate axis.
  svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      // Draws the label.
    .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Triples");

  // Draws the data line.
  svg.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);


  /**
   * Validation button.
   * ---------------------------------------------------------------------
   */

   $('#validation-button').click(function (e){
    e.preventDefault();
    $this = $(this);
    var queryString = queryEditor.getValue();
    $.getJSON('http://localhost:8080/complex/validate?query=' + queryString, function (data) {
      if (data.valid) {
        $this.removeClass('btn-info').removeClass('btn-danger').addClass('btn-success');
      }
      else {
        $this.removeClass('btn-info').removeClass('btn-success').addClass('btn-danger');
      }
    });
   });


  /**
   * About
   * ---------------------------------------------------------------------
   */

  $('.contributor img').tooltip({'placement' : 'bottom'});

  /**
   * Send query
   * ---------------------------------------------------------------------
   */

  var $queryForm = $('#query-form');

  $queryForm.submit(function (event) {
    event.preventDefault();

    //var environmentParameters = retrieveQueryFields();
    //var jqxhr = sendSPARQLQuery(environmentParameters);

    $('#wait-modal').modal('show');

    var $selected = $querySelect.find(':selected');
    var queryIndex = $selected.attr('data-index');
    var results = defaultQueries.queries[queryIndex].result;

    handleQueryResults(results);

    $('#wait-modal').delay(2000).modal('hide');
  });

  function retrieveQueryFields () {
    var fieldsValues = {
      query: queryEditor.getValue(),
      limit: $('#set-limit').val(),
      inference: $('#use-inference').val()
    };

    // For all environment pairing selects.
    $('.' + environmentSelectClass).each(function (){
      $this = $(this);
      fieldsValues[$this.attr('name')] = $this.val();
    });

    return fieldsValues;
  }

  function sendSPARQLQuery (queryParameters) {
    var timestamp = Date.now();
    queryParameters['timestamp'] = timestamp;
    console.log("SPARQL Query " + timestamp);

    // var jqxhr : contains the AJAX query.
    var jqxhr = $.post('http://localhost:8080/complex/request',
      queryParameters,
      function (data) {
        handleQueryResults(data.request);
      },
      'json'
    )
    .success(function() {
      $('#wait-modal').modal('hide');
      $('#alert-modal').modal('hide');
      $('a[href="#visualization"]').tab('show');
      console.log(timestamp + " SUCCESS");
    })
    .error(function (xhr, ajaxOptions, thrownError) {
      $('#alert-modal-message').empty();
      $('#alert-modal-message').append('<strong>'+xhr.status+'</strong> '+ xhr.responseText);
      $('#wait-modal').modal('hide');
      $('#alert-modal').modal('show');
      console.log(timestamp + " ERROR");
    })
    .complete(function() {
      console.log(timestamp + " COMPLETE");
    });

     return jqxhr;
  }

});


