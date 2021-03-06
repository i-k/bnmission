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
      writeResult(res, 200, 'not found')
  })
}

// fetch single mission by mission id
app.get('/api/mission/:id', function(req, res) {
  Mission.findById(req.param.id, writeDocOnDbQuerySuccess(res))
})

// list missions filtered by date and tags parameters
// returns missions that are active between from-date and to-date, i.e.
// missions that have their endTimes between from-date and to-date
app.get('/api/mission', function(req, res) {
  var fromDate = req.query["from-date"]
    , toDate = req.query["to-date"]
    , query = {}

  if (fromDate) {
    if (toDate)
      query.endTime = { $gte: fromDate, $lte: toDate }
    else
      query.endTime = { $gte: fromDate }
  } else if (toDate)
    query.endTime = { $lte: toDate }

  missionByTagsAndTimeQuery(req, res, query)
})

app.post('/api/mission', function(req, res) {
  var id = req.body['_id'];
  
  if(id) {
    Mission.findById(id, onDbQueryFound(res, function(mission) {
      mission.set(req.body).save(writeDocOnDbQuerySuccess(res));
    }))
  } else {
    console.log("Creating mission")
    new Mission().set(req.body).save(writeDocOnDbQuerySuccess(res))
  }
})

// list active missions by seekdate (seekdate usually is the current date)
app.get('/api/missions-by-seekdate', function(req, res) {
  var seekDate = req.query["seek-date"]
    , query = {}

  if (seekDate) {
    query.startTime = {$lte: seekDate}
    query.endTime = {$gte: seekDate}
    missionByTagsAndTimeQuery(req, res, query)
  } else {
    return writeResult(res, 412, "Missing seekdate", null)
  }
})

function missionByTagsAndTimeQuery(req, res, timeQuery) {
  var tags = req.query["tags"]

  if (tags)
    timeQuery.tags = {$all: Mission().parseTagsFromString(tags) }
    
  console.log(timeQuery)
  Mission.find(timeQuery, writeDocOnDbQuerySuccess(res))
}

// get mission entry by user, if exists
app.get('/api/mission-entry', function(req, res) {
  var missionId = req.query["mid"],
      userIp = getUserIp(req)
  console.log('Searching: ' + missionId + ', ' + userIp)
  MissionEntry.findOne(
    {missionId: new ObjectId(missionId), userId: userIp},
    onDbQueryFound(res, function(doc) {
      writeResult(res, 200, 'success', { done: doc.done })
    })
  )
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
    query.tags = {$all: Mission().parseTagsFromString(tags)}
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

function getUserIp(req) {
  return req.header('x-forwarded-for') || req.headers['X-Forwarded-For'] || req.connection.remoteAddress
}

// get user's points, which equal how many missions he/she has completed
app.get('/api/points', function(req, res) {
  MissionEntry.count({done: true, userId: getUserIp(req)}, writeDocOnDbQuerySuccess(res))
})

// to save the entry for given mission
app.post('/api/mission-entry', function(req, res) {
  var userIp = getUserIp(req)
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
              return writeResult(res, 201, 'New mission entry created')
            }))
          }
        }))
      } else
        writeResult(res, 412, 'failed', 'Cannot save: mission is too old')
  }))
})

app.listen(settings.appPort)

console.log('BNMission listening on port ' + settings.appPort)
