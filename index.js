const config = require("/home/mike/bottestingserver/config.json");

// Load up the discord.js library
const Discord = require("discord.js");
const fs = require("fs")

const botResponse = require(config.path + "response.js");
const botManage = require(config.path + "manage.js");
const botManageRules = require(config.path + "manageRules.js");
const botAddNewRule = require(config.path + "addnewrule.js");
const botEcho = require(config.path + "botEcho.js");

let rollUsers = {}
let roll_message_link = ""


/********************************************** start code **********************************************/

// This is your client. Some people call it `bot`, some people call it `self`, 
// some might call it `cootchie`. Either way, when you see `client.something`, or `bot.something`,
// this is what we're refering to. Your client.
const client = new Discord.Client();

client.on("ready", () => {
    // This event will run if the bot starts, and logs in, successfully.
    console.log(`Update successful!`); 
    // Example of changing the bot's playing game to something useful. `client.user` is what the
    // docs refer to as the "ClientUser".
    client.user.setActivity(config.playing);

    // set up users for rolling posts
    client.users.cache.forEach(function(value){
        rollUsers[value.id] = false
    })
});

client.on("message", async message => {
// This event will run on every single message received, from any channel or DM.
  
    if (message.author.bot) return;

    // if a user sends a direct message to the bot, copy that message and send to me in a dm
    if (client.channels.cache.find(channel => channel.id === message.channel.id).type === "dm"){
        if (message.author.id !== config.myid)
        {
            let newMessage = {}
            newMessage["content"] = client.users.cache.find(user => user.id === message.author.id).username + "\n" + message.content
            if (message.attachments.first() != null){
                newMessage["files"] = [message.attachments.first().url]
            }
            let dmuser = client.users.cache.find(client => client.id === config.myid)
            if (dmuser.dmChannel){
                dmuser.dmChannel.send(newMessage)
            }
            else{
                dmuser.createDM()
                .then(channel => {
                    channel.send(newMessage)
                })
            }
        }
    }
    // 4chan roll shenanigans
    else{
        if (message.content.substring(0,4).toLowerCase() === "roll"){
            client.users.cache.forEach(function(value){
                rollUsers[value.id] = true
            })
            roll_message_link = "https://discordapp.com/channels/" + message.channel.guild.id + "/" + message.channel.id + "/" + message.id
            message.channel.send("Lets roll some numbers!")
        }
        if (rollUsers[message.author.id] == true){
            message.channel.send(roll_message_link + "\n" + message.id)
            rollUsers[message.author.id] = false
        }
    }

    // if a user is adding a rule, interact with the bot add rule manager
    if (fs.existsSync(config.path + message.author.id + "user.json") && message.content.indexOf(config.command) !== 0){
        let addjson = JSON.parse(fs.readFileSync(config.path + message.author.id + "user.json"))
        if (Date.now()-addjson["timestamp"] > config.timeout*1000){
            fs.unlinkSync(config.path + message.author.id + "user.json")
        }
        else if (message.content === "quit" || message.content === "q"){
            message.channel.send("Quit Adding Command")
            fs.unlinkSync(config.path + message.author.id + "user.json")
            return
        }
        else if (addjson["channel"] == message.channel.id){
            botAddNewRule.addNewRule(client, message)
            return
        }
    }

    // if a user is echoing, use the bot echo manager
    if (fs.existsSync(config.path + message.author.id + "echo.json") && message.content.indexOf(config.command) !== 0){
        let echojson = JSON.parse(fs.readFileSync(config.path + message.author.id + "echo.json"))
        if (Date.now()-echojson["timestamp"] <= config.timeout*1000){
            if (message.content === "quit" || message.content === "q"){
                message.channel.send("Quit Echo")
                fs.unlinkSync(config.path + message.author.id + "echo.json")
                return
            }
            botEcho.echoMessage(client, message, echojson["channel"])
        }
        fs.unlinkSync(config.path + message.author.id + "echo.json")
    }

    // if the message starts with '+' use the bot default command manager
    if (message.content.indexOf(config.prefix) === 0){
        // Here we separate our "command" name, and our "arguments" for the command. 
        // e.g. if we have the message "+say Is this the real life?" , we'll get the following:
        // command = say
        // args = ["Is", "this", "the", "real", "life?"]
        const args = message.content.slice(config.prefix.length).trim().split(/ +/g)
        const command = args.shift().toLowerCase()
        
        botManage.execManage(client, message, args, command);
    }
    else if (message.content.indexOf(config.command) === 0){
        botManageRules.manageRules(client, message)
    }
    else {
        botResponse.botMessage(client, message)
    }

});

client.on("voiceStateUpdate", (oldState, newState) => {
    // This event triggers when a user enters or leave the voice channel.

    if (oldState.member.id === config.botid) return;

    botResponse.botVoice(client, oldState, newState);  
  
});

client.login(config.token);
