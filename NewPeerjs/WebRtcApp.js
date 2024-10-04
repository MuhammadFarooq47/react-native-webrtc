import React, { useState, useEffect, useRef } from 'react';
import { View, Button, StyleSheet, Text } from 'react-native';
import { mediaDevices, RTCPeerConnection, RTCIceCandidate } from 'react-native-webrtc';
import io from 'socket.io-client';
import Video from 'react-native-video';
import { RTCView } from 'react-native-webrtc';

// Replace with your signaling server URL
const SIGNALING_SERVER_URL = 'http://192.168.100.208:3000';

const WebRTCApp = () => {
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    // console.log('Remote stream URL:', remoteStream.toURL());
    console.log('Remote stream URL:', remoteStream ? remoteStream.toURL() : 'No remote stream');


    const [isCalling, setIsCalling] = useState(false);
    const pcRef = useRef(null);
    const socketRef = useRef(null);
    const remoteCandidates = useRef([]);

    useEffect(() => {
        // Initialize Socket.IO with reconnection options
        socketRef.current = io(SIGNALING_SERVER_URL, {
            reconnection: true,         // Enable reconnection
            reconnectionAttempts: 5,    // Number of reconnection attempts
            reconnectionDelay: 1000     // Time delay between reconnection attempts
        });

        // Listen for the connection event
        socketRef.current.on('connect', () => {
            console.log('Socket connected:', socketRef.current.id);
        });

        // Handle incoming messages from signaling server
        socketRef.current.on('offer', (offer) => {
            console.log('Received offer:', offer);  // Log the offer to check its structure
            handleRemoteOffer(offer);
        });
        
        socketRef.current.on('answer', (answer) => {
            console.log('Received answer:', answer);  // Log the answer to check its structure
            handleAnswer(answer);
        });
        socketRef.current.on('ice-candidate', handleNewICECandidateMsg);

        const startVideo = async () => {
            try {
                const stream = await mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(stream);
        
                // Initialize PeerConnection
                pcRef.current = new RTCPeerConnection(null);
        
                pcRef.current.onicecandidate = handleIceCandidate;
                
                // Set up event listener for receiving remote track
                pcRef.current.ontrack = handleTrack;
        
                // Add local stream tracks to the peer connection
                stream.getTracks().forEach((track) => pcRef.current.addTrack(track, stream));
        
            } catch (error) {
                console.error('Error getting user media:', error);
            }
        };
        

        // Start the video stream only if it has not been initialized yet
        if (!localStream) {
            startVideo();
        }

        return () => {
            if (localStream) {
                localStream.getTracks().forEach((track) => track.stop());
            }
            if (remoteStream) {
                remoteStream.getTracks().forEach((track) => track.stop());
            }

            // Properly disconnect socket on unmount
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [localStream, remoteStream]); // Dependency array includes both streams

    const handleIceCandidate = (event) => {
        if (event.candidate) {
            // Send ICE candidate to the remote peer via signaling server
            socketRef.current.emit('ice-candidate', { candidate: event.candidate });
        }
    };

    const handleTrack = (event) => {
        if (event.streams && event.streams[0]) {
            console.log('Remote stream received:', event.streams[0]);
    
            const videoTrack = event.streams[0].getVideoTracks()[0];
            if (videoTrack) {
                console.log('Video track state:', videoTrack.readyState);
                if (videoTrack.readyState === 'live') {
                    setRemoteStream(event.streams[0]);  // Only set if the track is live
                } else {
                    console.error('Video track is not live');
                }
            }
            
        } else {
            console.error('No remote stream received');
        }
    };
    
    


    const handleCall = async () => {
        if (!pcRef.current) {
            console.error('Peer connection is not initialized');
            return;
        }
    
        if (!isCalling) {
            setIsCalling(true);
            try {
                const offer = await pcRef.current.createOffer();
                await pcRef.current.setLocalDescription(offer);
                // Send a properly formatted offer
                socketRef.current.emit('offer', {
                    type: offer.type, // Ensure 'type' is present
                    sdp: offer.sdp,   // Ensure 'sdp' is present
                });
            } catch (error) {
                console.error('Error creating offer:', error);
            }
        } else {
            endCall();
        }
    };
    

    const handleAnswer = async (answer) => {
        try {
            // Ensure that the 'answer' contains both type and sdp
            if (!answer || !answer.type || !answer.sdp) {
                console.error('Invalid answer:', answer);
                return;
            }
    
            // Apply the answer received from the signaling server
            await pcRef.current.setRemoteDescription(answer);
        } catch (error) {
            console.error('Error setting remote description:', error);
        }
    };
    

    const handleRemoteOffer = async (offer) => {
        try {
            if (!pcRef.current) {
                console.error('Peer connection is not initialized');
                return;
            }
    
            // Ensure that the 'offer' contains both type and sdp
            if (!offer || !offer.type || !offer.sdp) {
                console.error('Invalid offer:', offer);
                return;
            }
    
            // Apply the offer received from the signaling server
            await pcRef.current.setRemoteDescription(offer);
    
            // Create and send an answer
            const answer = await pcRef.current.createAnswer();
            await pcRef.current.setLocalDescription(answer);
    
            // Send a properly formatted answer
            socketRef.current.emit('answer', {
                type: answer.type, // Ensure 'type' is present
                sdp: answer.sdp,   // Ensure 'sdp' is present
            });
        } catch (error) {
            console.error('Error handling remote offer:', error);
        }
    };
    

    const handleNewICECandidateMsg = async (msg) => {
        const candidate = new RTCIceCandidate(msg.candidate);
        try {
            if (pcRef.current.remoteDescription) {
                await pcRef.current.addIceCandidate(candidate);
            } else {
                remoteCandidates.current.push(candidate);  // Save candidates for later
            }
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    };
    

    const endCall = () => {
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        setLocalStream(null);
        setRemoteStream(null);
        setIsCalling(false);
    };

    return (
        <View style={styles.container}>
          {localStream && (
   <RTCView
   streamURL={localStream.toURL()}  // Use RTCView for WebRTC video streams
   style={styles.video}
   key={localStream.id}  // Ensure a unique key for rerender
/>
)}
{remoteStream ?  
    <RTCView
        streamURL={remoteStream.toURL()}  // Use RTCView for WebRTC video streams
        style={styles.video}
        key={remoteStream.id}  // Ensure a unique key for rerender
    />
    : <Text>No Remote Stream</Text>}


            <Button title={isCalling ? 'End Call' : 'Start Call'} onPress={handleCall} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    video: {
        width: '100%',
        height: 400,  // Increase height for better visibility
        backgroundColor: 'black',  // Add background to confirm visibility
    },
});


export default WebRTCApp;
