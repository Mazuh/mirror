/* Main routine */

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  showCameraSelector(devices.cameras);
  getOrDie('cameras-select').addEventListener('change', activateSelectedCamera);

  showMicrophonesList(devices.microphones);

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

  const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;
  if (videoEl.srcObject) {
    (videoEl.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
  }

  if (!isTurningOn) {
    return;
  }

  const videoStream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: camerasSelectEl.value },
  });
  videoEl.srcObject = videoStream;
  await videoEl.play();
}

function showMicrophonesList(microphones: MediaDeviceInfo[]): void {
  if (!microphones.length) {
    return;
  }

  const microphonesEmptyEl = getOrDie('microphones-empty');
  microphonesEmptyEl.classList.remove('d-block');
  microphonesEmptyEl.classList.add('d-none');

  const microphonesListEl = getOrDie('microphones-list');
  microphonesListEl.classList.add('d-block');
  microphonesListEl.classList.remove('d-none');
  microphonesListEl.innerHTML = '';

  microphones.forEach((microphone) => {
    const listItemEl = document.createElement('li');
    listItemEl.innerText = microphone.label;
    if (microphone.deviceId === 'default') {
      listItemEl.innerText += ' (Default)';
    }
    listItemEl.title = microphone.deviceId;
    microphonesListEl.appendChild(listItemEl);
  });
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
