module.exports = initMissionEntry;

function initMissionEntry(mongoose, settings) {
  var schema = mongoose.Schema({
    missionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mission', required: true },
    userId: String, // Ip's can change and collisions can happen, so create random string and save into cookie and here?
    done: Boolean // when user participates in the mission, this is first set to false. On completion this is set to true.
  }),
      v = require("./commonValidators.js")
  
  schema.path('userId').validate(v.stringExists, 'userId is missing')

  schema.path('userId').validate(function (value) {
    if(value) // needed because the validation is not stopped even though the validation before failed
      return value.length <= 100
  }, 'userId is too long')

  return mongoose.model('MissionEntry', schema);
}

