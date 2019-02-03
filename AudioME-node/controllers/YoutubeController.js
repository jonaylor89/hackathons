
const ydl = require('youtube-dl')
const search = require('youtube-search');
 
module.exports.grabInstrumental = function(title) {

  // lol
  title += " instrumental"

  ydl.exec("ytsearch1:" + title, ['-o', 'music.mp3', '-x', '--audio-format', 'mp3'], {}, function(err, output) {
    if (err) throw err;

      console.log("OUTPUT " + output.join('\n'));
    });   
  
};
