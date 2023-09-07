const TARGETS_BODY = [
    [["left leg", "leg", "legs"], "on the left leg"],
    [["right leg", "leg", "legs"], "on the right leg"],
    [["left thigh", "thigh", "thighs"], "on the left thigh"],
    [["right thigh", "thigh", "thighs"], "on the right thigh"],
    [["left arm", "arm", "arms"], "on the left arm"],
    [["right arm", "arm", "arms"], "on the right arm"],
    [["left hand", "hand", "hands"], "on the left hand"],
    [["right hand", "hand", "hands"], "on the right hand"],
    [["left foot", "foot", "feet"], "on the left foot"],
    [["right foot", "foot", "feet"], "on the right foot"],
    [["chest", "torso", "breasts", "boobs"], "in the chest"],
    [["tummy", "stomach"], "on the tummy"],
    [["crotch", "penis", "cock", "dick", "vagina", "pussy"], "in the crotch"],
];

const TARGETS_HEAD = [
    [["nose"], "right on the nose"],
    [["forehead"], "in the forehead"],
    [["mouth"], "in the mouth"],
    [["left cheek", "cheek", "cheeks"], "on the right cheek"],
    [["right cheek", "cheek", "cheeks"], "on the left cheek"],
    [["eyes", "face"], "right between the eyes"],
];

const PROJECTILES = [
    // singular, plural
    ["tomato", "tomatoes"],
    ["egg", "eggs"],
];

function publicName(character) {
    return character.NickName || character.Name;
}

function isPilloried(character) {
    return character.Appearance.some((a) => a.Name === "WoodenStocks");
}

function findCharacter(name) {
    if (!name) return undefined;
    return ChatRoomCharacter.find(
        (c) =>
            c.Name.toLowerCase() === name.toLowerCase() ||
            c.NickName?.toLowerCase() === name.toLowerCase() ||
            c.MemberNumber == name
    );
}

function pluralize(projectile, count) {
    const found = PROJECTILES.find((p) => p[0] === projectile);
    if (!found) return undefined;
    return count > 1 ? found[1] : found[0];
}

function describeProjectileArray(arr) {
    const counts = new Map();
    for (const i of arr) {
        if (!counts.has(i)) {
            counts.set(i, 1);
        } else {
            counts.set(i, counts.get(i) + 1);
        }
    }
    const sortedTuples = Array.from(counts.entries()).sort(
        (a, b) => b[1] - a[1]
    );

    const countPlusProjectile = (tup) =>
        `${tup[1]} ${pluralize(tup[0], tup[1])}`;

    if (sortedTuples.length === 1) {
        return countPlusProjectile(sortedTuples[0]);
    } else {
        return (
            sortedTuples
                .slice(0, sortedTuples.length - 1)
                .map((t) => countPlusProjectile(t))
                .join(", ") +
            " and " +
            countPlusProjectile(sortedTuples[sortedTuples.length - 1])
        );
    }
}

function totalThrows(charData) {
    return charData.hits + charData.misses;
}

class ThrowGame {
    constructor(private bot) {
        bot.commands.set("throw", this.commandThrow);
        bot.commands.set("bucket", this.commandBucket);
        bot.commands.set("stats", this.commandStats);
        bot.commands.set("addprojectile", this.commandAddProjectile);

        bot.on("emote", this.onEmote);

        this.players = new Map();
    }

    onEmote = (senderCharacter, senderData, msg) => {
        const matchesThrow =
            /.*throws a (\w+) at (\w+)(?:'s (\w+))?.*/.exec(msg.Content);
        const matchesBucketGive =
            /.*(?:gives|hands) .*? bucket .*?(?:of (\w+))?.*to (\w+)/.exec(
                msg.Content
            );
        const matchesBucketTake =
            /.*(?:takes|picks|steals|gets) .* bucket(?: of (\w+))?.*/.exec(
                msg.Content
            );
        const matchesBucketLook = /.*(?:looks|examines) .* bucket/.exec(
            msg.Content
        );
        if (matchesThrow) {
            this.doThrow(
                senderCharacter,
                senderData,
                matchesThrow[1],
                matchesThrow[2],
                matchesThrow[3]
            );
        } else if (matchesBucketGive) {
            this.doBucket(
                senderCharacter,
                senderData,
                matchesBucketGive[2],
                matchesBucketGive[1]
            );
        } else if (matchesBucketTake) {
            this.doBucket(
                senderCharacter,
                senderData,
                senderCharacter.MemberNumber + "",
                matchesBucketTake[1]
            );
        } else if (matchesBucketLook) {
            this.doBucketLook(senderCharacter, senderData);
        }
    };

    commandThrow = (senderCharacter, senderData, args) => {
        let projectileString;
        let targetString;
        let aimString;
        if (args.length >= 3 && args[1] === "at") {
            projectileString = args[0];

            if (args[2].includes("'s ")) {
                const parts = args[2].split("'s ");
                targetString = parts[0];
                aimString = parts[1];
            } else {
                targetString = args[2];
            }
        } else {
            for (const arg of args) {
                if (findCharacter(arg) && !targetString) {
                    targetString = arg;
                } else if (!projectileString) {
                    projectileString = arg;
                } else if (!aimString) {
                    aimString = arg;
                }
            }
        }
        this.doThrow(
            senderCharacter,
            senderData,
            projectileString,
            targetString,
            aimString
        );
    };

    doThrow(
        senderCharacter,
        senderData,
        projectileString,
        targetString,
        aimString
    ) {
        if (senderCharacter.IsRestrained()) {
            this.bot.sendEmote(
                `${publicName(senderCharacter)} struggles in their restraints.`
            );
            return;
        }

        if (senderData.bucket.length === 0) {
            this.bot.sendEmote(
                `${publicName(senderCharacter)} doesn't have anything to throw.`
            );
            return;
        }

        if (!projectileString) projectileString = "tomato";

        const projectileIdx = senderData.bucket.indexOf(projectileString);
        if (projectileIdx === -1) {
            if (projectileString) {
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )} tries to throw a ${projectileString} but doesn't have one.`
                );
            } else {
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )} doesn't have anything to throw.`
                );
            }
            return;
        }
        const projectile = senderData.bucket[projectileIdx];
        senderData.bucket.splice(projectileIdx, 1);

        const targetCharacter = findCharacter(targetString);
        const targetData = this.bot.getPlayerData(targetCharacter);

        if (!targetCharacter) {
            // can you miss if you weren't aiming anywhere?
            ++senderData.misses;
            const rnd = this.bot.randInt(100);
            if (rnd < 20 && ChatRoomCharacter.length > 1) {
                const whoHit = this.bot.arrayPick(
                    ChatRoomCharacter.filter(
                        (c) => c.MemberNumber !== senderCharacter.MemberNumber
                    )
                );
                const whoHitData = this.bot.getPlayerData(whoHit);
                if (rnd < 10) {
                    whoHitData.strikes.push(projectile);
                    this.bot.sendEmote(
                        `${publicName(
                            senderCharacter
                        )} throws a ${projectile} wildly, unexpectedly hitting ${publicName(
                            whoHit
                        )}.`
                    );
                } else {
                    this.bot.sendEmote(
                        `${publicName(
                            senderCharacter
                        )} throws a ${projectile} wildly, almost hitting ${publicName(
                            whoHit
                        )}.`
                    );
                }
            } else {
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )} throws a ${projectile} which splatters onto the ground.`
                );
            }
        } else {
            let aimTarget = TARGETS_BODY.find((t) => t[0].includes(aimString));
            if (!aimTarget)
                aimTarget = TARGETS_HEAD.find((t) => t[0].includes(aimString));

            const hitDifficulty = targetCharacter.IsSlow() ? 70 : 80;
            const directHitDifficulty = targetCharacter.IsSlow() ? 90 : 95;
            const senderSkill = Math.min(totalThrows(senderData) / 4, 50);
            const roll = this.bot.randInt(100) + 1 + senderSkill;

            if (roll >= hitDifficulty) {
                targetData.strikes.push(projectile);
                ++senderData.hits;
            } else {
                ++senderData.misses;
            }

            const verb = this.bot.arrayPick([
                "flies",
                "zooms",
                "whizzes",
                "speeds",
                "shoots",
                "zips",
                "whooshes",
                "sails",
            ]);

            if (roll >= directHitDifficulty) {
                if (!aimTarget) aimTarget = this.bot.arrayPick(TARGETS_HEAD);
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )}'s ${projectile} hits ${publicName(targetCharacter)} ${
                        aimTarget[1]
                    }!`
                );
            } else if (roll >= hitDifficulty) {
                if (isPilloried(targetCharacter) && this.bot.randInt(100) < 20) {
                    const splatterWhere = this.bot.randInt(100) > 60 ? "face" : "body";
                    this.bot.sendEmote(
                        `${publicName(
                            senderCharacter
                        )}'s ${projectile} hits ${publicName(
                            targetCharacter
                        )}'s stocks, splattering over their ${splatterWhere}.`
                    );
                } else {
                    const whereHit = this.bot.arrayPick([
                        ...TARGETS_BODY,
                        ...TARGETS_HEAD,
                    ]);
                    this.bot.sendEmote(
                        `${publicName(
                            senderCharacter
                        )}'s ${projectile} hits ${publicName(
                            targetCharacter
                        )} ${whereHit[1]}.`
                    );
                }
            } else if (roll >= hitDifficulty - 5) {
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )}'s ${projectile} narrowly ${verb} past ${publicName(
                        targetCharacter
                    )}.`
                );
            } else if (roll <= 5) {
                senderData.strikes.push(projectile);
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )}'s ${projectile} disintegrates mid-throw, showering them in bits of ${projectile}.`
                );
            } else {
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )}'s ${projectile} ${verb} past ${publicName(
                        targetCharacter
                    )}.`
                );
            }

            if (roll >= hitDifficulty) {
                this.maybeSendStrikeSummary(targetCharacter, targetData);
                this.maybeSendThrowSummary(senderCharacter, senderData);
            }
        }
    }

    commandBucket = (senderCharacter, senderData, args) => {
        if (args.length === 0) {
            this.doBucketLook(senderCharacter, senderData);
        } else {
            this.doBucket(senderCharacter, senderData, args[0], args[1]);
        }
    };

    doBucketLook = (senderCharacter, senderData) => {
        if (!senderData.hasBucket) {
            this.bot.sendEmote(
                `${publicName(
                    senderCharacter
                )} has no bucket. What is a life without a bucket?`
            );
        } else if (senderData.bucket.length === 0) {
            this.bot.sendEmote(`${publicName(senderCharacter)}'s bucket is empty.`);
        } else {
            this.bot.sendEmote(
                `${publicName(
                    senderCharacter
                )}'s bucket contains ${describeProjectileArray(
                    senderData.bucket
                )}.`
            );
        }
    };

    doBucket = (senderCharacter, senderData, targetString, contentsString) => {
        if (senderCharacter.IsRestrained()) {
            if (senderData.hasBucket) {
                this.bot.sendEmote(
                    `${publicName(
                        senderCharacter
                    )} tries to reach their bucket.`
                );
            } else {
                this.bot.sendEmote(
                    `${publicName(senderCharacter)} tries to reach the buckets.`
                );
            }
            return;
        }

        const targetCharacter = findCharacter(targetString);
        const targetPlayerData = this.bot.getPlayerData(targetCharacter);

        if (!targetCharacter) {
            this.bot.sendEmote(
                `${publicName(
                    senderCharacter
                )} tries to give a bucket to someone, but can't find them.`
            );
            return;
        }

        targetPlayerData.hasBucket = true;
        targetPlayerData.bucket = [];

        const chosenContents = PROJECTILES.find(
            (p) => p[1] === contentsString || p[0] === contentsString
        );
        let what = "tomato";
        if (chosenContents) what = chosenContents[0];
        for (let i = 0; i < 5; ++i) {
            targetPlayerData.bucket.push(what);
        }

        if (targetCharacter.MemberNumber === senderCharacter.MemberNumber) {
            //this.bot.sendEmote(`${publicName(senderCharacter)} helps themselves to a bucket of fruit containing ${targetPlayerData.bucket.length} rotten tomatoes.`);
            this.bot.sendEmote(
                `${publicName(
                    senderCharacter
                )} helps themselves to a bucket containing ${describeProjectileArray(
                    targetPlayerData.bucket
                )}.`
            );
        } else {
            this.bot.sendEmote(
                `${publicName(senderCharacter)} hands ${publicName(
                    targetCharacter
                )} a bucket containing ${describeProjectileArray(
                    targetPlayerData.bucket
                )}. Throw them with !throw target or like /me throws a tomato at target`
            );
        }
    };

    commandStats = (senderCharacter, senderData, _args) => {
        if (
            senderData.strikes.length === 0 &&
            senderData.hits === 0 &&
            senderData.misses === 0
        ) {
            this.bot.sendEmote(
                `${publicName(senderCharacter)} hasn't done anything yet.`
            );
            return;
        }
        if (senderData.strikes.length > 0) {
            this.sendStrikeSummary(senderCharacter, senderData);
        }
        if (senderData.hits > 0 || senderData.misses > 0) {
            this.sendThrowSummary(senderCharacter, senderData);
        }
    };

    commandAddProjectile = (senderCharacter, senderData, args) => {
        if (args.length < 2) {
            this.bot.sendWhisperEmote(
                senderCharacter,
                "Usage: !addprojectile singluar plural"
            );
            return;
        }

        if (senderCharacter.MemberNumber !== Player.MemberNumber) {
            return;
        }

        PROJECTILES.push([args[0], args[1]]);
        this.bot.sendWhisperEmote(
            senderCharacter,
            `Added projectile ${args[0]}/${args[1]}`
        );
    };

    maybeSendStrikeSummary(character, characterData) {
        if (
            characterData.strikes.length % 5 === 0 &&
            characterData.strikes.length > 0
        ) {
            this.sendStrikeSummary(character, characterData);
        }
    }

    sendStrikeSummary(character, characterData) {
        this.bot.sendEmote(
            `${publicName(character)} has been hit by ${describeProjectileArray(
                characterData.strikes
            )}.`
        );
    }

    maybeSendThrowSummary(character, characterData) {
        if (totalThrows(characterData) === 0) {
            this.bot.sendEmote(`${publicName(character)} hasn't thrown anything yet.`);
            return;
        }

        if (characterData.hits % 5 === 0 && characterData.hits > 0) {
            this.sendThrowSummary(character, characterData);
        }
    }

    sendThrowSummary(character, characterData) {
        if (totalThrows(characterData) === 0) {
            this.bot.sendEmote(`${publicName(character)} hasn't thrown anything yet.`);
            return;
        }

        const accuracy = Math.round(
            (characterData.hits / totalThrows(characterData)) * 100
        );
        this.bot.sendEmote(
            `${publicName(character)} has made ${
                characterData.hits
            } shot${characterData.hits > 1 ? 's' : ''} on target with an accuracy of ${accuracy}%.`
        );
    }
}

export default function throwgame(bot) {
    new ThrowGame(bot);
}

//if (typeof window !== 'undefined') window.ThrowGame = ThrowGame;
//if (typeof module !== 'undefined') module.exports.ThrowGame = ThrowGame;
