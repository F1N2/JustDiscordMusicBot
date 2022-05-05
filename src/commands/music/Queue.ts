import { Music } from "../../modules/music";
import { Command } from "../../types/command";

export default new Command({
    name:"queue",
    description:"재생목록에 있는 곡 목록을 보여줍니다.",
    run: async ({ interaction }) => {
        const music = new Music(interaction);
        interaction.reply(await music.queue());
    }
});