var discord = require("discord.js"); // Discord API
var yaml    = require("js-yaml");    // Parse .yaml files
var request = require("request");
var fs      = require("fs");

function Chomper(){
  this.client = new discord.Client();

  this.client.on("ready", () => {
    this.client.user.setActivity("commands /help", {"type":"listening"});
    console.log(`Start: ${this.client.user.tag}`);
  });

  this.client.on("message", msg => {
    var text    = msg.content;
    var command = text.split(" ")[0];
    var args    = text.split(" "); args.shift();

    if     (command === "/help"  )   this.Help    (msg);
    else if(command === "/points")   this.Points  (msg);
    else if(command === "/rank")     this.Rank    (msg);
    else if(command === "/register") this.Register(msg, args);
    else if(command === "/list")     this.List    (msg);
  });

  this.LoadConfig()
  .then((data) => {
    this.discordBotToken = data["discordBotToken"];
    this.riotApiKey      = data["riotApiKey"];
    this.fizzId          = data["fizzId"];
    this.client.login(this.discordBotToken);
  });

  this.LoadData()
  .then((data) => {
    this.users = data;
  });
}

// COMMAND: /help
Chomper.prototype.Help = function(msg){
  String.prototype.AddLine = function(text){return this + text + "\n";}

  var text = "";
  text = text.AddLine("/help   | Displays this helpbox");
  text = text.AddLine("/points | Shows you how many Fizz points you have");
  text = text.AddLine("/rank   | Shows you your current rank");
  text = text.AddLine("/list   | Lists users that are currently registered");

  msg.channel.send("```"+text+"```");
}

// COMMAND: /list
Chomper.prototype.List = function(msg, args){
  console.log("===== LIST =====");
  var qwe = msg.guild.members.get("262262172036366336");
  var name = qwe.user.username;
  if(qwe.nickname)
    name = qwe.nickname;
  console.log(name);
  return;

  for(var discordId in this.users){
    var summonerId = this.users[discordId];

    var riotApi = `https://na1.api.riotgames.com/lol/summoner/v3/summoners/${summonerId}?api_key=${this.riotApiKey}`;

    // (function(){
      request(riotApi, {json:true}, function(err, res, body){
        console.log(`${discordId} => ${body["name"]}`);
        // console.log(`${discordId} => ${summonerId}`);
      });
    // })();
  }
}

// COMMAND: /register
Chomper.prototype.Register = function(msg, args){
  if(msg.mentions.members.array().length == 0){
    console.log("No user specified with @");
    return;
  }

  if(msg.mentions.members.array().length > 1){
    console.log("You can only specify one user");
    return;
  }

  // var memberFirst = msg.mentions.members.first();
  var discordId = args[0];
  var re        = new RegExp("<@!?(.*)>");
  discordId     = re.exec(discordId)[1];

  args.shift();
  var summonerName = args.join(" ");

  console.log(discordId);
  console.log(summonerName);

  this.GetSummonerId(summonerName)
  .then((summonerId) => {
    this.users[discordId] = summonerId;
    fs.writeFile("data.json", JSON.stringify(this.users), function(err){
      msg.channel.send("Registration successful");
    });
  })
  .catch(err => {
    var errorMessage = "Unknown error";
    if(err == 404) errorMessage = "That summoner name wasn't found";
    msg.channel.send(`Error ${err}: ${errorMessage}`);
  });
}

// COMMAND: /points
Chomper.prototype.Points = function(msg){
  var authorId = msg.author["id"];
  var summonerId = this.users[authorId];

  if(!(authorId in this.users)){
    msg.channel.send(`${msg.author}: Your summoner name isn't linked to your Discord account. Contact <@262262172036366336> or <@212961703598489603> for assistance`);
    return;
  }

  this.GetFizzPoints(summonerId)
  .then((o) => {
    msg.channel.send(`${msg.author}: Fizz points = ${o}`);
  })
  .catch(err => {
    var errorMessage = "Unknown error";
    if(err == 404) errorMessage = "That summoner name wasn't found";
    if(err == 404) errorMessage = "That summoner name wasn't found";
    if(err == 404) errorMessage = "That summoner name wasn't found";
    msg.channel.send(`Error ${err}: ${errorMessage}`);
  });
}

// COMMAND: /rank
Chomper.prototype.Rank = function(msg){
  var authorId = msg.author["id"];
  var summonerId = this.users[authorId];

  if(!(authorId in this.users)){
    msg.channel.send(`${msg.author}: Your summoner name isn't linked to your Discord account. Contact <@262262172036366336> or <@212961703598489603> for assistance`);
    return;
  }

  this.GetRank(summonerId)
  .then((o) => {
    msg.channel.send(`${msg.author}: Your current rank is ${o}`);
  });
}

Chomper.prototype.LoadConfig = function(){return new Promise((done, reject) => {
  fs.readFile("config.yml", "utf-8", function(err, data){
    done(yaml.safeLoad(data));
  });
})}

Chomper.prototype.LoadData = function(){return new Promise((done, reject) => {
  fs.readFile("data.json", "utf-8", function(err, data){
    done(JSON.parse(data));
  });
})}

Chomper.prototype.GetSummonerId = function(name){return new Promise((done, reject) => {
  var summonerName = encodeURIComponent(name);
  var apiGetSummonerId = `https://na1.api.riotgames.com/lol/summoner/v3/summoners/by-name/${summonerName}?api_key=${this.riotApiKey}`;

  request(apiGetSummonerId, {json:true}, function(err, res, body){
    // If there was a problem, then I'll get a status code included in the response from Riot's API
    if(body["status"]){
      reject(body["status"]["status_code"]);
      return;
    }

    done(body["id"]);
  });
})}

Chomper.prototype.GetFizzPoints = function(summonerId){return new Promise((done, reject) => {
  var apiGetFizzPoints = `https://na1.api.riotgames.com/lol/champion-mastery/v3/champion-masteries/by-summoner/${summonerId}/by-champion/${this.fizzId}?api_key=${this.riotApiKey}`;

  request(apiGetFizzPoints, {json:true}, function(err, res, body){
    // If there was a problem, then I'll get a status code included in the response from Riot's API
    if(body["status"]){
      reject(body["status"]["status_code"]);
      return;
    }

    done(body["championPoints"]);
  });
})}

Chomper.prototype.GetRank = function(summonerId){return new Promise((done, reject) => {
  var apiGetRank = `https://na1.api.riotgames.com/lol/league/v3/positions/by-summoner/${summonerId}?api_key=${this.riotApiKey}`;

  request(apiGetRank, {json:true}, function(err, res, body){
    if(body.length == 0){
      done("You aren't currently ranked")
      return;
    }

    var bestRank = "UNRANKED";
    var rankings = [
      "UNRANKED",
      "BRONZE",
      "SILVER",
      "GOLD",
      "PLATINUM",
      "DIAMOND",
      "MASTER",
      "CHALLENGER"
    ];

    for(var i = 0; i < body.length; i++){
      var best = rankings.indexOf(bestRank);
      var test = rankings.indexOf(body[i]["tier"]);
      if(test > best)
        bestRank = body[i]["tier"];
    }

    done(bestRank);
  });
})}

var chomper = new Chomper();
