import { useState } from 'react'
import './App.css'

function App() {
  const [hearts, setHearts] = useState(0)
  const [hunger, setHunger] = useState(70)
  const [happiness, setHappiness] = useState(50)
  const [message, setMessage] = useState('วันนี้มาเล่นกับน้องแมวกันนะ 💗')

  const feedCat = () => {
    if (hunger >= 100) {
      setMessage('น้องแมวอิ่มแล้ว ไว้กินใหม่นะ 😽')
      return
    }

    setHunger(Math.min(100, hunger + 20))
    setHearts((previous) => previous + 2)
    setMessage('งั่ม ๆ อร่อยจัง ขอบคุณนะ! 😻')
  }

  const playCat = () => {
    setHappiness(Math.min(100, happiness + 15))
    setHearts((previous) => previous + 3)
    setMessage('เหมียววว~ น้องแมวมีความสุขมากเลย 💕')
  }

  const petCat = () => {
    setHappiness(Math.min(100, happiness + 10))
    setHearts((previous) => previous + 1)
    setMessage('น้องแมวเคลิ้มแล้ว งื้ออ 🥹💗')
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="brand">🐱 Our Little Cat</div>
        <div className="heart-count">💗 {hearts} Hearts</div>
      </header>

      <section className="hero">
        <span className="eyebrow">A LITTLE WORLD FOR TWO</span>
        <h1>รักปลาที่สุดในสามโลก ♡</h1>
        <p>มาดูแลเจ้าเหมียวและเก็บความทรงจำดี ๆ ไปด้วยกัน</p>

        <div className="cat-card">
          <div className="sparkle">✦　♡　✦</div>
          <div className="cat-image">
  <img src="/cats/poop.gif" alt="น้องปลาน้อย" />
</div>

          <h2>ปลาน้อย (narak)</h2>
          <p className="cat-message">{message}</p>

          <div className="stats">
            <div className="stat">
              <div className="stat-label">🍰 ความอิ่ม</div>
              <div className="progress">
                <div style={{ width: `${hunger}%` }} />
              </div>
              <small>{hunger}/100</small>
            </div>

            <div className="stat">
              <div className="stat-label">🥰 ความสุข</div>
              <div className="progress happiness">
                <div style={{ width: `${happiness}%` }} />
              </div>
              <small>{happiness}/100</small>
            </div>
          </div>

          <div className="actions">
            <button onClick={feedCat}>🍓 ให้อาหาร</button>
            <button onClick={playCat}>🧶 เล่นกับแมว</button>
            <button onClick={petCat}>💗 ลูบหัว</button>
          </div>
        </div>
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