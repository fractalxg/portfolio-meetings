import "./Meeting.css";
import { useEffect, useRef, useState } from "react";
import { IoCopyOutline } from "react-icons/io5";
import { IoCallSharp } from "react-icons/io5";
import { FiPhoneCall } from "react-icons/fi";

import Peer from "peerjs";
import io from "socket.io-client";

const socket = io.connect(import.meta.env.VITE_SOCKET_SERVER);

const Meeting = ({ username, setUsername }) => {
  const [userId, setUserId] = useState("");
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    socket.emit("userData");
  });

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        setStream(stream);
        myVideo.current.srcObject = stream;
      });

    socket.on("userData", (data) => {
      setUserId(data.userId);
    });

    socket.on("callUser", (data) => {
      setReceivingCall(true);
      setCaller(data.from);
      //setUsername(data.name);
      setCallerSignal(data.signal);
    });
  }, []);

  const callUser = (id) => {
    console.log("Calling user:", id);

    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream,
    });

    peer.on("open", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: userId,
        name: name,
      });
    });

    socket.on("answerCall", (signal) => {
      setCallAccepted(true);

      const call = peer.call(signal, stream);

      call.on("stream", (stream) => {
        userVideo.current.srcObject = stream;
      });
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("open", (data) => {
      socket.emit("answerCall", { signal: data, to: caller });
    });

    peer.on("call", (call) => {
      call.answer(stream);
      call.on("stream", (stream) => {
        userVideo.current.srcObject = stream;
      });
    });

    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
  };

  const copyToClipboard = async (textToCopy) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className="meeting-container">
      <div className="meeting-video-container">
        <div className="meeting-video-content">
          {stream && <video playsInline muted ref={myVideo} autoPlay />}
        </div>
        <div className="meeting-video-content">
          {callAccepted && !callEnded ? (
            <video playsInline ref={userVideo} autoPlay />
          ) : null}
        </div>
      </div>
      <div className="meeting-id-container">
        <div className="meeting-id-content">
          <label>Your Meeting ID: {userId}</label>
          <IoCopyOutline
            className="meeting-id-icon"
            onClick={() => copyToClipboard(userId)}
          />
        </div>

        <div className="meeting-call-id-content">
          <input
            id="filled-basic"
            placeholder="Paste the Meeting ID to call"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <button onClick={leaveCall}>End Call</button>
            ) : (
              <IoCallSharp
                className="meeting-call-id-icon"
                onClick={() => callUser(idToCall)}
              />
            )}
          </div>
        </div>
        {receivingCall && !callAccepted ? ( <div className="meeting-id-caller-content">
        

            <label>{username} is calling...</label>
            <FiPhoneCall className="meeting-id-caller-icon" onClick={answerCall}/>

        
      </div> ) : null}
      </div>
      
      <div></div>
    </div>
  );
};

export default Meeting;
