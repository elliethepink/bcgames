import { waitSeconds } from "./util/wait";

// todo: honour blocks
// pick free group

const GROUPS = [
    "ItemFeet",
    "ItemLegs",
    //"ItemPelvis",
    //"ItemTorso",
    //"ItemTorso2",
    "ItemArms",
    "ItemHands",
    "ItemMouth",
    "ItemHead",
    "ItemDevices",
];

let bot: Bot;
let item;
let targetCharacter;

function itemFilter(item) {
    if (item.Effect.includes("FillVulva")) return false;
    if (item.Fetish?.includes("ABDL")) return false;
    if (
        ["LuckyWheel", "WheelFortune", "Stitches", "PantiesMask"].includes(
            item.Name
        )
    )
        return false;
    return true;
}

function filteredItemsForGroupAndCharacter(groupName, character) {
    //return Asset.filter(a => a.Group.Name === groupName).filter(itemFilter).filter(a => WheelFortuneCanWear(a.Name, a.Group.Name));
    return Asset.filter((a) => a.Group.Name === groupName)
        .filter(itemFilter)
        .filter((a) => InventoryAllow(character, a));
}

function moveBot(right: boolean) {
    ServerSend("ChatRoomAdmin", {
        MemberNumber: Player.MemberNumber,
        Action: right ? "MoveRight" : "MoveLeft",
        Publish: false,
    });
}

function characterPosition(character) {
    return ChatRoomCharacter.findIndex(
        (c) => c.MemberNumber === character.MemberNumber
    );
}

async function botRun() {
    try {
        while (true) {
            await waitSeconds(2);
            CharacterSetFacialExpression(Player, "Eyes", "Closed");
            ChatRoomCharacterUpdate(Player);
            await waitSeconds(2);
            CharacterSetFacialExpression(Player, "Emoticon", "Sleep");
            ChatRoomCharacterUpdate(Player);
            await waitSeconds(60);

            if (!selectItemAndTarget()) {
                await waitSeconds(60);
                continue;
            }

            CharacterSetFacialExpression(Player, "Emoticon", null);
            ChatRoomCharacterUpdate(Player);
            await waitSeconds(2);
            CharacterSetFacialExpression(Player, "Eyes", null);
            ChatRoomCharacterUpdate(Player);
            await waitSeconds(2);

            //bot.sendEmote(`BEEP BOOP. BindBot has selected item: ${item.Description.toLowerCase()}`);
            await waitSeconds(3);

            while (
                characterPosition(targetCharacter) !== -1 &&
                Math.abs(
                    characterPosition(targetCharacter) -
                        characterPosition(Player)
                ) > 1
            ) {
                moveBot(
                    characterPosition(Player) <
                        characterPosition(targetCharacter)
                );
                await waitSeconds(1);
            }
            if (characterPosition(targetCharacter) === -1) {
                continue;
            }
            InventoryWear(targetCharacter, item.Name, item.Group.Name);

            const focusedCharacter = Object.assign({}, targetCharacter, {
                FocusGroup: AssetGroup.find((g) => g.Name === item.Group.Name),
            });

            ChatRoomPublishAction(focusedCharacter, "ActionUse", null, {
                Asset: AssetGet("Female3DCG", item.Group.Name, item.Name),
            });
            ChatRoomCharacterUpdate(targetCharacter);
            await waitSeconds(2);

            if (
                bot.randInt(100) < 33 &&
                InventoryDoesItemAllowLock({ Asset: item })
            ) {
                //InventoryLock(focusedCharacter, InventoryGet(targetCharacter, item.Group.Name), lock, Player.MemberNumber, true);
                InventoryLock(
                    focusedCharacter,
                    item.Group.Name,
                    "ExclusivePadlock",
                    Player.MemberNumber,
                    true
                );
                //ChatRoomCharacterUpdate(targetCharacter);
                const lock = {
                    Asset: AssetGet(
                        "Female3DCG",
                        "ItemMisc",
                        "ExclusivePadlock"
                    ),
                };
                ChatRoomPublishAction(
                    focusedCharacter,
                    "ActionAddLock",
                    {
                        Asset: AssetGet(
                            "Female3DCG",
                            item.Group.Name,
                            item.Name
                        ),
                    },
                    lock
                );
                await waitSeconds(2);
            }

            while (characterPosition(Player) > 0) {
                moveBot(false);
                await waitSeconds(1);
            }
        }
    } catch (e) {
        bot.sendEmote(`BindBot terminated`);
        throw e;
    }
}

function selectItemAndTarget(): boolean {
    if (ChatRoomCharacter.length === 1) return false;

    targetCharacter = undefined;
    item = undefined;
    const tries = 30;

    while (!item && tries > 0) {
        targetCharacter = bot.arrayPick(
            ChatRoomCharacter.filter(
                (c) => c.MemberNumber !== Player.MemberNumber
            ).filter((c) => c.ItemPermission <= 2)
        );

        const possibleGroups = GROUPS.filter(
            (g) => !InventoryGet(targetCharacter, g)
        );
        if (possibleGroups.length === 0) continue;
        const group = bot.arrayPick(possibleGroups);
        const possibleItems = filteredItemsForGroupAndCharacter(
            group,
            targetCharacter
        );
        if (possibleItems.length === 0) {
            untriedGroups = untriedGroups.filter((g) => g !== group);
        } else {
            item = bot.arrayPick(possibleItems);
        }
    }

    return true;
}

export default function bindbot(b: Bot) {
    bot = b;
    botRun();
}
