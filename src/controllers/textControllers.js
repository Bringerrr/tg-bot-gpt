import { png } from '../image.js'
import { code } from 'telegraf/format'
import { openai } from "../openai.js";

import midjourney from "midjourney-client"

export const imageGeneratorTypes = {
    openai: 'DALL·E',
    midjourney: 'Midjourney',  
} 

export const photoGeneration = async ({ctx, idea, generator = imageGeneratorTypes.openai}) => {
    try {    
        let imgUrl = null;
        let midjourneyError = false
    
        await ctx.reply(code(`${generator} генерирует изображение ...`))
    
        if(generator === imageGeneratorTypes.midjourney){
            try {
                imgUrl = await midjourney(idea);
            } catch (error) {
                midjourneyError = true
                console.log('generating midjourney error' , error);
                await ctx.reply('К сожалению, Midjourney сейчас недоступен. Так что DALL·E сейчас сгенерирует изображение вместе него')
            }
        }
        
        if(midjourneyError || (generator === imageGeneratorTypes.openai)){
            imgUrl = await openai.generateImage(idea)
        }
    
        const fileName = `${String(ctx.message.from.id)}_generated`
        const generatedPicturePath = await png.create(imgUrl, fileName)
    
        await ctx.replyWithPhoto({
            source: generatedPicturePath
        })
        
    } catch (error) {
        await ctx.reply(`Не удалось сгенерировать изображение по следующей причине: ${error.message}`)
        throw Error(error)
    }

}

export const justChatting = async (ctx) => {

    await ctx.reply(code('Обрабатываю запрос ...'))

    ctx.session.messages.push({role: openai.roles.USER, content: ctx.message.text});

    const response = await openai.chat(ctx.session.messages)

    ctx.session.messages.push({role: openai.roles.ASSISTANT, content: response.content});

    await ctx.reply(response.content)

}