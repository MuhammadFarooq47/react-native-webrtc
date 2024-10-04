import React from 'react';
import { Text } from 'react-native';
import VideoCallScreen from './VideoCallScreen';
import WebRTCApp from './WebRtcApp';
// peerjs --port 9000 --key peerjs

const App = () => {
 
  return (
  <>
{/* <Text> Hello</Text> */}
{/* <VideoCallScreen /> */}
<WebRTCApp />
  </>
  );
};

export default App;
