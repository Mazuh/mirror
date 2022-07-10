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

export async function startVideoMirror(deviceId: string) {
  const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;
  const videoStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId },
  });
  videoEl.srcObject = videoStream;
  return videoEl.play();
}

export async function stopVideoMirror() {
  const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;
  if (!videoEl.srcObject) {
    return;
  }

  (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null;
}

export async function startAudioEchoCall(deviceId: string) {
  console.warn('Not implemented yet: startEchoCall', deviceId);
}

export async function stopAudioEchoCall() {
  console.warn('Not implemented yet: stopEchoCall');
}
