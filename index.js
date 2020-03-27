
//const { db } = require('./modules/persitance');
const generator = require('./modules/helper');

const cron = require('node-cron');
const https = require('https');

const TELEGRAM_BOT_TOKEN = '';
const GIPHY_TOKEN = '';

const TelegramBot = require('node-telegram-bot-api');
const giphy = require('giphy-api')(GIPHY_TOKEN);
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

const { now } = require('./dist/services')
now(bot)


bot.on("message", (message, match) => {
    console.log("[ON MESSAGE] ");
    console.log("me: ", bot.id);
    const { entities, from, chat, text } = message;
    console.log("origin: ", message);
    console.log("FROM: ", from);
    console.log("CHAT: ", chat);
    console.log("match: ", match);

    const { id } = chat;
    const { first_name, last_name } = from;
    if (entities) {
        console.log("ENTITIES");
        console.table(entities);

        entities.forEach(entity => {
            if (entity.user) {
                const { user } = entity;
                console.log("user: ", user);
                bot.sendMessage(id, `Hey, ${user.first_name}, ${first_name} just mentioned you`);
            }
            else {
                switch (entity.type) {
                    case 'mention':
                        bot.sendMessage(id, `Yes ${first_name} ${last_name}, what do you want me to do ?`);
                        const giphyText = text.replace("@atg_maid", "").replace("_bot", "").trim();
                        console.log("text to gif: ", giphyText);
                        if (giphyText) {
                            giphy.random(giphyText, function (err, res) {
                                const url = res.data.url;
                                console.log("URL: ", url)
                                bot.sendMessage(id, (!err && url) ? url : 'just dont know why');
                            });
                        }
                        break;

                    case 'bot_command':
                        console.log('match: ', match);
                        const searchTerm = text.replace('/', '').trim();
                        if (searchTerm === 'now') break
                        if (['time', 'remind', 'covid'].indexOf(searchTerm) == -1) {
                            bot.sendMessage(id, `${first_name} ${last_name}, I dont understand !`);
                            bot.sendMessage(id, `You might want https://www.google.com/search?q=${searchTerm}`);
                        }
                        break;

                    case 'email':
                        break;

                    case 'phone_number':
                        break;

                    default:
                        break;
                }
            }
        });
    }
});

bot.onText(/\/covid/, (message, match) => {
    console.log("[ON COVID] ");
    const { entities, from, chat } = message;
    console.log("FROM: ", from);
    console.log("CHAT: ", chat);
    console.log("match: ", match);
    const { first_name, last_name } = chat;

    https.get('https://corona.lmao.ninja/countries/vietnam', (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            const result = JSON.parse(data);
            bot.sendMessage(message.chat.id, `Today Vietnam has ${result.todayCases} new cases`).then(() => {
                const todayDealths = result.todayDeaths == 0 ? `So lucky, no one die today` : `Sadly, ${result.deaths} confirmed death !`;
                bot.sendMessage(message.chat.id, todayDealths).then(() => {
                    bot.sendMessage(message.chat.id, `Vietnam has totally ${result.cases} confirmed`);
                });
            });
        });
    }).on("error", (err) => {
        bot.sendMessage(message.chat.id, `Sorry, I cannot have data due to ${err.message}`)
    })
});

bot.onText(/\/remind/, (message, match) => {
    console.log("[ON REMIND] ");
    const { entities, from, chat } = message;
    console.log("FROM: ", from);
    console.log("CHAT: ", chat);
    console.log("match: ", match);
    const { first_name, last_name } = chat.type && chat.type.indexOf('group') >= 0 ? from : chat;

    bot.sendMessage(message.chat.id, `Got it! What time, please ? [For example: /time (HH:MM:SS:AM|PM)]`)
        .then(() => {
            bot.onText(/\/time ([01]\d|2[0-3]):([0-5]\d:[0-5]\d):(AM|PM)/, (message, match) => {
                console.log(match);
                const time = match[0].split(' ')[1];
                const docItem = String(message.chat.first_name + generator.randomStringGenerator(11));

                let seperateTime = time.split(':');
                console.log('seperateTime: ', seperateTime);

                let timeOfDay = seperateTime[seperateTime.length - 1];

                seperateTime.splice(seperateTime.length - 1, 1);

                let numberTime = seperateTime.map(Number);
                console.log(timeOfDay.trim());

                if (timeOfDay.trim() == 'PM' && numberTime[0] < 13) {
                    numberTime[0] += 12;
                }

                cron.schedule(`${numberTime[2]} ${numberTime[1]} ${numberTime[0]} * * *`, () => {
                    giphy.random("meeting", function (err, res) {
                        const url = res.data.bitly_gif_url;
                        const reminding = err ? `Meeting !!!!!!!!! ${first_name} ${last_name}, please stand up !!!!` : `Meeting !!!!!!!!! ${first_name} ${last_name} ${url}`;
                        bot.sendMessage(message.chat.id, reminding);
                    });
                    console.log('meeting id: ', docItem);
                });
                bot.sendMessage(message.chat.id, `Thank ${first_name} ${last_name}, your meeting will be ${time}.`);
            });
        });
});

bot.on('polling_error', (error) => {
    return error;  // => 'EFATAL'
});

//Handle errors
bot.on('error', (error) => {
    return error;
});
