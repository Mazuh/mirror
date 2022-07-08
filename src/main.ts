/* Main routine */

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  showCameraSelector(devices.cameras);
  showMicrophonesList(devices.microphones);
});

/* WebRTC */

interface FetchedMediaDevices {
  cameras: MediaDeviceInfo[];
  microphones: MediaDeviceInfo[];
}

async function fetchInputDevices(): Promise<FetchedMediaDevices> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    stream.getTracks().forEach((t) => t.stop());
    const allDevices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => !!d.label);
    const cameras = allDevices.filter((d) => d.kind === 'videoinput');
    const microphones = allDevices.filter((d) => d.kind === 'audioinput');
    return { cameras, microphones };
  } catch (error) {
    console.error(`Error while fetching media devices.`, error);
    return { cameras: [], microphones: [] };
  }
}

/* UI */

function getOrDie(elementId: string): HTMLElement {
  const element = document.getElementById(elementId);
  if (!element) {
    document.getElementsByTagName('main')[0].innerHTML =
      '<p class="error-message">Failed to load page for programming reasons.</p>';
    throw new Error(`Unavailable DOM element: ${elementId}`);
  }

  return element;
}

function assertDevicesStatus(devices: FetchedMediaDevices): boolean {
  const errorEl = getOrDie('error');

  if (!devices.cameras.length && !devices.microphones.length) {
    errorEl.innerHTML = `
      <strong>Failed to fetch cameras and microphones...</strong>
      Please, make sure at least one media input device is connected
      and your browser has permanent permission to access them.
    `;
    errorEl.classList.remove('d-none');
    errorEl.classList.add('d-block');
    return false;
  }

  return true;
}

function showCameraSelector(cameras: MediaDeviceInfo[]): void {
  console.warn('showCameraSelector: not implemented yet', cameras);
}

function showMicrophonesList(microphones: MediaDeviceInfo[]): void {
  const microphonesEmptyEl = getOrDie('microphones-empty');
  microphonesEmptyEl.classList.remove('d-block');
  microphonesEmptyEl.classList.add('d-none');

  const microphonesList = getOrDie('microphones-list');
  microphonesList.classList.add('d-block');
  microphonesList.classList.remove('d-none');
  microphonesList.innerHTML = '';

  microphones.forEach((microphone) => {
    const listItemEl = document.createElement('li');
    listItemEl.innerText = microphone.label;
    if (microphone.deviceId === 'default') {
      listItemEl.innerHTML += ' <em>(Default)</em>';
    }
    listItemEl.title = microphone.deviceId;
    microphonesList.appendChild(listItemEl);
  });
}
