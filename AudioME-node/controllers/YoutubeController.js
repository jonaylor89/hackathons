
const ydl = require('youtube-dl')
const search = require('youtube-search');
 
module.exports.grabInstrumental = function(title) {

  // lol
  title += " instrumental"

  let opts = {
    maxResults: 1,
    key: ''
  };
 
  return search(title, opts, function(err, results) {
    if(err) return console.log(err);
 
      console.log(results);

      
  });
  
};
