// It sets up the Express server, connects to the MongoDB database
require('dotenv').config();
const mongoose = require('mongoose');
const app = require("express")();
const http = require("http").Server(app);
const User = require('./models/userModel');
const userRoute = require('./routes/userRoute');
const Chat = require('./models/chatModel');
const io = require('socket.io')(http);
app.use('/',userRoute);

mongoose.connect('mongodb://127.0.0.1:27017/dynamic-chat-app');

var usp = io.of('/user-namespace');

usp.on('connection',async function(socket){
    console.log('User Connected');

    var userId = socket.handshake.auth.token;

    await User.findByIdAndUpdate({_id: userId},{$set:{is_online:"1"}});

    //broadcasting that user is online 
    socket.broadcast.emit('getOnlineUser',{user_id:userId});

    socket.on('disconnect', async   function(){
        console.log('user Disconnected');

        var userId = socket.handshake.auth.token;
        await User.findByIdAndUpdate({_id: userId},{$set:{is_online:"0"}});

        //broadcasting that user is offline 
        socket.broadcast.emit('getOfflineUser',{user_id:userId});
    });

    //chatting implementation
    socket.on('newChat',function(data){
        socket.broadcast.emit('loadNewChat',data);
    })

    //load old chats
    socket.on('existsChat',async function(data){
        var chats = await Chat.find({$or:[
            {sender_id:data.sender_id,receiver_id:data.receiver_id},
            {sender_id:data.receiver_id,receiver_id:data.sender_id},
        ]});

        socket.emit('loadChats',{chats:chats});
    });

    //delete chats
    socket.on('chatDeleted',function(id){
        socket.broadcast.emit('chatMessageDeleted',id);
    });
    
    //update chats
    socket.on('chatUpdated',function(data){
        socket.broadcast.emit('chatMessageUpdated',data);
    });

    //new group chat
    socket.on('newGroupChat',function(data){
        socket.broadcast.emit('loadNewGroupChat',data); // broadcast group chat object
    });
    
    socket.on('groupChatDeleted',function(id){
        socket.broadcast.emit('groupChatMessageDeleted', id); // broadcast  chat deleted id
    });

    socket.on('groupChatUpdated',function(data){        
        socket.broadcast.emit('groupChatMessageUpdated',data);
    });
});

http.listen(3000, function() {
    console.log("Server Started");
})
  