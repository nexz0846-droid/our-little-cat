
import { supabase } from './supabase'

const SHARED_ROOM_CODE = 'ourlittlecatsharedroom20261012'

async function ensureSignedIn() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (session) return session.user

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) throw error
  if (!data.user) throw new Error('เข้าสู่ระบบไม่สำเร็จ')

  return data.user
}

export async function createCatRoom(code?: string) {
  await ensureSignedIn()

  const inviteCode = code ?? crypto.randomUUID().replaceAll('-', '')

  const { data, error } = await supabase.rpc('create_cat_room', {
    p_code: inviteCode,
  })

  if (error) throw error

  return {
    roomId: data as string,
    inviteCode,
  }
}

export async function joinCatRoom(inviteCode: string) {
  await ensureSignedIn()

  const { data, error } = await supabase.rpc('join_cat_room', {
    p_code: inviteCode.trim(),
  })

  if (error) throw error

  return data as string
}

export async function getOrCreateSharedCatRoom() {
  try {
    const roomId = await joinCatRoom(SHARED_ROOM_CODE)

    return {
      roomId,
      inviteCode: SHARED_ROOM_CODE,
    }
  } catch {
    try {
      return await createCatRoom(SHARED_ROOM_CODE)
    } catch (createError) {
      try {
        const roomId = await joinCatRoom(SHARED_ROOM_CODE)

        return {
          roomId,
          inviteCode: SHARED_ROOM_CODE,
        }
      } catch {
        throw createError
      }
    }
  }
}

export async function getCatState(roomId: string) {
  const { data, error } = await supabase.rpc(
    'get_cat_state_with_decay',
    { p_room_id: roomId },
  )

  if (error) throw error
  return data
}

export async function performCatAction(
  roomId: string,
  action: 'feed' | 'play' | 'pet',
) {
  const { data, error } = await supabase.rpc('perform_cat_action', {
    p_room_id: roomId,
    p_action: action,
  })

  if (error) throw error
  return data
}

// Realtime: เพิ่ม .on() ให้ครบก่อนเรียก .subscribe()
export function subscribeToCat(
  roomId: string,
  onChange: () => void,
) {
  const channel = supabase.channel(`cat-room-${roomId}`)

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'shared_cat',
      filter: `room_id=eq.${roomId}`,
    },
    onChange,
  )

  return channel.subscribe()
}

export async function leaveRealtime(
  channel: ReturnType<typeof subscribeToCat>,
) {
  await supabase.removeChannel(channel)
}

export type DailyMission = {
  mission_type: 'feed' | 'play' | 'pet'
  progress: number
  claimed: boolean
}

function getThailandDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

export async function recordDailyCatAction(
  roomId: string,
  action: 'feed' | 'play' | 'pet',
) {
  const { data, error } = await supabase.rpc(
    'record_daily_cat_action',
    {
      p_room_id: roomId,
      p_action: action,
    },
  )

  if (error) throw error
  return data
}

export async function getDailyMissions(roomId: string) {
  const today = getThailandDate()

  const [
    { data: missions, error: missionError },
    { data: bonus, error: bonusError },
  ] = await Promise.all([
    supabase
      .from('daily_cat_missions')
      .select('mission_type, progress, claimed')
      .eq('room_id', roomId)
      .eq('mission_date', today),

    supabase
      .from('daily_cat_bonus')
      .select('claimed')
      .eq('room_id', roomId)
      .eq('mission_date', today)
      .maybeSingle(),
  ])

  if (missionError) throw missionError
  if (bonusError) throw bonusError

  return {
    missions: (missions ?? []) as DailyMission[],
    bonusClaimed: bonus?.claimed ?? false,
  }
}

export function subscribeToMissions(
  roomId: string,
  onChange: () => void,
) {
  const channel = supabase.channel(`daily-missions-${roomId}`)

  channel
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'daily_cat_missions',
        filter: `room_id=eq.${roomId}`,
      },
      onChange,
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'daily_cat_bonus',
        filter: `room_id=eq.${roomId}`,
      },
      onChange,
    )

  return channel.subscribe()
}

export async function recoverCat(roomId: string) {
  const { data, error } = await supabase.rpc('recover_cat', {
    p_room_id: roomId,
  })

  if (error) throw error
  return data
}

// ================================
// ร้านค้าแลกหัวใจ
// ================================

export type ShopItem = {
  id: string
  name: string
  emoji: string
  price: number
  description: string
}

export type ShopInventoryItem = {
  item_id: string
  quantity: number
}

export const CAT_SHOP_ITEMS: ShopItem[] = [
  {
    id: 'cat_bed',
    name: 'เตียงแมวแสนนุ่ม',
    emoji: '🛏️',
    price: 30,
    description: 'ที่นอนนุ่ม ๆ สำหรับเจ้าเหมียว',
  },
  {
    id: 'couple_sofa',
    name: 'โซฟาคู่รัก',
    emoji: '🛋️',
    price: 50,
    description: 'โซฟาสำหรับบ้านของเราสองคน',
  },
  {
    id: 'flower_pot',
    name: 'กระถางดอกไม้',
    emoji: '🌷',
    price: 20,
    description: 'เพิ่มความสดใสให้บ้านแมว',
  },
  {
    id: 'scratch_post',
    name: 'ที่ฝนเล็บแมว',
    emoji: '🧶',
    price: 40,
    description: 'ของเล่นสำหรับน้องแมวขี้เล่น',
  },
]

export async function purchaseCatShopItem(
  roomId: string,
  itemId: string,
) {
  await ensureSignedIn()

  const { data, error } = await supabase.rpc('purchase_cat_item', {
    p_room_id: roomId,
    p_item_id: itemId,
  })

  if (error) throw error

  return data as {
    success: boolean
    item_id: string
    item_name: string
    cost: number
    remaining_hearts: number
  }
}

export async function getCatShopInventory(roomId: string) {
  await ensureSignedIn()

  const { data, error } = await supabase.rpc(
    'get_cat_shop_inventory',
    { p_room_id: roomId },
  )

  if (error) throw error
  return (data ?? []) as ShopInventoryItem[]
}
