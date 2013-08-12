// Goal has been to keep this small, not bothering with Backbone etc.
(function($) {
  // so descriptions newlines make sense
  Handlebars.registerHelper('breaklines', function(text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.toString();
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
  });
  
  var app = $.sammy('#main', function() {
    var source   = $("#mission-template").html()
      , template = Handlebars.compile(source)
      , backendApiRoot = "http://localhost:8080/api/"
      , backend = {
        missionsBySeekdate: backendApiRoot + "mission?seek-date=",
        mission: backendApiRoot + "mission", // not used at the moment
        notDoneCount: backendApiRoot + "count-mission-entries?done=false&mid=",
        doneCount: backendApiRoot + "count-mission-entries?done=true&mid=",
        getMissionEntry: backendApiRoot + "mission-entry?mid=",
        postMissionEntry: backendApiRoot + "mission-entry",
        getScore: backendApiRoot + "points"
      }
      , today = new Date()
      , year = (today.getYear() + 1900).toString()
      , month = (today.getMonth() + 1).toString()
      , day = today.getDate().toString()
      , dateStr = year + '-' + month + '-' + day
      , self = this
      , currentMission
      , tags = ["urheilu", "ruoka", "terveys"]
      , missionsByTag = { }
      , missionsAreFetched = false
      , activeTag = getActiveTag();
      
    $.each(tags, function(i, tag) {
      $("#menu li a").click(function() {
         window.location.href = '#/tags/' + $(this).text().toLowerCase()
         $("#menu .active").removeClass("active")
         $(this).parent().addClass("active")
      })
    })
    
    fillMissionsByTagFrom([])
    fetchAndSetTodaysMissions()
    
    function fillMissionsByTagFrom(missions) {
      $.each(tags, function(i, tag) {
        missionsByTag[tag] = missions.filter(function(m) {
          return m.tags.indexOf(tag) !== -1
        })
      })
      console.log(missionsByTag)
    }
    
    function fetchAndSetTodaysMissions() {
      var missionUrl = backend.missionsBySeekdate + dateStr
      $.getJSON(missionUrl, function(result){
        if (result.result.data) {
          fillMissionsByTagFrom(result.result.data)
          missionsAreFetched = true
          
          renderEditMission(getActiveTag()) //renderCurrentMission() TODO: remember to change back to this
        }
      })
    }

    function renderMissionTagged(tag) {
      if(missionsAreFetched) {
        var foundMissions = missionsByTag[tag];
        if(foundMissions.length > 0)
          renderMission(foundMissions[0])
        else
          $('#main').html('<div class="text-failure" style="padding: 5%; background: pink;"><h3>Haastetta ei löytynyt. Yritä myöhemmin uudestaan!</h3></div>');
      }
    }
    
    function renderMission(mission) {
      $('#main').html(template(mission));
      self.updateScore();
      updateCounts(mission._id);
      self.signUpOrDone(mission._id);
    }
    
    function renderCurrentMission() {
      renderMissionTagged(getActiveTag())
    }
    
    function getActiveTag() { return activeTag || $("#menu li.active a").text().toLowerCase() }

    this.get('#/', function(context) {
      context.log('Rendering frontpage');
      renderMissionTagged(tags[0])
    })

    this.get('#/tags/:name', function(context) {
      context.log('Rendering by tagname ' + this.params.name)
      activeTag = this.params.name
      renderMissionTagged(activeTag)
    })
    
    this.get('#/muokkaa/:tag', function(context) {
      activeTag = this.params.name
      renderEditMission(activeTag)
    })
 
    this.updateScore = function() {
      fetchNumberAndUpdate(backend.getScore, '#points-value')
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
    // TODO: remember to get rid of this
    function renderEditMission(missionTag) {
      var mission = { },
          tag = missionTag || getActiveTag(),
          foundMissions = missionsByTag[tag],
          submitBtn = $("<button class='save-mission btn btn-success' type='submit'>Save</button>");
      
      if(missionsAreFetched && foundMissions.length > 0) {
        mission = foundMissions[0];
      }
      
      $('#main').html(template(mission));
      function editable(sel) { $("#main " + sel).attr("contenteditable", "true") }
      [".name", ".description", ".img-src"].map(function(sel) {
        editable(sel);
      })
      submitBtn.click(function() {
        function txt(sel) { return $("#main " + sel).html().toString().split('<br>').join('\n'); }
        mission.name = txt(".name");
        mission.description = txt(".description");
        mission.image = { src: $("#main img").attr("src"), alt: $("#main img").attr("alt") };
        mission.tags = mission.tags || [];
        if(mission.tags.indexOf(tag) === -1)
          mission.tags.push(tag)
        $.ajax({
          type: "POST",
          url: backend.mission,
          data: mission,
          success: function(d){
            console.log("saved!");
            console.log(d.result.data);
          },
          dataType: 'json'
        });
      })
      $('#main').append(submitBtn);
    }

  });
  
  // Start the main application logic:    
  $(function() {
    app.run('#/');
  });
      
})(jQuery);
