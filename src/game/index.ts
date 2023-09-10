import {WebSocket} from "ws"
import {Game,PlayerSymbol} from './game'
import Logger from '../pino'

type PlayerMessage = {
    move: number,
}

type Player = {
    ws: WebSocket,
    symbol: PlayerSymbol,
}

function isValidPlayMessage(msg: PlayerMessage) : msg is PlayerMessage {
    return msg.move !== undefined 
}

function inRange(x:number): boolean {
    return x >= 0 && x < 9
}

function createOnMessage(
    game : Game, 
    player: Player,
    otherPlayer: Player,
) {
    return (msg: string | Buffer) => {
        if (player.ws.readyState === WebSocket.OPEN && otherPlayer.ws.readyState === WebSocket.OPEN) {
            const queue = msg.toString().trim().split('\n');
            while ( queue.length !== 0) {
                const data = queue.shift() as string;
                let msg: PlayerMessage;
                try {
                    console.log(data);
                    msg = JSON.parse(data) as PlayerMessage;
                }catch(err){
                    player.ws.send(JSON.stringify({
                        type: "error",
                        message: "invalid message format (should be json)",
                        ...game.getState(),
                    }));
                    console.log(err)
                    return;
                }
                if (game.turn !== player.symbol) {
                    player.ws.send(JSON.stringify({
                        type: "error",
                        message: "not your turn",
                        ...game.getState(),
                    }));
                    return;
                }
                if (!isValidPlayMessage(msg)) {
                    player.ws.send(JSON.stringify({
                        type: "error",
                        message: "expected move property in json",
                        ...game.getState(),
                    }));
                    return;
                }
                if (!inRange(msg.move)) {
                    player.ws.send(JSON.stringify({
                        type: "error",
                        message: "invalid move",
                        ...game.getState(),
                    }));
                    return;
                }
                const result = game.update(msg.move);
                if (!result) {
                    player.ws.send(JSON.stringify({
                        type: "error",
                        message: "square is taken",
                        ...game.getState(),
                    }));
                    return;
                }
                if (game.gameOver) {
                    player.ws.send(JSON.stringify({
                        type: "stop",
                        ...game.getState(),
                    }));
                    otherPlayer.ws.send(JSON.stringify({
                        type: "stop",
                        ...game.getState(),
                    }));
                    player.ws.terminate();
                    otherPlayer.ws.terminate();
                    return;
                }
                otherPlayer.ws.send(JSON.stringify({
                    type: "move",
                    ...game.getState(),
                }));
            }
        }
    }
}

function onClose(player: Player, otherPlayer: Player, game:Game) {
    return () => {
        game.winner = otherPlayer.symbol;
        game.gameOver = true;
        Logger.info("player disconnected")
        if (otherPlayer.ws.readyState === WebSocket.OPEN) {
            otherPlayer.ws.send(JSON.stringify({
                type: "stop",  
                ...game.getState(),
            }));
            otherPlayer.ws.terminate();
        }
    }
}


async function runGame(ws1: WebSocket, ws2: WebSocket) {
    const game = new Game();
    let p1: Player = {
        ws: ws1, 
        symbol: "x",
    }
    let p2: Player = {
        ws: ws2, 
        symbol: "o",
    }
    const onMessage1 = createOnMessage(game,p1,p2);
    const onMessage2 = createOnMessage(game,p2,p1);
    const onClose1 = onClose(p1,p2,game);
    const onClose2 = onClose(p2,p1,game);
    p1.ws.on('message',onMessage1);
    p2.ws.on('message',onMessage2);
    p1.ws.on('close',onClose1);
    p2.ws.on('close',onClose2);
    p1.ws.on('error',onClose1);
    p2.ws.on('error',onClose2);
    p1.ws.send(JSON.stringify({
        type: "move",
        ...game.getState(),
    }))
}

export function createRunner() {
    let p : WebSocket | undefined = undefined;
    return (player: WebSocket) => {
        if (p === undefined) {
            p = player;
            return;
        }
        if (p.readyState === WebSocket.CLOSED) {
            p = player;
            return;
        }
        Logger.info("a new game started")
        runGame(player,p)
        p = undefined
    }
}
