import {WebSocketServer} from 'ws'
import {createRunner} from './game'
import Logger from './pino'

const port = 8080;
const wss = new WebSocketServer({ port });
const runner = createRunner();

wss.on("listening",()=>{
    console.log(`listening on ${port}`);
})

wss.on("connection",(player)=>{
    Logger.info(`player connected`);
    runner(player);
})
