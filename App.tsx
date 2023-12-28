import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Image, TextInput, Button, ToastAndroid } from "react-native";
import MyComponent from "./src/components/MyComponent";
import axios, { AxiosResponse } from "axios";
import { io } from 'socket.io-client'
import { MediaStream, RTCPeerConnection, RTCSessionDescription, RTCView, mediaDevices } from "react-native-webrtc";

interface IceServer {
  urls: string,
  username?: string,
  credential?: string
}

interface Message {
  sender_id: string, 
  receiver_id: string, 
  message: string
}

const App = () => {
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')
  const [receiver, setReceiver] = useState('')
  const [chat, setChat] = useState<Message[]>([])

  // deployed to render
  const socket = io('wss://chat-app-server-gmhe.onrender.com/events')
  const [ thoughts, setThoughts ] = useState('')
  const [ iceServerList, setIceServerList ] = useState<IceServer[]>([{'urls': 'stun:stun.l.google.com:19302'}])
  const iceServersUrl = 'https://chat-app-server-gmhe.onrender.com/chat/get_ice_servers'

  let mediaConstraints = {
    audio: true,
    video: {
      frameRate: 30,
      facingMode: 'user'
    }
  }

  let [ localMediaStream, setLocalMediaStream ] = useState<MediaStream>()
  let [ remoteMediaStream, setRemoteMediaStream ] = useState<MediaStream>()
  let isVoiceOnly = false

  const startCamera = async () => {
    try {
      const mediaStream = await mediaDevices.getUserMedia( mediaConstraints )
  
      if ( isVoiceOnly ) {
        let videoTrack = await mediaStream.getVideoTracks()[0]
        videoTrack.enabled = false
      }
  
      setLocalMediaStream(mediaStream)
    } catch (err) {
      console.error('Error getting media stream', err)
    }
  }

  let peerConstraints = {
    iceServers: [
      {
        urls: 'stun:stun.l.google.com:19302'
      }
    ]
  }

  let peerConnection = new RTCPeerConnection( peerConstraints )

  useEffect(() => {
    axios.get(iceServersUrl)
      .then((response: AxiosResponse<IceServer[]>) => {
        console.log("received servers", response.data)
        setIceServerList(response.data)
        peerConnection.setConfiguration({
            iceServers: iceServerList
        })
      })
  }, [])

  useEffect(() => {
      if (localMediaStream != undefined) {
          localMediaStream.getTracks().forEach(track => {
            // @ts-ignore
              peerConnection.addTrack(track, localMediaStream)
          })
      }
  }, [ localMediaStream ])

  socket.on('sendMessage', (arg: Message) => {
    console.log('received message', arg)
    setChat(prevArray => [...prevArray, arg])
  })

  socket.on('offer', async (arg: any) => {
    console.log('received offer')

    if (arg.offer) {
      try {
        if (peerConnection.signalingState !== 'stable') {
          console.warn('Cannot handle offer in signaling state:', peerConnection.signalingState)
          return
        }
  
        await peerConnection.setRemoteDescription(new RTCSessionDescription(arg.offer))
        console.log('set offer as remote desc')

        const answer = await peerConnection.createAnswer()
        console.log('created answer')

        await peerConnection.setLocalDescription(answer)
        console.log('set answer as local desc.')

        console.log('signaling state', peerConnection.signalingState)
  
        sendMessage('answer', { answer })
        console.log('sending answer...')
      } catch(err) {
        console.error('Error setting remote description', err)
      }
    }
  })

  socket.on('answer', async (arg: any) => {
    console.log('received answer')
    console.log('answer message', arg)

    try {
      if (arg.answer) {
        console.log('signaling state', peerConnection.signalingState)
        const remoteDesc = new RTCSessionDescription(arg.answer)

        await peerConnection.setRemoteDescription(remoteDesc)
        console.log('set answer as remote desc')

        console.log('signaling state', peerConnection.signalingState)
      }
    } catch (err) {
      console.error('Error set answer as remote desc')
    }
  })

  socket.on('new-ice-candidate', async (arg: any) => {
      if (arg.ice_candidate) {
          try {
              await peerConnection.addIceCandidate(arg.ice_candidate)
          } catch (e) {
              console.error('Error adding received ice candidate', e)
          }
      }
  })

  peerConnection.addEventListener('icecandidate', event => {
      console.log('on icecandidate')
      if (event.candidate) {
          sendMessage('new-ice-candidate', { ice_candidate: event.candidate })
      }
  })

  peerConnection.addEventListener('connectionstatechange', event => {
      console.log('connectionstatechange', event)
      if (peerConnection.connectionState === 'connected') {
          console.log("CONNECTED")
      }
  })

  peerConnection.addEventListener('track', (event) => {
      const [remoteStream] = event.streams
      setRemoteMediaStream(remoteStream)
  })

  const register = () => {
    socket.emit('register', {
      id: username
    }, (data: any) => {
        console.log('server response', data)
        ToastAndroid.show('Successfully registered user', ToastAndroid.LONG)
    })
  }

  const onServerResponse = (data: any) => {
      console.log('server response', data)
  }

  const onSendMessage = () => {
    const msg = {
      sender_id: username, 
        receiver_id: receiver, 
        message: message
    }
    socket.emit('sendMessage', msg, onServerResponse)

    setChat(prevArray => [...prevArray, msg])
  }

  const renderChat = () => {
    if (chat.length) {

      return (
        chat.map((msg, index) => {
          return (
            msg.sender_id === username ?
            <Text key={ index } style={{ color: 'teal' }}>{ msg.message }</Text> :
            <Text key={ index } style={{ color: 'green' }}>{ msg.message }</Text>
          )
        })
      )
    }
  }

  const sendMessage = (eventName: string, msgObject: any) => {
    const msg = {
        sender_id: username, 
        receiver_id: receiver, 
        ...msgObject
    }
    socket.emit(eventName, msg, onServerResponse)
}

  let sessionConstraints = {
    mandatory: {
      OfferToReceiveAudio: true,
      OfferToReceiveVideo: true,
      VoiceActivityDetection: true
    }
  };

  const makeCall = async () => {
    try {
      const offerDescription = await peerConnection.createOffer({
        OfferToReceiveAudio: true,
        OfferToReceiveVideo: true
      });
      console.log('created offer')

      await peerConnection.setLocalDescription(offerDescription)
      console.log('set offer as local desc')

      sendMessage('offer', { offer: offerDescription })
      console.log('Making call...')
      console.log('Sending offer...')
    } catch( err ) {
      console.error('Error creating offer', err)
    };
  }

  return (
    <ScrollView style={{ padding: 10 }}>
      <View style={{ marginBottom: 10 }}>
        <RTCView
          mirror={ true }
          objectFit={ 'cover' }
          streamURL={ localMediaStream?.toURL() }
          zOrder={0}
          style={{ height: 150, width: 150 }}
        />
      </View>

      <View>
        <RTCView
            mirror={ true }
            objectFit={ 'cover' }
            streamURL={ remoteMediaStream?.toURL() }
            zOrder={0}
            style={{ height: 150, width: 150 }}
          />
      </View>

      <View>
        { renderChat() }
      </View>

      <View>
        <Text>Your name</Text>
        <TextInput
          style={{
            height: 40,
            borderColor: 'gray',
            borderWidth: 1
          }}
          defaultValue={ username }
          onChangeText={ (newText) => setUsername(newText) }
        />
      </View>

      <View style={{ marginTop: 10 }}>
        <Text>Your friend's name</Text>
        <TextInput
          style={{
            height: 40,
            borderColor: 'gray',
            borderWidth: 1
          }}
          defaultValue={ receiver }
          onChangeText={ (newText) => setReceiver(newText) }
        />
      </View>

      <View style={{ marginTop: 10 }}>
          <Button
            title="Connect"
            disabled={ username == '' || username === null }
            onPress={ () => register() }
          />

          <Button
            title="Get camera"
            onPress={ () => startCamera() }
          />

          <Button
            title="Call"
            onPress={ () => makeCall() }
          />
      </View>

      <View style={{ marginTop: 20 }}>
        <Text>Message</Text>
        <TextInput
          style={{
            height: 40,
            borderColor: 'gray',
            borderWidth: 1
          }}
          defaultValue={ message }
          onChangeText={ (newText) => setMessage(newText) }
        />
      </View>

      <View style={{ marginTop: 10 }}>
          <Button
            title="Send message"
            onPress={ () => onSendMessage() }
          />
      </View>
    </ScrollView>
  );
}

export default App;