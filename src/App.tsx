
import Cat3D from './Cat3D'

import { useEffect, useState } from 'react'
import './App.css'
import InventoryTabs from './inventoryTabs'
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
  CAT_SHOP_ITEMS,
  getCatShopInventory,
  purchaseCatShopItem,
  type ShopInventoryItem,
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

type HomeLevel = {
  level: number
  name: string
  emoji: string
  start: number
  next: number | null
}

const missionInfo: Record<
  MissionType,
  { title: string; emoji: string; target: number }
> = {
  feed: { title: 'ให้อาหารน้องแมว', emoji: '🍓', target: 1 },
  play: { title: 'เล่นกับน้องแมว', emoji: '🧶', target: 2 },
  pet: { title: 'ลูบหัวน้องแมว', emoji: '🐾', target: 3 },
}

function getHomeLevel(hearts: number): HomeLevel {
  if (hearts >= 1000) {
    return {
      level: 5,
      name: 'ปราสาทแมวคู่รัก',
      emoji: '🏰',
      start: 1000,
      next: null,
    }
  }

  if (hearts >= 500) {
    return {
      level: 4,
      name: 'บ้านแห่งความรัก',
      emoji: '💖',
      start: 500,
      next: 1000,
    }
  }

  if (hearts >= 250) {
    return {
      level: 3,
      name: 'บ้านสวนแมว',
      emoji: '🌷',
      start: 250,
      next: 500,
    }
  }

  if (hearts >= 100) {
    return {
      level: 2,
      name: 'บ้านแสนอบอุ่น',
      emoji: '🏠',
      start: 100,
      next: 250,
    }
  }

  return {
    level: 1,
    name: 'บ้านหลังน้อย',
    emoji: '🏡',
    start: 0,
    next: 100,
  }
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
  const [catAnimation, setCatAnimation] = useState<
  'idle' | 'feed' | 'play' | 'sleep' | 'pet'
>('idle')

  const [shopInventory, setShopInventory] = useState<ShopInventoryItem[]>([])
  const [shopLoading, setShopLoading] = useState(false)
  const [shopMessage, setShopMessage] = useState('')

  const heartTotal = Math.max(0, cat?.hearts ?? 0)
  const homeLevel = getHomeLevel(heartTotal)

  const homeProgress =
    homeLevel.next === null
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((heartTotal - homeLevel.start) /
              (homeLevel.next - homeLevel.start)) *
              100,
          ),
        )

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // โหลดแมวและคลังสินค้า พร้อมใช้ Realtime channel เดียวกัน
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

    const refreshInventory = async () => {
      try {
        const inventory = await getCatShopInventory(roomId)
        if (active) setShopInventory(inventory)
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'โหลดคลังของไม่สำเร็จ',
          )
        }
      }
    }

    void refreshCat()
    void refreshInventory()

    const channel = subscribeToCat(roomId, () => {
      void refreshCat()
      void refreshInventory()
    })

    return () => {
      active = false
      void leaveRealtime(channel)
    }
  }, [roomId])

  // ภารกิจประจำวันมี channel ของตัวเอง
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

 
  const handleAction = async (action: MissionType) => {
    if (!roomId || !cat || loading || cat.is_unconscious) return

    setLoading(true)
    setError('')
    setCatAnimation(action)

    window.setTimeout(() => {
      setCatAnimation('idle')
    }, 1800)

    if (action === 'pet') {
      setPetAnimation(true)
      window.setTimeout(() => setPetAnimation(false), 1000)
    }

    // เก็บโค้ดส่วน messages, try, catch และ finally เดิมไว้ทั้งหมด


    const messages: Record<MissionType, string> = {
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

  const handleBuyShopItem = async (itemId: string) => {
    if (!roomId || !cat || shopLoading || loading) return

    const item = CAT_SHOP_ITEMS.find((product) => product.id === itemId)
    if (!item) return

    if (cat.is_unconscious) {
      setShopMessage('รอน้องแมวฟื้นก่อน แล้วค่อยเลือกซื้อของนะ 💗')
      return
    }

    if (cat.hearts < item.price) {
      setShopMessage('หัวใจยังไม่พอ ทำภารกิจเพื่อสะสมเพิ่มนะ 💗')
      return
    }

    setShopLoading(true)
    setShopMessage('')
    setError('')

    try {
      const result = await purchaseCatShopItem(roomId, itemId)

      const [updatedCat, inventory] = await Promise.all([
        getCatState(roomId),
        getCatShopInventory(roomId),
      ])

      setCat(updatedCat as CatState)
      setShopInventory(inventory)
      setShopMessage(
        `ซื้อ${result.item_name}สำเร็จ! หัก ${result.cost} หัวใจแล้ว 💗`,
      )
    } catch (err) {
      setShopMessage(
        err instanceof Error
          ? err.message
          : 'ซื้อของไม่สำเร็จ กรุณาลองใหม่',
      )
    } finally {
      setShopLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">🐱 Our Little Cat</div>
        <div className="heart-count">
          💗 {heartTotal.toLocaleString()} Hearts
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
              <p>
                เปิดเว็บจากอุปกรณ์ของอีกคนเพื่อดูแลแมวตัวเดียวกันได้เลย
              </p>
            </div>

            {cat && (
              <div className="mission home-level-card">
                <span className="eyebrow">OUR LOVE LEVEL</span>
                <h2>
                  {homeLevel.emoji} เลเวลบ้านแมว {homeLevel.level}
                </h2>
                <p>
                  บ้านของเรา: <strong>{homeLevel.name}</strong>
                </p>

                <div className="mission-item">
                  <strong>💗 หัวใจของเราสองคน</strong>
                  <span>{heartTotal.toLocaleString()} ❤️</span>
                </div>

                <div
                  className="progress happiness"
                  style={{ marginTop: 16, height: 14 }}
                  role="progressbar"
                  aria-valuenow={Math.floor(homeProgress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="ความคืบหน้าสู่เลเวลบ้านแมวถัดไป"
                >
                  <div style={{ width: `${homeProgress}%` }} />
                </div>

                <p>
                  {homeLevel.next === null
                    ? '🎉 บ้านของเราเลเวลสูงสุดแล้ว!'
                    : `อีก ${homeLevel.next - heartTotal} หัวใจ จะเลื่อนเป็นเลเวล ${homeLevel.level + 1} 💕`}
                </p>
                <small>ความคืบหน้า {Math.floor(homeProgress)}%</small>
              </div>
            )}

            <div className="cat-card">
              <div className="sparkle">✦　♡　✦</div>

              <div className={`cat-image ${petAnimation ? 'petting' : ''}`}>
                <Cat3D action={catAnimation} />

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
                      {new Date(cat.unconscious_until).toLocaleTimeString(
                        'th-TH',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        },
                      )}
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

  <button
    onClick={() => {
      setCatAnimation('sleep')
      window.setTimeout(() => {
        setCatAnimation('idle')
      }, 3000)
    }}
    disabled={loading || cat.is_unconscious}
  >
    💤 พักผ่อน
  </button>
</div>

                </>
              )}
            </div>
<InventoryTabs roomId={roomId} />
            <section className="shop-section">
              <span className="eyebrow">OUR LITTLE SHOP</span>
              <h2>🛍️ ร้านค้าบ้านแมว</h2>
              <p>เลือกของตกแต่งน่ารัก ๆ ให้บ้านของเราสองคน</p>

              <div className="shop-balance">
                💗 หัวใจของเรา: {heartTotal.toLocaleString()}
              </div>

              {shopMessage && (
                <p className="shop-message" role="status">
                  {shopMessage}
                </p>
              )}

              <div className="shop-grid">
                {CAT_SHOP_ITEMS.map((item) => {
                  const owned =
                    shopInventory.find(
                      (product) => product.item_id === item.id,
                    )?.quantity ?? 0

                  const canAfford = heartTotal >= item.price

                  return (
                    <article className="shop-item" key={item.id}>
                      <div className="shop-item-emoji">{item.emoji}</div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <div className="shop-price">
                        💗 {item.price} หัวใจ
                      </div>
                      <div className="shop-owned">
                        ในคลัง: {owned} ชิ้น
                      </div>
                      <button
                        className="shop-buy-button"
                        onClick={() => void handleBuyShopItem(item.id)}
                        disabled={
                          shopLoading ||
                          loading ||
                          !cat ||
                          cat.is_unconscious ||
                          !canAfford
                        }
                      >
                        {shopLoading
                          ? 'กำลังซื้อ...'
                          : !canAfford
                            ? 'หัวใจไม่พอ 💗'
                            : '🛍️ ซื้อเลย'}
                      </button>
                    </article>
                  )
                })}
              </div>

              <div className="shop-inventory">
                <h3>🎁 คลังของตกแต่งของเรา</h3>

                {shopInventory.length === 0 ? (
                  <p>ยังไม่มีของตกแต่ง มาเลือกซื้อชิ้นแรกกันนะ 💕</p>
                ) : (
                  <div className="inventory-list">
                    {shopInventory.map((ownedItem) => {
                      const item = CAT_SHOP_ITEMS.find(
                        (product) => product.id === ownedItem.item_id,
                      )

                      if (!item) return null

                      return (
                        <div
                          className="inventory-item"
                          key={ownedItem.item_id}
                        >
                          <span>
                            {item.emoji} {item.name}
                          </span>
                          <strong>× {ownedItem.quantity}</strong>
                        </div>
                      )
                    })}
                  </div>
                )}

                <p className="inventory-note">
                  ของที่ซื้อจะถูกเก็บไว้ในคลังของห้องแมวร่วมกัน 🏡
                </p>
              </div>
            </section>
          </>
        )}

        {error && (
          <div className="mission" role="alert">
            <p>⚠️ {error}</p>
            <p>
              ถ้าเชื่อมต่อไม่ได้ ให้ตรวจสอบการตั้งค่า Supabase ด้วยนะครับ
            </p>
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
