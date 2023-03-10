import { Results, SelfieSegmentation } from '@mediapipe/selfie_segmentation';
import pkg from '../../package.json';

class SimpleTransformer implements Transformer {
  startCanvas_: OffscreenCanvas;
  startCtx_: OffscreenCanvasRenderingContext2D;
  message_: string;
  selfieSegmentation_: SelfieSegmentation;

  constructor(message: string) {
    const width = 640;
    const height = 480;

    this.startCanvas_ = new OffscreenCanvas(width, height);
    this.startCtx_ = this.startCanvas_.getContext('2d') as OffscreenCanvasRenderingContext2D;
    this.message_ = message;
    if (!this.startCtx_) {
      throw new Error('Unable to create CanvasRenderingContext2D');
    }

    // setup semantic segmentation, downloading its models and other metadata
    this.selfieSegmentation_ = new SelfieSegmentation({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation@${pkg.dependencies['@mediapipe/selfie_segmentation']}/${file}`,
    });
    this.selfieSegmentation_.setOptions({
      modelSelection: 1,
      selfieMode: true,
    });

    // setup drawing callback,
    // to make use of mediapipe results by blurring each frame in a canvas.
    const canvasCtx = this.startCtx_;

    this.selfieSegmentation_.onResults((results: Results) => {
      canvasCtx.save();

      canvasCtx.clearRect(0, 0, width, height);
      canvasCtx.filter = '';

      // just redraw entire image in default composition.
      canvasCtx.globalCompositeOperation = 'source-over';
      canvasCtx.drawImage(results.image, 0, 0, width, height);

      // existing image is kept only where selfie segment overlaps it,
      // i.e., now only selfie will remain.
      canvasCtx.globalCompositeOperation = 'destination-in';
      canvasCtx.drawImage(results.segmentationMask, 0, 0, width, height);

      // draw blurred image behind existing content,
      // i.e., now selfie will remain but with the blurred image behind it.
      canvasCtx.filter = 'blur(10px)';
      canvasCtx.globalCompositeOperation = 'destination-over';
      canvasCtx.drawImage(results.image, 0, 0, width, height);

      canvasCtx.restore();
    });
  }

  //start function is optional.
  start(controller: TransformStreamDefaultController) {
    //In this sample nothing needs to be done.
  }

  //transform function must be implemented.
  async transform(sourceVideoFrame: any, controller: TransformStreamDefaultController) {
    // feeds mediapipe with source frames
    // (and mediapipe is in parallel updating the canvas with that callback)
    // (to be clear, that canvas callback is doing the actual "heavy work")
    sourceVideoFrame.width = sourceVideoFrame.displayWidth;
    sourceVideoFrame.height = sourceVideoFrame.displayHeight;
    await this.selfieSegmentation_.send({ image: sourceVideoFrame });
    sourceVideoFrame.close();

    // gets whatever is happening on canvas and feed target generator
    const newFrame = new VideoFrame(this.startCanvas_, {
      timestamp: sourceVideoFrame.timestamp,
      alpha: 'discard',
    });
    controller.enqueue(newFrame);
  }

  //flush function is optional.
  flush(controller: TransformStreamDefaultController) {
    //In this sample nothing needs to be done.
  }
}
export default SimpleTransformer;
