var express = require('express'),
    settings = require('./settings.js'),
    db = require('./model/db.js')(settings), // settings for validations of the models
    models = db.connect(settings.mongoHost),
    Mission = models.Mission,
    MissionEntry = models.MissionEntry,
    ObjectId = require('mongoose').Types.ObjectId

var app = express()

app.use(express.bodyParser()) // to parse POSTs in JSON
app.use(express.static(__dirname + '/public'))

// A little helper function for writing results in dry-manner.
function writeResult(res, status, message, data){
  res.writeHead(status, {"Content-Type": "application/json"})
  res.write(
    JSON.stringify({ 
      result: {
        status: status,
        message: message,
        data: data
      }
    })
  )
  res.end()
}

function writeDocOnDbQuerySuccess(res) {
  return onDbQuerySuccess(res, function(doc) {
    writeResult(res, 200, 'success', doc)
  })
}

function onDbQuerySuccess(res, onSuccess) {
  return function(err, doc) {
    if (err)
      writeResult(res, 500, 'error', err)
    else
      onSuccess(doc)
  }
}

function onDbQueryFound(res, onSuccess) {
  return onDbQuerySuccess(res, function(doc) {
    if (doc)
      onSuccess(doc)
    else
      writeResult(res, 404, 'not found')
  })
}

// fetch single mission by mission id
app.get('/api/mission/:id', function(req, res) {
  Mission.findById(req.param.id, writeDocOnDbQuerySuccess(res))
})

// list missions filtered by date and tags parameters
app.get('/api/mission', function(req, res) {
  var tags = req.query["tags"]
    , startDate = req.query["start-date"]
    , endDate = req.query["end-date"]
    , query = {}

  if (tags) {
    query.tags = {$all: Mission.parseTagsFromString(tags)}
  }

  if (startDate) 
    query.startTime = {$gte: startDate}

  if (endDate)
    query.endTime = {$lte: endDate}

  console.log(query)

  Mission.find(query, writeDocOnDbQuerySuccess(res))
})

// list active missions by seekdate (seekdate usually is the current date)
app.get('/api/missions-by-seekdate', function(req, res) {
  var tags = req.query["tags"]
    , seekDate = req.query["seek-date"]
    , query = {}

  if (tags) {
    tagsArray = tags.split(',').map(function(tag) { return tag.trim() })
    query.tags = {$all: tagsArray}
  }

  if (seekDate) {
    query.startTime = {$lte: seekDate}
    query.endTime = {$gte: seekDate}
    console.log(query)
    Mission.find(query, writeDocOnDbQuerySuccess(res))
  } else {
    return writeResult(res, 412, "Missing seekdate", null)
  }

})

// get mission entry by user, if exists
app.get('/api/mission-entry', function(req, res) {
  var missionId = req.query["mid"],
      userIp = req.headers['X-Forwarded-For'] || req.connection.remoteAddress
  console.log('Searching: ' + missionId + ', ' + userIp)
  MissionEntry.findOne({missionId: new ObjectId(missionId), userId: userIp}, writeDocOnDbQuerySuccess(res))
})

// count all mission entries for given parameters.
app.get('/api/count-mission-entries', function(req, res) {
  var missionId = req.query["mid"]
    , tags = req.query["tags"]
    , startDate = req.query["start-date"]
    , endDate = req.query["end-date"]
    , done = req.query["done"]
    , query = {}

  if (missionId) {
    query.missionId = missionId
  }

  if (tags){
    query.tags = {$all: Mission.parseTagsFromString(tags)}
  }

  if (done) {
    if (done === 'true' || done === '1')
      query.done = true
    else
      query.done = false
  }
    
  if (startDate)
    query.startTime = {$gte: startDate}
    
  if (endDate)
    query.endTime = {$lte: endDate}

  console.log(query)
  MissionEntry.count(query, writeDocOnDbQuerySuccess(res))
})

// to save the entry for given mission
app.post('/api/mission-entry', function(req, res) {
  var userIp = req.headers['X-Forwarded-For'] || req.connection.remoteAddress
    , missionId = req.body.mid
  
  if (!missionId)
    return writeResult(res, 412, 'failed', 'Cannot save: no mission id given')

  Mission.findById(missionId, onDbQueryFound(res, function(doc) {
      // check that the endDate is within x days interval (here x = 3 days).
      var today = new Date()
        , threeDaysAgo = new Date(today)

      threeDaysAgo.setDate(threeDaysAgo.getDate() -3)

      // if the endTime doesn't exist, it is interpreted as an ongoing mission
      if (!doc.endTime || doc.endTime > threeDaysAgo) {
        // find existing entry and update it (done=true), or create new (done=false)
        MissionEntry.findOne({ missionId: missionId, userId: userIp}, onDbQuerySuccess(res, function(entry) {
          if (entry) {
            if (entry.done) {
              writeResult(res, 412, 'failed', 'Mission entry is already done')
            } else {
              entry.done = true
              entry.save(onDbQuerySuccess(res, function() {
                writeResult(res, 200, 'success', 'Updated mission entry as done')
              }))
            }
          } else { // create new
            var newMissionEntry = new MissionEntry({
              missionId: missionId,
              userId: userIp,
              done: false
            })

            newMissionEntry.save(onDbQuerySuccess(res, function() {
              return writeResult(res, 201, 'created', newMissionEntry)
            }))
          }
        }))
      } else
        writeResult(res, 412, 'failed', 'Cannot save: mission is too old')
  }))
})

app.listen(settings.appPort)

console.log('BNMission listening on port ' + settings.appPort)
