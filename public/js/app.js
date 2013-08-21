// Goal has been to keep this small, not bothering with Backbone etc.
(function($) {
  // so descriptions newlines make sense
  Handlebars.registerHelper('breaklines', function(text) {
    text = Handlebars.Utils.escapeExpression(text);
    text = text.toString();
    text = text.replace(/(\r\n|\n|\r)/gm, '<br>');
    return new Handlebars.SafeString(text);
  });

  $.support.cors = true
  $.ajaxSetup({cache: false}) // For Internet Explorer. If this is not set, all Ajax-requests hit the cache.
  
  var app = $.sammy('#main', function() {
    var source   = $("#mission-template").html()
      , template = Handlebars.compile(source)
      , sourceUrl = window.location.protocol + "//" + window.location.host
      , backendApiRoot = sourceUrl + "/api/"
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
    
    function fillMissionsByTagFrom(missions) {
      $.each(tags, function(i, tag) {
        missionsByTag[tag] = $(missions).filter(function(i, m) {
          return $.inArray(tag, m.tags) !== -1
        }).map(function(i, m) {
          m.mainTag = tag
          return setSocialUrl(m, tag)
        }).toArray()
      })
      console.log(missionsByTag)
    }
    
    function fetchAndSetTodaysMissions(renderOnSuccess) {
      var missionUrl = backend.missionsBySeekdate + dateStr
      $.getJSON(missionUrl, function(result){
        if (result.result.data) {
          fillMissionsByTagFrom(result.result.data)
          missionsAreFetched = true
          renderOnSuccess()
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
    // lists all the main tags' missions in #main
    function renderAllMissions() {
      var foundMissions, mission;
      $('#main').empty();
      $.each(tags, function(i, tag) {
        foundMissions = missionsByTag[tag];
        if(foundMissions.length > 0) {
          mission = foundMissions[0];
          $('#main').append(template(mission));
          updateCounts(mission._id);
          self.signUpOrDone(mission._id);
        }
      });
      if($('#main').children().size() === 0)
        $('#main').html('<div class="text-failure" style="padding: 5%; background: pink;"><h3>Haasteita ei löytynyt. Yritä myöhemmin uudestaan!</h3></div>');
    }
    
    function getActiveTag() { return activeTag || $("#menu li.active a").text().toLowerCase() }
    
    // lists all the main tags' missions
    this.get('#/', function(context) {
      if(missionsAreFetched)
        renderAllMissions()
      else
        fetchAndSetTodaysMissions(renderAllMissions)
    })

    this.get('#/tags/:name', function(context) {
      activeTag = this.params.name
      if(missionsAreFetched)
        renderMissionTagged(activeTag)
      else
        fetchAndSetTodaysMissions(function() { renderMissionTagged(activeTag) })
    })
    
    this.get('#/muokkaa/:name', function(context) {
      activeTag = this.params.name
      if(missionsAreFetched)
        renderEditMission(activeTag)
      else
        fetchAndSetTodaysMissions(function() { renderEditMission(activeTag) })
    })
 
    this.updateScore = function() {
      fetchNumberAndUpdate(backend.getScore, '#points-value')
    }

    this.signUpOrDone = function(missionId){
      var getMissionEntryUrl = backend.getMissionEntry + missionId
      $.getJSON(getMissionEntryUrl, function(result){
        console.log(result)
        if (result.result.data) {
          console.log(result.result.data)
          if (!result.result.data.done) {
            self.createButtonMarkDone(missionId)
          } else {
            $('#' + missionId + ' .signup-or-done-inputs').html('<h3 class="text-success">Olet suorittanut tämän haasteen!</h3>')
          }
        } else {
          self.createButtonParticipate(missionId)
        }
      }).fail(function() {
        self.createButtonParticipate(missionId)
      })
    }

    this.createButtonParticipate = function(missionId){
      var btn = $("<button class='btn btn-primary'>Osallistun haasteeseen!</button>")
      initAndRenderPostMissionEntryBtn(btn, missionId, function() {
        self.createButtonMarkDone(missionId) // update with next button
      })
    }

    this.createButtonMarkDone = function(missionId){
      var btn = $("<button class='btn btn-success'>Sain haasteen suoritettua!</button>")
      initAndRenderPostMissionEntryBtn(btn, missionId, function() { 
        $('#' + missionId + ' .signup-or-done-inputs').html('<h2 class="text-success">Hyvin tehty!</h2>')
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
      $('#' + missionId + ' .signup-or-done-inputs').html(btn)
    }

    this.notDoneCount = function(missionId){
      fetchNumberAndUpdate(backend.notDoneCount + missionId, '#' + missionId + ' .not-done-entry-amount')
    }

    this.doneCount = function(missionId){
      fetchNumberAndUpdate(backend.doneCount + missionId, '#' + missionId + ' .done-entry-amount')
    }
    //TODO: fetch both with one call
    function updateCounts(missionId) {
      self.notDoneCount(missionId);
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
    
    var rootUrl = encodeURIComponentStrict(sourceUrl)
    function setSocialUrl(mission, tag) {
      mission.socialUrl = rootUrl + encodeURIComponentStrict("/#/tags/" + tag)
      return mission
    }
    
    function encodeURIComponentStrict(s) {
      return encodeURIComponent(s).replace(/[+]/g, "%20");
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
        mission.description = $("#main .description").text();
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
    app.run(document.location.hash || '#/');
  });
      
})(jQuery);
