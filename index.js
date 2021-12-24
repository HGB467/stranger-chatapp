const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const port = process.env.PORT || 3000;
const io = require("socket.io")(server)


app.use(express.static('public'));

app.get('/',(req,res)=>{
    res.sendFile('./index.html')
})

let connectedUsers = [];
let connectedStrangers=[];

io.on('connection',socket=>{
    console.log(socket.id)
    connectedUsers.push(socket.id)
    console.log(connectedUsers)

    socket.on('pre-offer',({type,callId})=>{
      console.log(callId,type)
      const Callie = connectedUsers.find((user)=>
      user === callId
      )
      if(Callie){
        io.to(Callie).emit('pre-call',{
            callerId:socket.id,
            type
        })
      }
      else{
          io.to(socket.id).emit('pre-ans',{
              callerId:null,
              action:'Caller Unavailable'
          })
      }


    })

    socket.on('dungi',(data)=>{
        io.to(data.socketId).emit('pre-ans',{
            callerId:null,
            action:data.action
        })
    })

    socket.on('pre-offer-answer',(data)=>{
      const {callerId,action} = data;
      const Callie = connectedUsers.find((user)=>
      user === callerId
      )
      console.log(Callie,"5",action)
      if(Callie){
          io.to(Callie).emit('pre-ans',data)
      }

    })

    socket.on('webRTC-signaling',(data)=>{
        const {socketId} = data;

        const Callie = connectedUsers.find((user)=>
        user === socketId
        )

        if(Callie){
        io.to(Callie).emit('webRTC-signaling',data)
        }
    })

    socket.on('hanged-up',({socketId})=>{
        const Callie = connectedUsers.find((user)=>
        user === socketId
        )
        if(Callie){
            io.to(Callie).emit('hanging-up')
        }
    })

    socket.on('reject',({socketId})=>{
        const Callie = connectedUsers.find((user)=>
        user === socketId
        )
        if(Callie){
            io.to(Callie).emit('rejected')
        }
    })

    socket.on('stranger-em',({status})=>{
     if(status){
      connectedStrangers.push(socket.id)
     }
     else{
         connectedStrangers = connectedStrangers.filter((f)=>f!==socket.id)
     }
     console.log(connectedStrangers,'str')
    })

    socket.on('getRandomId',(data)=>{
        console.log('cal')
        let newConnecStrangers=connectedStrangers.filter(f=>f!==socket.id);

        console.log(newConnecStrangers,'new')

        if(newConnecStrangers.length>0){
            newConnecStrangers = newConnecStrangers[Math.floor(Math.random()*newConnecStrangers.length)]
            io.to(socket.id).emit('randomId',{      
           socketId:newConnecStrangers,
           type:data.type
        })
        }
        else{
            io.to(socket.id).emit('randomId',{
                socketId:null,
                type:null
            })
        }
    })

    socket.on("disconnect",()=>{
        connectedUsers = connectedUsers.filter((conU)=>
        conU !==socket.id
        )
       

        connectedStrangers = connectedStrangers.filter((f)=>f!==socket.id)

        console.log(connectedUsers)
    })
})


server.listen(port,()=>{
    console.log("App Listening Successfully!")
})

