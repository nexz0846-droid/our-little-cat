
import { supabase } from './supabase'

async function ensureSignedIn() {
  const { data: { session }, error: sessionError } =
    await supabase.auth.getSession()

  if (sessionError) throw sessionError
  if (session) return session.user

  const { data, error } = await supabase.auth.signInAnonymously()

  if (error) throw error
  if (!data.user) throw new Error('เข้าสู่ระบบไม่สำเร็จ')

  return data.user
}

export async function createCatRoom() {
  await ensureSignedIn()

  // รหัสเชิญสุ่มยาว ไม่ใช้รหัสที่เดาง่าย
  const inviteCode = crypto.randomUUID().replaceAll('-', '')

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

export async function getCatState(roomId: string) {
  const { data, error } = await supabase
    .from('shared_cat')
    .select('*')
    .eq('room_id', roomId)
    .single()

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


export function subscribeToCat(
  roomId: string,
  onChange: () => void,
) {
  return supabase
    .channel(`cat-room-${roomId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'shared_cat',
        filter: `room_id=eq.${roomId}`,
      },
      onChange,
    )
    .subscribe()
}

export async function leaveRealtime(channel: ReturnType<typeof subscribeToCat>) {
  await supabase.removeChannel(channel)
}
