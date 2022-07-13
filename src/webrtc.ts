import { getOrDie } from './dom';

export interface FetchedMediaDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

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

export async function askMediaPermission(constraints: MediaStreamConstraints): Promise<void> {
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoStream.getTracks().forEach((t) => t.stop());
  } catch (error) {
    console.error(`Error while requesting user media.`, constraints, error);
  }
}

export async function startVideoMirror(deviceId: string): Promise<void> {
  console.log('Starting video mirror for device:', deviceId);
  const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;
  const videoStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId },
  });
  videoEl.srcObject = videoStream;
  return videoEl.play();
}

export async function stopVideoMirror(): Promise<void> {
  console.log('Checking for any existing video mirror.');
  const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;
  if (!videoEl.srcObject) {
    return;
  }

  console.log('Existing video tracks found, cleaning up.');
  (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null;
}

export async function startAudioEcho(
  deviceId: string,
  audioEl: HTMLAudioElement
): Promise<() => void> {
  console.log('Initializing audio echo for device:', deviceId);
  const recordingBufferRateMs = 1000;

  let stopRecordingTimeout = 0;
  let isRecording = false;

  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
  const tracks = audioStream.getTracks();
  if (tracks.length !== 1) {
    console.error('Got invalid amount of audio tracks, cleaning them', tracks);
    tracks.forEach((t) => t.stop());
    throw new Error('Failed to start echo recording.');
  }

  const [track] = tracks;
  track.onended = () => {
    console.log('Track ended, cleaning up echo resources. Track id:', track.id);
    isRecording = false;
    clearTimeout(stopRecordingTimeout);
    clearInterval(checkRecordingInterval);
    recorder?.stop();
  };

  const killTrackAndTriggerEnding = () => {
    console.log('Killing audio input track. Track id:', track.id);
    track.stop();
    track.dispatchEvent(new Event('ended'));
  };

  const checkRecordingInterval = setInterval(() => {
    console.log('Checking if recording is still active. Interval id:', checkRecordingInterval);
    if (!isRecording) {
      killTrackAndTriggerEnding();
    }
  }, 3000);

  const recorder = new MediaRecorder(audioStream);
  recorder.ondataavailable = async (event) => {
    console.log('Handling recorded chunk for device', deviceId);
    clearTimeout(stopRecordingTimeout);

    if (!isRecording) {
      return;
    }

    if (!event.data.size) {
      stopRecordingTimeout = setTimeout(() => recorder.stop(), recordingBufferRateMs);
      return;
    }

    const blob = new Blob([event.data]);
    const url = URL.createObjectURL(blob);
    audioEl.src = url;
    audioEl.currentTime = 0;

    console.log('Playing recorded chunk, then will continue to a next iteration.');
    try {
      await audioEl.play();
    } catch (error) {
      console.error('Detected exception on playing a recorded chunk, ignoring.', error);
    }

    recorder.start();
    stopRecordingTimeout = setTimeout(() => recorder.stop(), recordingBufferRateMs);
  };

  console.log('Starting echo loop.');
  recorder.start();
  isRecording = true;
  stopRecordingTimeout = setTimeout(() => recorder.stop(), recordingBufferRateMs);

  const stopAudioEcho = killTrackAndTriggerEnding;
  return stopAudioEcho;
}
