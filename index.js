
const { db } = require('./modules/persitance');
const generator = require('./modules/helper');
const cron = require('node-cron');

const YOUR_BOT_TOKEN = '1140790627:AAFNDpV-FJinAsGo38aHg7bifU6gC52SHzQ';
const TelegramBot = require('node-telegram-bot-api'),
// Be sure to replace YOUR_BOT_TOKEN with your actual bot token on this line.
bot = new TelegramBot(YOUR_BOT_TOKEN, { polling: true });

bot.on("message", (message, match) => {
    console.log("[ON MESSAGE] ");
    const { entities, from, chat } = message;
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
                bot.sendMessage(id, `Dạ, ${user.first_name}, ${first_name} nhắn gì kìa`);
            }
            else {
                switch(entity.type) {
                    case 'mention':
                        bot.sendMessage(id, `Dạ ${first_name} ${last_name}, em nghe ?`);
                        break;

                    case 'bot_command':
                        console.log('match: ', match);
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


bot.onText(/\/remind/, (message, match) => {
    console.log("[ON REMIND] ");
    const { entities, from, chat } = message;
    console.log("FROM: ", from);
    console.log("CHAT: ", chat);
    console.log("match: ", match);
    const { first_name, last_name } = chat;

    bot.sendMessage(message.chat.id,`Em ghi nhận! Mình họp giờ nào vậy? [ví dụ: /time (HH:MM:SS:AM|PM)]`)
    .then(() => {
        bot.onText(/\/time ([01]\d|2[0-3]):([0-5]\d:[0-5]\d):(AM|PM)/,(message,match) => {
            console.log(match);
            const time = match[0].split(' ')[1];
            const docItem = String(message.chat.first_name + generator.randomStringGenerator(11));

            let seperateTime = time.split(':');
            let timeOfDay = seperateTime[seperateTime.length - 1];

            seperateTime.splice(seperateTime.length - 1, 1);

            console.log(seperateTime);
            let numberTime = seperateTime.map(Number);
            console.log(timeOfDay.trim());

            if(timeOfDay.trim() == 'PM' && numberTime[0] < 13) {
                numberTime[0] += 12;
            }

            cron.schedule(`${numberTime[2]} ${numberTime[1]} ${numberTime[0]} * * *`,()=>{
                bot.sendMessage(message.chat.id,`Họp thôi !!!!!!!!! ${first_name} ${last_name}, nhanh lên nào !!!`);
            });
            bot.sendMessage(message.chat.id,`Cám ơn ${first_name} ${last_name}, em đã ghi giờ họp ${time} rồi nhen.`);

        });
    });
});

bot.onText(/\/bug/, (message, match) => {
    console.log("[ON HOT] ");
    const { entities, from, chat } = message;
    console.log("FROM: ", from);
    console.log("CHAT: ", chat);
    console.log("match: ", match);

    const { id, first_name, title, type } = chat;
    bot.sendMessage(id,`Bug ai người đó gánh, hỏi tui làm gì ????`)

});

bot.onText(/\/hot/, (message, match) => {
    console.log("[ON HOT] ");
    const { entities, from, chat } = message;
    console.log("FROM: ", from);
    console.log("CHAT: ", chat);
    console.log("match: ", match);

    const { id, first_name, title, type } = chat;
    bot.sendMessage(id,`Toàn bộ Đông Lào đang có 53 ca nhiễm. Em nghe đồn đã có ca 54 và 55 gần chỗ mát xa PXL :(`)
});

bot.on('callback_query', query => {
    const { message, data } = query;
    console.log('ON [callback_query]');
    console.log('message: ', message);
    console.log('data: ', data);
});

bot.on('polling_error', (error) => {
    return error;  // => 'EFATAL'
  });

//Handle errors
bot.on('error',(error)=>{
   return error;
});

const storeToken = (token, signingKey) => {
    const values = [uuidv4(), token, signingKey, new Date().toISOString().slice(0, 19).replace('T', ' '), new Date().toISOString().slice(0, 19).replace('T', ' ')];
    const statement = 'INSERT OR IGNORE INTO tokens (id, token, signing_key, date_created, date_modified) VALUES (?, ?, ?, ?, ?)';
    db.run(statement, values, err =>{
        if (err) {
            return console.log(err.message);
        }
        console.log(`A row has been inserted with rowid ${this.lastID}`);
    });
};