import {
  FFmpegKit,
  FFmpegKitConfig,
  Level,
  ReturnCode,
  Statistics,
} from 'ffmpeg-kit-react-native';
import { useCallback, useEffect, useState } from 'react';

export enum PublisherProtocol {
  RTMP,
  RTSP_UDP,
  RTSP_TCP,
}

export enum PublishingState {
  Normal = 'Normal',
  RequestPublish = 'RequestPublish',
  Publishing = 'Publishing',
  RequestStopPublish = 'RequestStopPublish',
}

type DataState = {
  baseUrl: string;
  mode: PublisherProtocol;
};

type Props = {
  url: string;
  mode: PublisherProtocol;
};

export const useLiveFilePublisher = ({ url, mode }: Props) => {
  const [publishingState, setPublishingState] = useState<PublishingState>(
    PublishingState.Normal
  );
  const [error, setError] = useState<any>(null);
  const [log, setLog] = useState<string | undefined>();
  var [data, setData] = useState<DataState | undefined>();
  const [stats, setStats] = useState<Statistics | undefined>();

  const connect = useCallback((u: string, m: PublisherProtocol) => {
    /** Check if url is empty */
    if (u === '') throw Error('url is empty');
    /**  Check if url has right scheme */
    if (m === PublisherProtocol.RTMP && !u.includes('rtmp://')) {
      throw Error('Invalid url. Please use rtmp://');
    } else if (
      (m === PublisherProtocol.RTSP_TCP || m === PublisherProtocol.RTSP_UDP) &&
      !u.includes('rtsp://')
    ) {
      throw Error('Invalid url. Please use rtsp://');
    }
    setData({
      baseUrl: u,
      mode: m,
    });
  }, []);

  useEffect(() => {
    if (data === undefined) {
      connect(url, mode);
    }
  }, [url, mode, data, connect]);

  const notifyError = useCallback(
    (err: string) => {
      setError(err);
      setPublishingState(PublishingState.RequestStopPublish);
    },
    [setPublishingState]
  );

  useEffect(() => {
    console.log('stats called ', stats, publishingState, stats?.getSessionId());
    if (
      stats !== undefined &&
      stats.getSessionId() &&
      publishingState === PublishingState.RequestPublish
    ) {
      console.log('changed to publishing');
      setPublishingState(PublishingState.Publishing);
    }
  }, [publishingState, stats]);

  const _ingest = useCallback(
    (filePath: string, name: string, offsetStartTime?: string) => {
      // String cmd =
      //     '${offsetStartTime == null ? "" : "-ss $offsetStartTime"} -re -i ${filePath} -c:v h264 -b:v 2M -vf "scale=1920:1080" -s 1920x1080 -preset ultrafast -c:a copy -color_primaries bt709 -color_trc bt709 -colorspace bt709 -threads 4 -f flv ${Environment.baseUrl}/${name}';
      var cmd = `${offsetStartTime === undefined ? '' : `-ss ${offsetStartTime}`} -re  -i ${filePath} -c:a aac -c:v h264 -b:v 2M `;
      if (data!.mode === PublisherProtocol.RTMP) {
        cmd += `-f flv ${data!.baseUrl}/${name}`;
      } else if (data!.mode === PublisherProtocol.RTSP_UDP) {
        cmd += `-f rtsp ${data!.baseUrl}/${name}`;
      } else {
        cmd += `-f rtsp -rtsp_transport tcp ${data!.baseUrl}/${name}`;
      }
      setLog('CMD => ' + cmd);
      try {
        FFmpegKitConfig.setLogLevel(Level.AV_LOG_VERBOSE);
        FFmpegKit.executeAsync(
          cmd,
          // '-f h264 -thread_queue_size 4096 -vsync drop -i ${inputPath} -f h264 -ar 44100 -ac 2 -acodec pcm_s16le -thread_queue_size 4096 -i ${inputPath} -vcodec copy -acodec aac -ab 128k -f fifo -fifo_format flv -map 0:v -map 1:a -drop_pkts_on_overflow 1 -attempt_recovery 1 -recovery_wait_time 1 rtmp://192.168.1.100:1935/mystream',
          async (c) => {
            console.log('Completed');
            setPublishingState(PublishingState.Normal);
            var returnCode = (await c.getReturnCode()).getValue();
            if (
              returnCode !== ReturnCode.CANCEL &&
              returnCode !== ReturnCode.SUCCESS
            ) {
              console.log('Error ', (await c.getFailStackTrace()) ?? '');
              notifyError((await c.getOutput()) ?? '');
            }
          },
          (_log) => {
            setLog(`${_log.getMessage()}`);
            // print(log.getMessage());
          },
          (_stats) => {
            setStats(_stats);
          }
        );
      } catch (e) {
        setError(e);
      }
    },
    [data, notifyError]
  );

  const _cancel = useCallback(async () => {
    try {
      await FFmpegKit.cancel(stats?.getSessionId());
    } catch (e) {}
    setPublishingState(PublishingState.Normal);
  }, [stats]);

  useEffect(() => {
    switch (publishingState) {
      case PublishingState.Normal:
        setStats(undefined);
        break;
      case PublishingState.RequestPublish:
        break;
      case PublishingState.Publishing:
        break;
      case PublishingState.RequestStopPublish:
        _cancel();
        break;
    }
  }, [_cancel, _ingest, data, notifyError, publishingState]);

  const publish = useCallback(
    (filePath: string, name: string, startTime?: string) => {
      console.log(data);
      if (!data) {
        throw new Error('Data is undefined');
      }
      if (filePath === '') {
        throw Error('File path is empty');
      }
      if (name === '') {
        throw Error('Stream name is empty');
      }
      setPublishingState(PublishingState.RequestPublish);
      _ingest(filePath, name, startTime);
    },
    [_ingest, data]
  );

  const stop = async () => {
    setPublishingState(PublishingState.RequestStopPublish);
  };

  return { publish, stop, publishingState, error, log };
};
