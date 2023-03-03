import adapter from 'webrtc-adapter';

export interface FetchedMediaDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

export type CleanupFn = () => Promise<unknown>;

export const NO_OP_CLEANUP: CleanupFn = () => Promise.resolve();

export async function fetchInputDevices(): Promise<FetchedMediaDevices> {
  try {
    if (!(await hasVideoPermissions())) {
      await askMediaPermission({ video: true });
    }

    if (!(await hasAudioPermissions())) {
      await askMediaPermission({ audio: true });
    }

    const allDevices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => !!d.label);
    const cameras = allDevices.filter((d) => d.kind === 'videoinput');
    const microphones = allDevices.filter((d) => d.kind === 'audioinput');
    const audioOutputs = allDevices.filter((d) => d.kind === 'audiooutput');
    return { cameras, microphones, audioOutputs };
  } catch (error) {
    console.error(`Error while fetching media devices.`, error);
    return { cameras: [], microphones: [], audioOutputs: [] };
  }
}

export async function hasVideoPermissions(): Promise<boolean> {
  return (await navigator.mediaDevices.enumerateDevices())
    .filter((d) => d.kind === 'videoinput')
    .some((d) => !!d.label);
}

export async function hasAudioPermissions(): Promise<boolean> {
  return (await navigator.mediaDevices.enumerateDevices())
    .filter((d) => d.kind === 'audioinput')
    .some((d) => !!d.label);
}

export function getBrowserDetails() {
  return adapter.browserDetails;
}

export async function askMediaPermission(constraints: MediaStreamConstraints): Promise<void> {
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoStream.getTracks().forEach((t) => t.stop());
  } catch (error) {
    console.error(`Error while requesting user media.`, constraints, error);
  }
}

export async function startVideoMirror(
  deviceId: string,
  videoEl: HTMLVideoElement
): Promise<() => void> {
  console.log('Starting video mirror for device:', deviceId);

  const videoStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId } });
  videoEl.srcObject = videoStream;

  try {
    await videoEl.play();
  } catch (error) {
    console.error('Detected exception on playing video feed, ignoring.', error);
  }

  const stopVideoMirror = () => {
    console.log('Killing video input track(s).');
    (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
    videoEl.srcObject = null;
  };
  return stopVideoMirror;
}

export async function startRecording(
  deviceId: string,
  audioEl: HTMLAudioElement
): Promise<CleanupFn> {
  console.log('Initializing audio input recorder for device:', deviceId);

  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
  const tracks = audioStream.getTracks();
  if (tracks.length !== 1) {
    console.error('Got invalid amount of audio tracks, cleaning them', tracks);
    tracks.forEach((t) => t.stop());
    throw new Error('Failed to start recorder.');
  }

  const [track] = tracks;
  track.onended = () => {
    if (recorder?.state === 'inactive') {
      console.log('Track ended, recorder already inactive.');
    } else {
      console.log('Track ended, but recorder might still be active, so trying to stop it.');
      recorder?.stop();
    }
  };

  const killTrackAndTriggerEnding = () => {
    console.log('Ending audio input track.');
    track.stop();
    track.dispatchEvent(new Event('ended'));
  };

  const foundSupportedMediaType = findMediaTypeForRecordings();
  if (!foundSupportedMediaType) {
    throw new Error('Failed to find supported media type (i.e., no supported MIME found).');
  }

  console.log('Recorder mime type:', foundSupportedMediaType);
  const blobType = foundSupportedMediaType;
  const recorderMimeType = foundSupportedMediaType;

  const recorder = new MediaRecorder(audioStream, { mimeType: recorderMimeType });
  recorder.ondataavailable = async (event) => {
    console.log('Handling recorded audio for device', deviceId);

    try {
      if (!event.data.size) {
        console.log('No data found for the recorder, just ignoring.');
        return;
      }

      const blob = new Blob([event.data], { type: blobType });
      const url = URL.createObjectURL(blob);
      audioEl.src = url;
    } catch (error) {
      console.error('Failed to build blob and/or assign as audio source.', error);
      audioEl.dispatchEvent(new Event('error', error));
      return;
    }

    try {
      console.log('Trying to auto play recorded audio.');
      audioEl.muted = false;
      audioEl.load();
      await audioEl.play();
      console.log('Recorder audio successfully auto played.');
    } catch (error) {
      console.warn('Could not auto play recorded audio chunk, relying on manual mode.', error);
    }
  };

  console.log('Starting recorder.');
  recorder.start();

  const stopRecording = async () => {
    try {
      killTrackAndTriggerEnding();
    } catch (error) {
      console.error('Failed to kill audio input track and/or trigger its ending.');
    }
  };
  return stopRecording;
}

function findMediaTypeForRecordings(): string | null {
  // More complex discussion and approaches: https://stackoverflow.com/a/64656254
  return (
    [
      'audio/mp3',
      'audio/webm',
      'audio/ogg',
      'audio/x-matroska',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/x-matroska',
    ].find((mime) => MediaRecorder.isTypeSupported(mime)) || null
  );
}

// adapter already made mutations globally, no need to use it directly,
// but this might be useful for devs in the console
(window as any).adapter = adapter;
