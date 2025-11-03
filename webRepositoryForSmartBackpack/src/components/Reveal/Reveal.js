"use client";

import { motion, useAnimation } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";

/**
 * @param {{
 *   children: React.ReactNode,
 *   delay?: number,
 *   duration?: number,
 *   direction?: 'up' | 'down' | 'left' | 'right' | 'fade' | 'scale',
 *   triggerOnce?: boolean,
 *   threshold?: number
 * }} props
 */
export default function Reveal({
  children,
  delay = 0,
  duration = 0.6,
  direction = "up",
  triggerOnce = true,
  threshold = 0.1,
}) {
  const controls = useAnimation();
  const [ref, inView] = useInView({ triggerOnce, threshold });

  useEffect(() => {
    if (inView) {
      controls.start("visible");
    }
  }, [controls, inView]);

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? 30 : direction === "down" ? -30 : 0,
      x: direction === "left" ? 30 : direction === "right" ? -30 : 0,
      scale: direction === "scale" ? 0.8 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        ease: "easeOut",
      },
    },
  };

  return (
    <motion.div ref={ref} initial="hidden" animate={controls} variants={variants}>
      {children}
    </motion.div>
  );
}
