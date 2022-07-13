import { getOrDie } from './dom';
import { FetchedMediaDevices, startAudioEcho, startVideoMirror, stopVideoMirror } from './webrtc';

export function assertDevicesStatus(devices: FetchedMediaDevices): boolean {
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

export function showCameraSelector(cameras: MediaDeviceInfo[]): void {
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

export async function activateSelectedCamera(): Promise<void> {
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

export function configureMicrophoneSelector(microphones: MediaDeviceInfo[]): void {
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

  let currentCleanup = () => {};
  const handleChange = async () => {
    currentCleanup();

    currentCleanup = await activateSelectedMicrophone();
  };
  microphonesSelectEl.addEventListener('change', handleChange);
}

async function activateSelectedMicrophone(): Promise<() => void> {
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

  if (!isTurningOn) {
    return () => {};
  }

  try {
    return await startAudioEcho(microphonesSelectEl.value);
  } catch (error) {
    microphonesSelectEl.value = '';
    throw error;
  }
}

export function showAudioOutputsList(audioOutputs: MediaDeviceInfo[]): void {
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
