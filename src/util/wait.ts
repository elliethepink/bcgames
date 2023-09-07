export async function waitSeconds(t): Promise<void> {
    await new Promise((resolve) => {
        setTimeout(resolve, t * 1000);
        //setTimeout(resolve, t * 50);
    });
    if (!bot.gameRunning) throw new Error("Game terminated");
    return;
}
