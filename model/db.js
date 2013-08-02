module.exports = createBnObjectiveDb;

function createBnObjectiveDb(settings) {

  var mongoose = require('mongoose'),
      initEntry = require('./Entry.js'),
      initMission = require('./Mission.js');
    
  return {
    connect: function(host) {
      mongoose.connect(host);
      return {
        Entry: initEntry(mongoose, settings),
        Mission: initMission(mongoose, settings.mission)
      };
    }
  };
}