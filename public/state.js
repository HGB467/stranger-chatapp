let state = {
    socketId:null,
    localStream:null,
    remoteStream:null,
    recordingActive:false,
    screenSharingStream:null,
    screenSharingStreamActive:false,
    allowConnFromStrangers:null,
    callState:'CHAT-ONLY'
}

export const changeCallState=(callState)=>{
    state={
        ...state,
        callState
    }
}

export const changeSocketId=(socketId)=>{
    state={
        ...state,
        socketId
    }
}

export const changeLocalStream=(localStream)=>{
  state={
      ...state,
      localStream
  }
}

export const changeRemoteStream=(remoteStream)=>{
    state={
        ...state,
        remoteStream
    }
}

export const recordingActive=(recordingActive)=>{
    state={
        ...state,
        recordingActive
    }
}

export const changeScreenSharing=(screenSharingStream)=>{
   state={
       ...state,
       screenSharingStream
   }
}

export const changeScreenSharingActive=(screenSharingStreamActive)=>{
    state={
        ...state,
        screenSharingStreamActive
    }
 }

export const changeConnFromStrangers=(allowConnFromStrangers)=>{
   state={
       ...state,
       allowConnFromStrangers
   }
}

export const getState=()=>{
    return state;
}