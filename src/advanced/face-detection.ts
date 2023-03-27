import { FaceDetection } from '@mediapipe/face_detection';
import * as drawingUtils from '@mediapipe/drawing_utils';
import pkg from '../../package.json';
import { CleanupFn } from '../webrtc';

export async function startFaceDetection(
  videoEl: HTMLVideoElement,
  canvasEl: HTMLCanvasElement
): Promise<CleanupFn> {
  const canvasCtx = canvasEl.getContext('2d')!;

  const faceDetection = new FaceDetection({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection@${pkg.dependencies['@mediapipe/face_detection']}/${file}`,
  });
  faceDetection.setOptions({
    model: 'short',
    minDetectionConfidence: 0.5,
  });
  faceDetection.onResults((results: any) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);
    if (results.detections.length > 0) {
      drawingUtils.drawRectangle(canvasCtx, results.detections[0].boundingBox, {
        color: 'blue',
        lineWidth: 2,
        fillColor: '#00000000',
      });
      drawingUtils.drawLandmarks(canvasCtx, results.detections[0].landmarks, {
        color: 'red',
        radius: 3,
      });
    }
    canvasCtx.restore();
  });

  const handleFrame = () =>
    faceDetection
      .send({ image: videoEl })
      .then(() => videoEl.requestVideoFrameCallback(handleFrame));
  videoEl.requestVideoFrameCallback(handleFrame);

  const stopFaceDetection = async () => faceDetection.close(); // fyi, see: https://github.com/google/mediapipe/issues/3373
  return stopFaceDetection;
}
