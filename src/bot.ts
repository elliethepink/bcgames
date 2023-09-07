import bindbot from "./bindbot";
import roulette from "./roulette";
import throwgame from "./throwgame";
import dare from "./dare";
import pickperson from "./pickperson";

import { EventEmitter } from "events";

const GAMES = {
    bindbot,
    roulette,
    throwgame,
    dare,
    pickperson,
};

export function findCharacter(name) {
    if (!name) return undefined;
    return ChatRoomCharacter.find(
        (c) =>
            c.Name.toLowerCase() === name.toLowerCase() ||
            c.NickName?.toLowerCase() === name.toLowerCase() ||
            c.MemberNumber == name
    );
}

export class Bot extends EventEmitter {
    public gameRunning = false;
    private commands: Map<string, () => void>;

    constructor() {
        super();
        ServerSocket.on("ChatRoomMessage", this.onMessage);
        ServerSocket.on("ChatRoomLeave", this.onLeave);
        this.reset();
    }

    private reset() {
        this.removeAllListeners();
        this.commands = new Map();
        this.commands.set("load", this.onLoad);
        this.commands.set("unload", this.onUnload);
        this.players = new Map();
        this.gameRunning = false;
        this.roomName = undefined;
    }

    private onLoad = (senderCharacter, senderData, args) => {
        if (args.length === 0) {
            this.sendEmote("No game specified.");
            return;
        }
        if (senderCharacter.MemberNumber !== Player.MemberNumber) {
            this.sendEmote(
                `I can't let you do that, ${CharacterNickname(senderCharacter)}`
            );
            return;
        }

        if (this.gameRunning) {
            this.sendEmote(`Game already running.`);
            return;
        }

        const game = GAMES[args[0]];
        if (!game) {
            this.sendEmote("I can't find that game.");
            return;
        }

        this.gameRunning = true;
        game(this);
        this.roomName = ChatRoomData.Name;
        this.sendEmote(`Loaded ${args[0]}!`);
    };

    private onUnload = (senderCharacter, _senderData, _args) => {
        if (senderCharacter.MemberNumber !== Player.MemberNumber) {
            this.sendEmote(
                `I can't let you do that, ${CharacterNickname(senderCharacter)}`
            );
            return;
        }
        this.reset();
        this.sendEmote("Game unloaded.");
    };

    private dispose() {
        ServerSocket.removeListener("ChatRoomMessage", this.onMessage);
        ServerSocket.removeListener("ChatRoomLeave", this.onLeave);
    }

    private onMessage = (data) => {
        if (
            ChatRoomData.Name !== this.roomName &&
            !data.Content.startsWith("!load")
        )
            return;

        const senderCharacter = ChatRoomCharacter.find(
            (c) => c.MemberNumber === data.Sender
        );
        if (!senderCharacter) return;
        const senderData = this.getPlayerData(senderCharacter);

        if (data.Type === "Chat" || data.Type === "Whisper") {
            if (data.Content[0] !== "!") return;

            const parts = data.Content.substring(1).split(" ");
            if (this.commands.has(parts[0])) {
                const fn = this.commands.get(parts[0]);
                fn(senderCharacter, senderData, parts.slice(1));
            }
        } else if (data.Type === "Activity") {
            this.emit("activity", senderCharacter, senderData, data);
        } else if (data.Type === "Emote") {
            this.emit("emote", senderCharacter, senderData, data);
        }
    };

    private onLeave = () => {
        this.reset();
    };

    public sendEmote = (content) => {
        console.log("sending: " + content);
        ServerSend("ChatRoomChat", { Content: "*" + content, Type: "Emote" });
    };

    public sendActionEmote = (content) => {
        console.log("sending: " + content);
        ServerSend("ChatRoomChat", { Content: content, Type: "Emote" });
    };

    public sendWhisperEmote = (dest, content) => {
        ServerSend("ChatRoomChat", {
            Content: content,
            Type: "Emote",
            Target: dest,
        });
    };

    public getPlayerData(character) {
        if (!character) return undefined;

        if (!this.players.has(character.MemberNumber)) {
            this.players.set(character.MemberNumber, {
                hits: 0,
                misses: 0,
                strikes: [], // things they've been hit with
                hasBucket: false,
                bucket: [],
            });
        }
        return this.players.get(character.MemberNumber);
    }

    public arrayPick(a) {
        return a[this.randInt(a.length)];
    }

    public randInt(lessThan): number {
        return Math.floor(Math.random() * lessThan);
    }

    public async waitSeconds(t): Promise<void> {
        await new Promise((resolve) => {
            setTimeout(resolve, t * 1000);
            //setTimeout(resolve, t * 50);
        });
        if (!this.gameRunning) throw new Error("Game terminated");
        return;
    }
}

async function init(): void {
    while (typeof ServerSocket === "undefined" || ServerSocket === null) {
        setTimeout(init, 3000);
        return;
    }
    window.bcGameBot = new Bot();
}

if (typeof window !== "undefined") init();
