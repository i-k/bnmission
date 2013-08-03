// NOTE: saving mission entries is yet untested!

var express = require('express'),
    request = require('request'),
    settings = require('./settings.js'),
    db = require('./model/db.js')(settings), // settings for validations of the models
    models = db.connect(settings.mongoHost),
    Mission = models.Mission,
    MissionEntry = models.MissionEntry;

var app = express()

app.use(express.bodyParser()) // to parse POSTs in JSON
app.use(express.static(__dirname + '/public'))

// CORS-headers (Cross Origin ResourceS) allow AJAX-requests from other hosts 
function setCORSHeaders(res){
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Methods", "DELETE, PATCH, PUT, HEAD, OPTIONS, GET, POST")
  res.setHeader("Access-Control-Allow-Headers", "Overwrite, Destination, Content-Type, Depth, User-Agent, X-File-Size, X-Requested-With, If-Modified-Since, X-File-Name, Cache-Control")
}

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

  if (tags){
    var tagsArray = tags.split(',').map(function(tag){return tag.trim()})
    query.tags = {$all: tagsArray}     
  }

  if (startDate)
    query.startDate = {$gte: startDate}

  if (endDate)
    query.endDate = {$lte: endDate}

  console.log(query)

  Mission.find(query, writeDocOnDbQuerySuccess(res))
})

// count all mission entries for given parameters.
// Count is done either by mission id or tags, start-date and end-date
app.get('/api/count-mission-entries', function(req, res) {
  var missionId = req.param.mid
    , tags = req.param.tags
    , startDate = req.query["start-date"]
    , endDate = req.query["end-date"]
    , query = {}
    
  if (missionId) {
    query.missionId = missionId
  } else {
    if (tags){
      var tagsArray = tags.split(',').map(function(tag){return tag.trim()})
      query.tags = {$all: tagsArray}     
    }
    
    if (startDate)
      query.startDate = {$gte: startDate}
    
    if (endDate)
      query.endDate = {$lte: endDate}
  }
  MissionEntry.count(query, writeDocOnDbQuerySuccess(res))
})

// to save the entry for given mission
// WARNING: yet untested!
app.post('/api/mission-entry', function(req, res) {
  var userIp = req.headers['X-Forwarded-For'] || req.connection.remoteAddress
    , missionId = req.body.missionId

  Mission.findById(missionId, onDbQuerySuccess(res, function(doc) {
      // check that the endDate is within x days interval (here x = 3 days).
      var today = new Date()
        , todayMinus3Days = new Date(today)
      todayMinus3Days.setDate(-3)
      if (doc.endDate > todayMinus3Days) {
        // find existing entry and update it (done=true), or create new (done=false)
        MissionEntry.findOne({ missionId: missionId, userId: userIp}, onDbQuerySuccess(res, function(entry) {
          if(entry) {
            if(entry.done) {
              writeResult(res, 412, 'failed', 'Mission entry is already done') 
            } else {
              entry.done = true
              entry.save(function(err) {
                if(err)
                  return writeResult(res, 500, 'error', err)
                else
                  writeResult(res, 200, 'success', 'Updated mission entry as done')
              })
            }
          } else { // create new
              var newMissionEntry = new MissionEntry({ missionId: missionId,
                                                     userId: userIp,
                                                     done: false
                                                   })

              newMissionEntry.save(function(err){
                if (err){
                  console.log(err)
                  return writeResult(res, 500, "Error: " + err)
                } else {
                  return writeResult(res, 201, 'created', newMissionEntry)
                }
              })
          }
        }))
      } else
        writeResult(res, 412, 'failed', 'Cannot save: mission is too old')
  }))
})

app.listen(settings.appPort)

console.log('BNMission listening on port ' + settings.appPort)
