module.exports = createBnObjectiveDb;

function createBnObjectiveDb(settings) {

  var mongoose = require('mongoose'),
      initMissionEntry = require('./MissionEntry.js'),
      initMission = require('./Mission.js');
    
  return {
    connect: function(host) {
      mongoose.connect(host);
      return {
        MissionEntry: initMissionEntry(mongoose, settings),
        Mission: initMission(mongoose, settings.mission)
      };
    }
  };
}