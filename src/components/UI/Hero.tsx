type HeroProps = {
  title: string;
  subtitle: string;
  onEnter: () => void;
};

export default function Hero({ title, subtitle, onEnter }: HeroProps) {
  return (
    <div className="pointer__events-none position__absolute flex d__h100 container__syp">
      <div className="align__self-center">
        <h1
          className="pointer__events-auto text__transform-uppercase"
          style={{
            width: "50%",
            fontSize: "clamp(32px, 8vw, 96px)",
            lineHeight: 0.9,
            margin: 0,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            background: "linear-gradient(180deg, #ffffff, #d6bfa0)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            textShadow: "0 0 20px rgba(255,255,255,0.08)",
          }}
        >
          {title}
        </h1>
        <p className="">{subtitle}</p>
      </div>
    </div>
  );
}
