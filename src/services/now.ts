import { v4 as uuidv4 } from 'uuid'
import rp from 'request-promise'
import TelegramBot from 'node-telegram-bot-api'

const headers = {
  'x-foody-access-token': '',
  'x-foody-api-version': '1',
  'x-foody-app-type': '1004',
  'x-foody-client-id': '',
  'x-foody-client-language': 'vi',
  'x-foody-client-type': '1',
  'x-foody-client-version': '3.0.0',
}

async function get_from_url(nowUrl: string) {
  const nowUrlObj = new URL(nowUrl)
  const options = {
    uri: `https://gappapi.deliverynow.vn/api/delivery/get_from_url?url=${nowUrlObj.pathname.substring(1)}`,
    headers,
    json: true
  }
  const { reply, result } = await rp(options)
  return { reply, result }
}

async function get_delivery_dishes(request_id: number) {
  const options = {
    uri: `https://gappapi.deliverynow.vn/api/dish/get_delivery_dishes?id_type=2&request_id=${request_id}`,
    headers,
    json: true
  }
  const { reply, result } = await rp(options)
  return { reply, result }
}

interface DishPrice {
  text: string
  unit: string
  value: number
}

interface DishPhoto {
  value: string
  width: number
  height: number
}

interface Dish {
  id: number
  is_available: boolean
  name: string
  description: string
  photos: DishPhoto[]
  price: DishPrice
  discount_price?: DishPrice
  final_price: DishPrice

  // total_order?: number
  // display_total_order: string
  // total_like: "0"
  // properties: []
  // options: []
  // time: {available: [],…}
  // quantity: 0
  // is_group_discount_item: false
}

interface Order {
  id: string
  dish_id: number
  user_id: number
}

interface Now {
  id: string
  chat_id: number
  dishes: Dish[]
  users: TelegramBot.User[]
  orders: Order[]
}

export const now = (bot: TelegramBot) => {
  let sessions: Now[] = []
  let remind, expire

  const findNowObject = (message: TelegramBot.Message): Now => sessions.find(item => item.chat_id = message.chat.id)

  const addUser = (now: Now, user: TelegramBot.User): void => {
    const find = now.users.find(v => v.id === user.id)
    if (!find) now.users.push(user)
  }

  const findUser = (now: Now, user_id: number): TelegramBot.User => {
    return now.users.find(v => v.id === user_id)
  }

  const findDish = (now: Now, dish_id: number): Dish => now.dishes.find(item => item.id === dish_id)

  const book = async (query: TelegramBot.CallbackQuery) => {
    const { from, message } = query
    const now = findNowObject(message)
    if (!now) {
      await bot.sendMessage(message.chat.id, 'Em không tìm thấy link order hoặc là link order đã hết hạn rồi! 😥')
      return
    }
    // add user
    const dish_id = Number(query.data.split('/')[2])
    addUser(now, from)
    // add order
    const id = uuidv4()
    now.orders.push({ id, dish_id, user_id: query.from.id })

    const dish = findDish(now, dish_id)
    const reply_message = `*${from.first_name || ''} ${from.last_name || ''} - ${dish.name} ${dish.description || ''}*`
    await bot.sendMessage(message.chat.id, reply_message, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: 'Cancel', callback_data: `now/cancel/${id}` }]]
      }
    })

    return id
  }

  const cancel = async (query: TelegramBot.CallbackQuery) => {
    const now = findNowObject(query.message)
    if (!now) {
      await bot.sendMessage(query.message.chat.id, 'Em không tìm thấy link order hoặc là link order đã hết hạn rồi! 😥')
      return
    }
    const [, , order_id] = query.data.split('/')
    const index = now.orders.findIndex(v => v.id === order_id)
    if (now.orders[index].user_id !== query.from.id) return
    if (index != -1) now.orders.splice(index, 1)

    // @ts-ignore
    await bot.deleteMessage(query.message.chat.id, query.message.message_id)
  }

  const report = async (message: TelegramBot.Message) => {
    const now = findNowObject(message)
    if (!now) {
      await bot.sendMessage(message.chat.id, 'Em không tìm thấy link order hoặc là link order đã hết hạn rồi! 😥')
      return
    }

    const orders = now.orders.reduce((total: any, order) => {
      let index = total.findIndex(d => d.dish.id === order.dish_id)
      if (index === -1) {
        total.push({
          dish: now.dishes.find(d => d.id === order.dish_id),
          quantity: 0,
          order_by: []
        })
        index = total.length - 1
      }

      total[index].quantity++
      total[index].order_by.push(now.users.find(u => u.id === order.user_id))
      return total
    }, [])

    const list: string = orders.map(item => {
      const price = item.dish.final_price.value
      const quantity = item.quantity
      const total = price * quantity
      const order_by = (item.order_by as TelegramBot.User[])
        .reduce((acc, user) => {
          let find = acc.findIndex(i => i.id = user.id)
          if (find === -1) {
            acc.push({...user, quantity: 0})
            find = acc.length - 1
          }
          acc[find].quantity++
          return acc
        }, [])
        .map(user => `${user.first_name || ''} ${user.last_name || ''} x${user.quantity}`)
        .join(',')
      return `${item.dish.name}: ${price}đ x ${quantity} = ${total}đ (${order_by})`
    }).join('\n')

    const total: string = orders.reduce((acc, item) => acc + item.quantity * item.dish.final_price.value, 0)
    const money: string = now.users.map(user => {
      let msg = `${user.first_name || ''} ${user.last_name || ''}: `
      msg += now.orders 
        .filter(order => order.user_id = user.id)
        .map(order => now.dishes.find(dish => dish.id === order.dish_id).final_price.value)
        .reduce((acc, v) => acc + v, 0)
      return `*${msg}đ*`
    }).join('\n')
    const result = `Em chốt đơn như sau:\n\n${list}\n*Tổng cộng: ${total}đ*\n\nThu tiền:\n${money}`
    await bot.sendMessage(message.chat.id, result, {parse_mode: 'Markdown'})

  }

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
        .map(item => ({ ...item, final_price: item.discount_price || item.price }))
        .sort((a, b) => b.final_price.value - a.final_price.value)
      if (available_dishes.length === 0) throw { message: 'Em không tìm được món ăn' }

      const inline_keyboard = available_dishes.map(dish => {
        const callback_data = `now/book/${dish.id}`
        let text = `${dish.name} -> giá ${dish.price.text}`
        if (dish.discount_price) {
          text = `${dish.name} -> giá ${dish.discount_price.text} (giá gốc ${dish.price.text})`
        }
        return [{ text, callback_data }]
      })

      const poll = await bot.sendMessage(chat.id, `Chọn món đi các anh chị ơi!!!`, { reply_markup: { inline_keyboard } })
      // const result_message = await bot.sendMessage(chat.id, `Click vào nút này để xem kết quả nhé`, {
      //   reply_markup: {
      //     inline_keyboard: [
      //       // [{text: 'Xem kết quả của tôi', callback_data: 'now/report/'}],
      //       [{ text: 'Chốt đơn', callback_data: `now/report/${poll.message_id}` }],
      //     ]
      //   }
      // })

      const id = uuidv4()

      sessions.push({
        id,
        chat_id: chat.id,
        dishes: available_dishes,
        users: [],
        orders: []
      })
      // remind after 15m
      clearTimeout(remind)
      remind = setTimeout(async () => {
        await bot.sendMessage(chat.id, `Còn 5 phút nữa là sẽ chốt đơn, các anh chị tranh thủ chọn món nha!`, { reply_to_message_id: poll.message_id })
      }, 900000)
      // expire after 15m
      clearTimeout(expire)
      expire = setTimeout(async () => {
        const index = sessions.findIndex(session => session.id = id)
        if (index !== -1) sessions.splice(index, 1)
      }, 1200000)

    } catch (e) {
      console.log(e)
    }
  })

  bot.onText(/\/now\sstatus/, report)
  bot.onText(/\/now\send/, async (message, match) => {
    report(message)
    clearTimeout(remind)
    clearTimeout(expire)
    const id = findNowObject(message).id
    const index = sessions.findIndex(session => session.id = id)
    if (index !== -1) sessions.splice(index, 1)
  })

  bot.on('callback_query', async (query) => {
    const { data } = query

    const args = data.split('/')
    if (args[0] === 'now') {
      if (args[1] === 'book') await book(query)
      if (args[1] === 'cancel') await cancel(query)
      if (args[1] === 'report') await report(query.message)
    }


    // const [dish] = inline_keyboard.find(([item]) => item.callback_data === data)
    // if (!now) return
    // data.users[`${from}`]
    // console.log(`poll_id: `, message.message_id)

    // const text = dish.text.split('->')[0]
    // const reply_message = `*${from.first_name} ${from.last_name || ''} - ${text}*`
    // await bot.sendMessage(message.chat.id, reply_message, { parse_mode: 'Markdown' })
  })
}