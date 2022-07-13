import { getOrDie } from './dom';
import {
  activateSelectedCamera,
  assertDevicesStatus,
  showAudioOutputsList,
  showCameraSelector,
  configureMicrophoneSelector,
} from './ui';
import { fetchInputDevices } from './webrtc';

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  showCameraSelector(devices.cameras);
  getOrDie('cameras-select').addEventListener('change', activateSelectedCamera);

  configureMicrophoneSelector(devices.microphones);

  showAudioOutputsList(devices.audioOutputs);
});
