var chai = require("chai"),
    should = chai.should(),
    settings = require("../../settings.js").mission,
    Mission = require("../../model/Mission.js")(require("mongoose"), settings)

describe("Mission", function() {
  describe("#validate()", function() {
    it("should not complain on valid values", function(done) {
      var today = new Date()
      var mission = new Mission({
        name: "test"
      });
      mission.validate(function(err) {
        should.not.exist(err)
        done()
      })
    })
    it("should complain when name is empty", function(done) {
      nameValidationShouldFail("", done)
    })
    it("should complain when name null", function(done) {
      nameValidationShouldFail(null, done)
    })
    it("should complain when name is undefined", function(done) {
      nameValidationShouldFail(undefined, done)
    })
    it("should complain when name is too long", function(done) {
      var name = ""
      for(var i = 0; i < settings.maxNameLength + 1; i = i + 4)
        name = name + "test"
      nameValidationShouldFail(name, done)
    })
    
    function nameValidationShouldFail(name, done) {
      new Mission({ name: name }).validate(function(err) {
        should.exist(err)
        err.errors.name.should.exist
        done()
      })
    }
  })
  describe("#setEndTimeToStartTimeAndAddDays", function() {
    it("should fill endTime from startTime", function() {
      var firstOfMonth = new Date(),
          daysToAdd = 7
      firstOfMonth.setDate(1)
      var mission = new Mission({
        name: "test",
        startTime: firstOfMonth
      });
      mission.setEndTimeToStartTimeAndAddDays(daysToAdd)
      should.exist(mission.endTime)
      mission.endTime.getDate().should.equal(1 + daysToAdd)
    })
  })
})