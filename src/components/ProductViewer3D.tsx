"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { Loader2, RotateCcw, Sparkles, X, ZoomIn } from "lucide-react";
import { useNobystStore } from "@/store/useStore";

type Props = {
  modelUrl?: string | null;
  productName: string;
  colors?: string[];
  onClose: () => void;
};

// Preset palette for colors / finishes
const COLOR_MAP: Record<string, { hex: string; metalness: number; roughness: number }> = {
  default: { hex: "#1A2540", metalness: 0.35, roughness: 0.4 },
  black: { hex: "#18181B", metalness: 0.4, roughness: 0.4 },
  gold: { hex: "#D4AF37", metalness: 0.85, roughness: 0.25 },
  navy: { hex: "#1A365D", metalness: 0.5, roughness: 0.35 },
  silver: { hex: "#E2E8F0", metalness: 0.9, roughness: 0.2 },
  white: { hex: "#F8FAFC", metalness: 0.1, roughness: 0.3 },
  blue: { hex: "#2563EB", metalness: 0.6, roughness: 0.3 },
  green: { hex: "#15803D", metalness: 0.5, roughness: 0.4 },
  red: { hex: "#DC2626", metalness: 0.5, roughness: 0.4 },
};

function resolveColor(name: string) {
  const clean = name.toLowerCase().trim();
  if (COLOR_MAP[clean]) return COLOR_MAP[clean];
  if (name.startsWith("#")) {
    return { hex: name, metalness: 0.5, roughness: 0.35 };
  }
  return COLOR_MAP.default;
}

export default function ProductViewer3D({
  modelUrl,
  productName,
  colors = [],
  onClose,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedColor, setSelectedColor } = useNobystStore();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // References for live material updating
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const controlsRef = useRef<OrbitControls | null>(null);

  const availableColors = useMemo(
    () => (colors.length > 0 ? colors : ["Black", "Gold", "Navy", "Silver"]),
    [colors]
  );

  useEffect(() => {
    if (!selectedColor || selectedColor === "Default") {
      setSelectedColor(availableColors[0]);
    }
  }, [availableColors, selectedColor, setSelectedColor]);

  // Update Three.js materials when selectedColor changes
  useEffect(() => {
    if (!selectedColor) return;
    const config = resolveColor(selectedColor);
    materialsRef.current.forEach((mat) => {
      mat.color.set(config.hex);
      mat.metalness = config.metalness;
      mat.roughness = config.roughness;
      mat.needsUpdate = true;
    });
  }, [selectedColor]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. Scene, Camera, Renderer
    const width = container.clientWidth;
    const height = container.clientHeight || 380;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F8FAFC");

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(2.4, 1.8, 3.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 8;
    controls.minDistance = 1.2;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't flip upside down
    controls.target.set(0, 0.2, 0);
    controlsRef.current = controls;

    // 3. Studio Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0001;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xdbeafe, 1.0);
    fillLight.position.set(-5, 3, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xfef08a, 0.8);
    rimLight.position.set(0, -4, -5);
    scene.add(rimLight);

    // Ground contact shadow receiver
    const shadowGeo = new THREE.PlaneGeometry(10, 10);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.12 });
    const ground = new THREE.Mesh(shadowGeo, shadowMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle grid helper on the ground
    const grid = new THREE.GridHelper(6, 12, 0xd1d5db, 0xe5e7eb);
    grid.position.y = -0.499;
    scene.add(grid);

    // 4. Load GLB or Build Procedural High-Fidelity Geometry
    materialsRef.current = [];
    const initialConfig = resolveColor(selectedColor || availableColors[0]);

    if (modelUrl && (modelUrl.endsWith(".glb") || modelUrl.endsWith(".gltf"))) {
      const loader = new GLTFLoader();
      loader.load(
        modelUrl,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              mesh.castShadow = true;
              mesh.receiveShadow = true;
              if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                mat.color.set(initialConfig.hex);
                mat.metalness = initialConfig.metalness;
                mat.roughness = initialConfig.roughness;
                materialsRef.current.push(mat);
              }
            }
          });

          // Center & scale model to fit view bounding box
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxAxis = Math.max(size.x, size.y, size.z);
          if (maxAxis > 0) {
            model.scale.multiplyScalar(1.5 / maxAxis);
          }
          const centeredBox = new THREE.Box3().setFromObject(model);
          const center = centeredBox.getCenter(new THREE.Vector3());
          model.position.sub(center);
          model.position.y += 0.2;

          scene.add(model);
          setLoading(false);
        },
        undefined,
        (error) => {
          console.warn("GLTF Load error, falling back to procedural model:", error);
          buildProceduralModel();
        }
      );
    } else {
      buildProceduralModel();
    }

    function buildProceduralModel() {
      // Build a premium accessory body (Fast-Charger / Adapter with ports & contacts)
      const group = new THREE.Group();

      // Main charger body
      const bodyMat = new THREE.MeshStandardMaterial({
        color: initialConfig.hex,
        metalness: initialConfig.metalness,
        roughness: initialConfig.roughness,
      });
      materialsRef.current.push(bodyMat);

      const bodyGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;
      bodyMesh.position.y = 0.2;
      group.add(bodyMesh);

      // Accent gold/metallic bezel
      const bezelMat = new THREE.MeshStandardMaterial({
        color: "#D4AF37",
        metalness: 0.9,
        roughness: 0.2,
      });
      const bezelGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.82, 32);
      const bezel = new THREE.Mesh(bezelGeo, bezelMat);
      bezel.rotation.x = Math.PI / 2;
      bezel.position.set(0, 0.75, 0);
      group.add(bezel);

      // Metallic contact prongs (UK / Ghana plug style)
      const prongMat = new THREE.MeshStandardMaterial({
        color: "#CBD5E1",
        metalness: 0.95,
        roughness: 0.15,
      });
      const prongGeo = new THREE.BoxGeometry(0.14, 0.5, 0.08);

      const prong1 = new THREE.Mesh(prongGeo, prongMat);
      prong1.position.set(-0.35, -0.65, 0);
      prong1.castShadow = true;
      group.add(prong1);

      const prong2 = new THREE.Mesh(prongGeo, prongMat);
      prong2.position.set(0.35, -0.65, 0);
      prong2.castShadow = true;
      group.add(prong2);

      const earthProngGeo = new THREE.BoxGeometry(0.18, 0.6, 0.1);
      const prong3 = new THREE.Mesh(earthProngGeo, prongMat);
      prong3.position.set(0, -0.7, 0.25);
      prong3.castShadow = true;
      group.add(prong3);

      // USB-C output ports on the top
      const portMat = new THREE.MeshStandardMaterial({
        color: "#0F172A",
        metalness: 0.2,
        roughness: 0.8,
      });
      const portGeo = new THREE.BoxGeometry(0.3, 0.08, 0.15);
      const port1 = new THREE.Mesh(portGeo, portMat);
      port1.position.set(-0.25, 0.91, 0);
      group.add(port1);

      const port2 = new THREE.Mesh(portGeo, portMat);
      port2.position.set(0.25, 0.91, 0);
      group.add(port2);

      // Status indicator LED
      const ledMat = new THREE.MeshBasicMaterial({ color: "#22C55E" });
      const ledGeo = new THREE.SphereGeometry(0.04, 16, 16);
      const led = new THREE.Mesh(ledGeo, ledMat);
      led.position.set(0, 0.85, 0.41);
      group.add(led);

      scene.add(group);
      setLoading(false);
    }

    // 5. Animation loop
    let reqId: number;
    let isInteracting = false;

    controls.addEventListener("start", () => {
      isInteracting = true;
    });
    controls.addEventListener("end", () => {
      isInteracting = false;
    });

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      controls.update();

      // Gentle auto-rotation when user is not actively interacting
      if (!isInteracting) {
        scene.rotation.y += 0.003;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 6. Handle Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 380;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // Initial color is handled by the initialConfig and live updates are tracked in the selectedColor effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelUrl, availableColors]);

  function resetView() {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-navy/15 bg-slate-100 shadow-md">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 backdrop-blur-sm">
          <Loader2 className="animate-spin text-royal" size={32} />
          <p className="mt-3 text-xs font-bold uppercase tracking-wider text-navy">
            Loading 3D Model…
          </p>
          <p className="text-[11px] text-navy/55">Optimized for mobile inspection</p>
        </div>
      )}

      {/* Top Header Badge & Exit Button */}
      <div className="absolute left-3 right-3 top-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 shadow-sm backdrop-blur-md">
          <Sparkles size={13} className="text-royal" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-navy">
            3D Inspector
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={resetView}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-navy shadow-sm backdrop-blur-md transition-colors hover:bg-white"
            title="Reset 3D view"
          >
            <RotateCcw size={14} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-white shadow-sm transition-colors hover:bg-royal"
            title="Return to 2D photos"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Bottom Floating Swatches & Orbit Controls Hint */}
      <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/90 p-3 shadow-lg backdrop-blur-md">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-navy/55">
              Select Finish / Color:
            </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {availableColors.map((col) => {
                const isSelected = selectedColor === col;
                const config = resolveColor(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setSelectedColor(col)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-all ${
                      isSelected
                        ? "border-royal bg-royal text-white shadow-sm"
                        : "border-navy/15 bg-white text-navy hover:border-royal/40"
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full border border-black/10"
                      style={{ backgroundColor: config.hex }}
                    />
                    <span>{col}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="text-[10px] text-navy/50 sm:text-right">
            Drag to rotate • Pinch to zoom
          </p>
        </div>
      </div>
    </div>
  );
}
