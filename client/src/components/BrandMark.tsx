type BrandMarkProps = {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

export function BrandMark({ size = "md", showText = true, className = "" }: BrandMarkProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5`}>
        <img
          src="/icons/logo_le_sem_fundo.png"
          alt="Lumi Entregas"
          className="h-full w-full object-contain p-1.5"
        />
      </div>
      {showText ? (
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-foreground">Lumi Entregas</div>
          <div className="text-xs text-muted-foreground">Gestão e logística inteligente</div>
        </div>
      ) : null}
    </div>
  );
}
