import { FetchedMediaDevices, startAudioEcho, startVideoMirror } from './webrtc';

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
    showBlock(errorEl);
    return false;
  }

  return true;
}

export function setupCameraSelector(cameras: MediaDeviceInfo[]): void {
  if (!cameras.length) {
    return;
  }

  const camerasEmptyEl = getOrDie('cameras-empty');
  hideBlock(camerasEmptyEl);

  const camerasSelectEl = getOrDie('cameras-select');
  showBlock(camerasSelectEl);
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

  let currentCleanup = () => {};
  const handleChange = async () => {
    currentCleanup();

    try {
      currentCleanup = await activateSelectedCamera();
    } catch (error) {
      handleError();
    }
  };
  camerasSelectEl.addEventListener('change', handleChange);

  const videoEl = getOrDie('camera-demo-video') as HTMLAudioElement;
  const errorEl = getOrDie('camera-demo-error');
  const handleError = () => {
    errorEl.innerText = 'Unexpected error on video feedback.';
    showBlock(errorEl);
  };
  videoEl.onerror = handleError;
  const handleOk = () => {
    errorEl.innerText = '';
    hideBlock(errorEl);
  };
  videoEl.onplay = handleOk;
}

export function setupMicrophoneSelector(microphones: MediaDeviceInfo[]): void {
  if (!microphones.length) {
    return;
  }

  const microphonesEmptyEl = getOrDie('microphones-empty');
  hideBlock(microphonesEmptyEl);

  const microphonesSelectEl = getOrDie('microphones-select');
  showBlock(microphonesSelectEl);
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

    try {
      currentCleanup = await activateSelectedMicrophone();
    } catch (error) {
      handleError();
    }
  };
  microphonesSelectEl.addEventListener('change', handleChange);

  const audioEl = getOrDie('microphone-demo-audio') as HTMLAudioElement;
  const errorEl = getOrDie('microphone-demo-error');
  const handleError = () => {
    errorEl.innerText = 'Unexpected error on audio feedback.';
    showBlock(errorEl);
  };
  audioEl.onerror = handleError;
  const handleOk = () => {
    errorEl.innerText = '';
    hideBlock(errorEl);
  };
  audioEl.onplay = handleOk;
}

export function showAudioOutputsList(audioOutputs: MediaDeviceInfo[]): void {
  if (!audioOutputs.length) {
    return;
  }

  const audioOutputsEmptyEl = getOrDie('audio-outputs-empty');
  hideBlock(audioOutputsEmptyEl);

  const audioOutputsListEl = getOrDie('audio-outputs-list');
  showBlock(audioOutputsListEl);
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

async function activateSelectedCamera(): Promise<() => void> {
  const camerasSelectEl = getOrDie('cameras-select') as HTMLSelectElement;
  const isTurningOn = !!camerasSelectEl.value;

  const cameraDemoSectionEl = getOrDie('camera-demo-section') as HTMLDivElement;
  if (isTurningOn) {
    showBlock(cameraDemoSectionEl);
  } else {
    hideBlock(cameraDemoSectionEl);
  }

  if (!isTurningOn) {
    return () => {};
  }

  return await startVideoMirror(
    camerasSelectEl.value,
    getOrDie('camera-demo-video') as HTMLVideoElement
  );
}

async function activateSelectedMicrophone(): Promise<() => void> {
  const microphonesSelectEl = getOrDie('microphones-select') as HTMLSelectElement;
  const isTurningOn = !!microphonesSelectEl.value;

  const microphoneDemoSectionEl = getOrDie('microphone-demo-section') as HTMLDivElement;
  if (isTurningOn) {
    showBlock(microphoneDemoSectionEl);
  } else {
    hideBlock(microphoneDemoSectionEl);
  }

  if (!isTurningOn) {
    return () => {};
  }

  return await startAudioEcho(
    microphonesSelectEl.value,
    getOrDie('microphone-demo-audio') as HTMLAudioElement
  );
}

function showBlock(element: HTMLElement): void {
  element.classList.add('d-block');
  element.classList.remove('d-none');
}

function hideBlock(element: HTMLElement): void {
  element.classList.remove('d-block');
  element.classList.add('d-none');
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
