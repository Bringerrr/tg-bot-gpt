import c from "config";
import { Telegraf, session } from "telegraf";
import { message } from 'telegraf/filters'
import { code } from 'telegraf/format'
import { ogg } from './ogg.js'
import { png } from './image.js'
import { openai } from "./openai.js";

console.log(c.get('TEST'));

const bot = new Telegraf(c.get('TG_TOKEN'), {polling: true});

const mode ={
    chat: 'chatGPT',
    picture: 'picture'
}

const INITIAL_SESSION = { 
    mode: mode.chat,
    messages: []
}

bot.use(session())

bot.command('new', async (ctx)=> {
    ctx.session = INITIAL_SESSION;
    await ctx.reply('Жду вашего голосового или текстового сообщения')
})

bot.hears('Вариант 1 - Чат', (ctx) => {
    ctx.session.mode = mode.chat;
});
bot.hears('Вариант 2 - Картинка', (ctx) => {
    ctx.session.mode = mode.picture;
});

bot.command('start', async (ctx)=> {
    ctx.session = INITIAL_SESSION;
    await ctx.reply('Жду вашего голосового или текстового сообщения')

    await ctx.reply("Чем бы вы хотели заняться?", {
        reply_markup: {
          keyboard: [
            ["Вариант 1 - Чат", "Вариант 2 - Картинка"],
          ],
          one_time_keyboard: true
        }})

})

// bot.on('text', contains('Option 1'), (ctx) => {
//     // Do something when a message containing 'subscribe' is received
//   });


bot.on(message('voice'), async (ctx)=> {
    ctx.session ??= INITIAL_SESSION;
    try {
        await ctx.reply(code('Обрабатываю запрос ...'))
        const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id)
        const linkHref = String(link.href)
        const userId = String(ctx.message.from.id)
        const oggPath = await ogg.create(linkHref, userId)
        const mp3Path = await ogg.toMp3(oggPath, userId)

        const text = await openai.transcription(mp3Path);

        await ctx.reply(code(`Ваш запрос: ${text}`))

        ctx.session.messages.push({role: openai.roles.USER, content: text});
        const response = await openai.chat(ctx.session.messages)

        ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});
        
        await ctx.reply(response.content)
    } catch (error) {
        console.log('Error while voice msg', error)        
    }
})

bot.on('photo', async (ctx)=> {
    ctx.session ??= INITIAL_SESSION;
    try {
        await ctx.reply(code('Принимаю картинку ...'))

        // const chatId = msg.chat.id;
        // const photo = msg.photo.pop(); // Get the photo with the highest resolution
        // bot.sendPhoto(chatId, photo.file_id);

        const fileId = ctx.message.photo[ctx.message.photo.length-2].file_id
        const link = await ctx.telegram.getFileLink(fileId)
        const linkHref = String(link.href)
        const userId = String(ctx.message.from.id)

        const pngPath = await png.create(linkHref, userId)
        
        console.log('ctx', ctx.message.photo);
        await ctx.reply(`fileId ${fileId}`)
    } catch (error) {
        console.log('Error while photo msg', error)        
    }

})

// sending photo back
// bot.on('message', (msg) => {
//     const chatId = msg.chat.id;
  
//     // send an image as an attachment
//     bot.sendPhoto(chatId, 'path_to_your_image.jpg', {
//       caption: 'This is your image!'
//     });
//   });

bot.on(message('text'), async (ctx)=> {
    ctx.session ??= INITIAL_SESSION;
    try {
        await ctx.reply(code('Обрабатываю запрос ...'))

        ctx.session.messages.push({role: openai.roles.USER, content: ctx.message.text});

        const response = await openai.chat(ctx.session.messages)

        ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});
        
        await ctx.reply(response.content)
    } catch (error) {
        console.log('Error while text msg', error)        
    }

})

bot.launch()

process.once('SIGINT', ()=> bot.stop("SIGINT"))
process.once('SIGTERM', ()=> bot.stop("SIGTERM"))