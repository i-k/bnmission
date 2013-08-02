module.exports = initMission;

function initMission(mongoose, settings) {
  var schema = mongoose.Schema({
    name: String,
    description: String,
    image: { url: String, alt: String },
    startTime: Date,
    endTime: Date,
    tags: [String]
  });

  schema.path('name').validate(function (value) {
    return value && value.length > 0
  }, 'Name is missing')

  schema.path('name').validate(function (value) {
    return value.length <= settings.maxNameLength
  }, 'Name too long. Max ' + settings.maxNameLength + ' characters.')

  schema.path('description').validate(function (value) {
    return !value || value.length <= settings.maxDescriptionLength
  }, 'Description too long for mission. Max ' + settings.maxDescriptionLength + ' characters.')

  schema.path('tags').validate(function (value) {
    return value instanceof Array
  }, 'Malformed tags')

  schema.path('tags').validate(function (value) {
    return value.length <= settings.maxAmountOfTags
  }, 'Too many tags. Max ' + settings.maxAmountOfTags + ' tags.')

  schema.path('tags').validate(function (value) {
    return value.every(function(tag) {
      return tag.length <= settings.maxTagLength
    })
  }, 'Some tag is too long. Tag max length ' + settings.maxTagLength + ' characters.')
  
  return mongoose.model('Mission', schema);
};