let bot: Bot;

const onPick = async (senderCharacter, _senderData, _args) => {
    const options = ChatRoomCharacter.filter(c => c.MemberNumber !== senderCharacter.MemberNumber && c.MemberNumber !== Player.MemberNumber);
    if (options.length === 0) {
        bot.sendEmote("It's just you & me here, pal.");
        return;
    }

    bot.sendEmote("Choosing a random person from the room...");
    await bot.waitSeconds(2);
    bot.sendEmote(`${CharacterNickname(bot.arrayPick(options))} has been selected!`);
};

export default function pickperson(b: Bot) {
    bot = b;
    bot.commands.set("pick", onPick);
}
