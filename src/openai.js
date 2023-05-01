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
}

export const openai = new OpenAI()