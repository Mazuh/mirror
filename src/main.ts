import {
  assertDevicesStatus,
  showAudioOutputsList,
  setupCameraSelector,
  setupMicrophoneSelector,
} from './ui';
import { fetchInputDevices } from './webrtc';

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  setupCameraSelector(devices.cameras);

  setupMicrophoneSelector(devices.microphones);

  showAudioOutputsList(devices.audioOutputs);
});
