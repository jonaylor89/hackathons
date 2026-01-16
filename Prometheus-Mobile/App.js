import React, { Component } from 'react';
import { View, Text } from 'react-native';
import { InitScreen, SpeakingScreen } from './Screens';

export default class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      index: 0
    };
  }

  nextView() {
    this.setState({
      index: this.state.index + 1
    });
  }

  getView(index) {
    switch (index) {
      case 0: return (<InitScreen onStart={() => this.nextView()} />);
      case 1: return (<SpeakingScreen />);
      default: return this.getView(0);
    }
  }

  render() {
    return this.getView(this.state.index || 0)
  }
}
