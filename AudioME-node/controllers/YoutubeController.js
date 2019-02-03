
const ydl = require('youtube-dl')
const search = require('youtube-search');
 
module.exports.grabInstrumental = function(title) {

  // lol
  title += " instrumental"

  let opts = {
    maxResults: 1,
    key: 'AIzaSyArKNxoDuAkrTGXKrk9nFnAPseRX1xDStM'
  };
 
  return search(title, opts, function(err, results) {
    if(err) return console.log(err);
 
      console.log(results);

      let url = results[0];

      ytdl.exec(url, ['-o', title + '.mp3', '-x', '--audio-format', 'mp3'], {}, function(err, output) {
        if (err) throw err;

        console.log(output.join('\n'));
      });   
  });
  
};
