import c from "config";
import { Telegraf, session } from "telegraf";
import { message } from "telegraf/filters";
import { code } from "telegraf/format";
import { ogg } from "./ogg.js";
import { png } from "./image.js";
import { openai } from "./openai.js";
import {
  imageGeneratorTypes,
  justChatting,
  photoGeneration,
} from "./controllers/textControllers.js";

const bot = new Telegraf(c.get("TG_TOKEN"));

const mode = {
  chat: "chatGPT",
  picture: "picture",
};

const INITIAL_SESSION = {
  mode: mode.chat,
  messages: [],
  free: false,
  picture: {
    generator: null,
    idea: null,
  },
};

const questions = {
  activity: {
    [mode.chat]: "Вариант 1 - Чат",
    [mode.picture]: "Вариант 2 - Картинка",
  },
  pictureGenerateWay: {
    random: "Да, сгенерируй идею для рисунка",
    custom: "Я сам(а)!",
  },
  pictureGenerationTools: imageGeneratorTypes,
  needsEnglishTranslation: {
    yes: "Я справлюсь !",
    no: "Лондон из зэ кэпитал оф Грэйт Британ",
  },
  confirmPictureIdea: {
    yes: "Да. Давай нирисуем это !",
    no: "Нет. Предложи что-нибудь еще.",
    custom: "Дай я сам напишу",
  },
};

const arrayOfPicGenerators = Object.values(questions.pictureGenerationTools);

bot.use(session());

bot.command("new", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply(
    "Здравствуйте! Я - бот для работы с chatGPT и генерацией картикок с помощью искусственного интелектаю."
  );
});

bot.hears(questions.activity[mode.chat], async (ctx) => {
  ctx.session = INITIAL_SESSION;
  ctx.session.mode = mode.chat;
  ctx.session.free = true;

  await ctx.reply("Жду вашего голосового или текстового сообщения");
});

bot.hears(questions.activity[mode.picture], async (ctx) => {
  ctx.session = INITIAL_SESSION;
  ctx.session.mode = mode.picture;

  await ctx.reply("C помощью чего?", {
    reply_markup: {
      keyboard: [arrayOfPicGenerators],
      one_time_keyboard: true,
    },
  });
});

bot.hears([...arrayOfPicGenerators], async (ctx) => {
  ctx.session.picture.generator = ctx.message.text;
  await ctx.reply("Подсказать вам идею для картинки?", {
    reply_markup: {
      keyboard: [
        [
          questions.pictureGenerateWay.random,
          questions.pictureGenerateWay.custom,
        ],
      ],
      one_time_keyboard: true,
    },
  });
});

bot.hears(
  [questions.pictureGenerateWay.random, questions.confirmPictureIdea.no],
  async (ctx) => {
    // generating random idea for pic
    await ctx.reply(code("Генерирую идею ..."));

    const response = await openai.chat([
      { role: openai.roles.USER, content: "Сгенерируй одну идею для рисунка. Эта идея должна быть не длинее двух предложений. Затем переведи эту идею на английский и покажи оба варианта на разных строках" },
    ]);

    const idea = response.content;
    const rows = idea.split(/\r\n|\r|\n/g);
    const ideaOriginal = rows[0];
    const ideaTranslated = rows[rows.length-1]

    await ctx.reply(ideaOriginal);

    ctx.session.picture.idea = ideaTranslated;

    await ctx.reply("Хотите нарисовать это ?", {
      reply_markup: {
        keyboard: [Object.values(questions.confirmPictureIdea)],
        one_time_keyboard: true,
      },
    });
  }
);

bot.hears([questions.confirmPictureIdea.yes], async (ctx) => {
  // generating random idea for pic
  await photoGeneration({
      ctx,
      generator: ctx.session.picture.generator,
      idea: ctx.session.picture.idea,
    });

    ctx.session.free = true;
});

bot.hears([questions.pictureGenerateWay.custom, questions.confirmPictureIdea.custom], async (ctx) => {
    await ctx.reply(`Опишите рисунок, и ${ctx.session.picture.generator} вам его нарисует`)
      ctx.session.free = true;
  });

bot.command("start", async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply("Чем бы вы хотели заняться?", {
    reply_markup: {
      keyboard: [
        [questions.activity[mode.chat], questions.activity[mode.picture]],
      ],
      one_time_keyboard: true,
    },
  });
});

bot.on(message("voice"), async (ctx) => {
  if (!ctx.session?.free) {
    return null;
  }
  ctx.session ??= INITIAL_SESSION;
  try {
    await ctx.reply(code("Обрабатываю запрос ..."));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const linkHref = String(link.href);
    const userId = String(ctx.message.from.id);
    const oggPath = await ogg.create(linkHref, userId);
    const mp3Path = await ogg.toMp3(oggPath, userId);

    const text = await openai.transcription(mp3Path);

    await ctx.reply(code(`Ваш запрос: ${text}`));

    ctx.session.messages.push({ role: openai.roles.USER, content: text });
    const response = await openai.chat(ctx.session.messages);

    ctx.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    });

    await ctx.reply(response.content);
  } catch (error) {
    console.log("Error while voice msg", error);
  }
});

bot.on("photo", async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    await ctx.reply(code("Принимаю картинку ..."));

    // const chatId = msg.chat.id;
    // const photo = msg.photo.pop(); // Get the photo with the highest resolution
    // bot.sendPhoto(chatId, photo.file_id);

    const fileId = ctx.message.photo[ctx.message.photo.length - 2].file_id;
    const link = await ctx.telegram.getFileLink(fileId);
    const linkHref = String(link.href);
    const userId = String(ctx.message.from.id);

    const pngPath = await png.create(linkHref, userId);

    console.log("ctx", ctx.message.photo);
    await ctx.reply(`fileId ${fileId}`);
  } catch (error) {
    console.log("Error while photo msg", error);
  }
});

bot.on(message("text"), async (ctx) => {
  if (!ctx.session?.free) {
    return null;
  }

  try {
    if (ctx.session?.mode === mode.picture) {
      await photoGeneration({
        ctx,
        generator: imageGeneratorTypes.midjourney,
        idea: ctx.message.text,
      });
    } else {
      ctx.session ??= INITIAL_SESSION;
      await justChatting(ctx);
    }
  } catch (error) {
    console.log("Error while text msg", error);
  }
});

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
