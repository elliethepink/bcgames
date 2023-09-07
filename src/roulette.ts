let bot: Bot;
let players = [];
let keyword: string;
let chosenPlayer;

function mangleKeyword(w) {
    return w[0] + "\u200B" + w.slice(1);
}

const onRoulette = (senderCharacter, senderData, args) => {
    if (args.length < 1) {
        bot.sendEmote("Usage: !roulette <start <keyword>|join|deal>");
        return;
    }

    switch (args[0]) {
        case "start":
            if (args.length < 2) {
                bot.sendEmote("Usage: !roulette <start <keyword>|join|deal>");
                return;
            }
            players = [];
            keyword = args[1];
            bot.sendEmote(
                `Shot roulette started (${keyword}). Use '!roulette join' to join.`
            );
            break;
        case "join":
            players.push(senderCharacter);
            bot.sendEmote(
                `${CharacterNickname(
                    senderCharacter
                )} has joined shot roulette.`
            );
            break;
        case "deal":
            chosenPlayer = bot.arrayPick(players);
            //const glass = Asset.find(a => a.Name == 'GlassFilled');
            for (const p of players) {
                const desc = `Maybe ${
                    p === chosenPlayer ? keyword : mangleKeyword(keyword)
                }?`;
                //;${p === chosenPlayer ? `, laced with ${keyword}` : ''}`;
                InventoryWear(
                    p,
                    "GlassFilled",
                    "ItemHandheld",
                    "#fff",
                    -10,
                    Player.MemberNumber,
                    {
                        MemberNumber: Player.MemberNumber,
                        MemberName: CharacterNickname(Player),
                        Name: "Roulette Shot",
                        Description: desc,
                    },
                    true
                );
                ChatRoomCharacterUpdate(p);

                /*const focusedCharacter = Object.assign({}, targetCharacter, {
                FocusGroup: AssetGroup.find(g => g.Name === glass.Group.Name),
            });*/

                //ChatRoomPublishAction(focusedCharacter, "ActionUse", null, { Asset: AssetGet("Female3DCG", item.Group.Name, item.Name)});
                //ChatRoomCharacterUpdate(targetCharacter);
            }
            bot.sendActionEmote("hands everyone a glass.");
            break;
        default:
            bot.sendEmote("Usage: !roulette <start|join|deal>");
            return;
    }
};

const onActivity = (senderCharacter, senderData, msg) => {
    if (msg.Content === "ChatSelf-ItemMouth-SipItem") {
        if (senderCharacter === chosenPlayer && !senderCharacter.LSCG) {
            bot.sendEmote(
                `${CharacterNickname(
                    senderCharacter
                )} starts to feel very strange.`
            );
        }
    }
};

export default function roulette(b: Bot) {
    bot = b;
    bot.commands.set("roulette", onRoulette);
    bot.on("activity", onActivity);
}
