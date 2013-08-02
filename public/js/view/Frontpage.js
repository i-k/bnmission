define(['lib/handlebars', 
        'lib/jquery',
        'lib/text!../../../template/mission.hbs'],
       function(Handlebars, $, missionHtml) {
         
  //TODO: fetch only amount of entries and the current ip's entry
  
  var missionTemplate = Handlebars.compile(missionHtml),
      mission,
      db,
      userId;
  
  Handlebars.registerHelper('funcLen', function(func, options) {
    return func().length;
  });
      
  function render() {
    $("#mission").html(missionTemplate(mission));
  }
  // shows either a button for signing up for the mission or,
  // if the user has already signed up, a button for setting the mission as done
  function showSignUpInput() {
    $("#signup-or-done-inputs").html(renderSignUpInput());
  }
  
  function showDoneOrInput(entry) {
    if(entry.done)
      html = renderDone();
    else 
      html = renderDoneInput(entry);
    $("#signup-or-done-inputs").html(html);
  }
  
  function renderSignUpInput() {
    var button = btn("Olen mukana!").click(function() {
      var entry = db.createEntry();
      db.saveEntry(entry);
      showDoneOrInput(entry);
      refreshDoneAmounts();
    });
    return button;
  }
  
  function refreshDoneAmounts() {
    $("#not-done-entry-amount").text(mission.notDoneEntries().length);
    $("#done-entry-amount").text(mission.doneEntries().length);
  }
  
  function renderDoneInput(entry) {
    var div = $("<div><p>Olet mukana haasteessa!</p></div>");
    var button = btn("Selvitin haasteen!").click(function() {
      entry.done = true;
      showDoneOrInput(entry);
      refreshDoneAmounts();
    });
    return div.append(button);
  }
  
  function btn(msg) { return $('<button class="btn btn-default btn-large dropdown-toggle">' + msg + '</button>'); }
  
  function renderDone() {
    return $("<h3>Olet suorittanut haasteen!</h3>");
  }
  
  function initialize(database) {
    db = database;
    userId = db.getUserId();
    db.fetchMissionByDate(new Date(), function(found) {
      mission = found;
      console.log(found.name);
      render();
      db.fetchEntry(userId, found.id, showDoneOrInput, showSignUpInput);
    });
  }
  
  return {
    initialize: initialize
  };
  
});