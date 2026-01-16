import React, { Component } from 'react';
import { Text, View, Button, Image } from 'react-native';
import styles from '../Styles';

export default class InitScreen extends Component {

  render() {
    return (
      <View style={styles.InitStyles}>

        <Image
          style = {{width: 100, height: 100}}
          source={require('../images/Octo.png')}
        />

        <Text style={{width: 78, color: 'white'}}>Prometheus</Text>

        <Button
          onPress={() => this.props.onStart()}
          title="Start"
          accessibilityLabel="Continue into Application"
        />

        <Image
          style={{width: 250, height: 100}}
          source={require('../images/University.png')}
        />
      </View>
    );
  }
}
