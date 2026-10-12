
import { useCallback, useEffect, useState } from 'react'
import './InventoryTabs.css'
import {
  CAT_SHOP_ITEMS,
  getCatShopInventory,
  type ShopInventoryItem,
} from './catRoom'

type TabId = 'food' | 'bath' | 'scratch' | 'friends' | 'chat'

const categories: { id: TabId; icon: string; label: string }[] = [
  { id: 'food', icon: '🍓', label: 'อาหาร' },
  { id: 'bath', icon: '🛁', label: 'อาบน้ำ' },
  { id: 'scratch', icon: '🐾', label: 'ของเล่น' },
  { id: 'friends', icon: '👥', label: 'เพื่อน' },
  { id: 'chat', icon: '💌', label: 'ข้อความ' },
]

export default function InventoryTabs({
  roomId,
}: {
  roomId: string
}) {
  const [activeTab, setActiveTab] = useState<TabId>('food')
  const [items, setItems] = useState<ShopInventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  const loadInventory = useCallback(async () => {
    console.log('Inventory roomId:', roomId)

    if (!roomId) {
      setErrorMessage('ไม่พบรหัสห้องแมว (roomId)')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setErrorMessage('')

      const result = await getCatShopInventory(roomId)

      console.log('Inventory result:', result)
      setItems(result)
    } catch (error) {
      console.error('Inventory error:', error)

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'โหลดคลังของไม่สำเร็จ',
      )
    } finally {
      setLoading(false)
    }
  }, [roomId])

  useEffect(() => {
    void loadInventory()
  }, [loadInventory])

  const shopItems = CAT_SHOP_ITEMS.filter(
    (item) => item.id === 'scratch_post',
  )

  return (
    <section className="inventory-panel">
      <div className="inventory-heading">
        <div>
          <span className="inventory-eyebrow">
            OUR LITTLE INVENTORY
          </span>
          <h2>🎒 คลังของของเรา</h2>
        </div>
        <span className="inventory-heart">♡</span>
      </div>

      <div className="inventory-tabs">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`inventory-tab ${
              activeTab === category.id ? 'active' : ''
            }`}
            onClick={() => setActiveTab(category.id)}
            aria-label={category.label}
            aria-pressed={activeTab === category.id}
            title={category.label}
          >
            <span>{category.icon}</span>
          </button>
        ))}
      </div>

      <div className="inventory-content">
        <div className="inventory-category-title">
          <h3>
            {categories.find(
              (category) => category.id === activeTab,
            )?.label}
          </h3>

          {activeTab === 'scratch' && (
            <span>{shopItems.length} รายการในร้านที่เชื่อมแล้ว</span>
          )}
        </div>

        {loading ? (
          <p>กำลังโหลดคลังของ... 🐱</p>
        ) : errorMessage ? (
          <div>
            <p role="alert">
              โหลดคลังของไม่สำเร็จ: {errorMessage}
            </p>
            <button
              type="button"
              onClick={() => void loadInventory()}
            >
              ลองโหลดอีกครั้ง
            </button>
          </div>
        ) : activeTab === 'scratch' ? (
          <div className="inventory-items">
            {shopItems.map((item) => {
              const quantity =
                items.find(
                  (entry) => entry.item_id === item.id,
                )?.quantity ?? 0

              return (
                <article
                  className="inventory-card"
                  key={item.id}
                >
                  <span className="inventory-card-heart">♥</span>

                  <div className="inventory-item-picture">
                    <span className="inventory-item-emoji">
                      {item.emoji}
                    </span>
                    <span className="inventory-quantity">
                      x{quantity}
                    </span>
                  </div>

                  <div className="inventory-item-name">
                    {item.name}
                  </div>

                  <div className="inventory-item-name">
                    {item.description}
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="inventory-empty">
            <span>🐱💗</span>
            <p>หมวดนี้ยังไม่ได้เชื่อมกับฐานข้อมูล</p>
            <small>
              ไอเทมในหมวดนี้จะเพิ่มได้ในขั้นตอนถัดไป
            </small>
          </div>
        )}
      </div>

      <div className="inventory-exp">
        <div className="inventory-exp-top">
          <strong>🎀 คลังของห้องคู่</strong>
          <span>Supabase</span>
        </div>

        <div className="inventory-exp-track">
          <div className="inventory-exp-fill" />
        </div>
      </div>

      <p className="inventory-footnote">
        จำนวนไอเทมโหลดจากฐานข้อมูลของห้องแมว 💗
      </p>
    </section>
  )
}
