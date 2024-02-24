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
  filePath?: string;
  name?: string;
  startTime?: string;
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

  const connect = useCallback((url: string, mode: PublisherProtocol) => {
    /** Check if url is empty */
    if (url === '') throw Error('url is empty');
    /**  Check if url has right scheme */
    if (mode === PublisherProtocol.RTMP && !url.includes('rtmp://')) {
      throw Error('Invalid url. Please use rtmp://');
    } else if (
      (mode === PublisherProtocol.RTSP_TCP ||
        mode === PublisherProtocol.RTSP_UDP) &&
      !url.includes('rtsp://')
    ) {
      throw Error('Invalid url. Please use rtsp://');
    }
    setData({
      baseUrl: url,
      mode: mode,
      filePath: undefined,
      name: undefined,
      startTime: undefined,
    });
  }, []);

  useEffect(() => {
    if (data == undefined) {
      connect(url, mode);
    }
  }, [url, mode, data, connect]);

  const notifyError = useCallback(
    (error: string) => {
      setError(error);
      setPublishingState(PublishingState.RequestStopPublish);
    },
    [setPublishingState]
  );

  useEffect(() => {
    console.log('Data ', data);
    if (publishingState === PublishingState.Normal) {
      if (data && data.filePath && data.name) {
        setPublishingState(PublishingState.RequestPublish);
      } else {
        console.log('data is invalid ', data);
      }
    } else {
      console.log('Invalid state', publishingState);
    }
  }, [data, publishingState]);

  useEffect(() => {
    console.log('stats called ', stats, publishingState);
    if (publishingState === PublishingState.RequestPublish) {
      setPublishingState(PublishingState.Publishing);
    }
  }, [publishingState, stats]);

  const _ingest = useCallback(
    (
      filePath: string,
      baseUrl: string,
      name: string,
      offsetStartTime?: string
    ) => {
      // String cmd =
      //     '${offsetStartTime == null ? "" : "-ss $offsetStartTime"} -re -i ${filePath} -c:v h264 -b:v 2M -vf "scale=1920:1080" -s 1920x1080 -preset ultrafast -c:a copy -color_primaries bt709 -color_trc bt709 -colorspace bt709 -threads 4 -f flv ${Environment.baseUrl}/${name}';
      var cmd = `${offsetStartTime === undefined ? '' : `-ss ${offsetStartTime}`} -re  -i ${filePath} -c:a aac -c:v h264 -b:v 2M `;
      if (data!.mode === PublisherProtocol.RTMP) {
        cmd += `-f flv ${baseUrl}/${name}`;
      } else if (data!.mode === PublisherProtocol.RTSP_UDP) {
        cmd += `-f rtsp ${baseUrl}/${name}`;
      } else {
        cmd += `-f rtsp -rtsp_transport tcp ${baseUrl}/${name}`;
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
          (log) => {
            setLog(`${log.getMessage()}`);
            // print(log.getMessage());
          },
          (stats) => {
            setStats(stats);
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
      await FFmpegKit.cancel();
    } catch (e) {}
    setPublishingState(PublishingState.Normal);
  }, []);

  const cleanup = useCallback(() => {
    if (data?.filePath && data?.name) {
      setData({
        ...data!,
        filePath: undefined,
        name: undefined,
      });
    }
    setStats(undefined);
  }, [data]);

  useEffect(() => {
    switch (publishingState) {
      case PublishingState.Normal:
        break;
      case PublishingState.RequestPublish:
        _ingest(data!.filePath!, data!.baseUrl, data!.name!, data?.startTime);
        break;
      case PublishingState.Publishing:
        break;
      case PublishingState.RequestStopPublish:
        cleanup();
        _cancel();
        break;
    }
  }, [_cancel, _ingest, cleanup, data, notifyError, publishingState]);

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
      setData({
        baseUrl: data.baseUrl,
        mode: data.mode,
        filePath: filePath,
        name: name,
        startTime: startTime,
      });
    },
    [data]
  );

  const stop = async () => {
    setPublishingState(PublishingState.RequestStopPublish);
  };

  return { publish, stop, publishingState, error, log };
};
