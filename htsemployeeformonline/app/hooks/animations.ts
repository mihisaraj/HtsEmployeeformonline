"use client";

import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

/* -----------------------------------------------
   🔥 Signed OUT (landing page) animations 
------------------------------------------------ */
export function useSignedOutAnimations(
  landingRef: any,
  heroRef: any,
) {
  useEffect(() => {
    if (!landingRef.current || !heroRef.current) return;

    const ctx = gsap.context(() => {
      const hero = heroRef.current;

      /* 🟦 INTRO TIMELINE — hero reveal */
      const intro = gsap.timeline({
        defaults: { ease: "power3.out", duration: 1 },
      });

      intro
        .from(hero, {
          opacity: 0,
          y: 40,
          scale: 0.97,
          filter: "blur(6px)",
        })
        .from(
          ".hero-title",
          { opacity: 0, y: 30, duration: 1.2 },
          "-=0.6"
        )
        .from(
          ".hero-sub",
          { opacity: 0, y: 20, duration: 1 },
          "-=0.6"
        )
        .from(
          ".hero-btn",
          {
            opacity: 0,
            y: 20,
            duration: 1,
            ease: "back.out(1.8)",
          },
          "-=0.7"
        );

      /* 🟦 Floating blobs */
      gsap.to(".blob", {
        y: 30,
        x: 20,
        rotate: 8,
        duration: 6,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      /* 🟦 Scroll parallax */
      gsap.to(hero, {
        y: -60,
        opacity: 0.5,
        scrollTrigger: {
          trigger: hero,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });

      /* 🟦 Smooth stagger reveals */
      gsap.utils.toArray(".welcome-reveal").forEach((el: any, i) => {
        gsap.from(el, {
          opacity: 0,
          y: 30,
          duration: 0.8,
          delay: i * 0.08,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        });
      });
    }, landingRef);

    return () => ctx.revert();
  }, [landingRef, heroRef]);
}

/* -----------------------------------------------
   🔥 Signed IN (form page) animations 
------------------------------------------------ */
export function useSignedInAnimations(flowRef: any) {
  useEffect(() => {
    if (!flowRef.current) return;

    const ctx = gsap.context(() => {
      /* 🟩 Slide-in form sections */
      gsap.utils.toArray(".flow-reveal").forEach((el: any, index: number) => {
        const xShift = index % 2 === 0 ? -40 : 40;

        gsap.from(el, {
          opacity: 0,
          x: xShift,
          rotateX: 8,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
          },
        });
      });

      /* 🟩 Inputs: subtle 3D tilt on hover */
      gsap.utils
        .toArray("input, select, textarea")
        .forEach((field: any) => {
          field.addEventListener("mouseenter", () => {
            gsap.to(field, {
              rotateX: 4,
              scale: 1.01,
              duration: 0.25,
              ease: "power2.out",
            });
          });

          field.addEventListener("mouseleave", () => {
            gsap.to(field, {
              rotateX: 0,
              scale: 1,
              duration: 0.25,
            });
          });
        });

      /* 🟩 Magnetic submit button */
      const btn = document.querySelector(".magnetic-btn") as HTMLElement;
      if (btn) {
        const strength = 30;
        const xTo = gsap.quickTo(btn, "x", { duration: 0.4 });
        const yTo = gsap.quickTo(btn, "y", { duration: 0.4 });

        btn.addEventListener("mousemove", (e) => {
          const rect = btn.getBoundingClientRect();
          const relX = e.clientX - (rect.left + rect.width / 2);
          const relY = e.clientY - (rect.top + rect.height / 2);
          xTo((relX / rect.width) * strength);
          yTo((relY / rect.height) * strength);
        });

        btn.addEventListener("mouseleave", () => {
          xTo(0);
          yTo(0);
        });
      }
    }, flowRef);

    return () => ctx.revert();
  }, [flowRef]);
}
