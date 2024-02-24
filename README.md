# react-native-live-file-publisher

This is a file publisher to publish the video file to RTSP or RTMP server.

## Installation

```sh
npm install react-native-live-file-publisher
```

## Usage

```typescript
import {
  PublisherProtocol,
  useLiveFilePublisher,
} from 'react-native-live-file-publisher';

// ...

const { publishingState, publish, stop, log } = useLiveFilePublisher({
    url: 'rtmp://192.168.1.100:1935',
    mode: PublisherProtocol.RTMP,
  });

.
.
// publish
timestamp: '00:00:00'
filepath: local file path
name: stream name
try {
    publish(<filepath>, <name>, <timestamp>);
} catch (e) {
    console.log(e);
}
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [create-react-native-library](https://github.com/callstack/react-native-builder-bob)
