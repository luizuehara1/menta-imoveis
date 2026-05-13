import { Variants } from 'motion/react';

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: 0.3 } }
};

export const slideUp: Variants = {
  initial: { opacity: 0, y: 24 },
  animate: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] } 
  },
  exit: { opacity: 0, y: 10, transition: { duration: 0.3 } }
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.4, ease: "easeOut" } 
  },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.3 } }
};

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

export const hoverCard = {
  rest: { scale: 1, y: 0 },
  hover: { 
    scale: 1.02, 
    y: -4, 
    transition: { duration: 0.3, ease: "easeOut" } 
  }
};

export const buttonTap = {
  whileTap: { scale: 0.98 }
};

export const pageTransition: Variants = {
  initial: { opacity: 0, x: 0, y: 5 },
  animate: { 
    opacity: 1, 
    x: 0, 
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" }
  },
  exit: { 
    opacity: 0, 
    y: -5,
    transition: { duration: 0.3, ease: "easeIn" }
  }
};
