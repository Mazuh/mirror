import { startBackgrondBlur } from './advanced/background-blur.ts';
import { startFaceDetection } from './advanced/face-detection.ts';
import {
  CleanupFn,
  FetchedMediaDevices,
  NO_OP_CLEANUP,
  startRecording,
  startVideoMirror,
} from './webrtc';

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

  const startRecordingBtn = getOrDie('microphone-demo-start-btn');
  let handleStartRecordingClick = () => console.warn('Empty recorder click handler.');
  startRecordingBtn.addEventListener('click', handleStartRecordingClick, { once: true });

  const stopRecordingBtn = getOrDie('microphone-demo-stop-btn');
  let handleStopRecordingClick = () => console.warn('Empty stop click handler.');
  let stopRecording: CleanupFn = NO_OP_CLEANUP;
  stopRecordingBtn.addEventListener('click', handleStopRecordingClick, { once: true });

  const microphoneDemoSectionEl = getOrDie('microphone-demo-section');
  const audioEl = getOrDie('microphone-demo-audio') as HTMLAudioElement;

  const handleMicrophoneSelectorChange = (event: Event) => {
    audioEl.muted = true;
    hideBlock(audioEl);

    const deviceId = (event.target as HTMLSelectElement).value;
    const isActivating = !!deviceId;
    if (isActivating) {
      showBlock(microphoneDemoSectionEl);
    } else {
      hideBlock(microphoneDemoSectionEl);
    }

    startRecordingBtn.removeEventListener('click', handleStartRecordingClick);
    showBlock(startRecordingBtn);
    handleStartRecordingClick = async () => {
      try {
        audioEl.muted = true;
        hideBlock(audioEl);
        stopRecording = await startRecording(deviceId, audioEl);
        hideBlock(startRecordingBtn);
        showBlock(stopRecordingBtn);
      } catch (error) {
        audioEl.dispatchEvent(new Event('error', error));
      }
    };
    startRecordingBtn.addEventListener('click', handleStartRecordingClick);

    stopRecordingBtn.removeEventListener('click', handleStopRecordingClick);
    hideBlock(stopRecordingBtn);
    handleStopRecordingClick = async () => {
      hideBlock(stopRecordingBtn);
      showBlock(startRecordingBtn);
      stopRecording();
      stopRecording = NO_OP_CLEANUP;
    };
    stopRecordingBtn.addEventListener('click', handleStopRecordingClick);

    const handleMicrophoneSelectorCleanup = () => {
      handleStopRecordingClick();
      microphonesSelectEl.removeEventListener('change', handleMicrophoneSelectorCleanup);
    };
    microphonesSelectEl.addEventListener('change', handleMicrophoneSelectorCleanup, { once: true });
  };

  microphonesSelectEl.addEventListener('change', handleMicrophoneSelectorChange);

  const errorEl = getOrDie('microphone-demo-error');
  const handleError = () => {
    errorEl.innerText = 'Unexpected error on audio feedback.';
    showBlock(errorEl);
    hideBlock(audioEl);
  };
  audioEl.onerror = handleError;

  const handleOk = () => {
    errorEl.innerText = '';
    hideBlock(errorEl);
    showBlock(audioEl);
  };
  audioEl.oncanplay = handleOk;
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

export async function setupFaceDetection() {
  const startBtn = getOrDie('facedetection-start-btn') as HTMLButtonElement;
  const stopBtn = getOrDie('facedetection-stop-btn') as HTMLButtonElement;

  startBtn.addEventListener('click', async () => {
    const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;

    const canvasEl = getOrDie('facedetection-canvas') as HTMLCanvasElement;
    canvasEl.width = videoEl.clientWidth;
    canvasEl.height = videoEl.clientHeight;

    showBlock(canvasEl);
    hideBlock(startBtn);
    showBlock(stopBtn);

    const stopFaceDetection = await startFaceDetection(videoEl, canvasEl);

    const fullCleanup = () =>
      stopFaceDetection().finally(() => {
        hideBlock(canvasEl);
        hideBlock(stopBtn);
        showBlock(startBtn);
      });
    stopBtn.addEventListener('click', fullCleanup, { once: true });
  });
}

export async function setupBackgroundBlur() {
  const startBtn = getOrDie('backgroundblur-start-btn') as HTMLButtonElement;
  const stopBtn = getOrDie('backgroundblur-stop-btn') as HTMLButtonElement;

  startBtn.addEventListener('click', async () => {
    console.warn('click');
    const videoEl = getOrDie('camera-demo-video') as HTMLVideoElement;

    const canvasEl = getOrDie('backgroundblur-canvas') as HTMLCanvasElement;
    canvasEl.width = videoEl.clientWidth;
    canvasEl.height = videoEl.clientHeight;

    showBlock(canvasEl);
    hideBlock(startBtn);
    showBlock(stopBtn);

    const stopFaceDetection = await startBackgrondBlur(videoEl, canvasEl);

    const fullCleanup = () =>
      stopFaceDetection().finally(() => {
        hideBlock(canvasEl);
        hideBlock(stopBtn);
        showBlock(startBtn);
      });
    stopBtn.addEventListener('click', fullCleanup, { once: true });
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
    return NO_OP_CLEANUP;
  }

  return await startVideoMirror(
    camerasSelectEl.value,
    getOrDie('camera-demo-video') as HTMLVideoElement
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
