import * as state from './state.js'

const personalCode = document.getElementById('per-code')
const copyBtn = document.getElementById('copyBtn')
const inpCode = document.getElementById('inp-code')
const chatBtn = document.getElementById('chatBtn')
const vidBtn = document.getElementById('vidBtn')
const recBox = document.getElementById('rec-box');
const pause = document.getElementById('pause');
const stop = document.getElementById('stop');
const resume = document.getElementById('resume');
const recBtn = document.getElementById('recBtn');

let collectedChunks = [];

const codec = "video/webm\;codecs=vp9";
const mCodec = {mimeType:codec}

let mediaRecorder;


recBtn.addEventListener('click',()=>{
    recBox.classList.remove('display-none')
    recBox.classList.add('display-flex')
    recBtn.style.pointerEvents = 'none';
    resume.classList.remove('display-flex')
    resume.classList.add('display-none')
    pause.classList.remove('display-none')
    pause.classList.add('display-flex');
    startRecording()
})

stop.addEventListener('click',()=>{
    recBox.classList.remove('display-flex')
    recBox.classList.add('display-none')
    recBtn.style.pointerEvents = 'auto';
    stopRecording()
})

pause.addEventListener('click',()=>{
  pause.classList.remove('display-flex')
  pause.classList.add('display-none')
  resume.classList.remove('display-none')
  resume.classList.add('display-flex');
  pauseRecording()
})

resume.addEventListener('click',()=>{
    resume.classList.remove('display-flex')
    resume.classList.add('display-none')
    pause.classList.remove('display-none')
    pause.classList.add('display-flex');
    resumeRecording()
})

function startRecording(){
    const rStream = state.getState().remoteStream;

    mediaRecorder = new MediaRecorder(rStream)
     
    
    mediaRecorder.ondataavailable=handleData;
    mediaRecorder.start()
}

function handleData(e){
  if(e.data.size>0){
  collectedChunks.push(e.data)
  console.log(collectedChunks,"handleDta")
  downloadData()
  }
}

function downloadData() {
    const blob = new Blob(collectedChunks, {
      type: "video/webm"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none;";
    a.href = url;
    a.download = "record.webm";
    a.click();
    console.log("downloading",url)
    window.URL.revokeObjectURL(url);
  }

 function stopRecording(){
     mediaRecorder.stop()
 }

 function pauseRecording(){
    mediaRecorder.pause()
}

function resumeRecording(){
    mediaRecorder.resume()
}

const hangUpVid = document.getElementById('hvid');
const hangUpChat=document.getElementById('hchat');



const socket = io("/");


let connectedUser;

let dataChannel;

const configuration=[
    {
        urls:'stun.l.google.com:19302'
    }
]


function getStream(){
    const localVideo = document.getElementById('myvid')
    navigator.mediaDevices.getUserMedia({
        audio:true,
        video:true
    }).then((stream)=>{
     state.changeLocalStream(stream)
     state.changeCallState("BOTH")
     updateCallState(state.getState().callState)
     localVideo.srcObject = stream;
    }).catch((err)=>console.log(err))
}

getStream()


let peer;

function peerConnection(){
     peer = new RTCPeerConnection(configuration)

     dataChannel = peer.createDataChannel('chat');

     
     peer.ondatachannel=(e)=>{
         const channel = e.channel;

    channel.onopen=()=>{
        console.log("Data Channel Is Open")
        }
   
    channel.onmessage=(e)=>{
       appendMessages(false,e.data)
      }

    channel.onerror=(e)=>{
        console.log(e)
    }

     }
    peer.onicecandidate = (event)=>{
     if(event.candidate){
         socket.emit('webRTC-signaling',{
             socketId:connectedUser.socketId,
             type:'ICE CANDIDATES',
             candidate:event.candidate
         })
     }
    }

    peer.onconnectionstatechange= (e)=>{
        if(e.connectionState==='connected'){
            console.log(e.connectionState)
        }
    }

    const remoteStream = new MediaStream();
    state.changeRemoteStream(remoteStream);
    const remoteVid = document.getElementById('remote-vid');
    remoteVid.srcObject = remoteStream;

    peer.ontrack = (e)=>{
        remoteStream.addTrack(e.track)
    }

    if(connectedUser.type==='VIDEO-CALL'){
      const localStream = state.getState().localStream;

      for(const stream of localStream.getTracks()){
          peer.addTrack(stream,localStream)
      }
    }
}


socket.on('connect',()=>{
    state.changeSocketId(socket.id)
   let vari = state.getState().callState
   console.log(vari)
   updateCallState(vari)

    personalCode.innerHTML = state.getState().socketId

    socket.on('pre-call',(data)=>{

        if(state.getState().callState==='Unavailable'){
            socket.emit('dungi',{
               socketId:data.callerId,
              action:'Caller Unavailable'
            })
        }
        else{
            connectedUser = {
                socketId:data.callerId,
                type:data.type
            }
            console.log(connectedUser)
            const {callerId,type} = data;
            if(type){
                createDialogBox(type)
            }
        }

      })

      socket.on('pre-ans',(data)=>{
          console.log("%")
      handleanswer(data)
      })

      socket.on('webRTC-signaling',(data)=>{
          console.log('webRtc emit')
          if(data.type==='OFFER'){
              handlewebrtcoffer(data)
          }
          else if(data.type==='ANSWER'){
              handlewebrtcanswer(data)
          }
          else if(data.type==='ICE CANDIDATES'){
              handleicecandidates(data)
          }
      })

      socket.on('hanging-up',()=>{
          handlehanged()
      })

      socket.on('rejected',()=>{
          handlerejected()
      })

      socket.on('randomId',(data)=>{
          console.log(data)
          handleStr(data)
      })
})

function handleStr(data){
  const {socketId,type} = data;
  if(socketId)
  {connectedUser = {
      socketId:socketId,
      type
  }
  socket.emit('pre-offer',{
      type,
      callId:socketId
  })
  showCallerSideBox()}
  else{
    showAnsBox('Caller Unavailable')
  }
}

function handlerejected(){
    const cont = document.querySelectorAll('.m-cont')
    const bl = document.getElementById('bl')
    bl.style.filter= 'blur(0px)'
    bl.style.pointerEvents = 'auto';
    enablebtns()
      cont.forEach((m)=>{
          m.remove()
      })
      connectedUser=[]
}

function updateCallState(state){
    console.log(state)
    if(state==='BOTH'){
        const vidBtn = document.querySelector('.vidBtn');
        const vidiBtn = document.querySelector('.vidiBtn');
        vidBtn.style.opacity = '1';
        vidBtn.style.pointerEvents = 'auto'
        vidiBtn.style.opacity = '1';
        vidiBtn.style.pointerEvents = 'auto'
        enablebtns()
    }
    else if(state==='CHAT-ONLY'){
        const vidBtn = document.querySelector('.vidBtn');
        const vidiBtn = document.querySelector('.vidiBtn');
        vidBtn.style.opacity = '0.5';
        vidBtn.style.pointerEvents = 'none'
        vidiBtn.style.opacity = '0.5';
        vidiBtn.style.pointerEvents = 'none'
       disablebtns()
    }
}
hangUpChat.addEventListener('click',()=>{
    socket.emit('hanged-up',{
        socketId:connectedUser.socketId
    })
    handlehanged()
})

hangUpVid.addEventListener('click',()=>{
    socket.emit('hanged-up',{
        socketId:connectedUser.socketId
    })
    handlehanged()
})

function handlehanged(){
    console.log("hanged")
    state.changeCallState('BOTH')
    if(peer){
        peer.close();
        peer = null;
    }
    if(connectedUser.type==='VIDEO-CALL'){
        const stre = state.getState().localStream
        stre.getVideoTracks()[0].enabled = true;
        stre.getAudioTracks()[0].enabled = true;
       updateUI('VIDEO-CALL')
       const local = state.getState().localStream;
       const localStream = document.getElementById('myvid');
       localStream.srcObject = local;
  
      state.getState().screenSharingStream.getTracks().forEach((track)=>track.stop())
  
      state.changeScreenSharingActive(false)
       connectedUser = []
    }
    else if(connectedUser.type==='CHAT-CALL'){
        updateUI('CHAT-CALL')
        connectedUser = []
    }
}

function updateUI(type){
 if(type==='VIDEO-CALL'){
     const firstMain = document.getElementById('firstmain');

     firstMain.style.pointerEvents = 'auto';
     enablebtns()
     firstMain.style.opacity= '1';

     const accBox = document.querySelector('.acc-box');

     accBox.classList.remove('display-flex');
     accBox.classList.add('display-none');

     const remoteVid = document.getElementById('remote-vid');

     remoteVid.srcObject = null;

     state.changeRemoteStream(null);

     const inpCode = document.getElementById('inp-code');
     inpCode.value = '';
 }
 else if (type==='CHAT-CALL'){
    const firstMain = document.getElementById('firstmain');

    firstMain.style.pointerEvents = 'auto';
    enablebtns()
    firstMain.style.opacity= '1';

    const chatBox = document.querySelector('.chatacc-box');
    chatBox.classList.remove('display-flex');
    chatBox.classList.add('display-none');

    const msgCont = document.getElementById('msgCont');
    const msgInp = document.querySelector('.msg-inp');

    msgCont.innerHTML = '';

    msgInp.classList.remove('display-flex');
    msgInp.classList.add('display-none');

    const inpCode = document.getElementById('inp-code');
    inpCode.value = '';
 }
}

const input = document.getElementById('inh');
const sendBtn = document.getElementById('btnCla')

input.addEventListener('keydown',(e)=>{
    const key = e.key;
    if(key==='Enter'){
        sendMessages(e.target.value)
        appendMessages(true)
        input.value ='';
        console.log('sent')
    }
})

sendBtn.addEventListener('click',()=>{
    const message = input.value;
    sendMessages(message)
    appendMessages(true)
    input.value = '';
})

function appendMessages(right,value){
  const msgCont = document.getElementById('msgCont');
  const msg = document.createElement('div');
  msg.classList.add('cut');
  if(right===true){
      msg.classList.add('right')
      msg.innerHTML = input.value;
  }
  else{
      msg.classList.add('left')
      msg.innerHTML = value;
  }
  
  msgCont.appendChild(msg)
}

function sendMessages(message){
    const messageString = JSON.stringify(message);
    dataChannel.send(message)

}

async function handleicecandidates(data){
    console.log(data,"can")
 try{await peer.addIceCandidate(data.candidate)}
 catch(err){
     console.error(err)
 }
}

async function handlewebrtcanswer(data){
    console.log(data,'answer');
    await peer.setRemoteDescription(data.answer)
}


async function handlewebrtcoffer(data){
    console.log(data,'offer')
    let dat = await peer.setRemoteDescription(data.offer);
    let answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    socket.emit('webRTC-signaling',{
        socketId:connectedUser.socketId,
        type:'ANSWER',
        answer:answer
    })
}


function createDialogBox(type){
    const typeInf = type==='CHAT-CALL'?"Chat":"Video"
  console.log(type)
  const main = document.getElementById('ma')
  const bl = document.getElementById('bl')
  bl.style.filter= 'blur(30px)'
  bl.style.pointerEvents = 'none';
  disablebtns()
  const cont = document.createElement('div')
  cont.setAttribute('id', 'namiz');
  const a = document.createElement('a');
  a.style.display='none';
  a.href="#firstmain";
  a.click()
  a.remove()
  cont.classList.add('m-cont')
  const header = document.createElement('h2')
  header.innerHTML = `Incomming ${typeInf} Call`
  header.classList.add('head')
  cont.appendChild(header)
  const img = document.createElement('img');
  img.src = "https://avatars.dicebear.com/api/human/:seed.svg";
  img.classList.add('imh')
  cont.appendChild(img)
  const btnCont = document.createElement('div')
  btnCont.classList.add('btnCont')
  cont.appendChild(btnCont)
  const accBtn = document.createElement('img');
  accBtn.src = './images/acceptCall.png'
  accBtn.classList.add('accBtn')
  accBtn.addEventListener('click',()=>{
      handlebtn('Call Accepted',typeInf)
      peerConnection()
      state.changeCallState('Unavailable')
  })
  btnCont.appendChild(accBtn)
  const decBtn = document.createElement('img');
  decBtn.src = './images/rejectCall.png'
  decBtn.classList.add('decBtn')
  decBtn.addEventListener('click',()=>{
      handlebtn('Call Declined')
  })
  btnCont.appendChild(decBtn)
  main.appendChild(cont)
}

function handlebtn(action,type){
    console.log('1',connectedUser.socketId,
    action)
    bl.style.filter= 'blur(0px)'
    bl.style.pointerEvents = 'auto';
    enablebtns()
    const cont = document.querySelector('.m-cont')
    const a = document.createElement('a')
    a.style.display = 'none'
    a.href=type==='Chat'?"#nam":"#kam"
    a.click()
    a.remove()
    cont.remove()
    if(action==='Call Accepted'){
        const area = document.querySelector('.area');
        area.classList.add('blur')
        if(type==='Chat'){
            const msgInp = document.querySelector('.msg-inp');
            const chatBox = document.querySelector('.chatacc-box');
        
            if(msgInp.classList.contains('display-none')){
                msgInp.classList.add('display-flex')
                msgInp.classList.remove('display-none')
            }
        
            if(chatBox.classList.contains('display-none')){
                chatBox.classList.add('display-flex')
                chatBox.classList.remove('display-none')
            }
        }
        else{
             const accBox = document.querySelector('.acc-box');
        
             if(accBox.classList.contains('display-none')){
                accBox.classList.add('display-flex')
                accBox.classList.remove('display-none')
             }
        }
    }
    socket.emit('pre-offer-answer',{
        callerId:connectedUser.socketId,
        action,
        type
    })
    }

function handleanswer(data){
    console.log('handle answer',data.action)
     const {action,type} = data;
    if(action==='Call Declined'){
        showAnsBox(action)
    }
    else if (action==='Caller Unavailable'){
        showAnsBox(action)
    }
    else if (action==='Call Accepted'){
        handlecallaccepted(type)
        state.changeCallState('Unavailable')
    }
    }

    async function sendOffer(){
     let offer = await peer.createOffer();
     await peer.setLocalDescription(offer)
     socket.emit('webRTC-signaling',{
       socketId:connectedUser.socketId,
       type:'OFFER',
       offer:offer
     })
    }

async function handlecallaccepted(type){
    peerConnection()
    await sendOffer()
    console.log(type)
    const a = document.createElement('a')
    a.style.display='none';
    a.href=type==='Chat'?'#nam':"#kam"
    a.click()
    a.remove()
    const bl = document.getElementById('bl')
    bl.style.filter= 'blur(0px)'
    bl.style.pointerEvents = 'auto';
    enablebtns()
    const mainCont = document.querySelector('.m1-cont');
    mainCont.remove();
    const area = document.querySelector('.area');
    area.classList.add('blur')
if(type==='Chat'){
    const msgInp = document.querySelector('.msg-inp');
    const chatBox = document.querySelector('.chatacc-box');

    if(msgInp.classList.contains('display-none')){
        msgInp.classList.add('display-flex')
        msgInp.classList.remove('display-none')
    }

    if(chatBox.classList.contains('display-none')){
        chatBox.classList.add('display-flex')
        chatBox.classList.remove('display-none')
    }
}
else{
     const accBox = document.querySelector('.acc-box');

     if(accBox.classList.contains('display-none')){
        accBox.classList.add('display-flex')
        accBox.classList.remove('display-none')
     }
     const msgInp = document.querySelector('.msg-inp');
     const chatBox = document.querySelector('.chatacc-box');

}
}

function showAnsBox(action){
    console.log("Gettting Ex1")
    window.addEventListener('click',()=>{
        const bl = document.getElementById('bl')
        bl.style.filter= 'blur(0px)'
        bl.style.pointerEvents = 'auto';
        enablebtns()
        const mainCont = document.querySelector('.m2-cont');
        mainCont&&mainCont.remove();
    })
     const mainCont = document.querySelector('.m1-cont');
     mainCont&&mainCont.remove();
     const main = document.getElementById('ma')
     const bl = document.getElementById('bl')
     bl.style.filter= 'blur(30px)'
     bl.style.pointerEvents = 'none';
     disablebtns()
     const cont = document.createElement('div')
     cont.setAttribute('id', 'namiz');
     const a = document.createElement('a');
     a.style.display='none';
     a.href="#firstmain";
     a.click()
     a.remove()
     cont.classList.add('m2-cont')
     const header = document.createElement('h2')
     header.innerHTML = `${action}`
     header.classList.add('head')
     cont.appendChild(header)
     const img = document.createElement('img');
     img.src = "https://avatars.dicebear.com/api/human/:seed.svg";
     img.classList.add('imh')
     cont.appendChild(img)
     const desc = document.createElement('h3');
     desc.innerHTML = action==='Call Declined'?'Call Has Been Declined By The User':'Caller Is Unavilable. Please Try Again Later!'
     desc.classList.add('desc')
     cont.appendChild(desc)
     main.appendChild(cont)
    }


copyBtn.addEventListener('click',()=>{
    const value = state.getState().socketId;
    console.log(value,'clicked')
    navigator.clipboard && navigator.clipboard.writeText(value)
})

function showCallerSideBox(){
    console.log("Getting Ex")
    const main = document.getElementById('ma')
    const bl = document.getElementById('bl')
    bl.style.filter= 'blur(30px)'
    bl.style.pointerEvents = 'none';
    disablebtns()
    const cont = document.createElement('div')
    const a = document.createElement('a');
    a.style.display='none';
    a.href="#firstmain";
    main.appendChild(a)
    a.click()
    a.remove()
    cont.classList.add('m1-cont')
    const header = document.createElement('h2')
    header.innerHTML = `Calling`
    header.classList.add('head')
    cont.appendChild(header)
    const img = document.createElement('img');
    img.src = "https://avatars.dicebear.com/api/human/:seed.svg";
    img.classList.add('imh')
    cont.appendChild(img)
    const btnCont = document.createElement('div')
    btnCont.classList.add('btnCont')
    cont.appendChild(btnCont)
    const decBtn = document.createElement('img');
    decBtn.src = './images/rejectCall.png'
    decBtn.classList.add('decBtn')
    decBtn.addEventListener('click',()=>{
      bl.style.filter= 'blur(0px)'
      bl.style.pointerEvents = 'auto';
        cont.remove()
        enablebtns()
        handleReject()
    })
    btnCont.appendChild(decBtn)
    main.appendChild(cont)
}

function handleReject(){
    socket.emit('reject',{
        socketId:connectedUser.socketId
    })
    connectedUser=[]
}

chatBtn.addEventListener('click',()=>{
    const value = inpCode.value;
    const type = 'CHAT-CALL'
    connectedUser = {
        socketId:value,
        type
    }
    console.log(connectedUser)
    socket.emit('pre-offer',{
        type,
        callId:value
    })
    showCallerSideBox()
    inpCode.value = '';
    
})

vidBtn.addEventListener('click',()=>{
    const value = inpCode.value;
    const type = 'VIDEO-CALL'
    connectedUser = {
        socketId:value,
        type
    }
    console.log(connectedUser)
    socket.emit('pre-offer',{
        type,
        callId:value
    })
    showCallerSideBox()
    inpCode.value = '';
})

const mic = document.getElementById('mic');
const micCont = document.getElementById('micCont');

const cam = document.getElementById('cam');
const camCont = document.getElementById('camCont')

const micOn = './images/mic.png';
const micOff = './images/micOff.png';

const camOn = './images/camera.png';
const camOff = './images/cameraOff.png'

micCont.addEventListener('click',()=>{
    const aud = state.getState().localStream;
    const audT = aud.getAudioTracks()[0].enabled;
    aud.getAudioTracks()[0].enabled = !audT;
    console.log(audT,!audT)
    mic.src = audT ? micOff : micOn
    console.log(mic.src)
})

camCont.addEventListener('click',()=>{
    const vid = state.getState().localStream;
    const vidT = vid.getVideoTracks()[0].enabled;
    vid.getVideoTracks()[0].enabled = !vidT;
    console.log(vid,!vidT)
    cam.src = vidT ? camOff : camOn
    console.log(cam.src)
})

const recCont = document.getElementById('recCont');

let screenStream;

recCont.addEventListener('click',async()=>{
    const scStream = state.getState().screenSharingStreamActive;
    if(scStream){

        try{
    const local = state.getState().localStream;

     const senders = peer.getSenders();
     const sender = senders.find((i)=>
     i.track.kind === local.getVideoTracks()[0].kind 
     )

     if(sender){
     sender.replaceTrack(local.getVideoTracks()[0])}

     const localStream = document.getElementById('myvid');
     localStream.srcObject = local;

    state.getState().screenSharingStream.getTracks().forEach((track)=>track.stop())

    state.changeScreenSharingActive(false)}
    catch(err){
        console.error(err)
    }
    }
    else{
     try{screenStream = await navigator.mediaDevices.getDisplayMedia({
         video:true
     });
     state.changeScreenSharing(screenStream);

     const senders = peer.getSenders();
     const sender = senders.find((i)=>
     i.track.kind === screenStream.getVideoTracks()[0].kind 
     )

     if(sender){
     sender.replaceTrack(screenStream.getVideoTracks()[0])}

     const localStream = document.getElementById('myvid');
     localStream.srcObject = screenStream;

     state.changeScreenSharingActive(true)
     console.log(localStream.srcObject)}
     catch(err){
         console.error(err)
     }
    }
})

const strangetChat = document.getElementById('stchat');
const strangetVid = document.getElementById('stvid');
const chech = document.getElementById('chech')

strangetChat.addEventListener('click',()=>{
    console.log('clicked')
    socket.emit('getRandomId',{
        type:"CHAT-CALL"
    })
})

strangetVid.addEventListener('click',()=>{
    console.log('clicked')
    socket.emit('getRandomId',{
        type:"VIDEO-CALL"
    })
})

let some = false;

chech.addEventListener('click',()=>{
        some=!some
    console.log(some,'exec')
    socket.emit('stranger-em',{
        status:some
    })
})
const btns = document.querySelectorAll('.disb')

function disablebtns(){
  btns.forEach((btn)=>{
      btn.style.pointerEvents = 'none';

  })
}

function enablebtns(){
    btns.forEach((btn)=>{
        btn.style.pointerEvents = 'auto';
    })
  }

  
  setInterval(() => {
    const ha = document.getElementById('msgCont')
    ha.scrollTop = ha.scrollHeight;
    console.log('end')
}, 1500);











