var chai = require("chai"),
    should = chai.should(),
    settings = require("../../settings.js").mission,
    Mission = require("../../model/Mission.js")(require("mongoose"), settings)

describe('Mission', function() {
  describe('#validate()', function() {
    it('should not complain on valid values', function() {
      var today = new Date()
      var mission = new Mission({
        name: "test",
        startTime: today
      });
      mission.validate(function(err) {
        should.not.exist(err)
      })
    })
    it('should complain when name is not present or is too long', function() {
      var mission = new Mission({
        name: ""
      })
      function validationShouldFail() {
        mission.validate(function(err) {
          should.exist(err)
          err.errors.name.should.exist
        })
      }
      validationShouldFail();
      mission.name = null
      validationShouldFail();
      mission.name = undefined
      validationShouldFail();
      
      for(var i = 0; i < settings.maxNameLength + 1; i = i + 4)
        mission.name = mission.name + "test"
      validationShouldFail()
    })
  })
})