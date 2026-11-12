"use client";
import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * A slowly floating gold-and-navy object that drifts as the visitor scrolls.
 * Built from primitive geometry on purpose: it borrows the motion approach from
 * the Fizzi landing page but none of its assets (its soda-can model is not ours).
 */
function FloatingObject() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = t * 0.35;
    group.current.position.y = Math.sin(t * 0.9) * 0.08;
  });

  return (
    <group ref={group}>
      <mesh>
        <cylinderGeometry args={[0.7, 0.7, 1.8, 48]} />
        <meshStandardMaterial color="#20349B" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <cylinderGeometry args={[0.72, 0.72, 0.08, 48]} />
        <meshStandardMaterial color="#E8AE0C" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.1, 0.71]}>
        <boxGeometry args={[0.9, 0.7, 0.02]} />
        <meshStandardMaterial color="#E8AE0C" metalness={0.6} roughness={0.35} />
      </mesh>
    </group>
  );
}

export default function HeroScene() {
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.registerPlugin(ScrollTrigger);
    const el = wrap.current;
    if (!el) return;

    // Scroll-linked tilt: the object turns and drifts as the hero scrolls out of view.
    const tween = gsap.to(el, {
      yPercent: -18,
      rotate: 6,
      ease: "none",
      scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div ref={wrap} aria-hidden className="pointer-events-none absolute inset-0">
      <Canvas
        camera={{ position: [0, 0.4, 4.2], fov: 40 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.7} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <FloatingObject />
      </Canvas>
    </div>
  );
}
