import axios from "axios"
import { createWriteStream } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

class ImageConverter {
    constructor(){
    }

    async create(url, filename){
        try {
            const imgPath = resolve(__dirname, '../images', `${filename}.png`)
            const response = await axios({
                method: 'get',
                url,
                responseType: 'stream'
            })

            return new Promise(resolve => {
                const stream = createWriteStream(imgPath)
                response.data.pipe(stream)
                stream.on('finish', ()=> resolve(imgPath))
            })

        } catch (error) {
            console.log('Error while creating png file', error.message);
        }
    }
}

export const png = new ImageConverter