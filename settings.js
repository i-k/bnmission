module.exports = new Settings()

function Settings(){

    // returns .mongoHost from the file given by the settings path
    // returns orUseThisHost if the file was not found or if some other error occurred
    function getMongoHostFromSettingsPathOr(pathToMongoSettings, orUseThisHost) {
      var mongoHost;
      try {
        mongoHost = require(pathToMongoSettings).mongoHost;
      } catch(err) {
        console.log(err);
      }
      return mongoHost || orUseThisHost;
    }

  this.appPort = process.env.PORT || 8080,
  this.mongoHost = getMongoHostFromSettingsPathOr('./mongoSettings.js', 'localhost')
  this.mission = {
    maxNameLength: 200,
    maxAmountOfTags: 10,
    maxTagLength: 50,
    maxDescriptionLength: 20000
  }
}