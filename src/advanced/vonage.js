import { MediaProcessor, MediaProcessorConnector } from '@vonage/media-processor';
import SimpleTransformer from './vonage-transformers';

const transformer1 = new SimpleTransformer('hello');
const mediaProcessor = new MediaProcessor();
const transformers = [transformer1];
mediaProcessor.setTransformers(transformers);
const connector = new MediaProcessorConnector(mediaProcessor);

const SAMPLE_SERVER_BASE_URL = 'http://YOUR-SERVER-URL';
const API_KEY = '47528001';
const SESSION_ID = '1_MX40NzUyODAwMX5-MTY3ODQ1OTcyMzc1MH54WjE2ZkJIb3JsdHdVZDdsVVhTVWRaRGx-fn4';
const TOKEN =
  'T1==cGFydG5lcl9pZD00NzUyODAwMSZzaWc9M2YyMWZkMGUyNzhhNzVjMDFjYWRkNzg2ZWM3NDhmMTNhNWNhMTJiZjpzZXNzaW9uX2lkPTFfTVg0ME56VXlPREF3TVg1LU1UWTNPRFExT1RjeU16YzFNSDU0V2pFMlprSkliM0pzZEhkVlpEZHNWVmhUVldSYVJHeC1mbjQmY3JlYXRlX3RpbWU9MTY3ODQ1OTgxMSZub25jZT0wLjQ3MjkxMjg5OTM1MDgxNjUmcm9sZT1wdWJsaXNoZXImZXhwaXJlX3RpbWU9MTY3ODU0NjIxMCZpbml0aWFsX2xheW91dF9jbGFzc19saXN0PQ==';

let apiKey;
let sessionId;
let token;

function handleError(error) {
  if (error) {
    console.error(error);
  }
}

function initializeSession() {
  console.log('init...');
  const session = OT.initSession(apiKey, sessionId);

  // Subscribe to a newly created stream
  session.on('streamCreated', (event) => {
    const subscriberOptions = {
      insertMode: 'append',
      width: '100%',
      height: '100%',
    };
    session.subscribe(event.stream, 'subscriber', subscriberOptions, handleError);
  });

  session.on('sessionDisconnected', (event) => {
    console.log('You were disconnected from the session.', event.reason);
  });

  // initialize the publisher
  const publisherOptions = {
    insertMode: 'append',
    width: '100%',
    height: '100%',
  };
  const publisher = OT.initPublisher('publisher', publisherOptions, handleError);

  // Connect to the session
  session.connect(token, (error) => {
    if (error) {
      handleError(error);
    } else {
      // If the connection is successful, publish the publisher to the session
      session.publish(publisher, handleError);
      publisher.setVideoMediaProcessorConnector(connector);
    }
  });
}

if (API_KEY && TOKEN && SESSION_ID) {
  apiKey = API_KEY;
  sessionId = SESSION_ID;
  token = TOKEN;
  initializeSession();
} else if (SAMPLE_SERVER_BASE_URL) {
  // Make a GET request to get the OpenTok API key, session ID, and token from the server
  fetch(SAMPLE_SERVER_BASE_URL + '/session')
    .then((response) => response.json())
    .then((json) => {
      apiKey = json.apiKey;
      sessionId = json.sessionId;
      token = json.token;
      // Initialize an OpenTok Session object
      initializeSession();
    })
    .catch((error) => {
      handleError(error);
      alert('Failed to get opentok sessionId and token. Bad config?');
    });
}
