import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lookupCep, formatCep } from "@/lib/cep";
import { toast } from "sonner";

export type AddressValue = {
  postalCode: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
  reference: string;
  latitude: string;
  longitude: string;
};

type Props = {
  title: string;
  value: AddressValue;
  onChange: (next: AddressValue) => void;
};

export function defaultAddressValue(): AddressValue {
  return {
    postalCode: "",
    street: "",
    number: "",
    neighborhood: "",
    city: "",
    state: "",
    complement: "",
    reference: "",
    latitude: "",
    longitude: "",
  };
}

export default function AddressFields({ title, value, onChange }: Props) {
  const setValue = (patch: Partial<AddressValue>) => onChange({ ...value, ...patch });

  const handleLookup = async () => {
    try {
      const result = await lookupCep(value.postalCode);
      if (!result) {
        toast.error("CEP não encontrado");
        return;
      }

      setValue({
        postalCode: formatCep(result.postalCode),
        street: result.street,
        neighborhood: result.neighborhood,
        city: result.city,
        state: result.state,
        complement: result.complement || value.complement,
      });
      toast.success("Endereço preenchido pelo CEP");
    } catch {
      toast.error("Falha ao consultar o CEP");
    }
  };

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">CEP, rua, número, bairro, cidade e complemento.</p>
        </div>
        <Button variant="outline" type="button" onClick={handleLookup}>
          Consultar CEP
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label>CEP</Label>
          <Input value={value.postalCode} onChange={e => setValue({ postalCode: formatCep(e.target.value) })} placeholder="00000-000" />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Rua</Label>
          <Input value={value.street} onChange={e => setValue({ street: e.target.value })} placeholder="Rua..." />
        </div>
        <div className="space-y-2">
          <Label>Número</Label>
          <Input value={value.number} onChange={e => setValue({ number: e.target.value })} placeholder="123" />
        </div>
        <div className="space-y-2">
          <Label>Bairro</Label>
          <Input value={value.neighborhood} onChange={e => setValue({ neighborhood: e.target.value })} placeholder="Bairro" />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input value={value.city} onChange={e => setValue({ city: e.target.value })} placeholder="Cidade" />
        </div>
        <div className="space-y-2">
          <Label>Estado</Label>
          <Input value={value.state} onChange={e => setValue({ state: e.target.value })} placeholder="UF" />
        </div>
        <div className="space-y-2">
          <Label>Complemento</Label>
          <Input value={value.complement} onChange={e => setValue({ complement: e.target.value })} placeholder="Sala, bloco..." />
        </div>
        <div className="space-y-2">
          <Label>Referência</Label>
          <Input value={value.reference} onChange={e => setValue({ reference: e.target.value })} placeholder="Perto de..." />
        </div>
      </div>
    </div>
  );
}
