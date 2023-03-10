import { Results, SelfieSegmentation } from '@mediapipe/selfie_segmentation';

class SimpleTransformer implements Transformer {
  startCanvas_: OffscreenCanvas;
  startCtx_: OffscreenCanvasRenderingContext2D;
  message_: string;
  constructor(message: string) {
    this.startCanvas_ = new OffscreenCanvas(1, 1);
    this.startCtx_ = this.startCanvas_.getContext('2d') as OffscreenCanvasRenderingContext2D;
    this.message_ = message;
    if (!this.startCtx_) {
      throw new Error('Unable to create CanvasRenderingContext2D');
    }
  }

  //start function is optional.
  start(controller: TransformStreamDefaultController) {
    //In this sample nothing needs to be done.
  }

  //transform function must be implemented.
  transform(frame: any, controller: TransformStreamDefaultController) {
    console.log('transforming', frame.displayWidth, frame.displayHeight);
    this.startCanvas_.width = frame.displayWidth;
    this.startCanvas_.height = frame.displayHeight;
    let timestamp: number = frame.timestamp;
    this.startCtx_.drawImage(frame, 0, 0, frame.displayWidth, frame.displayHeight);
    this.startCtx_.font = '30px Arial';
    this.startCtx_.fillStyle = 'white';
    this.startCtx_.fillText(this.message_, 50, 150);
    frame.close();
    controller.enqueue(new VideoFrame(this.startCanvas_, { timestamp, alpha: 'discard' }));
  }

  //flush function is optional.
  flush(controller: TransformStreamDefaultController) {
    //In this sample nothing needs to be done.
  }
}
export default SimpleTransformer;
