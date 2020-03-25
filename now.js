const rp = require('request-promise')
const headers = {
  'x-foody-access-token': '',
  'x-foody-api-version': '1',
  'x-foody-app-type': '1004',
  'x-foody-client-id': '',
  'x-foody-client-language': 'vi',
  'x-foody-client-type': '1',
  'x-foody-client-version': '3.0.0',
}

async function get_from_url(nowUrl) {
  const nowUrlObj = new URL(nowUrl)
  const options = {
    uri: `https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=${nowUrlObj.pathname.substring(1)}`,
    headers,
    json: true
  }
  const { reply, result } = await rp(options)
  return { reply, result }
}

async function get_delivery_dishes(request_id) {
  const options = {
    uri: `https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=${request_id}`,
    headers,
    json: true
  }
  const { reply, result } = await rp(options)
  return { reply, result }
}

module.exports = (bot) => {
  bot.onText(/now\.vn/, async (message, match) => {
    try {
      const { entities, from, chat, text } = message
  
      const c = entities.find(e => e.type == 'url')
      if (c === undefined) throw { message: 'Em không tìm được url' }
      const url = text.substr(c.offset, c.length)
      const get_from_url_res = await get_from_url(url)
      if (get_from_url_res.result !== 'success') throw { get_from_url_res }
      const { delivery_id } = get_from_url_res.reply
      const get_delivery_dishes_res = await get_delivery_dishes(delivery_id)
      if (get_delivery_dishes_res.result !== 'success') throw { get_delivery_dishes_res }
  
      const available_dishes = (get_delivery_dishes_res.reply.menu_infos || [])
        .reduce((arr, menu) => arr.concat(menu.dishes.filter(dish => dish.is_available)), [])
      if (available_dishes.length === 0) throw { message: 'Em không tìm được món ăn' }
  
      const inline_keyboard = available_dishes.map(dish => {
        const callback_data = dish.id
        let text = `${dish.name} -> giá ${dish.price.text}`
        if (dish.discount_price) {
          text = `${dish.name} -> giá ${dish.discount_price.text} (giá gốc ${dish.price.text})`
        }
        return [{ text, callback_data, name: dish.name }]
      })
  
      // console.log(inline_keyboard)
      const count = inline_keyboard.reduce((a, c) => a + c.length, 0)
      if (count === 0) throw { message: 'Em không tìm được món ăn' }
      console.log(chat.id)
      await bot.sendMessage(chat.id, `Chọn món đi các anh chị ơi!!!`, { reply_markup: { inline_keyboard } })
    } catch (e) {
      console.log(e)
    }
  })
  
  bot.on('callback_query', async (query) => {
    const { from, data, chat, message } = query
    const { inline_keyboard } = message.reply_markup
    const [dish] = inline_keyboard.find(([item]) => item.callback_data === data)
  
    const text = dish.text.split('->')[0]
    const reply_message = `*${from.first_name} ${from.last_name || ''} - ${text}*`
    console.log(reply_message)
    await bot.sendMessage(message.chat.id, reply_message, {parse_mode: 'Markdown'})
  })
}