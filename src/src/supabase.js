import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kybjzgjqakixqhicladk.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5Ymp6Z2pxYWtpeHFoaWNsYWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMDE0ODYsImV4cCI6MjA4ODU3NzQ4Nn0.X7oyTrV7ZpyHLCkaiQ9kVuzCPLIgo0uGUz4XSBQ6orI'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  realtime: { params: { eventsPerSecond: 10 } }
})

supabase.from('restaurants').select('count').then(({ error }) => {
  if (error) console.warn('[Supabase] Connection issue:', error.message)
  else console.log('[Supabase] Connected')
})

export async function dbInsertOrder(order) {
  const { error } = await supabase.from('orders').insert({
    id: order.id, restaurant_id: order.restaurantId,
    intent: order.intent, item: order.item, item_id: order.itemId,
    qty: order.qty, speaker_id: order.speakerId || null,
    status: order.status, override_flag: order.overrideFlag,
    predicted_qty: order.predictedQty || null,
    time_created: order.timeCreated, time_ack: null, time_fulfilled: null,
  })
  if (error) console.error('[DB] insertOrder:', error.message)
}

export async function dbUpdateOrder(id, patch) {
  const { error } = await supabase.from('orders').update(patch).eq('id', id)
  if (error) console.error('[DB] updateOrder:', error.message)
}

export async function dbLoadOrders(restaurantId) {
  const { data, error } = await supabase
    .from('orders').select('*')
    .eq('restaurant_id', restaurantId)
    .order('time_created', { ascending: false }).limit(300)
  if (error) { console.error('[DB] loadOrders:', error.message); return [] }
  return (data || []).map(r => ({
    id: r.id, restaurantId: r.restaurant_id,
    intent: r.intent, item: r.item, itemId: r.item_id,
    qty: r.qty, speakerId: r.speaker_id, status: r.status,
    overrideFlag: r.override_flag, predictedQty: r.predicted_qty,
    timeCreated: r.time_created, timeAck: r.time_ack, timeFulfilled: r.time_fulfilled,
  }))
}

export async function dbSubscribeOrders(restaurantId, callback) {
  const channel = supabase
    .channel('orders-' + restaurantId)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'orders',
      filter: 'restaurant_id=eq.' + restaurantId,
    }, (payload) => {
      if (!payload.new) return
      const r = payload.new
      callback({ ...payload, new: {
        id: r.id, restaurantId: r.restaurant_id,
        intent: r.intent, item: r.item, itemId: r.item_id,
        qty: r.qty, speakerId: r.speaker_id, status: r.status,
        overrideFlag: r.override_flag, predictedQty: r.predicted_qty,
        timeCreated: r.time_created, timeAck: r.time_ack, timeFulfilled: r.time_fulfilled,
      }})
    })
    .subscribe()
  return channel
}

export async function dbInsertVoiceEvent(ev) {
  const { error } = await supabase.from('voice_events').insert({
    id: ev.id, order_ref: ev.orderId || null,
    speaker_id: ev.speakerId || null, restaurant_id: ev.restaurantId,
    raw_transcript: ev.text, intent_detected: ev.intent || null,
    confidence: ev.confidence || null, ts: ev.ts,
  })
  if (error) console.error('[DB] insertVoiceEvent:', error.message)
}

export async function dbInsertOverrideFlag(order) {
  const { error } = await supabase.from('override_flags').insert({
    order_ref: order.id, qty_requested: order.qty,
    qty_predicted: order.predictedQty || null,
    variance_pct: order.predictedQty
      ? Math.round((order.qty / order.predictedQty - 1) * 100) : null,
    staff_id: order.speakerId || null, restaurant_id: order.restaurantId,
  })
  if (error) console.error('[DB] insertOverrideFlag:', error.message)
}
