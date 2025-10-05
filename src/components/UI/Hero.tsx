type HeroProps = {
  title: string;
  subtitle: string;
  onEnter: () => void;
};

export default function Hero({ title, subtitle, onEnter }: HeroProps) {
  return (
    <div className="pointer__events-none position__absolute flex d__h100 container__syp">
      <div className="align__self-center text__center">
        <p className="p__b-5 intro-text">{subtitle}</p>
        <h1
          className="pointer__events-auto text__transform-uppercase text__primary text__jumbo"
          style={{
            width: "100%",
            lineHeight: 0.9,
            margin: 0,
            fontWeight: 900,
            letterSpacing: "-0.02em",
            WebkitBackgroundClip: "text",
          }}
        >
          {title}
        </h1>
      </div>
    </div>
  );
}
