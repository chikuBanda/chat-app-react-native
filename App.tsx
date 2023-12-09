import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, Image, TextInput, Button, ToastAndroid } from "react-native";
import MyComponent from "./src/components/MyComponent";
import axios, { AxiosResponse } from "axios";
import { io } from 'socket.io-client'

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

  const MyServers = () => {
    return iceServerList.map((obj, index) => {
      return <Text key={ 'key' + index }>{ obj.urls }</Text>
    })
  }

  useEffect(() => {
    axios.get(iceServersUrl)
      .then((response: AxiosResponse<IceServer[]>) => {
        setIceServerList(response.data)
      })
  }, [])

  socket.on('sendMessage', (arg: Message) => {
    console.log('received message', arg)
    setChat(prevArray => [...prevArray, arg])
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

  return (
    <ScrollView style={{ padding: 10 }}>
      <Text>Some text</Text>
      <View>
        <Text>Some more text</Text>
        <Image
          source={{
            uri: 'https://reactnative.dev/docs/assets/p_cat2.png'
          }}
          style={ { width: 200, height: 200 } }
        />
      </View>

      <View>
        { renderChat() }
      </View>

      {/* <MyComponent name="Chiku" girlfriend="Sibo" thoughts={ thoughts } />

      <View>
        { MyServers() }
      </View> */}

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