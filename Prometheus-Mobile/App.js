import React, { Component } from 'react';
import { StyleSheet, Text, View, Button, Image } from 'react-native';

export default class App extends Component {

  render() {
    return (
      <View style={styles.container}>

        <Image
        style = {{width: 100, height: 100}}
        source={require('./Octo.png')}
        />

        <Text style={{width: 78, color: 'white'}}>Prometheus</Text>

        <Button
          onPress={ () => {console.log('Transition to the next screen')}}
          title="Start"
          accessibilityLabel="Continue into Application"
        />

        <Image
          style={{width: 250, height: 100}}
          source={require('./University.png')}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black'
  }
});
