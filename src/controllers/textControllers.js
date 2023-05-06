import { png } from '../image.js'

export const photoGeneration = async (ctx) => {

    ctx.session.messages.push({role: openai.roles.USER, content: ctx.message.text});
    ctx.session.mode = 'picture';
    
    // const response = await openai.chat(ctx.session.messages)

    console.log('ctx.message.text', ctx.message.text);
    const imgUrl = await openai.generateImage(ctx.message.text)
    const fileName = `${String(ctx.message.from.id)}_generated`
    
    await png.create(imgUrl, fileName)
}

export const photoGeneration = async (ctx) => {

    ctx.session.messages.push({role: openai.roles.USER, content: ctx.message.text});
    ctx.session.mode = 'picture';

    // const response = await openai.chat(ctx.session.messages)

    console.log('ctx.message.text', ctx.message.text);
    const imgUrl = await openai.generateImage(ctx.message.text)
    const fileName = `${String(ctx.message.from.id)}_generated`
    
    await png.create(imgUrl, fileName)
    await ctx.sendPhoto(imgUrl)
}