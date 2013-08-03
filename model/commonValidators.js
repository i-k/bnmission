module.exports = {
  stringExists: function(value) {
    if(value)
      return value.length > 0
    else
      return false
  }
}