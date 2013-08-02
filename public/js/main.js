/*
 * Initialize the application by loading the required modules
 *   Note: for Handlebars.js use https://github.com/SlexAxton/require-handlebars-plugin
 */
requirejs.config({
  baseUrl: 'js',
  paths: {
    "i18nprecompile": "lib/i18nprecompile",
    "json2": "lib/json2",
    "handlebars": "lib/handlebars",
    "underscore": "lib/underscore",
    "bootstrap": "lib/bootstrap",
    "jquery": "lib/jquery",
    "fixedmenu": "lib/jquery.fixheadertable"
  },
  
  shim: {
    enforceDefine: true,
    'lib/jquery': {
      exports: '$'
    },
    'lib/underscore': {
     exports: '_' // global value for underscore
    },
    'bootstrap': {
     deps: ['jquery'],
     exports: '$.fn.popover'
    },
    'fixedmenu': {
     deps: ['jquery'],
     exports: '$.fn.fixheadertable'
    },
    "lib/bootstrap-alert": ["jquery"],
    "lib/bootstrap-dropdown": ["jquery"],
    "lib/bootstrap-tooltip": ["jquery"]
  }
});

// Start the main app logic.
define(['js/view/Frontpage.js', /*, 'http://localhost:8080/socket.io/socket.io.js'*/
        'lib/jquery'
       ],
  function(Frontpage, $) {
/*var socket = io.connect('http://localhost:8080')
  socket.on('news', function (data) { console.log(data) }) */
    var db = (function() {
      var missions = [
        ["Käy marjaretkellä metsässä",
         "Kävelyn ja luonnossa liikkumisen on tutkitusti todettu auttavan muun muassa masennukseen, nivelvaivoihin, ... (lähteet)",
         { url: "http://31.media.tumblr.com/tumblr_m7iwk6veKz1qm06i2o1_500.jpg", alt: "Metsä" },
         ["terveys", "luonto", "kävely"]],
        ["Valkoiset jauhot",
         "Tehtävänä on pitäytyä poissa valkoisista jauhoista tehdyistä elintarvikkeista. Tällaisia ovat mm. vaaleat leivät, pasta, pizzat ja hampurilaiset. Valkoinen jauho nostaa insuliinin tason nopeasti korkealle",
         { url: "http://31.media.tumblr.com/93fc9c743131174f2daecbc03503eb82/tumblr_mqw0ucuTPf1saiotro1_500.jpg", alt: "Vaaleaa leipää" },
         ["ruoka"]]
       ].map(function(e) { 
         return createMissionWithRandomEntries(
           { name: e[0], description: e[1], image: e[2], tags: e[3] }
         );
       }),
          mission;
      
      return {
        fetchMissionByDate: function(date, onFound) {
          if(!mission)
            mission = missions[Math.floor(Math.random() * missions.length)];
          onFound(mission);
        },
        createEntry: function(userId) {
          if(mission)
            return createEntry(mission.id, userId);
          else
            return null;
        },
        saveEntry: function(e) {
          mission.entries.push(e);
        },
        fetchEntry: function(userId, missionId, onFound, onNotFound) {
          if(mission) {
            var found = mission.entries.filter(function(e) {
              return e.userId === userId && e.missionId === missionId;
            });
            if(found.length > 0)
              onFound(found[0]);
            else
              onNotFound();
          }
        },
        getUserId: getUserId
      };
    })();
    
    $.support.cors = true
    $.ajaxSetup({cache: false}) // For Internet Explorer. If this is not set, all Ajax-requests hit the cache.

    // show the '#loading' element when ajaxStart, and hide it when ajaxComplete
    $("#loading").on('ajaxStart', function(){
      $(this).show()
    }).on('ajaxComplete', function(){
      $(this).hide()
    })

    function createMissionWithRandomEntries(data) {
      var entries = [],
          missionId = Math.floor(Math.random() * 10),
          entryAmount = Math.floor(Math.random() * 100),
          i;
      for(i = 0; i < entryAmount; ++i)
        entries.push(createEntry(missionId, i));
      return $.extend(data, {
        entries: entries,
        notDoneEntries: function() {
          return entries.filter(function(e) { return !e.done; });
        },
        doneEntries: function() {
          return entries.filter(function(e) { return e.done; });
        }
      });
    }
    
    function createEntry(missionId, userId) {
      return {
        missionId: missionId,
        userId: (userId || getUserId()),
        done: false
      };
    }
    
    function getUserId() {
      return getUserAgentString();  
    }
    
    // the objects (like plugins) are not currently descended into. Should they be?
    function getUserAgentString() {
      var userAgentVars = [
        "appCodeName",
        "appName",
        "appMinorVersion",
        "cpuClass",
        "platform",
        "plugins",
        "opsProfile",
        "userProfile",
        "systemLanguage",
        "userLanguage",
        "appVersion",
        "userAgent",
        "onLine",
        "cookieEnabled",
        "mimeTypes"];
      return userAgentVars.reduce(function(prev, cur) {
        return (window.navigator[prev] || "") + " " + (window.navigator[cur] || "");
      });
    }
    
    Frontpage.initialize(db);
  }
)