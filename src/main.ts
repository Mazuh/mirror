/* Main routine */

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  showCameraSelector(devices.cameras);
  showCameraSelector(devices.microphones);
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
  const element = document.getElementById('error');
  if (!element) {
    document.getElementsByTagName('main')[0].innerHTML =
      '<p class="error-message">Failed to load page for programming reasons.</p>';
    throw new Error(`Unavailable DOM element: ${elementId}`);
  }

  return element;
}

function assertDevicesStatus(devices: FetchedMediaDevices) {
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

function showCameraSelector(cameras: MediaDeviceInfo[]) {
  console.warn('showCameraSelector: not implemented yet', cameras);
}

function showMicrophonesList(microphones: MediaDeviceInfo[]) {
  console.warn('showMicrophonesList: not implemented yet', microphones);
}
