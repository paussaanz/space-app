import React from "react";
import { motion } from "framer-motion";

type CardProps = {
  title?: string;
  subtitle?: string;
  rightLabel?: string;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "nebula" | "void" | "aurora";
  className?: string;
  overlayRef?: React.Ref<HTMLDivElement>; // opcional si quieres animar overlay
};

export default function Card({
  title,
  subtitle,
  rightLabel,
  footer,
  children,
  variant = "nebula",
  className = "",
  overlayRef,
}: CardProps) {
  return (
    <motion.article
      ref={overlayRef}
      className={`card card--${variant} ${className}`}
      whileHover={{ y: -2, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {(title || rightLabel) && (
        <header className="card__header">
          <div className="card__titles">
            {title && <h3 className="card__title">{title}</h3>}
            {subtitle && <p className="card__subtitle">{subtitle}</p>}
          </div>
          {rightLabel && <span className="card__label">{rightLabel}</span>}
        </header>
      )}

      <div className="card__content">{children}</div>

      {footer && <footer className="card__footer">{footer}</footer>}
    </motion.article>
  );
}
