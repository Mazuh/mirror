import {
  assertDevicesStatus,
  showAudioOutputsList,
  setupCameraSelector,
  setupMicrophoneSelector,
  setupFaceDetection,
  setupBackgroundBlur,
  showBrowserDetails,
  setupBackgroundReplacement,
} from './ui';
import { fetchInputDevices } from './webrtc';

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  // basic
  setupCameraSelector(devices.cameras);
  setupMicrophoneSelector(devices.microphones);
  showAudioOutputsList(devices.audioOutputs);

  // advanced
  showBrowserDetails();
  setupFaceDetection();
  setupBackgroundBlur();
  setupBackgroundReplacement();
});
