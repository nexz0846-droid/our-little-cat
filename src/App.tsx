
import { useEffect, useState } from 'react'
import './App.css'

import {
  getOrCreateSharedCatRoom,
  getCatState,
  performCatAction,
  subscribeToCat,
  leaveRealtime,
  getDailyMissions,
  recordDailyCatAction,
  subscribeToMissions,
  recoverCat,
} from './catRoom'

type CatState = {
  room_id: string
  food: number
  energy: number
  happiness: number
  hearts: number
  updated_at: string
  is_unconscious: boolean
  unconscious_until: string | null
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
  const [roomId, setRoomId] = useState('')
  const [cat, setCat] = useState<CatState | null>(null)
  const [message, setMessage] = useState(
    'วันนี้มาเล่นกับน้องแมวกันนะ 💗',
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [missions, setMissions] = useState<Mission[]>([])
  const [bonusClaimed, setBonusClaimed] = useState(false)
  const [petAnimation, setPetAnimation] = useState(false)

  // เชื่อมต่อห้องแมวกลางโดยอัตโนมัติ
  const connectSharedRoom = async () => {
    setLoading(true)
    setError('')

    try {
      const room = await getOrCreateSharedCatRoom()

      localStorage.setItem('catRoomId', room.roomId)
      localStorage.setItem('catInviteCode', room.inviteCode)

      setRoomId(room.roomId)
      setCat(null)
      setMessage('ยินดีต้อนรับสู่บ้านแมวของเราสองคน 💗')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'เชื่อมต่อห้องแมวไม่สำเร็จ',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void connectSharedRoom()
    // เชื่อมต่อห้องเพียงครั้งเดียวเมื่อเปิดหน้าเว็บ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!roomId) return

    let active = true

    const refreshCat = async () => {
      try {
        const data = await getCatState(roomId)
        if (active) setCat(data as CatState)
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'โหลดข้อมูลแมวไม่สำเร็จ',
          )
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
            err instanceof Error
              ? err.message
              : 'โหลดภารกิจไม่สำเร็จ',
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

  const handleRecoverCat = async () => {
    if (!roomId || loading) return

    setLoading(true)
    setError('')

    try {
      await recoverCat(roomId)

      const updatedCat = await getCatState(roomId)
      setCat(updatedCat as CatState)
      setMessage('น้องแมวฟื้นแล้ว! มาดูแลกันต่อนะ 💗')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'ฟื้นฟูแมวไม่สำเร็จ',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (
    action: 'feed' | 'play' | 'pet',
  ) => {
    if (!roomId || !cat || loading || cat.is_unconscious) return

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
      const actionResult = await performCatAction(roomId, action)

      if (
        actionResult?.is_unconscious &&
        actionResult.hearts === cat.hearts
      ) {
        const updatedCat = await getCatState(roomId)
        setCat(updatedCat as CatState)
        setMessage(
          '😿 น้องแมวหมดสติแล้ว รอครบ 30 นาทีแล้วค่อยฟื้นฟูนะ',
        )
        return
      }

      const result = await recordDailyCatAction(roomId, action)

      const updatedCat = await getCatState(roomId)
      setCat(updatedCat as CatState)

      const daily = await getDailyMissions(roomId)
      setMissions(daily.missions)
      setBonusClaimed(daily.bonusClaimed)

      if (result?.bonus_claimed) {
        setMessage(
          'สุดยอดเลย! ทำครบทุกภารกิจ รับโบนัส 10 หัวใจแล้ว 🎁💗',
        )
      } else if (result?.reward > 0) {
        setMessage(
          `${messages[action]} ทำภารกิจสำเร็จ รับ ${result.reward} หัวใจเพิ่ม! 💗`,
        )
      } else {
        setMessage(messages[action])
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'ทำรายการไม่สำเร็จ',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">🐱 Our Little Cat</div>
        <div className="heart-count">
          💗 {cat?.hearts ?? 0} Hearts
        </div>
      </header>

      <div className="couple-photo">
        <img src="/images/couple.png" alt="รูปคู่ของเรา" />
        <p>Our Little Memories 💗</p>
      </div>

      <section className="hero">
        <span className="eyebrow">A LITTLE WORLD FOR TWO</span>
        <h1>รักปลาที่สุดในสามโลก ♡</h1>
        <p>มาดูแลเจ้าเหมียวและเก็บความทรงจำดี ๆ ไปด้วยกัน</p>

        {!roomId && (
          <div className="cat-card">
            <h2>🐾 กำลังเปิดบ้านแมวของเรา</h2>
            <p>
              {loading
                ? 'กำลังเชื่อมต่อห้องแมว รอสักครู่นะ 💗'
                : 'ยังเชื่อมต่อไม่ได้ ลองใหม่อีกครั้งได้เลย'}
            </p>

            <div className="actions">
              <button
                onClick={() => void connectSharedRoom()}
                disabled={loading}
              >
                {loading ? 'กำลังเชื่อมต่อ...' : '🔄 ลองเชื่อมต่ออีกครั้ง'}
              </button>
            </div>
          </div>
        )}

        {roomId && (
          <>
            <div className="mission">
              <h2>💌 บ้านแมวของเราสองคน</h2>
              <p>
                ห้องนี้ใช้ร่วมกัน ให้อาหาร เล่น และสะสมหัวใจไปด้วยกันนะ
                💕
              </p>
              <p>เปิดเว็บจากอุปกรณ์ของอีกคนเพื่อดูแลแมวตัวเดียวกันได้เลย</p>
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

              {cat?.is_unconscious && (
                <div className="mission" role="status">
                  <h3>😿 น้องแมวหมดสติ</h3>
                  <p>น้องต้องพักฟื้น 30 นาทีก่อนนะ</p>

                  {cat.unconscious_until && (
                    <p>
                      ฟื้นฟูได้หลังเวลา{' '}
                      {new Date(
                        cat.unconscious_until,
                      ).toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}

                  <button
                    onClick={() => void handleRecoverCat()}
                    disabled={
                      loading ||
                      !cat.unconscious_until ||
                      new Date() < new Date(cat.unconscious_until)
                    }
                  >
                    💗 ฟื้นฟูน้องแมว
                  </button>
                </div>
              )}

              {!cat && !error && (
                <p>กำลังโหลดข้อมูลน้องแมว... 🐾</p>
              )}

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
                    <button
                      onClick={() => void handleAction('feed')}
                      disabled={loading || cat.is_unconscious}
                    >
                      🍓 ให้อาหาร
                    </button>

                    <button
                      onClick={() => void handleAction('play')}
                      disabled={loading || cat.is_unconscious}
                    >
                      🧶 เล่นกับแมว
                    </button>

                    <button
                      onClick={() => void handleAction('pet')}
                      disabled={loading || cat.is_unconscious}
                    >
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
            <p>ถ้าเชื่อมต่อไม่ได้ ให้ตรวจสอบการตั้งค่า Supabase ด้วยนะครับ</p>
          </div>
        )}
      </section>

      <section className="mission">
        <span className="eyebrow">DAILY ACTIVITIES</span>
        <h2>ภารกิจของวันนี้ ✨</h2>
        <p>ทำกิจกรรมกับน้องแมวเพื่อสะสมหัวใจกันเถอะ</p>

        {(['feed', 'play', 'pet'] as MissionType[]).map((type) => {
          const info = missionInfo[type]
          const mission = missions.find(
            (item) => item.mission_type === type,
          )
          const progress = Math.min(
            mission?.progress ?? 0,
            info.target,
          )
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
