import { music } from "../../modules/music";
import { Command } from "../../types/command";
import { Default, Error } from "../../modules/embed";

export default new Command({
    name:"skip",
    description:"곡을 스킵합니다.",
    options:[
        {
            type:4,
            name:"count",
            description:"스킵할 곡의 갯수를 입력해주세요.",
            required:false
        }
    ],
    run: async ({ interaction }) => {
        const num = interaction.options.getInteger('count')||1;
        const server = music[music.findIndex(e=>e.guild_id==interaction.guildId)];
        const voiceChannel = interaction.member.voice.channel;
        if(!voiceChannel) return interaction.reply(Error('보이스챗 정보를 가지고 오지 못하였습니다.'));
        const permission = voiceChannel.permissionsFor(interaction.client.user);
        if(!permission.has('CONNECT')) return interaction.reply(Error('보이스챗에 들어갈 수 있는 권한이 없습니다.'));
        if(!permission.has('SPEAK')) return interaction.reply(Error('보이스챗에서 말할 수 있는 권한이 없습니다.'));
        if(server.id && server.id != voiceChannel.id) return interaction.reply(Error('봇이 다른 보이스챗에 있어서 이 명령을 실행할 수 없습니다.'));
        if(server.queue.length<num) return interaction.reply(Error('입력한 값이 재생목록에 있는 곡의 수보다 너무 커서 스킵을 할 수 없습니다.'));
        for(let i=0;i<num-1;i++) {
            if(server.option.repeat) server.queue.push(server.queue[0]);
            server.queue.shift();
        }
        server.player.stop();
        return interaction.reply({
            embeds:[
                Default({
                    title: '곡 스킵됨',
                    desc: [
                        `➯ 제목 : ${server.queue[1].title}`,
                        `➯ 게시자 : ${server.queue[1].owner}`,
                        `➯ 길이 : \`${server.queue[1].length}\``
                    ].join('\n'),
                    color: process.env.BOT_COLOR,
                    thumbnail: server.queue[1].image,
                    timestamp: true,
                    footer: {
                        text: interaction.user.tag,
                        iconURL: interaction.user.avatarURL()
                    }
                })
            ]
        });
    }
});