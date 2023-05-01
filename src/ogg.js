import axios from "axios"
import { createWriteStream } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import Ffmpeg from "fluent-ffmpeg"
import installer from '@ffmpeg-installer/ffmpeg'
import { removeFile } from "./utils.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

class OggConverter {
    constructor(){
        Ffmpeg.setFfmpegPath(installer.path)
    }

     toMp3(input, output){

        try {
            const outputPath = resolve(dirname(input), `${output}.mp3`)

            return new Promise((resolve, reject) => {
                Ffmpeg(input)
                    .inputOptions('-t 30')
                    .output(outputPath)
                    .on('end', () => {
                        removeFile(input)
                        resolve(outputPath)})
                    .on('error', () => reject(outputPath))
                    .run()
            })

            
        } catch (error) {
            console.log('error file mp3 creating' , error.message);
        }

    }

    async create(url, filename){
        try {
            const oggPath = resolve(__dirname, '../voices', `${filename}.ogg`)
            const response = await axios({
                method: 'get',
                url,
                responseType: 'stream'
            })

            return new Promise(resolve => {
                const stream = createWriteStream(oggPath)
                response.data.pipe(stream)
                stream.on('finish', ()=> resolve(oggPath))
            })

        } catch (error) {
            console.log('Error while creating ogg file', error.message);
        }

    }
}

export const ogg = new OggConverter