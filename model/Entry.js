module.exports = initEntry;

function initEntry(mongoose, settings) {
  var schema = mongoose.Schema({
    missionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Mission' },
    userId: String, // Ip's can change and collisions can happen, so create random string and save into cookie and here?
    //ipAddresses: [String],
    done: Boolean
  });
  
  schema.path('userId').validate(function (value) {
    return value && value.length > 0
  }, 'userId is missing')

  return mongoose.model('Entry', schema);
}

