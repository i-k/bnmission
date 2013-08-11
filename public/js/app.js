// TODO: refactor this into some nicer form or rewrite?

// Define an anonymous module:
(function($) {

  // Load Handlebars mission-template
  var source   = $("#mission-template").html()
    , template = Handlebars.compile(source)
    , backendApiRoot = "http://localhost:8080/api/";

  var backend = {
    missionsBySeekdate: backendApiRoot + "missions-by-seekdate",
    mission: backendApiRoot + "mission", // not used at the moment
    notDoneCount: backendApiRoot + "count-mission-entries?done=false&mid=",
    doneCount: backendApiRoot + "count-mission-entries?done=true&mid=",
    getMissionEntry: backendApiRoot + "mission-entry?mid=",
    postMissionEntry: backendApiRoot + "mission-entry"
  }

  // Setup routes with Sammy.js
  var app = $.sammy('#main', function() {

    var self = this;

    this.get('#/', function(context) {
      context.log('Rendering frontpage');
      var today = new Date()
        , year = (today.getYear() + 1900).toString()
        , month = (today.getMonth() + 1).toString()
        , day = today.getDate().toString()
        , dateStr = year + '-' + month + '-' + day

      self.getMissionBySeekDate(dateStr)
    });

    this.get('#/tags/:name', function(context) {
      context.log('Rendering by tagname ' + this.params.name);
      // TODO: add categories!
    });
    
    // searches by start-date, doesn't limit the search by end-date (yet, should it?) 
    this.getMissionBySeekDate = function(seekDate) {
      var missionUrl = backend.missionsBySeekdate + '?seek-date=' + seekDate
      $.getJSON(missionUrl, function(result){
        // fill the mission-template with mission details (=render)
        if (result.result.data && result.result.data[0]) {
          var context = result.result.data[0]
            , html = template(context);
          $('#main').html(html)

          updateCounts(context._id);
          self.signUpOrDone(context._id);

        } else {
          $('#main').html('<div class="text-failure" style="padding: 5%; background: pink;"><h3>Haasteita ei löytynyt. Yritä myöhemmin uudestaan!</h3></div>')
        }
      })
    }

    this.signUpOrDone = function(missionId){
      var getMissionEntryUrl = backend.getMissionEntry + missionId
      $.getJSON(getMissionEntryUrl, function(result){
        if (result.result.data) {
          if (!result.result.data.done) {
            self.createButtonMarkDone(missionId)
          } else {
            $('#signup-or-done-inputs').html('<h3 class="text-success">Olet suorittanut tämän haasteen</h3>')
          }
        } else {
          self.createButtonParticipate(missionId)
        }
      })
    }

    this.createButtonParticipate = function(missionId){
      var btn = $("<button id='participate' class='btn btn-primary'>Osallistun haasteeseen!</button>")
      initAndRenderPostMissionEntryBtn(btn, missionId, function() {
        self.createButtonMarkDone(missionId) // update with next button
      })
    }

    this.createButtonMarkDone = function(missionId){
      var btn = $("<button id='mark-done' class='btn btn-success'>Sain haasteen suoritettua!</button>")
      initAndRenderPostMissionEntryBtn(btn, missionId, function() { 
        $('#signup-or-done-inputs').html('<h2 class="text-success">Hyvin tehty!</h2>')
      })
    }
    
    function initAndRenderPostMissionEntryBtn(btn, missionId, onSuccessBeforeUpdateCounts) {
      btn.click(function() {
        // post backend new entry:
        $.ajax({
          type: "POST",
          url: backend.postMissionEntry,
          data: {mid: missionId},
          success: function(result){
            onSuccessBeforeUpdateCounts()
            updateCounts(missionId)
          },
          dataType: 'json'
        });
      })
      $('#signup-or-done-inputs').html(btn)
    }

    this.notDoneCount = function(missionId){
      fetchNumberAndUpdate(backend.notDoneCount + missionId, '#not-done-entry-amount')
    }

    this.doneCount = function(missionId){
      fetchNumberAndUpdate(backend.doneCount + missionId, '#done-entry-amount')
    }
    //TODO: fetch both with one call
    function updateCounts(missionId) {
      self.notDoneCount(missionId); // update values
      self.doneCount(missionId);
    }
    
    function fetchNumberAndUpdate(url, selectorOfSpanToUpdate) {
      $.getJSON(url, function(result) {
        var num;
        if (result.result.data) {
          num = parseInt(result.result.data)
          if(!isNaN(num)) {
            $(selectorOfSpanToUpdate).text(num)
            $(selectorOfSpanToUpdate).parent().show()
          } else
            $(selectorOfSpanToUpdate).parent().hide()
        }
      })
    }

  });
  
  // Start the main application logic:    
  $(function() {
    app.run('#/');
  });
      
})(jQuery);
