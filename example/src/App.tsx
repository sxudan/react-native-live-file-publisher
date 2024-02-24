import React, { useEffect, useState } from 'react';

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

import {
  PublisherProtocol,
  useLiveFilePublisher,
} from 'react-native-live-file-publisher';

import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const { publishingState, publish, stop, log } = useLiveFilePublisher({
    url: 'rtmp://192.168.1.100:1935',
    mode: PublisherProtocol.RTMP,
  });
  const [file, setFile] = useState('');

  const pickVideo = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    console.log(result);

    if (result?.assets && result.assets[0]?.uri) {
      setFile(result.assets[0]?.uri);
    }
  };

  useEffect(() => {
    console.log(publishingState);
  }, [publishingState]);

  const startPublish = async () => {
    try {
      publish(file, 'mystream', '00:01:00');
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    // console.log('LOG', log);
  }, [log]);

  return (
    <View style={styles.container}>
      <Text>{file}</Text>
      <TouchableOpacity onPress={pickVideo}>
        <Text>Select file</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={startPublish}>
        <Text>Publish</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={stop}>
        <Text>Stop</Text>
      </TouchableOpacity>
      <Text>{publishingState}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  box: {
    width: 60,
    height: 60,
    marginVertical: 20,
  },
});
