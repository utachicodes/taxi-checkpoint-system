"use client"

import { Canvas } from "@react-three/fiber"
import { Environment, Float, ContactShadows, MeshDistortMaterial, Sparkles } from "@react-three/drei"

function Sphere({ color, position, scale = 1, speed = 1.5, distort = 0.4 }: { color: string; position: [number, number, number]; scale?: number; speed?: number; distort?: number }) {
    return (
        <Float floatIntensity={2} rotationIntensity={1} speed={speed}>
            <mesh position={position} scale={scale}>
                <sphereGeometry args={[1, 64, 64]} />
                <MeshDistortMaterial
                    color={color}
                    speed={2}
                    distort={distort}
                    radius={1}
                />
            </mesh>
        </Float>
    )
}

export default function HeroScene() {
    return (
        <div className="w-full h-full min-h-[500px] absolute inset-0 md:relative md:inset-auto">
            <Canvas camera={{ position: [0, 0, 10], fov: 40 }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={10} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={5} color="#fff" />

                <group position={[1.5, 0, 0]}>
                    {/* Senegal Flag Colors: Green, Yellow, Red */}
                    {/* Top Sphere (Red) */}
                    <Sphere color="#e31b23" position={[1.2, 1.8, 0]} scale={2} speed={1.2} distort={0.5} />

                    {/* Middle Sphere (Yellow) */}
                    <Sphere color="#ffcc00" position={[0, 0, 1]} scale={2.4} speed={1} distort={0.3} />

                    {/* Bottom Sphere (Green) */}
                    <Sphere color="#00853f" position={[-1.2, -1.8, -1]} scale={2.2} speed={1.5} distort={0.4} />

                    {/* Background Decorative element */}
                    <Float floatIntensity={1} speed={1}>
                        <mesh position={[-1.5, 0.5, -2]} rotation={[Math.PI / 4, 0, 0]}>
                            <torusGeometry args={[3.2, 0.2, 16, 100]} />
                            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.2} roughness={0.1} metalness={0.9} transparent opacity={0.2} />
                        </mesh>
                    </Float>
                </group>

                <Sparkles count={50} scale={15} size={3} speed={0.4} opacity={0.3} color="#fff" />
                <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.25} far={10} color="#000000" />
                <Environment preset="city" />
            </Canvas>
        </div>
    )
}
