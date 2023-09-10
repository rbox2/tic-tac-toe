const winPattern = [
    0b111000000,0b000111000,0b000000111,
    0b100010001,0b001010100,
];

const drawPattern = 0b111111111;

function bitBoardToString(o : number,x: number) : string {
    let result = ''; 
    for (let i = 0 ; i < 9 ; i++) {
        let pos = 1 << i;
        if ( (pos & o) !== 0  ) {
            result += 'O,';
        }else if ((pos & x) !== 0) {
            result += 'X,'
        }else {
            result += '_,'
        }
    }
    return result;
} 

export type PlayerSymbol = 'x' | 'o';
type Result = PlayerSymbol | 'd';

type GameState = {
    board: string,
    gameOver: boolean,
    winner?: Result,
}

export class Game {

    private board : number;
    private xBitBoard: number;
    private oBitBoard: number;
    public turn: PlayerSymbol; 
    public gameOver : boolean;
    public winner: PlayerSymbol | undefined;
    
    constructor(){
        this.xBitBoard = 0;
        this.oBitBoard = 0;
        this.board = this.xBitBoard | this.oBitBoard;
        this.turn = 'x';
        this.winner = undefined;
        this.gameOver = false;
    }

    private updateBoard(player: PlayerSymbol, newBoard: number) : void {
        if (player === 'x') {
            this.xBitBoard = newBoard;
            this.board = this.xBitBoard | this.oBitBoard;
            return;
        }
        this.oBitBoard = newBoard;
        this.board = this.xBitBoard | this.oBitBoard;
    }

    private getBoard(player: PlayerSymbol) : number {
        if (player === 'x') {
            return this.xBitBoard;
        }
        return this.oBitBoard;
    }
    
    public checkGameOver() {
        let playerBoard = this.getBoard('x');
        for (const p of winPattern) {
            if ((playerBoard & p) === p) {
                this.gameOver = true;
                this.winner = 'x';
                return 
            }
        }
        playerBoard = this.getBoard('o');
        for (const p of winPattern) {
            if ((playerBoard & p) === p) {
                this.gameOver = true;
                this.winner = 'o';
                return ;
            }
        }
        if ((this.board & drawPattern) === drawPattern ) {
            this.gameOver = true;
        }
    }

    public update(move: number) : boolean {
        if (this.gameOver) {
            return false;
        }
        move = 1 << move;
        if ((this.board & move) === 0) {
            this.updateBoard(this.turn , this.getBoard(this.turn) | move);
            this.turn = this.turn === 'o' ? 'x' : 'o';
            this.checkGameOver();
            return true;
        }
        return false;
    }

    public getState() : GameState {
        return {
            board: bitBoardToString(this.oBitBoard,this.xBitBoard),
            gameOver: this.gameOver,
            winner: this.winner,
        }
    }
}
