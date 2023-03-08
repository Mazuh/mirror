import './rvfc-polyfill';
import pkg from '../../package.json';
import { CleanupFn } from '../webrtc';
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export async function startBackgrondBlur(
  sourceVideoEl: HTMLVideoElement,
  targetVideoEl: HTMLVideoElement
): Promise<CleanupFn> {
  // setup semantic segmentation and download its trainings

  const selfieSegmentation = new SelfieSegmentation({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${pkg.dependencies['@mediapipe/selfie_segmentation']}/${file}`,
  });
  selfieSegmentation.setOptions({
    modelSelection: 1,
    selfieMode: true,
  });

  // setup drawing instructions

  const canvas = new OffscreenCanvas(sourceVideoEl.clientWidth, sourceVideoEl.clientHeight);
  const canvasCtx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  selfieSegmentation.onResults((results) => {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
    canvasCtx.filter = '';

    // just redraw entire image in default composition.
    canvasCtx.globalCompositeOperation = 'source-over';
    canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    // existing image is kept only where selfie segment overlaps it,
    // i.e., now only selfie will remain.
    canvasCtx.globalCompositeOperation = 'destination-in';
    canvasCtx.drawImage(results.segmentationMask, 0, 0, canvas.width, canvas.height);

    // draw blurred image behind existing content,
    // i.e., now selfie will remain but with the blurred image behind it.
    canvasCtx.filter = 'blur(10px)';
    canvasCtx.globalCompositeOperation = 'destination-over';
    canvasCtx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    canvasCtx.restore();
  });

  // setup processor

  const [sourceVideoTrack] = (sourceVideoEl.srcObject as MediaStream).getVideoTracks();
  const trackProcessor = new MediaStreamTrackProcessor({ track: sourceVideoTrack });

  const transformer = new TransformStream({
    async transform(videoFrame, controller) {
      // send frame for MediaPipe to process (and later generate a result to be handled)
      videoFrame.width = videoFrame.displayWidth;
      videoFrame.height = videoFrame.displayHeight;
      await selfieSegmentation.send({ image: videoFrame });
      videoFrame.close();

      // initialize a new frame from canvas and put it on transformation queue
      const nextFrame = new VideoFrame(canvas, {
        timestamp: videoFrame.timestamp,
      });
      controller.enqueue(nextFrame);
    },
  });

  // connecting everything...
  // from source track reader thru transformer and ends at a given track generator,
  // and such track generator is just a lazy evaluated track to be added to a stream,
  // and such stream will be played in a regular DOM element.

  const trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
  trackProcessor.readable.pipeThrough(transformer).pipeTo(trackGenerator.writable);

  const processedStream = new MediaStream();
  processedStream.addTrack(trackGenerator);

  targetVideoEl.srcObject = processedStream;
  await targetVideoEl.play();

  // build function to cleanup these resources when needed

  const stopSelfieSegmentation = async () => {
    selfieSegmentation.close(); // fyi, see: https://github.com/google/mediapipe/issues/3373
    processedStream.getTracks().forEach((t) => t.stop());
  };
  return stopSelfieSegmentation;
}
