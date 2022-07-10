import { getOrDie } from './dom';
import {
  activateSelectedCamera,
  activateSelectedMicrophone,
  assertDevicesStatus,
  showAudioOutputsList,
  showCameraSelector,
  showMicrophoneSelector,
} from './ui';
import { fetchInputDevices } from './webrtc';

document.addEventListener('DOMContentLoaded', async (): Promise<void> => {
  const devices = await fetchInputDevices();
  if (!assertDevicesStatus(devices)) {
    return;
  }

  showCameraSelector(devices.cameras);
  getOrDie('cameras-select').addEventListener('change', activateSelectedCamera);

  showMicrophoneSelector(devices.microphones);
  getOrDie('microphones-select').addEventListener('change', activateSelectedMicrophone);

  showAudioOutputsList(devices.audioOutputs);
});
