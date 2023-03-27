import pkg from '../../package.json';
import { CleanupFn } from '../webrtc';
import { Results, SelfieSegmentation } from '@mediapipe/selfie_segmentation';

export async function startBackgrondReplacement(
  sourceVideoEl: HTMLVideoElement,
  targetVideoEl: HTMLVideoElement,
  bgImageUrl: string = 'https://upload.wikimedia.org/wikipedia/commons/1/18/Artur_Tim%C3%B3teo_da_Costa_-_Pintor_no_ateli%C3%AA.jpg' // Artur Timóteo da Costa - Pintor no ateliê
): Promise<CleanupFn> {
  // some last dom-based stuff
  const [sourceVideoTrack] = (sourceVideoEl.srcObject as MediaStream).getVideoTracks();
  const width = sourceVideoEl.clientWidth || 640;
  const height = sourceVideoEl.clientHeight || 480;

  const bgImageBlob = await fetch(bgImageUrl).then((r) => r.blob());
  const bgImage = await createImageBitmap(bgImageBlob);

  // setup semantic segmentation, downloading its models and other metadata
  const selfieSegmentation = new SelfieSegmentation({
    locateFile: (file) =>
      `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${pkg.dependencies['@mediapipe/selfie_segmentation']}/${file}`,
  });
  selfieSegmentation.setOptions({
    modelSelection: 1,
    selfieMode: true,
  });

  // setup drawing callback,
  // to make use of mediapipe results to perform replacement on each frame in a canvas.
  const canvas = new OffscreenCanvas(width, height);
  const canvasCtx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

  selfieSegmentation.onResults((results: Results) => {
    canvasCtx.save();

    canvasCtx.clearRect(0, 0, width, height);

    // just redraw entire image in default composition.
    canvasCtx.globalCompositeOperation = 'source-over';
    canvasCtx.drawImage(results.image, 0, 0, width, height);

    // existing image is kept only where selfie segment overlaps it,
    // i.e., now only selfie will remain.
    canvasCtx.globalCompositeOperation = 'destination-in';
    canvasCtx.drawImage(results.segmentationMask, 0, 0, width, height);

    // draw selected image behind existing content,
    // i.e., now selfie will remain but with the selected image behind it.
    canvasCtx.globalCompositeOperation = 'destination-over';
    canvasCtx.drawImage(bgImage, 0, 0, width, height);

    canvasCtx.restore();
  });

  // setup source track reader
  const trackProcessor = new MediaStreamTrackProcessor({ track: sourceVideoTrack });
  const { readable: trackProcessorReadable } = trackProcessor;

  // setup target track writer
  const trackGenerator = new MediaStreamTrackGenerator({ kind: 'video' });
  const { writable: trackGeneratorWritable } = trackGenerator;

  // setup transformer middleware,
  // it's the bridge between source track and target track.
  const transformer = new TransformStream({
    transform: async (sourceVideoFrame, controller) => {
      // feeds mediapipe with source frames
      // (and mediapipe is in parallel updating the canvas with that callback)
      // (to be clear, that canvas callback is doing the actual "heavy work")
      sourceVideoFrame.width = sourceVideoFrame.displayWidth;
      sourceVideoFrame.height = sourceVideoFrame.displayHeight;
      await selfieSegmentation.send({ image: sourceVideoFrame });
      sourceVideoFrame.close();

      // gets whatever is happening on canvas and feed target generator
      const newFrame = new VideoFrame(canvas, {
        timestamp: sourceVideoFrame.timestamp,
      });
      controller.enqueue(newFrame);
    },
  });

  // "connect origin and destination with a bridge"
  trackProcessorReadable.pipeThrough(transformer).pipeTo(trackGeneratorWritable);

  // generating track itself isn't enough and must be inside a stream
  const processedStream = new MediaStream();
  processedStream.addTrack(trackGenerator);

  // now the target stream is attached to a DOM element and starts
  targetVideoEl.srcObject = processedStream;
  await targetVideoEl.play();

  // build function to cleanup these resources when needed
  const stopSelfieSegmentation = async () => {
    processedStream.getTracks().forEach((t) => t.stop());
    await selfieSegmentation.close(); // fyi, see: https://github.com/google/mediapipe/issues/3373
  };
  return stopSelfieSegmentation;
}
