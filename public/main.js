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

const configuration={
    iceServers:[
        {
            url:'turn:numb.viagenie.ca',
            credential:'muazkh',
            username:'webrtc@live.com',
        },
        {
            url:'stun:stun.I.google.com:19302'
        }
    ]
}


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


     peer.onicecandidate = (event)=>{
        if(event.candidate){
            socket.emit('webRTC-signaling',{
                socketId:connectedUser.socketId,
                type:'ICE CANDIDATES',
                candidate:event.candidate
            })
        }
       }

       dataChannel = peer.createDataChannel('chat');

     peer.ondatachannel=(e)=>{
         const channel = e.channel;
   
    channel.onmessage=(e)=>{
       appendMessages(false,e.data)
       const ha = document.getElementById('msgCont')
       if(ha.scrollTop>=ha.scrollHeight-880){
        ha.scrollTop = ha.scrollHeight;
       }
      }

    channel.onerror=(e)=>{
        console.log(e)
    }

     }

    peer.onconnectionstatechange= (e)=>{
        if(e.connectionState==='connected'){
            
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
            
            const {callerId,type} = data;
            if(type){
                createDialogBox(type)
            }
        }

      })

      socket.on('pre-ans',(data)=>{
          
      handleanswer(data)
      })

      socket.on('webRTC-signaling',(data)=>{
          
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

// Uncomment In Case Of Using Default Input(With No Emoji Support)

// input.addEventListener('keydown',(e)=>{
//     const key = e.key;
//     if(key==='Enter'){
//         sendMessages(e.target.value)
//         appendMessages(true)
//         input.value ='';
//         
//     }
// })

// input2&&input2.addEventListener('keydown',(e)=>{
//     const key = e.key;
//     if(key==='Enter'){
//         sendMessages(e.target.value)
//         appendMessages(true)
//         input.value ='';
//         
//     }
// })

sendBtn.addEventListener('click',()=>{
    const message = input.value;
    sendMessages(message)
    appendMessages(true)
    input.value = '';
    const newg = document.querySelector('.emoji-wysiwyg-editor');
    newg.innerHTML = input.value;
    const ha = document.getElementById('msgCont')
    ha.scrollTop = ha.scrollHeight;
    if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) {
    setTimeout(()=>{
        const elem = document.getElementById('msgCont');
        elem.lastChild.setAttribute('id','calem');
        const a = document.createElement('a');
        a.href="#calem";
        a.click();
        a.remove();
        elem.lastChild.removeAttribute('id')
    },0)}
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
    
 try{await peer.addIceCandidate(data.candidate)}
 catch(err){
     console.error(err)
 }
}

async function handlewebrtcanswer(data){
    ;
    await peer.setRemoteDescription(data.answer)
}


async function handlewebrtcoffer(data){
    
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
    
    navigator.clipboard && navigator.clipboard.writeText(value)
})

function showCallerSideBox(){
    
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
    
    mic.src = audT ? micOff : micOn
    
})

camCont.addEventListener('click',()=>{
    const vid = state.getState().localStream;
    const vidT = vid.getVideoTracks()[0].enabled;
    vid.getVideoTracks()[0].enabled = !vidT;
    
    cam.src = vidT ? camOff : camOn
    
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
     }
     catch(err){
         console.error(err)
     }
    }
})

const strangetChat = document.getElementById('stchat');
const strangetVid = document.getElementById('stvid');
const chech = document.getElementById('chech')

strangetChat.addEventListener('click',()=>{
    
    socket.emit('getRandomId',{
        type:"CHAT-CALL"
    })
})

strangetVid.addEventListener('click',()=>{
    
    socket.emit('getRandomId',{
        type:"VIDEO-CALL"
    })
})

let some = false;

chech.addEventListener('click',()=>{
        some=!some
    
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


$(function() {
    // Initializes and creates emoji set from sprite sheet
    window.emojiPicker = new EmojiPicker({
      emojiable_selector: '[data-emojiable=true]',
      assetsPath: 'http://onesignal.github.io/emoji-picker/lib/img/',
      popupButtonClasses: 'fa fa-smile-o'
    });
    // Finds all elements with `emojiable_selector` and converts them to rich emoji input fields
    // You may want to delay this step if you have dynamically created input fields that appear later in the loading process
    // It can be called as many times as necessary; previously converted input fields will not be converted again
    window.emojiPicker.discover();
  });

  setTimeout(() => {
    if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
    || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) { 
    const emoji = document.querySelector('.emoji-picker-icon');
    emoji?emoji.style.display = 'none':''

  }},3000);

  function checkMob(){
    const nam = document.getElementById('nam');
    nam.style.margin = '0 1.5vw'
    const recCont = document.getElementById('recCont');
    recCont.style.display = 'none';
  }

  if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|iris|kindle|Android|Silk|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(navigator.userAgent) 
  || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(navigator.userAgent.substr(0,4))) { 
  checkMob()}






