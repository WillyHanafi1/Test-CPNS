"use client";

import { useRef, useEffect, useCallback, useState } from 'react';
import { gsap } from 'gsap';
import { Zap, ChevronRight, Layout, MessageCircle, Heart, ShieldCheck } from 'lucide-react';
import './MagicBento.css';

const DEFAULT_PARTICLE_COUNT = 8;
const DEFAULT_SPOTLIGHT_RADIUS = 400;
const DEFAULT_GLOW_COLOR = '99, 102, 241'; // Indigo color
const MOBILE_BREAKPOINT = 768;

const createParticleElement = (x: number, y: number, color = DEFAULT_GLOW_COLOR) => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(${color}, 0.8);
    box-shadow: 0 0 10px rgba(${color}, 0.5);
    pointer-events: none;
    z-index: 5;
    left: ${x}px;
    top: ${y}px;
    opacity: 0;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.6,
  fadeDistance: radius * 0.9
});

const updateCardGlowProperties = (card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

interface ParticleCardProps {
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
}

const ParticleCard = ({
  children,
  className = '',
  disableAnimations = false,
  style = {},
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = true,
  enableMagnetism = true
}: ParticleCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLElement[]>([]);
  const isHoveredRef = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const clearAllParticles = useCallback(() => {
    magnetismAnimationRef.current?.kill();
    particlesRef.current.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          particle.parentNode?.removeChild(particle);
        }
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!cardRef.current || !isHoveredRef.current) return;

    const { width, height } = cardRef.current.getBoundingClientRect();
    
    for (let i = 0; i < particleCount; i++) {
      const particle = createParticleElement(
        Math.random() * width,
        Math.random() * height,
        glowColor
      );
      cardRef.current.appendChild(particle);
      particlesRef.current.push(particle);

      gsap.to(particle, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        delay: Math.random() * 0.5,
        ease: 'power2.out'
      });

      gsap.to(particle, {
        x: '+=20',
        y: '+=20',
        duration: 2 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut'
      });
    }
  }, [particleCount, glowColor]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current) return;

    const element = cardRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      animateParticles();
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(element, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
      }

      if (enableMagnetism) {
        gsap.to(element, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        gsap.to(element, {
          rotateX,
          rotateY,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 1000
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.03;
        const magnetY = (y - centerY) * 0.03;

        magnetismAnimationRef.current = gsap.to(element, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (!clickEffect) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: rgba(${glowColor}, 0.5);
        left: ${x}px;
        top: ${y}px;
        pointer-events: none;
        z-index: 100;
      `;

      element.appendChild(ripple);

      gsap.to(ripple, {
        scale: 40,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out',
        onComplete: () => ripple.remove()
      });
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor]);

  return (
    <div
      ref={cardRef}
      className={`${className} particle-container`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
    >
      {children}
    </div>
  );
};

interface GlobalSpotlightProps {
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}

const GlobalSpotlight = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}: GlobalSpotlightProps) => {
  const spotlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: ${spotlightRadius * 2}px;
      height: ${spotlightRadius * 2}px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.1) 0%,
        rgba(${glowColor}, 0.05) 20%,
        transparent 70%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    (spotlightRef as any).current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const mouseInside =
        e.clientX >= rect.left - 50 && e.clientX <= rect.right + 50 && 
        e.clientY >= rect.top - 50 && e.clientY <= rect.bottom + 50;

      const cards = gridRef.current.querySelectorAll('.magic-bento-card');

      if (!mouseInside) {
        gsap.to(spotlightRef.current, { opacity: 0, duration: 0.5 });
        cards.forEach(card => (card as HTMLElement).style.setProperty('--glow-intensity', '0'));
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach(cardNode => {
        const card = cardNode as HTMLElement;
        const cardRect = card.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        const effectiveDistance = Math.max(0, distance - Math.max(cardRect.width, cardRect.height) / 2);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(card, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        opacity: minDistance < fadeDistance ? 1 : 0,
        duration: 0.1,
        ease: 'power2.out'
      });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      spotlightRef.current?.remove();
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

interface MagicBentoProps {
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  glowColor?: string;
}

const MagicBento = ({
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
}: MagicBentoProps) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const shouldDisableAnimations = disableAnimations || isMobile;

  const cards = [
    {
      label: 'Vision',
      title: 'Built by 1 Solo Developer',
      description: 'Platform ini dirancang, dibangun, dan dikelola secara mandiri untuk membantu langkah kalian menuju impian.',
      icon: <Layout className="w-5 h-5" />,
      highlight: true
    },
    {
      label: 'Support',
      title: 'Butuh Bantuan?',
      description: 'Jangan ragu hubungi saya via WA di 0823-1940-1259 untuk saran atau kendala.',
      icon: <MessageCircle className="w-5 h-5 text-indigo-400" />,
      link: "https://wa.me/6282319401259"
    },
    {
      label: 'Motivation',
      title: 'Sweat & Dedication',
      description: '"Tidak ada jalan pintas menuju kesuksesan. Kesuksesan hanya bisa diraih dengan keringat, dedikasi, dan doa yang tak putus. Kalian mungkin akan merasa lelah dan banyak berkorban hari ini. Percayalah, kelak semua itu akan terbayar lunas dengan kesuksesan dan senyum kebanggaan yang mengubah hidupmu"',
      icon: <Heart className="w-5 h-5 text-indigo-400" />
    }
  ];

  return (
    <div className="w-full py-16">
      {enableSpotlight && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      <div className="card-grid bento-section" ref={gridRef}>
        {cards.map((card, index) => {
          const content = (
            <>
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">{card.label}</div>
                <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  {card.icon}
                </div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className={`magic-bento-card__title ${card.highlight ? 'text-2xl md:text-3xl font-black italic uppercase tracking-tighter' : ''}`}>
                  {card.highlight ? (
                    <>
                      Platform ini <span className="text-indigo-400">bukan sekadar kode</span>
                    </>
                  ) : card.title}
                </h2>
                <p className="magic-bento-card__description">
                  {card.description}
                </p>
                {card.link && (
                  <a 
                    href={card.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-colors group"
                  >
                    Hubungi via WA <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </a>
                )}
              </div>
            </>
          );

          return (
            <ParticleCard
              key={index}
              className={`magic-bento-card ${enableBorderGlow ? 'magic-bento-card--border-glow' : ''}`}
              disableAnimations={shouldDisableAnimations}
              particleCount={particleCount}
              glowColor={glowColor}
            >
              {content}
            </ParticleCard>
          );
        })}
      </div>
    </div>
  );
};

export default MagicBento;
