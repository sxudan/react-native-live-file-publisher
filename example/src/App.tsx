import React, { useEffect, useState } from 'react';

import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

import {
  PublisherProtocol,
  PublishingState,
  useLiveFilePublisher,
} from 'react-native-live-file-publisher';

import * as ImagePicker from 'expo-image-picker';

export default function App() {
  const { publishingState, publish, stop, log } = useLiveFilePublisher({
    url: 'rtmp://localhost:1935',
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
      <Text style={[styles.status]}>Publishing Status : {publishingState}</Text>
      <Text style={[styles.block]} numberOfLines={2}>
        {file}
      </Text>
      <TouchableOpacity onPress={pickVideo} style={[styles.button]}>
        <Text style={{ color: 'white' }}>Select file</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={startPublish}
        style={[styles.button]}
        disabled={publishingState != PublishingState.Normal}
      >
        <Text style={{ color: 'white' }}>Publish</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={stop}
        style={[styles.button]}
        disabled={publishingState != PublishingState.Publishing}
      >
        <Text style={{ color: 'white' }}>Stop</Text>
      </TouchableOpacity>

      {publishingState === PublishingState.Publishing && (
        <View style={styles.block}>
          <Text>Publishing at {'rtmp://localhost:1935'}</Text>
        </View>
      )}
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
  block: {
    padding: 24,
  },
  status: {
    backgroundColor: 'black',
    color: 'white',
    padding: 8,
  },
  button: {
    backgroundColor: 'green',
    height: 44,
    width: 100,
    marginBottom: 16,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
