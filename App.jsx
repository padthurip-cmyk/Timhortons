import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    '[Supabase] Missing env variables. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file or Netlify dashboard.'
  )
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key'
)

/* ── helpers ── */

export async function dbInsertOrder(order) {
  const { error } = await supabase.from('orders').insert({
    id:             order.id,
    restaurant_id:  order.restaurantId,
    intent:         order.intent,
    item:           order.item,
    item_id:        order.itemId,
    qty:            order.qty,
    speaker_id:     order.speakerId,
    status:         order.status,
    override_flag:  order.overrideFlag,
    predicted_qty:  order.predictedQty,
    time_created:   order.timeCreated,
    time_ack:       order.timeAck,
    time_fulfilled: order.timeFulfilled,
  })
  if (error) console.error('[DB] Insert order error:', error.message)
}

export async function dbUpdateOrder(id, patch) {
  const { error } = await supabase.from('orders').update(patch).eq('id', id)
  if (error) console.error('[DB] Update order error:', error.message)
}

export async function dbInsertVoiceEvent(ev) {
  const { error } = await supabase.from('voice_events').insert({
    id:              ev.id,
    order_ref:       ev.orderId || null,
    speaker_id:      ev.speakerId || null,
    restaurant_id:   ev.restaurantId,
    raw_transcript:  ev.text,
    intent_detected: ev.intent || null,
    confidence:      ev.confidence || null,
    ts:              ev.ts,
  })
  if (error) console.error('[DB] Insert voice event error:', error.message)
}

export async function dbInsertOverrideFlag(order) {
  const { error } = await supabase.from('override_flags').insert({
    order_ref:       order.id,
    qty_requested:   order.qty,
    qty_predicted:   order.predictedQty,
    variance_pct:    order.predictedQty
      ? Math.round((order.qty / order.predictedQty - 1) * 100)
      : null,
    staff_id:        order.speakerId,
    restaurant_id:   order.restaurantId,
  })
  if (error) console.error('[DB] Insert override flag error:', error.message)
}

export async function dbLoadOrders(restaurantId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('time_created', { ascending: false })
    .limit(200)
  if (error) { console.error('[DB] Load orders error:', error.message); return [] }
  return (data || []).map(r => ({
    id:            r.id,
    restaurantId:  r.restaurant_id,
    intent:        r.intent,
    item:          r.item,
    itemId:        r.item_id,
    qty:           r.qty,
    speakerId:     r.speaker_id,
    status:        r.status,
    overrideFlag:  r.override_flag,
    predictedQty:  r.predicted_qty,
    timeCreated:   r.time_created,
    timeAck:       r.time_ack,
    timeFulfilled: r.time_fulfilled,
  }))
}

export async function dbSubscribeOrders(restaurantId, callback) {
  return supabase
    .channel(`orders:${restaurantId}`)
    .on('postgres_changes', {
      event:  '*',
      schema: 'public',
      table:  'orders',
      filter: `restaurant_id=eq.${restaurantId}`,
    }, payload => callback(payload))
    .subscribe()
}
