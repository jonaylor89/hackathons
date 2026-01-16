import React, { Component } from 'react';
import { View, Text, Button } from 'react-native';
// import Speech from 'react-native-speech';
const Speech = require('react-native-speech');

export default class SpeechCom extends Component {

      _startHandler() {
        Speech.speak({
          text: 'Aujourd\'hui, Maman est morte. Ou peut-être hier, je ne sais pas.',
          voice: 'fr-FR'
        })
        .then(started => {
          console.log('Speech started');
        })
        .catch(error => {
          console.log('You\'ve already started a speech instance.');
        });
      }

      _pauseHandler() {
        Speech.pause();
      }

      _resumeHandler() {
        Speech.resume();
      }

      _stopHandler() {
        Speech.stop();
      }

      render() {
        return (
          <View>
            <Button title="Speak" onPress={this._startHandler} />
            <Button title="Pause" onPress={this._pauseHandler} />
            <Button title="Resume" onPress={this._resumeHandler} />
            <Button title="Stop" onPress={this._stopHandler} />
          </View>
      );
    }
}
