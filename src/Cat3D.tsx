
import { useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Html, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

type CatAction = 'idle' | 'feed' | 'play' | 'sleep' | 'pet'

function CuteCat({ action }: { action: CatAction }) {
  const root = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const tail = useRef<THREE.Group>(null!)
  const hand = useRef<THREE.Group>(null!)

  const leftEye = useRef<THREE.Group>(null!)
  const rightEye = useRef<THREE.Group>(null!)

  const frontLeft = useRef<THREE.Group>(null!)
  const frontRight = useRef<THREE.Group>(null!)
  const backLeft = useRef<THREE.Group>(null!)
  const backRight = useRef<THREE.Group>(null!)

  const [isPetting, setIsPetting] = useState(false)
  const petPointer = useRef<number | null>(null)

  const tailCurve = useMemo(
    () =>
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0.2, 0.02, 0),
          new THREE.Vector3(0.42, 0.2, 0),
          new THREE.Vector3(0.36, 0.43, 0),
          new THREE.Vector3(0.2, 0.48, 0),
        ]),
        24,
        0.075,
        8,
        false,
      ),
    [],
  )

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime
    const petActive = isPetting || action === 'pet'

    let bounce = Math.sin(t * 2) * 0.012
    let headTilt = Math.sin(t * 0.9) * 0.035
    let headDip = 0
    let headBob = Math.sin(t * 1.8) * 0.018
    let tailSpeed = 3
    let bodySquash = 1
    let bodyWidth = 1
    let bodyLean = 0
    let sleepPose = 0
    let legSpeed = 1.8
    let legAmount = 0.07
    let tuckLegs = false

    // หายใจเบา ๆ
    bodySquash += Math.sin(t * 2.4) * 0.018

    if (action === 'feed') {
      headDip = Math.max(0, Math.sin(t * 8)) * 0.22
      headBob = Math.sin(t * 8) * 0.025
      bounce = Math.sin(t * 8) * 0.012
      tailSpeed = 5
      legAmount = 0.025
    }

    if (action === 'play') {
      const jump = Math.max(0, Math.sin(t * 7))

      bounce = jump * 0.3
      bodySquash = 1 - jump * 0.06
      bodyLean = Math.sin(t * 7) * 0.09
      headTilt = Math.sin(t * 7) * 0.12
      tailSpeed = 11
      legSpeed = 10
      legAmount = 0.48
    }

    if (petActive) {
      headTilt = 0.2 + Math.sin(t * 3) * 0.06
      headDip = Math.sin(t * 3) * 0.035
      headBob = Math.sin(t * 3) * 0.012
      tailSpeed = 4
      legAmount = 0.025
    }

    if (action === 'sleep') {
      sleepPose = 0.12
      bounce = -0.08 + Math.sin(t * 1.5) * 0.008
      bodySquash = 0.86 + Math.sin(t * 1.5) * 0.012
      bodyWidth = 0.92
      bodyLean = 0.035
      headTilt = 0.12
      headDip = 0.06
      headBob = 0
      tailSpeed = 1.5
      legAmount = 0
      tuckLegs = true
    }

    // ขยับตัวขึ้นลง
    root.current.position.y = THREE.MathUtils.damp(
      root.current.position.y,
      bounce,
      7,
      delta,
    )

    // ยืดหดลำตัว
    body.current.scale.y = THREE.MathUtils.damp(
      body.current.scale.y,
      bodySquash,
      6,
      delta,
    )

    body.current.scale.x = THREE.MathUtils.damp(
      body.current.scale.x,
      bodyWidth,
      6,
      delta,
    )

    body.current.rotation.z = THREE.MathUtils.damp(
      body.current.rotation.z,
      bodyLean,
      6,
      delta,
    )

    // ขยับหัว
    head.current.position.y = THREE.MathUtils.damp(
      head.current.position.y,
      0.27 + headBob - sleepPose,
      7,
      delta,
    )

    head.current.rotation.z = THREE.MathUtils.damp(
      head.current.rotation.z,
      headTilt,
      6,
      delta,
    )

    head.current.rotation.x = THREE.MathUtils.damp(
      head.current.rotation.x,
      headDip,
      7,
      delta,
    )

    // ส่ายหาง
    const tailTarget =
      action === 'sleep'
        ? -0.45 + Math.sin(t * tailSpeed) * 0.04
        : Math.sin(t * tailSpeed) *
          (action === 'play' ? 0.5 : 0.2)

    tail.current.rotation.z = THREE.MathUtils.damp(
      tail.current.rotation.z,
      tailTarget,
      5,
      delta,
    )

    // ขยับขาสลับกัน
    const step = Math.sin(t * legSpeed) * legAmount
    const oppositeStep = Math.sin(t * legSpeed + Math.PI) * legAmount

    const frontLeftTarget = tuckLegs ? 0.65 : step
    const frontRightTarget = tuckLegs ? -0.65 : oppositeStep
    const backLeftTarget = tuckLegs ? -0.55 : oppositeStep
    const backRightTarget = tuckLegs ? 0.55 : step

    frontLeft.current.rotation.z = THREE.MathUtils.damp(
      frontLeft.current.rotation.z,
      frontLeftTarget,
      8,
      delta,
    )

    frontRight.current.rotation.z = THREE.MathUtils.damp(
      frontRight.current.rotation.z,
      frontRightTarget,
      8,
      delta,
    )

    backLeft.current.rotation.z = THREE.MathUtils.damp(
      backLeft.current.rotation.z,
      backLeftTarget,
      8,
      delta,
    )

    backRight.current.rotation.z = THREE.MathUtils.damp(
      backRight.current.rotation.z,
      backRightTarget,
      8,
      delta,
    )

    // เก็บขาเข้าหาตัวตอนนอน
    const legPositions = [
      {
        ref: frontLeft,
        normal: [-0.29, -0.38, 0.12],
        sleeping: [-0.19, -0.31, 0.23],
      },
      {
        ref: frontRight,
        normal: [0.29, -0.38, 0.12],
        sleeping: [0.19, -0.31, 0.23],
      },
      {
        ref: backLeft,
        normal: [-0.31, -0.22, -0.1],
        sleeping: [-0.2, -0.2, 0.02],
      },
      {
        ref: backRight,
        normal: [0.31, -0.22, -0.1],
        sleeping: [0.2, -0.2, 0.02],
      },
    ]

    legPositions.forEach(({ ref, normal, sleeping }) => {
      const target = tuckLegs ? sleeping : normal

      ref.current.position.x = THREE.MathUtils.damp(
        ref.current.position.x,
        target[0],
        7,
        delta,
      )

      ref.current.position.y = THREE.MathUtils.damp(
        ref.current.position.y,
        target[1],
        7,
        delta,
      )

      ref.current.position.z = THREE.MathUtils.damp(
        ref.current.position.z,
        target[2],
        7,
        delta,
      )
    })

    // มือจะปรากฏเมื่อกำลังลากลูบหัว
    hand.current.visible = petActive

    const petMotion = Math.sin(t * 5)

    hand.current.position.x = THREE.MathUtils.damp(
      hand.current.position.x,
      petActive ? 0.48 + petMotion * 0.045 : 0.85,
      7,
      delta,
    )

    hand.current.position.y = THREE.MathUtils.damp(
      hand.current.position.y,
      petActive ? 0.91 + petMotion * 0.035 : 1.5,
      7,
      delta,
    )

    hand.current.rotation.z = THREE.MathUtils.damp(
      hand.current.rotation.z,
      petActive ? -0.35 + petMotion * 0.08 : -0.2,
      7,
      delta,
    )

    // กะพริบตา
    const blinkCycle = t % 4.5
    const blinking = blinkCycle > 4.15 && blinkCycle < 4.3

    const eyeScale =
      action === 'sleep' ? 0.06 : petActive ? 0.35 : blinking ? 0.12 : 1

    leftEye.current.scale.y = THREE.MathUtils.damp(
      leftEye.current.scale.y,
      eyeScale,
      22,
      delta,
    )

    rightEye.current.scale.y = THREE.MathUtils.damp(
      rightEye.current.scale.y,
      eyeScale,
      22,
      delta,
    )
  })

  const fur = '#f6c995'
  const cream = '#fff0dc'
  const pink = '#ff9fb7'
  const dark = '#49343a'
  const skin = '#f2c6a5'

  return (
    <group ref={root}>
      {/* หาง */}
      <group ref={tail} position={[0.3, -0.32, -0.22]}>
        <mesh geometry={tailCurve}>
          <meshStandardMaterial color={fur} roughness={0.85} />
        </mesh>

        <mesh position={[0.2, 0.48, 0]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshStandardMaterial color={pink} roughness={0.8} />
        </mesh>
      </group>

      {/* ลำตัว */}
      <group ref={body} position={[0, -0.38, 0]}>
        <mesh scale={[0.46, 0.52, 0.38]}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial color={fur} roughness={0.9} />
        </mesh>

        <mesh
          position={[0, -0.04, 0.31]}
          scale={[0.29, 0.34, 0.1]}
        >
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color={cream} roughness={0.9} />
        </mesh>

        {/* ขาหน้า */}
        <group ref={frontLeft} position={[-0.29, -0.38, 0.12]}>
          <mesh scale={[0.17, 0.13, 0.18]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={cream} roughness={0.85} />
          </mesh>
        </group>

        <group ref={frontRight} position={[0.29, -0.38, 0.12]}>
          <mesh scale={[0.17, 0.13, 0.18]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={cream} roughness={0.85} />
          </mesh>
        </group>

        {/* ขาหลัง */}
        <group ref={backLeft} position={[-0.31, -0.22, -0.1]}>
          <mesh scale={[0.17, 0.19, 0.17]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={fur} roughness={0.85} />
          </mesh>
        </group>

        <group ref={backRight} position={[0.31, -0.22, -0.1]}>
          <mesh scale={[0.17, 0.19, 0.17]}>
            <sphereGeometry args={[1, 24, 24]} />
            <meshStandardMaterial color={fur} roughness={0.85} />
          </mesh>
        </group>
      </group>

      {/* หัว */}
      <group ref={head} position={[0, 0.27, 0.05]}>
        <mesh scale={[0.55, 0.5, 0.44]}>
          <sphereGeometry args={[1, 40, 40]} />
          <meshStandardMaterial color={fur} roughness={0.82} />
        </mesh>

        {/* หู */}
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * 0.37, 0.39, 0]}
            rotation={[0, 0, -side * 0.18]}
          >
            <mesh>
              <coneGeometry args={[0.19, 0.35, 4]} />
              <meshStandardMaterial color={fur} roughness={0.85} />
            </mesh>

            <mesh
              position={[0, -0.015, 0.09]}
              scale={[0.095, 0.17, 0.035]}
            >
              <sphereGeometry args={[1, 20, 20]} />
              <meshStandardMaterial color={pink} roughness={0.8} />
            </mesh>
          </group>
        ))}

        {/* ดวงตา */}
        {[-1, 1].map((side) => (
          <group
            key={side}
            ref={side === -1 ? leftEye : rightEye}
            position={[side * 0.21, 0.015, 0.405]}
          >
            <mesh scale={[0.078, 0.105, 0.045]}>
              <sphereGeometry args={[1, 24, 24]} />
              <meshStandardMaterial color={dark} roughness={0.2} />
            </mesh>

            <mesh
              position={[0.022, 0.04, 0.037]}
              scale={[0.025, 0.03, 0.018]}
            >
              <sphereGeometry args={[1, 16, 16]} />
              <meshBasicMaterial color="white" />
            </mesh>
          </group>
        ))}

        {/* แก้ม */}
        {[-1, 1].map((side) => (
          <mesh
            key={side}
            position={[side * 0.32, -0.13, 0.35]}
            scale={[0.105, 0.055, 0.025]}
          >
            <sphereGeometry args={[1, 20, 20]} />
            <meshBasicMaterial
              color={pink}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}

        {/* จมูก */}
        <mesh position={[0, -0.105, 0.43]} scale={[0.055, 0.04, 0.035]}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial color="#ff7899" />
        </mesh>

        {/* ปาก */}
        <mesh
          position={[-0.035, -0.16, 0.427]}
          rotation={[0, 0, -0.3]}
        >
          <boxGeometry args={[0.055, 0.012, 0.012]} />
          <meshBasicMaterial color={dark} />
        </mesh>

        <mesh
          position={[0.035, -0.16, 0.427]}
          rotation={[0, 0, 0.3]}
        >
          <boxGeometry args={[0.055, 0.012, 0.012]} />
          <meshBasicMaterial color={dark} />
        </mesh>

        {/* พื้นที่ตรวจจับการลูบหัว */}
        <mesh
          position={[0, 0.08, 0.2]}
          onPointerDown={(event) => {
            event.stopPropagation()
            petPointer.current = event.pointerId
            
            setIsPetting(true)
          }}
          onPointerMove={(event) => {
            if (petPointer.current === event.pointerId) {
              event.stopPropagation()
              setIsPetting(true)
            }
          }}
          onPointerUp={(event) => {
            if (petPointer.current === event.pointerId) {
              event.stopPropagation()
              petPointer.current = null
              setIsPetting(false)
            }
          }}
          onPointerCancel={() => {
            petPointer.current = null
            setIsPetting(false)
          }}
        >
          <sphereGeometry args={[0.49, 24, 24]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </group>

      {/* มือ 3D */}
      <group
        ref={hand}
        visible={false}
        position={[0.85, 1.5, 0.62]}
      >
        {/* แขนเสื้อ */}
        <mesh
          position={[0.22, 0.02, 0]}
          rotation={[0, 0, -0.45]}
          scale={[0.25, 0.105, 0.09]}
        >
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color="#f5b8d0" roughness={0.8} />
        </mesh>

        {/* ข้อมือ */}
        <mesh
          position={[0.045, -0.015, 0]}
          rotation={[0, 0, -0.25]}
          scale={[0.13, 0.085, 0.075]}
        >
          <sphereGeometry args={[1, 24, 24]} />
          <meshStandardMaterial color={skin} roughness={0.85} />
        </mesh>

        {/* ฝ่ามือ */}
        <mesh
          position={[-0.045, -0.07, 0.005]}
          rotation={[0, 0, -0.2]}
          scale={[0.145, 0.13, 0.065]}
        >
          <sphereGeometry args={[1, 32, 24]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>

        {/* นิ้วมือ */}
        {[-0.13, -0.065, 0, 0.065].map((x, index) => (
          <mesh
            key={index}
            position={[
              x,
              -0.18 + Math.abs(index - 1.5) * 0.012,
              0.015,
            ]}
            rotation={[0, 0, (index - 1.5) * 0.09]}
            scale={[0.033, 0.09, 0.035]}
          >
            <sphereGeometry args={[1, 20, 20]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
        ))}

        {/* นิ้วโป้ง */}
        <mesh
          position={[0.105, -0.075, 0.02]}
          rotation={[0, 0, -0.75]}
          scale={[0.04, 0.085, 0.035]}
        >
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial color={skin} roughness={0.8} />
        </mesh>
      </group>

      {/* เอฟเฟกต์ตอนนอน */}
      {action === 'sleep' && (
        <Html position={[0.55, 1.05, 0]} center>
          <div
            style={{
              color: '#9b83df',
              fontSize: 25,
              fontWeight: 800,
              textShadow: '0 2px 8px #ffffff',
              animation: 'catZzz 1.2s ease-in-out infinite',
            }}
          >
            Zzz...
          </div>
        </Html>
      )}

      {/* เอฟเฟกต์ตอนเล่น */}
      {action === 'play' && (
        <Html position={[0.6, 0.85, 0]} center>
          <div
            style={{
              fontSize: 24,
              animation: 'catSparkle 0.6s infinite alternate',
            }}
          >
            ✨ 💗
          </div>
        </Html>
      )}

      {/* หัวใจตอนใช้ปุ่มลูบหัวเดิมเท่านั้น */}
      {action === 'pet' && (
        <Html position={[-0.5, 0.9, 0.3]} center>
          <div
            style={{
              fontSize: 25,
              animation: 'catHeart 0.8s ease-in-out infinite alternate',
              filter: 'drop-shadow(0 2px 4px #ffc1df)',
            }}
          >
            💗 💕
          </div>
        </Html>
      )}
    </group>
  )
}

export default function Cat3D({
  action = 'idle',
}: {
  action?: CatAction
}) {
  return (
    <div
      style={{
        width: '100%',
        height: 300,
        position: 'relative',
        touchAction: 'pan-y',
      }}
    >
      <style>{`
        @keyframes catZzz {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-9px) scale(1.08);
            opacity: 1;
          }
        }

        @keyframes catSparkle {
          from {
            transform: scale(0.8) rotate(-8deg);
          }
          to {
            transform: scale(1.15) rotate(8deg);
          }
        }

        @keyframes catHeart {
          from {
            transform: translateY(4px) scale(0.9);
            opacity: 0.7;
          }
          to {
            transform: translateY(-7px) scale(1.12);
            opacity: 1;
          }
        }
      `}</style>

      <Canvas
        camera={{ position: [0, 0.45, 3.5], fov: 42 }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={1.8} />
        <directionalLight position={[3, 4, 5]} intensity={2.2} />
        <pointLight
          position={[-3, 2, 3]}
          intensity={0.7}
          color="#ffc4df"
        />

        <CuteCat action={action} />

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  )
}
