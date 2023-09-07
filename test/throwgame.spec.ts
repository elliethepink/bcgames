//import throwGame from "../src/throwGame";
import { Bot } from "../src/bot";

const EventEmitter = require("events");

class FakeServerSocket extends EventEmitter {}

describe("ThrowGame", () => {
    let bot;

    let alice;
    let bob;
    let charlie;

    beforeEach(() => {
        alice = {
            Name: "Alice",
            MemberNumber: 1,
            IsRestrained: jest.fn().mockReturnValue(false),
            IsSlow: jest.fn().mockReturnValue(false),
            Appearance: [],
        };
        bob = {
            Name: "Bob",
            MemberNumber: 2,
            IsRestrained: jest.fn().mockReturnValue(false),
            IsSlow: jest.fn().mockReturnValue(false),
            Appearance: [],
        };
        charlie = {
            Name: "Charles",
            NickName: "Charlie",
            MemberNumber: 2,
            IsRestrained: jest.fn().mockReturnValue(false),
            IsSlow: jest.fn().mockReturnValue(false),
            Appearance: [],
        };
        global.Player = alice;
        global.ChatRoomCharacter = [alice, bob, charlie];
        global.ServerSocket = new FakeServerSocket();
        global.ServerSend = jest.fn();
        global.ChatRoomData = {
            Name: "test room",
        };

        bot = new Bot();
        //throwGame(bot);
        sendMsg(Player, "!load throwgame");
    });

    afterEach(() => {
        bot.dispose();
        bot = undefined;

        global.ServerSocket = undefined;
        global.Player = undefined;
        global.ChatRoomCharacter = undefined;
        global.ServerSend = undefined;
        global.ChatRoomData = undefined;
    });

    const sendMsg = (sender, msg) => {
        ServerSocket.emit('ChatRoomMessage', { Sender: sender.MemberNumber, Type: "Chat", Content: msg });
    };

    const sendEmote = (sender, msg) => {
        ServerSocket.emit('ChatRoomMessage', { Sender: sender.MemberNumber, Type: "Emote", Content: msg });
    };

    const emoteFromBot = (msg) => ["ChatRoomChat", {
        Type: "Emote",
        Content: expect.stringContaining("*" + msg),
    }];

    const emoteFromBotMatching = (msg) => ["ChatRoomChat", {
        Type: "Emote",
        Content: expect.stringMatching(msg),
    }];

    it("examines no bucket", () => {
        sendMsg(alice, "!bucket");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice has no bucket"));
    });

    it("doesn't let restrained characters give buckets", () => {
        Player.IsRestrained = jest.fn().mockReturnValue(true);
        sendMsg(alice, "!bucket bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice tries to reach the buckets"));
    });

    it("gives a bucket with ! command", () => {
        sendMsg(alice, "!bucket bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice hands Bob a bucket containing 5 tomatoes"));
    });

    it("lets players take a bucket with ! command", () => {
        sendMsg(alice, "!bucket alice");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice helps themselves to a bucket containing 5 tomatoes"));
    });

    describe.each([null, "tomatoes", "eggs"])("give/take %s", (projectile) => {
        it("gives a bucket with emote", () => {
            const of = projectile ? ` of ${projectile}` : '';
            sendEmote(alice, `gives a bucket${of} to Bob`);
            const shouldBe = projectile ?? "tomatoes";
            expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot(`Alice hands Bob a bucket containing 5 ${shouldBe}`));
        });

        it("lets players take a bucket with emote", () => {
            const of = projectile ? ` of ${projectile}` : '';
            sendEmote(alice, `takes a bucket${of}`);
            const shouldBe = projectile ?? "tomatoes";
            expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot(`Alice helps themselves to a bucket containing 5 ${shouldBe}`));
        });
    });

    it("gives a bucket of unknown projectile", () => {
        sendMsg(alice, "!bucket bob walruses");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice hands Bob a bucket containing 5 tomatoes"));
    });

    it("gives a bucket of custom projectile", () => {
        sendMsg(alice, "!addprojectile bus busses");
        sendMsg(alice, "!bucket bob busses");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice hands Bob a bucket containing 5 busses"));
    });

    it("runs out of projectiles", () => {
        sendMsg(alice, "!bucket alice");
        sendMsg(alice, "!throw");
        sendMsg(alice, "!throw");
        sendMsg(alice, "!throw");
        sendMsg(alice, "!throw");
        sendMsg(alice, "!throw");
        sendMsg(alice, "!throw");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice doesn't have anything to throw"));
    });

    it("fails if player tries to throw something they don't have", () => {
        sendMsg(alice, "!bucket alice");
        sendMsg(alice, "!throw spoon");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice tries to throw a spoon but doesn't have one"));
    });

    it("handles catastrophic miss", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValue(1);
        ServerSend.mockReset();
        sendMsg(alice, "!throw bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato disintegrates mid-throw"));
    });

    it("handles normal miss", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValue(6);
        ServerSend.mockReset();
        sendMsg(alice, "!throw bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBotMatching(/\*Alice\'s tomato (\w+) past Bob.*/));
    });

    it("handles hit", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(80).mockReturnValue(1);
        ServerSend.mockReset();
        sendMsg(alice, "!throw bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Bob on the right leg"));
    });

    it("handles direct hit", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(100).mockReturnValue(1);
        ServerSend.mockReset();
        sendMsg(alice, "!throw bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Bob in the forehead"));
    });

    it("handles direct hit with specific target", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(100).mockReturnValue(1);
        ServerSend.mockReset();
        sendMsg(alice, "!throw tomato bob mouth");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Bob in the mouth"));
    });

    it("handles throw with emote", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(80).mockReturnValue(1);
        ServerSend.mockReset();
        sendEmote(alice, "/me throws a tomato at bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Bob on the right leg"));
    });

    it("handles throw with emote", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(80).mockReturnValue(1);
        ServerSend.mockReset();
        sendEmote(alice, "/me throws a tomato at bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Bob on the right leg"));
    });

    it("handles direct hit with emote", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(100).mockReturnValue(1);
        ServerSend.mockReset();
        sendEmote(alice, "/me throws a tomato at bob's mouth");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Bob in the mouth"));
    });

    it("increases skill", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(55).mockReturnValue(1);
        ServerSend.mockReset();
        sendEmote(alice, "/me throws a tomato at bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBotMatching(/\*Alice\'s tomato (\w+) past Bob.*/));

        for (let i = 0; i < 20; ++i) {
            sendMsg(alice, "!bucket alice");
            for (let j = 0; j < 5; ++j) {
                sendEmote(alice, "/me throws a tomato at bob");
            }
        }

        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(55).mockReturnValue(1);
        ServerSend.mockReset();
        sendEmote(alice, "/me throws a tomato at bob");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Bob on the right leg"));
    });

    it("works with nicknames", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(80).mockReturnValue(1);
        ServerSend.mockReset();
        sendEmote(alice, "/me throws a tomato at charlie");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Charlie on the right leg"));
    });

    it("works with names when player has nickname", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(80).mockReturnValue(1);
        ServerSend.mockReset();
        sendEmote(alice, "/me throws a tomato at charles");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice's tomato hits Charlie on the right leg"));
    });

    it("sends stats for player that's done nothing", () => {
        sendMsg(alice, "!stats");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice hasn't done anything yet"));
    });

    it("sends stats for throws", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(80).mockReturnValue(1);
        sendEmote(alice, "/me throws a tomato at bob");
        ServerSend.mockReset();
        sendMsg(alice, "!stats");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Alice has made 1 shot on target with an accuracy of 100%"));
    });

    it("sends stats for strikes", () => {
        sendMsg(alice, "!bucket alice");
        bot.randInt = jest.fn().mockReturnValueOnce(80).mockReturnValue(1);
        sendEmote(alice, "/me throws a tomato at bob");
        ServerSend.mockReset();
        sendMsg(bob, "!stats");
        expect(ServerSend).toHaveBeenCalledWith(...emoteFromBot("Bob has been hit by 1 tomato"));
    });
});
