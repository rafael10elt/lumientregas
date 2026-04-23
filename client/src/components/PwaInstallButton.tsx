import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Download, Smartphone } from "lucide-react";
import { toast } from "sonner";

type PwaInstallButtonProps = {
  variant?: "default" | "outline" | "ghost";
  className?: string;
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
};

export function PwaInstallButton({
  variant = "outline",
  className = "",
  size = "default",
  fullWidth = false,
}: PwaInstallButtonProps) {
  const { canInstall, installed, promptInstall } = usePwaInstall();

  if (installed) {
    return null;
  }

  const handleClick = async () => {
    if (canInstall) {
      const accepted = await promptInstall();
      if (accepted) {
        toast.success("App instalado com sucesso");
      }
      return;
    }

    toast.message("Instalação não disponível neste navegador", {
      description:
        "No celular, use o menu do navegador e selecione \"Adicionar à tela inicial\".",
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={`${fullWidth ? "w-full" : ""} ${className}`.trim()}
    >
      {canInstall ? (
        <Download className="h-4 w-4" />
      ) : (
        <Smartphone className="h-4 w-4" />
      )}
      Instalar app
    </Button>
  );
}
