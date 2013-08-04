var chai = require("chai"),
    should = chai.should(),
    settings = require("../../settings.js").mission,
    Mission = require("../../model/Mission.js")(require("mongoose"), settings)

describe("Mission", function() {
  describe("#validate()", function() {
    it("should not complain on valid values", function(done) {
      var mission = new Mission({
        name: "test"
      });
      mission.validate(function(err) {
        should.not.exist(err)
        done()
      })
    })
    it("should complain when name is empty", nameValidationShouldFail(""))
    it("should complain when name is null", nameValidationShouldFail(null))
    it("should complain when name is undefined", nameValidationShouldFail(undefined))
    it("should complain when name is too long", function(done) {
      var name = ""
      for(var i = 0; i < settings.maxNameLength + 1; i = i + 4)
        name = name + "test"
      nameValidationShouldFail(name)(done)
    })
    
    it("should complain when tags are null", function(done) {
      var mission = new Mission({ name: "t", tags: null })
      mission.validate(function(err) {
        should.exist(err)
        err.errors.tags.should.exist
        done()
      })
    })
    
    function nameValidationShouldFail(name) {
      return function(done) {
        new Mission({ name: name }).validate(function(err) {
          should.exist(err)
          err.errors.name.should.exist
          done()
        })
      }
    }
  })
  describe("#tags", function() {
    it("should parse an Array from String", function() {
      var mission = new Mission({ name: "t", tags: "this,should, work" })
      mission.tags[0].should.equal("this")
      mission.tags[1].should.equal("should")
      mission.tags[2].should.equal("work")
    })
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