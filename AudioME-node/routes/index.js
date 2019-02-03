var express = require('express');
var router = express.Router();
var spotifyController = require('../controllers/SpotifyController')


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', {
    title: 'musicScape'
  });
});

router.get('/audiome', function(req, res, next) {

  /* 
   * This is where the magic happens 
   */


  // this is the retrival of the mp3
  var music = spotifyController.spotifySearch();

  // this is an JSON obj that contains the avg of the song features
  var obj = req.session.obj;

  // this is userName
  var user = req.session.user;

  res.render('visuals', {
    title: 'audiome',
    d : obj,
    m : music
    u : user
  })

});

router.get('/spotifycallback', function(req, res) {
  spotifyController.spotifyCallback(req, res)
});

router.get('/login', function(req, res) {
    spotifyController.spotifyLogin(res);
});

module.exports = router;
