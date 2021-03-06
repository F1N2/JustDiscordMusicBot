import { music, selectButtonID, select_data } from "../../modules/music";
import { Command, CommandType, ExtendedInteraction } from "../../types/command";
import { Default, Error } from '../../modules/embed';
import { Search, URL } from "../../modules/youtube";
import { AudioPlayerStatus, createAudioPlayer, createAudioResource, DiscordGatewayAdapterCreator, joinVoiceChannel, NoSubscriberBehavior, VoiceConnection } from "@discordjs/voice";
import play from 'play-dl';
import { Button } from "../../modules/component";
import { IMusicButtonSelectData } from "../../types/music";
import { SlashCommandBuilder } from "@discordjs/builders";

export async function playMusic(connection: VoiceConnection, interaction: ExtendedInteraction) {
    let server = music[music.findIndex(e=>e.guild_id==interaction.guildId)];
    const stream = await play.stream(server.queue[0].url);
    const resource = createAudioResource(stream.stream,{inlineVolume:true,inputType:stream.type});
    resource.volume.setVolume(0.2);
    server.player = createAudioPlayer({
        behaviors: {
            noSubscriber: NoSubscriberBehavior.Play
        }
    });
    connection.subscribe(server.player);
    server.player.play(resource);
    server.voice_id = interaction.member.voice.channel.id;
    server.player.on(AudioPlayerStatus.Idle,()=>{
        if(server.option.repeat) server.queue.push(server.queue[0]);
        server.queue.shift();
        if(server.queue.length>0) playMusic(connection, interaction);
        else {
            server.queue = [];
            server.option = {
                repeat: false,
                pause: false
            };
            connection.destroy();
        }
    });
}

export function selectButton(id: string, option: IMusicButtonSelectData, interaction: ExtendedInteraction) {
    let server = music[music.findIndex(e=>e.guild_id==interaction.guildId)];
    let select = select_data[select_data.findIndex(e=>e.id==id)];
    if(option == 'CANCEL') {
        select.message.deleteReply();
        clearTimeout(select.removeTimer);
        select_data.splice(select_data.findIndex(e=>e.id===id),1);
    } else if(option == 'SELECT') {
        let voiceChannel = interaction.member.voice.channel;
        server.queue.push(select.queue[select.index]);
        const voiceConnection = joinVoiceChannel({
            channelId:voiceChannel.id,
            guildId:interaction.guildId,
            adapterCreator:interaction.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator
        });
        if(server.queue.length<=1) playMusic(voiceConnection, interaction);
        select.message.editReply({
            embeds: [
                Default({
                    title: `????????? ?????? ??????????????? ?????????`,
                    color: process.env.BOT_COLOR,
                    desc: [
                        `??? ?????? : ${select.queue[select.index].title}`,
                        `??? ????????? : ${select.queue[select.index].owner}`,
                        `??? ?????? : \`${select.queue[select.index].length}\``
                    ].join('\n'),
                    thumbnail: select.queue[select.index].image,
                    timestamp: true,
                    footer: {
                        text: interaction.user.tag,
                        iconURL: interaction.user.avatarURL()
                    }
                })
            ],
            components:[
                Button([
                    {
                        title: 'URL',
                        style: 'LINK',
                        url: select.queue[select.index].url
                    }
                ])
            ]
        });
        clearTimeout(select.removeTimer);
        select_data.splice(select_data.findIndex(e=>e.id===id),1);
    } else {
        select.index += option == 'PREVIOUS' ? -1 : 1;
        select.message.editReply({
            embeds: [
                Default({
                    title: `\`${select.title}\` ???????????? ( ${select.index+1} / ${select. queue.length} )`,
                    color: process.env.BOT_COLOR,
                    desc: [
                        `??? ?????? : ${select.queue[select.index].title}`,
                        `??? ????????? : ${select.queue[select.index].owner}`,
                        `??? ?????? : \`${select.queue[select.index].length}\``
                    ].join('\n'),
                    thumbnail: select.queue[select.index].image,
                    timestamp: true,
                    footer: {
                        text: interaction.user.tag,
                        iconURL: interaction.user.avatarURL()
                    }
                })
            ],
            components: [
                Button([
                    {
                        id: `SELECT_PREVIOUS_${interaction.user.id}_${select.id}`,
                        title: 'Previous',
                        style: 'SECONDARY',
                        disabled: select.index==0
                    },
                    {
                        id: `SELECT_NEXT_${interaction.user.id}_${select.id}`,
                        title: 'Next',
                        style: 'SECONDARY',
                        disabled: select.index==select.queue.length-1
                    },
                    {
                        id: `SELECT_SELECT_${interaction.user.id}_${select.id}`,
                        title: 'Select',
                        style: 'SUCCESS'
                    },
                    {
                        id: `SELECT_CANCEL_${interaction.user.id}_${select.id}`,
                        title: 'Cancel',
                        style: 'DANGER'
                    },
                    {
                        title: 'URL',
                        style: 'LINK',
                        url: select.queue[select.index].url
                    }
                ])
            ]
        });
    }
}

export default new Command({
    ...new SlashCommandBuilder()
        .setName('play')
        .setDescription('?????? ???????????????.')
        .addStringOption(option=>
            option.setName('keyword')
                .setDescription('????????? ???????????? ??????????????????.')
                .setRequired(true)    
        ) as unknown as CommandType,
    run: async ({ interaction }) => {
        const str = interaction.options.getString('keyword');
        const server = music[music.findIndex(e=>e.guild_id==interaction.guildId)];
        const voiceChannel = interaction.member.voice.channel;
        if(!voiceChannel) return interaction.reply(Error('???????????? ????????? ????????? ?????? ??????????????????.'));
        const permission = voiceChannel.permissionsFor(interaction.client.user);
        if(!permission.has('CONNECT')) return interaction.reply(Error('??????????????? ????????? ??? ?????? ????????? ????????????.'));
        if(!permission.has('SPEAK')) return interaction.reply(Error('?????????????????? ?????? ??? ?????? ????????? ????????????.'));
        if(server.id && server.id != voiceChannel.id) return interaction.reply(Error('?????? ?????? ??????????????? ????????? ??? ????????? ????????? ??? ????????????.'));
        try {
            if(str.startsWith('https://')) { /* URL */
                const data = await URL(str);
                data.forEach(e=>server.queue.push(e));
                const voiceConnection = joinVoiceChannel({
                    channelId: voiceChannel.id,
                    guildId: interaction.guildId,
                    adapterCreator: interaction.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator
                });
                if(server.queue.length<=data.length) playMusic(voiceConnection,interaction);
                return interaction.reply({
                    embeds: [
                        Default({
                            title: `${data.length}?????? ???${data.length>1?'???':''}??? ??????????????? ?????????????????????.`,
                            desc: [
                                `??? ?????? : ${data[0].title}`,
                                `??? ????????? : ${data[0].owner}`,
                                `??? ?????? : \`${data[0].length}\``
                            ].join('\n'),
                            color: process.env.BOT_COLOR,
                            thumbnail: data[0].image,
                            timestamp: true,
                            footer: {
                                text: interaction.user.tag,
                                iconURL: interaction.user.avatarURL()
                            }
                        })
                    ],
                    components: [
                        Button([
                            {
                                title:'URL',
                                style:'LINK',
                                url:data[0].url
                            }
                        ])
                    ]
                });
            } else { /* Keyword */
                const data = await Search(str);
                let id = selectButtonID();
                let select = select_data[select_data.findIndex(e=>e.id==id)];
                select.queue = data;
                select.title = str;
                await interaction.reply({
                    embeds: [
                        Default({
                            title: `\`${select.title}\` ???????????? ( ${select.index+1} / ${select. queue.length})`,
                            color: process.env.BOT_COLOR,
                            desc: [
                                `??? ?????? : ${select.queue[select.index].title}`,
                                `??? ????????? : ${select.queue[select.index].owner}`,
                                `??? ?????? : \`${select.queue[select.index].length}\``
                            ].join('\n'),
                            thumbnail: select.queue[select.index].image,
                            timestamp: true,
                            footer: {
                                text: interaction.user.tag,
                                iconURL: interaction.user.avatarURL()
                            }
                        })
                    ],
                    components: [
                        Button([
                            {
                                id: `SELECT_PREVIOUS_${interaction.user.id}_${select.id}`,
                                title: 'Previous',
                                style: 'SECONDARY',
                                disabled: select.index==0
                            },
                            {
                                id: `SELECT_NEXT_${interaction.user.id}_${select.id}`,
                                title: 'Next',
                                style: 'SECONDARY',
                                disabled: select.index==select.queue.length-1
                            },
                            {
                                id: `SELECT_SELECT_${interaction.user.id}_${select.id}`,
                                title: 'Select',
                                style: 'SUCCESS'
                            },
                            {
                                id: `SELECT_CANCEL_${interaction.user.id}_${select.id}`,
                                title: 'Cancel',
                                style: 'DANGER'
                            },
                            {
                                title: 'URL',
                                style: 'LINK',
                                url: select.queue[select.index].url
                            }
                        ])
                    ]
                });
                select.message = interaction;
                select.removeTimer = setTimeout(()=>{
                    select.message.deleteReply();
                    select_data.splice(select_data.findIndex(e=>e.id===id),1);
                },3*60*1000);
            }
        } catch(e) {
            console.error(e);
            return interaction.reply(Error(e.message));
        }
    }
});