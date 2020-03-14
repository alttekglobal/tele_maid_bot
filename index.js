
var app = require('nodemon')({
    args: args.slice(3)
  });

console.log('args: ', app.args);

const YOUR_BOT_TOKEN = '';
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
    const { first_name } = from;
    if (entities) {
        console.log("ENTITIES");
        console.table(entities);

        entities.forEach(entity => {
            if (entity.user) {
                const { user } = entity;
                console.log("user: ", user);
                bot.sendMessage(id, `Eh, ${user.first_name}, ${first_name} noi gi kia`);
            } 
            else {
                switch(entity.type) {
                    case 'mention':
                        bot.sendMessage(id, `Sao ${first_name}, muon gi day ?`);
                        break;
        
                    case 'bot_command':
                        console.log('match: ', match);
                    default:
                        break;
                }    
            }
        });
        
    }
});

bot.onText(/\/trasua/, (message, match) => {
    console.log("[ON TATSUA] ");
    const { entities, from, chat } = message;
    console.log("FROM: ", from);
    console.log("CHAT: ", chat);
    console.log("match: ", match);

    const { id, first_name, title, type } = chat; 
    if (entities) {
        console.log("ENTITIES");
        console.table(entities);
    }

    if (type && title && (type === 'group')) {
        const { first_name , last_name } = from;
        bot.sendMessage(id, 
                        `Eh, ace ${title}, ${first_name} ${last_name} moi uong tra sua kia. Em offer menu sau`,
                        {
                            reply_markup: {
                                inline_keyboard: [[
                                    {
                                        text: 'Tra sua fuk long',
                                        callback_data: 'fuklong'
                                    }, {
                                        text: 'Tra su tocotocha',
                                        callback_data: 'tocotocha'
                                    }, {
                                        text: 'Tra sua nha lam',
                                        callback_data: 'nhalam'
                                    }
                                ]]
                            }
                        });
    }
});