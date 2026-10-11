
import { useEffect, useState } from 'react'
import './App.css'
import {
  createCatRoom,
  joinCatRoom,
  getCatState,
  performCatAction,
  subscribeToCat,
  leaveRealtime,
} from './catRoom'

type CatState = {
  room_id: string
  food: number
  energy: number
  happiness: number
  hearts: number
  updated_at: string
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

    const messages = {
      feed: 'งั่ม ๆ อร่อยจัง ขอบคุณนะ! 😻',
      play: 'เหมียววว~ น้องแมวมีความสุขมากเลย 💕',
      pet: 'น้องแมวเคลิ้มแล้ว งื้ออ 🥹💗',
    }

    try {
      const updated = await performCatAction(roomId, action)
      setCat(updated as CatState)
      setMessage(messages[action])
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
              <div className="cat-image">
                <img src="/cats/poop.gif" alt="น้องปลาน้อย" />
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

        <div className="mission-item">
          <span>🍓 ให้อาหารน้องแมว</span>
          <span>+2 💗</span>
        </div>
        <div className="mission-item">
          <span>🧶 เล่นกับน้องแมว</span>
          <span>+3 💗</span>
        </div>
        <div className="mission-item">
          <span>🐾 ลูบหัวน้องแมว</span>
          <span>+1 💗</span>
        </div>
      </section>

      <footer>Made with love ♡ for our little family</footer>
    </main>
  )
}

export default App
