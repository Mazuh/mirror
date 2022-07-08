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
    askMediaPermission({ video: true });
    askMediaPermission({ audio: true });

    const allDevices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => !!d.label);
    const cameras = allDevices.filter((d) => d.kind === 'videoinput');
    const microphones = allDevices.filter((d) => d.kind === 'audioinput');
    return { cameras, microphones };
  } catch (error) {
    console.error(`Error while fetching media devices.`, error);
    return { cameras: [], microphones: [] };
  }
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

function getOrDie(elementId: string): HTMLElement {
  const element = document.getElementById(elementId);
  if (!element) {
    document.getElementsByTagName('main')[0].innerHTML =
      '<p class="error-message">Failed to load page for programming reasons.</p>';
    throw new Error(`Unavailable DOM element: ${elementId}`);
  }

  return element;
}
