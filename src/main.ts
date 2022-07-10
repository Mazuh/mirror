/* Main routine */

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  showCameraSelector(devices.cameras);
  getOrDie('cameras-select').addEventListener('change', activateSelectedCamera);

  showMicrophoneSelector(devices.microphones);
  getOrDie('microphones-select').addEventListener('change', activateSelectedMicrophone);

  showAudioOutputsList(devices.audioOutputs);
});

/* WebRTC */

interface FetchedMediaDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
}

async function fetchInputDevices(): Promise<FetchedMediaDevices> {
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

async function hasVideoPermissions(): Promise<boolean> {
  return (await navigator.mediaDevices.enumerateDevices())
    .filter((d) => d.kind === 'videoinput')
    .some((d) => !!d.label);
}

async function hasAudioPermissions(): Promise<boolean> {
  return (await navigator.mediaDevices.enumerateDevices())
    .filter((d) => d.kind === 'audioinput')
    .some((d) => !!d.label);
}

async function askMediaPermission(constraints: MediaStreamConstraints): Promise<void> {
  try {
    const videoStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoStream.getTracks().forEach((t) => t.stop());
  } catch (error) {
    console.error(`Error while requesting user media.`, constraints, error);
  }
}

async function startVideoMirror(deviceId: string) {
  const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;
  const videoStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId },
  });
  videoEl.srcObject = videoStream;
  return videoEl.play();
}

async function stopVideoMirror() {
  const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;
  if (!videoEl.srcObject) {
    return;
  }

  (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
  videoEl.srcObject = null;
}

async function startAudioEchoCall(deviceId: string) {
  console.warn('Not implemented yet: startEchoCall', deviceId);
}

async function stopAudioEchoCall() {
  console.warn('Not implemented yet: stopEchoCall');
}

/* UI */

function assertDevicesStatus(devices: FetchedMediaDevices): boolean {
  const errorEl = getOrDie('error');

  if (!devices.cameras.length && !devices.microphones.length) {
    errorEl.innerHTML = `
      <strong>Failed to fetch cameras and microphones...</strong>
      <br />
      <br />
      Please, make sure at least one media input device is connected
      and your browser has <em>permanent permission</em> to access them.
      <br />
      <br />
      Then refresh this page to try again.
    `;
    errorEl.classList.remove('d-none');
    errorEl.classList.add('d-block');
    return false;
  }

  return true;
}

function showCameraSelector(cameras: MediaDeviceInfo[]): void {
  if (!cameras.length) {
    return;
  }

  const camerasEmptyEl = getOrDie('cameras-empty');
  camerasEmptyEl.classList.remove('d-block');
  camerasEmptyEl.classList.add('d-none');

  const camerasSelectEl = getOrDie('cameras-select');
  camerasSelectEl.classList.add('d-block');
  camerasSelectEl.classList.remove('d-none');
  camerasSelectEl.innerHTML = '';

  const noOptionEl = document.createElement('option');
  noOptionEl.innerText = 'Turned off';
  noOptionEl.value = '';
  camerasSelectEl.appendChild(noOptionEl);

  cameras.forEach((camera) => {
    const optionEl = document.createElement('option');
    optionEl.innerText = camera.label;
    if (camera.deviceId === 'default') {
      optionEl.innerText += ' (Default)';
    }
    optionEl.title = camera.deviceId;
    optionEl.value = camera.deviceId;
    camerasSelectEl.appendChild(optionEl);
  });
}

async function activateSelectedCamera(): Promise<void> {
  const camerasSelectEl = getOrDie('cameras-select') as HTMLSelectElement;
  const isTurningOn = !!camerasSelectEl.value;

  const cameraDemoSectionEl = getOrDie('camera-demo-section') as HTMLDivElement;
  if (isTurningOn) {
    cameraDemoSectionEl.classList.add('d-block');
    cameraDemoSectionEl.classList.remove('d-none');
  } else {
    cameraDemoSectionEl.classList.remove('d-block');
    cameraDemoSectionEl.classList.add('d-none');
  }

  await stopVideoMirror();

  if (!isTurningOn) {
    return;
  }

  await startVideoMirror(camerasSelectEl.value);
}

function showMicrophoneSelector(microphones: MediaDeviceInfo[]): void {
  if (!microphones.length) {
    return;
  }

  const microphonesEmptyEl = getOrDie('microphones-empty');
  microphonesEmptyEl.classList.remove('d-block');
  microphonesEmptyEl.classList.add('d-none');

  const microphonesSelectEl = getOrDie('microphones-select');
  microphonesSelectEl.classList.add('d-block');
  microphonesSelectEl.classList.remove('d-none');
  microphonesSelectEl.innerHTML = '';

  const noOptionEl = document.createElement('option');
  noOptionEl.innerText = 'Turned off';
  noOptionEl.value = '';
  microphonesSelectEl.appendChild(noOptionEl);

  microphones.forEach((microphone) => {
    const optionEl = document.createElement('option');
    optionEl.innerText = microphone.label;
    if (microphone.deviceId === 'default') {
      optionEl.innerText += ' (Default)';
    }
    optionEl.title = microphone.deviceId;
    optionEl.value = microphone.deviceId;
    microphonesSelectEl.appendChild(optionEl);
  });
}

async function activateSelectedMicrophone(): Promise<void> {
  const microphonesSelectEl = getOrDie('microphones-select') as HTMLSelectElement;
  const isTurningOn = !!microphonesSelectEl.value;

  const microphoneDemoSectionEl = getOrDie('microphone-demo-section') as HTMLDivElement;
  if (isTurningOn) {
    microphoneDemoSectionEl.classList.add('d-block');
    microphoneDemoSectionEl.classList.remove('d-none');
  } else {
    microphoneDemoSectionEl.classList.remove('d-block');
    microphoneDemoSectionEl.classList.add('d-none');
  }

  await stopAudioEchoCall();

  if (!isTurningOn) {
    return;
  }

  await startAudioEchoCall(microphonesSelectEl.value);
}

function showAudioOutputsList(audioOutputs: MediaDeviceInfo[]): void {
  if (!audioOutputs.length) {
    return;
  }

  const audioOutputsEmptyEl = getOrDie('audio-outputs-empty');
  audioOutputsEmptyEl.classList.remove('d-block');
  audioOutputsEmptyEl.classList.add('d-none');

  const audioOutputsListEl = getOrDie('audio-outputs-list');
  audioOutputsListEl.classList.add('d-block');
  audioOutputsListEl.classList.remove('d-none');
  audioOutputsListEl.innerHTML = '';

  audioOutputs.forEach((audioOutput) => {
    const listItemEl = document.createElement('li');
    listItemEl.innerText = audioOutput.label;
    if (audioOutput.deviceId === 'default') {
      listItemEl.innerText += ' (Default)';
    }
    listItemEl.title = audioOutput.deviceId;
    audioOutputsListEl.appendChild(listItemEl);
  });
}

function getOrDie(elementId: string): HTMLElement {
  const element = document.getElementById(elementId);
  if (!element) {
    document.getElementsByTagName('main')[0].innerHTML =
      '<p class="error-message">Failed to load page for programming reasons.</p>';
    throw new Error(`Unavailable DOM element: ${elementId}`);
  }

  return element;
}
