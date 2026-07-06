import { Layers } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function Logo({ size = "md", showText = true }: LogoProps) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  };

  return (
    <div className="flex items-center gap-2">
      <div className="rounded-xl bg-primary p-1.5">
        <Layers className={`${sizes[size]} text-primary-foreground`} />
      </div>
      {showText && (
        <span className={`font-semibold ${textSizes[size]}`}>
          CollabSpace
        </span>
      )}
    </div>
  );
}
