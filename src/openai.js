 import { Configuration, OpenAIApi } from "openai";
 import config from 'config'
 import { createReadStream } from 'fs'

class OpenAI {
    roles = {
        ASSISTANT: 'assistant',
        USER: 'user',
        SYSTEM : 'system'
    }

    constructor(){
        const configuration = new Configuration({
            apiKey: config.OPENAI_API_KEY,
          });

        this.openai = new OpenAIApi(configuration);
    }

    async chat(messages) {

        try {
            const response = await this.openai.createChatCompletion({model: 'gpt-3.5-turbo', messages})
            return response.data.choices[0].message
        } catch (error) {
            console.log('error while chatGPT', error.message);
        }

    }

    async transcription(filepath){

        try {
            const respose = await this.openai.createTranscription(
                createReadStream(filepath),
                'whisper-1'
            )
            return respose.data.text

        } catch (error) {
            console.log('openai transcription error', error.message);
        }
    }

    async generateImage(prompt){

        try {
            // console.log('openai Object', openai);

            const response = await this.openai.createImage({
                prompt,
                n: 1,
                size: "1024x1024",
              });

            return response.data.data[0].url

        } catch (error) {
            if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
                const errorMsg = error.response.data.error.message
                throw Error(errorMsg)
              } else {
                console.log('openai generation image error', error.message);
              }
        }
    }

    async createImageVariation(filepath){

        try {
            const response = await openai.createImageVariation(
                fs.createReadStream(`${filepath}_variation.png`),
                1,
                "1024x1024"
              );
            
            const image_url = response.data.data[0].url;

            return respose.data.text

        } catch (error) {
            if (error.response) {
                console.log(error.response.status);
                console.log(error.response.data);
              } else {
                console.log('openai create image variation error', error.message);
              }

        }
    }
}

export const openai = new OpenAI()