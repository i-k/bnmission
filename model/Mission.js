module.exports = initMission;

function initMission(mongoose, settings) {
  var schema = mongoose.Schema({
    name: String,
    description: String,
    image: { url: String, alt: String },
    startTime: {
      type: Date,
      default: new Date()
    },
    endTime: {
      type: Date
     // default: couldn't get this to calculate its value from startTime, so call setEndTimeToStartTimeAndAddDays
    },
    tags: [String]
  }),
    model, // set below
    v = require("./commonValidators.js")
    
  schema.method('setEndTimeToStartTimeAndAddDays', function(days) {
    this.endTime = new Date(this.startTime)
    this.endTime.setDate(this.endTime.getDate() + (days || 7))
  })
  
  schema.method('parseTagsFromString', function(value) {
    return value.split(',').map(function(tag) { return tag.trim() })
  })
  
  schema.path('tags').set(function(value) {
    if(typeof value === 'string')
      return this.parseTagsFromString(value)
    return value
  })
  
  schema.path('name').validate(v.stringExists, 'Name is missing')
  //NOTE: Mongoose keeps validating even after the validations before failed, so null-checks are needed everywhere
  schema.path('name').validate(function (value) {
    if(value) 
      return value.length <= settings.maxNameLength
    // nothing is returned on purpose
  }, 'Name too long. Max ' + settings.maxNameLength + ' characters.')

  schema.path('description').validate(function (value) {
    return !value || value.length <= settings.maxDescriptionLength
  }, 'Description too long for mission. Max ' + settings.maxDescriptionLength + ' characters.')

  // mongooses setters automatically transform other types into a [type], so instanceof Array check is not needed
  schema.path('tags').validate(function (value) {
    return !!value // too hacky?
  }, "tags are missing")

  schema.path('tags').validate(function (value) {
    if(value)
      return value.length <= settings.maxAmountOfTags
  }, 'Too many tags. Max ' + settings.maxAmountOfTags + ' tags.')

  schema.path('tags').validate(function (value) {
    if(value)
      return value.every(function(tag) {
        return tag.length <= settings.maxTagLength
      })
  }, 'Some tag is too long. Tag max length ' + settings.maxTagLength + ' characters.')
  
  model = mongoose.model('Mission', schema)
  
  return model;
};