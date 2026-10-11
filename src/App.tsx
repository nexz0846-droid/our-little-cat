
import { useEffect, useState } from 'react'
import './App.css'

import {
  createCatRoom,
  joinCatRoom,
  getCatState,
  performCatAction,
  subscribeToCat,
  leaveRealtime,
  getDailyMissions,
  recordDailyCatAction,
  subscribeToMissions,
} from './catRoom'


type CatState = {
  room_id: string
  food: number
  energy: number
  happiness: number
  hearts: number
  updated_at: string
}
type MissionType = 'feed' | 'play' | 'pet'

type Mission = {
  mission_type: MissionType
  progress: number
  claimed: boolean
}

const missionInfo: Record<
  MissionType,
  { title: string; emoji: string; target: number }
> = {
  feed: { title: 'ให้อาหารน้องแมว', emoji: '🍓', target: 1 },
  play: { title: 'เล่นกับน้องแมว', emoji: '🧶', target: 2 },
  pet: { title: 'ลูบหัวน้องแมว', emoji: '🐾', target: 3 },
}
function App() {
  const [roomId, setRoomId] = useState(
    () => localStorage.getItem('catRoomId') || '',
  )
  const [inviteCode, setInviteCode] = useState(
    () => localStorage.getItem('catInviteCode') || '',
  )
  const [joinCode, setJoinCode] = useState('')
  const [cat, setCat] = useState<CatState | null>(null)
  const [message, setMessage] = useState('วันนี้มาเล่นกับน้องแมวกันนะ 💗')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

const [missions, setMissions] = useState<Mission[]>([])
const [bonusClaimed, setBonusClaimed] = useState(false)
const [petAnimation, setPetAnimation] = useState(false)
  useEffect(() => {
    if (!roomId) return

    let active = true

    const refreshCat = async () => {
      try {
        const data = await getCatState(roomId)
        if (active) setCat(data as CatState)
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'โหลดข้อมูลแมวไม่สำเร็จ')
        }
      }
    }

    void refreshCat()

    const channel = subscribeToCat(roomId, () => {
      void refreshCat()
    })

    return () => {
      active = false
      void leaveRealtime(channel)
    }
  }, [roomId])


useEffect(() => {
  if (!roomId) {
    setMissions([])
    setBonusClaimed(false)
    return
  }

  let active = true

  const refreshMissions = async () => {
    try {
      const daily = await getDailyMissions(roomId)
      if (!active) return

      setMissions(daily.missions)
      setBonusClaimed(daily.bonusClaimed)
    } catch (err) {
      if (active) {
        setError(
          err instanceof Error ? err.message : 'โหลดภารกิจไม่สำเร็จ',
        )
      }
    }
  }

  void refreshMissions()

  const channel = subscribeToMissions(roomId, () => {
    void refreshMissions()
  })

  return () => {
    active = false
    void leaveRealtime(channel)
  }
}, [roomId])

  const saveRoom = (id: string, code: string) => {
    localStorage.setItem('catRoomId', id)
    localStorage.setItem('catInviteCode', code)
    setRoomId(id)
    setInviteCode(code)
    setCat(null)
    setError('')
  }

  const handleCreateRoom = async () => {
    setLoading(true)
    setError('')

    try {
      const room = await createCatRoom()
      saveRoom(room.roomId, room.inviteCode)
      setMessage('สร้างห้องสำเร็จแล้ว ชวนคนพิเศษมาเลี้ยงแมวกันนะ 💗')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'สร้างห้องไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!joinCode.trim()) {
      setError('กรอกรหัสเชิญของอีกคนก่อนนะ 💌')
      return
    }

    setLoading(true)
    setError('')

    try {
      const id = await joinCatRoom(joinCode.trim())
      saveRoom(id, joinCode.trim())
      setMessage('เข้าห้องสำเร็จแล้ว มาเลี้ยงน้องแมวด้วยกันนะ 💕')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เข้าห้องไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  
const handleAction = async (action: 'feed' | 'play' | 'pet') => {
  if (!roomId || !cat || loading) return

  setLoading(true)
  setError('')
if (action === 'pet') {
  setPetAnimation(true)
  window.setTimeout(() => setPetAnimation(false), 1000)
}
  const messages = {
    feed: 'งั่ม ๆ อร่อยจัง ขอบคุณนะ! 😻',
    play: 'เหมียววว~ น้องแมวมีความสุขมากเลย 💕',
    pet: 'น้องแมวเคลิ้มแล้ว งื้ออ 🥹💗',
  }

  try {
    await performCatAction(roomId, action)

    const result = await recordDailyCatAction(roomId, action)

    const updatedCat = await getCatState(roomId)
    setCat(updatedCat as CatState)

    const daily = await getDailyMissions(roomId)
    setMissions(daily.missions)
    setBonusClaimed(daily.bonusClaimed)

    if (result?.bonus_claimed) {
      setMessage('สุดยอดเลย! ทำครบทุกภารกิจ รับโบนัส 10 หัวใจแล้ว 🎁💗')
    } else if (result?.reward > 0) {
      setMessage(
        `${messages[action]} ทำภารกิจสำเร็จ รับ ${result.reward} หัวใจเพิ่ม! 💗`,
      )
    } else {
      setMessage(messages[action])
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ')
  } finally {
    setLoading(false)
  }
}


  const leaveRoom = () => {
    localStorage.removeItem('catRoomId')
    localStorage.removeItem('catInviteCode')
    setRoomId('')
    setInviteCode('')
    setJoinCode('')
    setCat(null)
    setError('')
    setMessage('เลือกสร้างห้องใหม่หรือเข้าห้องของคนพิเศษนะ 💗')
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">🐱 Our Little Cat</div>
        <div className="heart-count">💗 {cat?.hearts ?? 0} Hearts</div>
      </header>

      <section className="hero">
        <span className="eyebrow">A LITTLE WORLD FOR TWO</span>
        <h1>รักปลาที่สุดในสามโลก ♡</h1>
        <p>มาดูแลเจ้าเหมียวและเก็บความทรงจำดี ๆ ไปด้วยกัน</p>

        {!roomId && (
          <div className="cat-card">
            <h2>💌 ห้องแมวของเรา</h2>
            <p>สร้างห้องใหม่ หรือใส่รหัสที่คนรักส่งมาให้</p>

<div className="couple-photo">
  <img src="/images/couple.png" alt="รูปคู่ของเรา" />
  <p>Our Little Memories 💗</p>
</div>

            <div className="actions">
              <button onClick={handleCreateRoom} disabled={loading}>
                {loading ? 'กำลังทำรายการ...' : '🏡 สร้างห้องใหม่'}
              </button>
            </div>

            <div style={{ marginTop: 20 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="วางรหัสเชิญที่ได้รับ"
                aria-label="รหัสเชิญ"
                style={{
                  boxSizing: 'border-box',
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  border: '1px solid #e7cfe0',
                  marginBottom: 10,
                }}
              />
              <button onClick={handleJoinRoom} disabled={loading}>
                💕 เข้าห้องด้วยรหัส
              </button>
            </div>
          </div>
        )}

        {roomId && (
          <>
            <div className="mission">
              <h2>💌 ห้องของเราสองคน</h2>
              <p>ส่งรหัสนี้ให้คนรักเพื่อเข้ามาเลี้ยงแมวตัวเดียวกัน</p>
              <p style={{ overflowWrap: 'anywhere', fontWeight: 700 }}>
                {inviteCode || 'ห้องที่เข้าร่วมแล้ว'}
              </p>
              {inviteCode && (
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(inviteCode)
                    setMessage('คัดลอกรหัสเชิญแล้ว ส่งให้คนรักได้เลย 💌')
                  }}
                >
                  📋 คัดลอกรหัสเชิญ
                </button>
              )}
              <button onClick={leaveRoom} style={{ marginLeft: 8 }}>
                ออกจากห้องนี้
              </button>
            </div>

            <div className="cat-card">
              <div className="sparkle">✦　♡　✦</div>
              
<div className={`cat-image ${petAnimation ? 'petting' : ''}`}>
  <img src="/cats/poop.gif" alt="น้องปลาน้อย" />

  {petAnimation && (
    <div className="pet-hearts" aria-hidden="true">
      <span>💗</span>
      <span>💕</span>
      <span>✨</span>
      <span>💖</span>
    </div>
  )}
</div>


              <h2>ปลาน้อย (narak)</h2>
              <p className="cat-message">{message}</p>

              {!cat && !error && <p>กำลังโหลดข้อมูลน้องแมว... 🐾</p>}

              {cat && (
                <>
                  <div className="stats">
                    <div className="stat">
                      <div className="stat-label">🍰 ความอิ่ม</div>
                      <div className="progress">
                        <div style={{ width: `${cat.food}%` }} />
                      </div>
                      <small>{cat.food}/100</small>
                    </div>

                    <div className="stat">
                      <div className="stat-label">🥰 ความสุข</div>
                      <div className="progress happiness">
                        <div style={{ width: `${cat.happiness}%` }} />
                      </div>
                      <small>{cat.happiness}/100</small>
                    </div>
                  </div>

                  <div className="actions">
                    <button onClick={() => void handleAction('feed')} disabled={loading}>
                      🍓 ให้อาหาร
                    </button>
                    <button onClick={() => void handleAction('play')} disabled={loading}>
                      🧶 เล่นกับแมว
                    </button>
                    <button onClick={() => void handleAction('pet')} disabled={loading}>
                      💗 ลูบหัว
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {error && (
          <div className="mission" role="alert">
            <p>⚠️ {error}</p>
          </div>
        )}
      </section>

      
<section className="mission">
  <span className="eyebrow">DAILY ACTIVITIES</span>
  <h2>ภารกิจของวันนี้ ✨</h2>
  <p>ทำกิจกรรมกับน้องแมวเพื่อสะสมหัวใจกันเถอะ</p>

  {(['feed', 'play', 'pet'] as MissionType[]).map((type) => {
    const info = missionInfo[type]
    const mission = missions.find((item) => item.mission_type === type)
    const progress = Math.min(mission?.progress ?? 0, info.target)
    const completed = mission?.claimed ?? false

    return (
      <div className="mission-item" key={type}>
        <div>
          <strong>
            {info.emoji} {info.title}
          </strong>
          <div className="progress">
            <div
              style={{
                width: `${(progress / info.target) * 100}%`,
              }}
            />
          </div>
          <small>
            {completed
              ? 'สำเร็จแล้ว ✓'
              : `${progress}/${info.target} ครั้ง`}
          </small>
        </div>
        <span>{completed ? 'รับแล้ว 💗' : '+5 💗'}</span>
      </div>
    )
  })}

  <div className="mission-item">
    <strong>🎁 โบนัสทำครบทุกภารกิจ</strong>
    <span>{bonusClaimed ? 'รับแล้ว ✓' : '+10 💗'}</span>
  </div>
</section>


      <footer>Made with love ♡ for our little family</footer>
    </main>
  )
}

export default App
