import React, { Component } from 'react';
import { View, Image, Text } from 'react-native';
import styles from '../Styles/styles';
import SpeechCom from '../Components/SpeechCom';

export default class SpeakingScreen extends Component{

  render(){
    return(
      <View style={styles.SpeechStyles}>
        <Image source={require('../images/greek.png')}></Image>
        <SpeechCom />
      </View>
    );
  }
}
