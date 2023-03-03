import './rvfc-polyfill';
import pkg from '../../package.json';
import { CleanupFn } from '../webrtc';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export async function startBackgrondBlur(
  videoEl: HTMLVideoElement,
  canvasEl: HTMLCanvasElement
): Promise<CleanupFn> {
  const canvasCtx = canvasEl.getContext('2d')!;

  const selfieSegmentation = new SelfieSegmentation({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${pkg.dependencies['@mediapipe/selfie_segmentation']}/${file}`,
  });
  selfieSegmentation.setOptions({
    modelSelection: 1,
    selfieMode: true,
  });

  selfieSegmentation.onResults((results: any) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height);
    canvasCtx.filter = '';

    // just redraw entire image in default composition.
    canvasCtx.globalCompositeOperation = 'source-over';
    canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

    // existing image is kept only where selfie segment overlaps it,
    // i.e., now only selfie will remain.
    canvasCtx.globalCompositeOperation = 'destination-in';
    canvasCtx.drawImage(results.segmentationMask, 0, 0, canvasEl.width, canvasEl.height);

    // draw blurred image behind existing content,
    // i.e., now selfie will remain but with the blurred image behind it.
    canvasCtx.filter = 'blur(10px)';
    canvasCtx.globalCompositeOperation = 'destination-over';
    canvasCtx.drawImage(results.image, 0, 0, canvasEl.width, canvasEl.height);

    canvasCtx.restore();
  });

  const handleFrame = () =>
    selfieSegmentation
      .send({ image: videoEl })
      .then(() => videoEl.requestVideoFrameCallback(handleFrame));
  videoEl.requestVideoFrameCallback(handleFrame);

  const stopSelfieSegmentation = async () => selfieSegmentation.close(); // fyi, see: https://github.com/google/mediapipe/issues/3373
  return stopSelfieSegmentation;
}
