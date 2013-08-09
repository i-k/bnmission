// TODO: refactor this into some nicer form or rewrite?

// Define an anonymous module:
(function($) {

  // Load Handlebars mission-template
  var source   = $("#mission-template").html()
    , template = Handlebars.compile(source)
    , backendApiRoot = "http://localhost:8080/api/";

  var backend = {
    mission: backendApiRoot + "mission",
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
      // load active mission with Ajax-request:
      var today = new Date()
        , year = (today.getYear() + 1900).toString()
        , month = (today.getMonth() + 1).toString()
        , day = today.getDate().toString()
        , dateStr = year + '-' + month + '-' + day

      self.getMissionByDate(dateStr)
    });

    this.get('#/tags/:name', function(context) {
      context.log('Rendering by tagname ' + this.params.name);
      // TODO: add categories!
    });

    this.getMissionByDate = function(seekDate) {
      var missionUrl = backend.mission + '?date=' + seekDate
      $.getJSON(missionUrl, function(result){
        // fill the mission-template with mission details (=render)
        if (result.result.data) {
          var context = result.result.data[0]
            , html = template(context);
          $('#main').html(html)

          self.notDoneCount(context._id);
          self.doneCount(context._id);
          self.signUpOrDone(context._id);

        } else {
          $('#main').html('An error occured, please try reloading the page')
        }
      })
    }

    this.signUpOrDone = function(missionId){
      var getMissionEntryUrl = backend.getMissionEntry + missionId
      $.getJSON(getMissionEntryUrl, function(result){
        if (typeof result.result.data !== 'undefined') {
          if (result.result.data !== null){
            var userHasCompletedMission = result.result.data.done
              , button = null
            if (!userHasCompletedMission) {
              self.createButtonMarkDone(missionId)
            } else {
              $('#signup-or-done-inputs').html('<h3 class="text-success">Olet suorittanut tämän haasteen</h3>')
            }
          } else {
              self.createButtonParticipate(missionId)
          }
        }
      })    
    }

    this.createButtonParticipate = function(missionId){
      buttonParticipate = document.createElement('button')
      buttonParticipate.setAttribute('id', 'participate')
      buttonParticipate.setAttribute('class', 'btn btn-primary')
      var t = document.createTextNode('Osallistun haasteeseen!');
      buttonParticipate.onclick = function(){
        // post backend new entry:
        $.ajax({
          type: "POST",
          url: backend.postMissionEntry,
          data: {missionId: missionId},
          success: function(result){
            self.createButtonMarkDone(missionId) // update with next button
            self.notDoneCount(missionId); // update values
            self.doneCount(missionId);
          },
          dataType: 'json'
        });
      }
      buttonParticipate.appendChild(t);
      $('#signup-or-done-inputs').html(buttonParticipate)
    }

    this.createButtonMarkDone = function(missionId){
      buttonMarkDone = document.createElement('button')
      buttonMarkDone.setAttribute('id', 'mark-done')
      buttonMarkDone.setAttribute('class', 'btn btn-success')
      var t = document.createTextNode('Sain haasteen suoritettua!');
      buttonMarkDone.onclick = function(){
        // post backend new entry:
        $.ajax({
          type: "POST",
          url: backend.postMissionEntry,
          data: {missionId: missionId},
          success: function(result){
            $('#signup-or-done-inputs').html('<h2 class="text-success">Hyvin tehty!</h2>')
            self.notDoneCount(missionId); // update values
            self.doneCount(missionId);
          },
          dataType: 'json'
        });
      }
      buttonMarkDone.appendChild(t);
      $('#signup-or-done-inputs').html(buttonMarkDone)
    }

    this.notDoneCount = function(missionId){
      // Fetch the not done count and render it:
      var notDoneCountUrl = backend.notDoneCount + missionId
      $.getJSON(notDoneCountUrl, function(result){
        if (typeof result.result.data !== 'undefined') {
          var notDoneCount = result.result.data.toString()
          $('#not-done-entry-amount').html(notDoneCount)
        }
      })
    }

    this.doneCount = function(missionId){
      // Fetch the not done count and render it:
      var doneCountUrl = backend.doneCount + missionId
      $.getJSON(doneCountUrl, function(result){
        if (typeof result.result.data !== 'undefined') {
          var doneCount = result.result.data.toString()
          $('#done-entry-amount').html(doneCount)
        }
      })
    }

  });
  
  // Start the main application logic:    
  $(function() {
    app.run('#/');
  });
      
})(jQuery);
