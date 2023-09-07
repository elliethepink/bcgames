let bot: Bot;

let allDares: string[];
let unusedDares: string[];

function loadDares(): void {
    let result;

    result = localStorage.getItem("dares");
    if (result === null) {
        allDares = [];
    } else {
        allDares = JSON.parse(result);
    }

    result = localStorage.getItem("unusedDares");
    if (result === null) {
        unusedDares = [];
    } else {
        unusedDares = JSON.parse(result);
    }
}

function addDare(dare: string) {
    allDares.push(dare);
    unusedDares.push(dare);
    saveDares();
}

function saveDares() {
    localStorage.setItem("dares", JSON.stringify(allDares));
    localStorage.setItem("unusedDares", JSON.stringify(unusedDares));
}

function dareSummary(): string {
    return `${unusedDares.length} dares remain out of ${allDares.length} total.`;
}

const onDare = async (senderCharacter, senderData, args) => {
    if (args.length < 1) {
        bot.sendEmote(dareSummary());
        return;
    }

    switch (args[0]) {
        case "add":
            if (args.length < 2) {
                bot.sendEmote("Usage: !dare add <dare>");
                return;
            }
            addDare(args.slice(1).join(" "));
            bot.sendEmote(
                `Dare saved, thanks ${CharacterNickname(
                    senderCharacter
                )}! ${dareSummary()}`
            );

            break;
        case "draw":
            if (unusedDares.length === 0) {
                bot.sendEmote(`No more dares left!`);
                return;
            }
            bot.sendEmote(
                `${CharacterNickname(senderCharacter)} draws a dare card...`
            );
            await bot.waitSeconds(2);
            const n = bot.randInt(unusedDares.length);
            const dare = unusedDares[n];
            unusedDares.splice(n, 1);
            bot.sendEmote(
                `${CharacterNickname(
                    senderCharacter
                )} draws: ${dare}\n${dareSummary()}`
            );
            break;
        case "reset":
            unusedDares = Array.from(allDares);
            saveDares();
            bot.sendEmote(dareSummary());
            break;
        default:
            bot.sendEmote("Usage: !dare <add|draw|reset>");
            return;
    }
};

export default function dare(b: Bot) {
    bot = b;
    bot.commands.set("dare", onDare);
    loadDares();
}
