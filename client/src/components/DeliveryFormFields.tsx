import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCep, formatPhone } from "@/lib/format";
import type { Dispatch, SetStateAction } from "react";

export type DeliveryStatusValue = "pendente" | "em_rota" | "entregue" | "cancelado";

export type DeliveryFormValues = {
  clientName: string;
  clientPhone: string;
  baseId: string;
  originPostalCode: string;
  originAddress: string;
  destinationPostalCode: string;
  destinationAddress: string;
  driverId: string;
  notes: string;
  scheduledAt: string;
  status: DeliveryStatusValue;
};

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatusValue, string> = {
  pendente: "Pendente",
  em_rota: "Em rota",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

type Props<T extends DeliveryFormValues> = {
  value: T;
  setValue: Dispatch<SetStateAction<T>>;
  bases: any[];
  driverOptions: any[];
  showStatus?: boolean;
  loadingCep?: "origin" | "destination" | null;
  onLookupCep: (type: "origin" | "destination") => void;
  onBaseChange?: (base: any | null) => void;
  selectedBaseLabel?: string | null;
  baseEmptyLabel?: string;
  driverEmptyLabel?: string;
  notesPlaceholder?: string;
  clientPlaceholder?: string;
  originPlaceholder?: string;
  destinationPlaceholder?: string;
  statusLabelMap?: Record<DeliveryStatusValue, string>;
};

export function DeliveryFormFields<T extends DeliveryFormValues>({
  value,
  setValue,
  bases,
  driverOptions,
  showStatus = false,
  loadingCep,
  onLookupCep,
  onBaseChange,
  selectedBaseLabel,
  baseEmptyLabel = "Base principal automática",
  driverEmptyLabel = "Sem motorista",
  notesPlaceholder = "Observações adicionais...",
  clientPlaceholder = "Ex: João Silva",
  originPlaceholder = "Rua, número, bairro",
  destinationPlaceholder = "Rua, número, bairro",
  statusLabelMap = DELIVERY_STATUS_LABELS,
}: Props<T>) {
  const selectedBase = bases.find((base: any) => String(base.id) === String(value.baseId)) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2 md:col-span-2">
        <Label>Cliente *</Label>
        <Input
          placeholder={clientPlaceholder}
          value={value.clientName}
          onChange={e => setValue(prev => ({ ...prev, clientName: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Telefone do cliente *</Label>
        <Input
          placeholder="(81) 99999-9999"
          value={value.clientPhone}
          onChange={e =>
            setValue(prev => ({ ...prev, clientPhone: formatPhone(e.target.value) }))
          }
          inputMode="tel"
        />
      </div>

      <div className="space-y-2">
        <Label>Base operacional *</Label>
        <Select
          value={value.baseId || "unassigned"}
          onValueChange={baseId => {
            const base = bases.find((entry: any) => String(entry.id) === baseId) ?? null;
            setValue(prev => ({
              ...prev,
              baseId: baseId === "unassigned" ? "" : baseId,
            }));
            onBaseChange?.(base);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione a base" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">{baseEmptyLabel}</SelectItem>
            {bases.map((base: any) => (
              <SelectItem key={base.id} value={String(base.id)}>
                {base.name}
                {base.isPrimary ? " (principal)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedBaseLabel ? (
          <p className="text-xs text-muted-foreground">{selectedBaseLabel}</p>
        ) : selectedBase ? (
          <p className="text-xs text-muted-foreground">
            {selectedBase.street}, {selectedBase.number || "-"} - {selectedBase.city}/{selectedBase.state}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label>CEP de origem</Label>
        <div className="flex gap-2">
          <Input
            placeholder="00000-000"
            value={value.originPostalCode}
            onChange={e =>
              setValue(prev => ({
                ...prev,
                originPostalCode: formatCep(e.target.value),
              }))
            }
            inputMode="numeric"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onLookupCep("origin")}
            disabled={loadingCep === "origin"}
          >
            Consultar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>CEP de destino</Label>
        <div className="flex gap-2">
          <Input
            placeholder="00000-000"
            value={value.destinationPostalCode}
            onChange={e =>
              setValue(prev => ({
                ...prev,
                destinationPostalCode: formatCep(e.target.value),
              }))
            }
            inputMode="numeric"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => onLookupCep("destination")}
            disabled={loadingCep === "destination"}
          >
            Consultar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Endereço de origem *</Label>
        <Input
          placeholder={originPlaceholder}
          value={value.originAddress}
          onChange={e => setValue(prev => ({ ...prev, originAddress: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Endereço de destino *</Label>
        <Input
          placeholder={destinationPlaceholder}
          value={value.destinationAddress}
          onChange={e => setValue(prev => ({ ...prev, destinationAddress: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label>Motorista ativo</Label>
        <Select
          value={value.driverId || "unassigned"}
          onValueChange={driverId =>
            setValue(prev => ({
              ...prev,
              driverId: driverId === "unassigned" ? "" : driverId,
            }))
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione um motorista ativo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">{driverEmptyLabel}</SelectItem>
            {driverOptions.map((driver: any) => (
              <SelectItem key={driver.id} value={String(driver.id)}>
                {driver.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Data/Hora Agendada</Label>
        <Input
          type="datetime-local"
          value={value.scheduledAt}
          onChange={e => setValue(prev => ({ ...prev, scheduledAt: e.target.value }))}
        />
      </div>

      {showStatus ? (
        <div className="space-y-2">
          <Label>Status da entrega</Label>
          <Select
            value={value.status}
            onValueChange={status =>
              setValue(prev => ({
                ...prev,
                status: status as DeliveryStatusValue,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(statusLabelMap) as DeliveryStatusValue[]).map(status => (
                <SelectItem key={status} value={status}>
                  {statusLabelMap[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2 md:col-span-2">
        <Label>Observações</Label>
        <Textarea
          placeholder={notesPlaceholder}
          value={value.notes}
          onChange={e => setValue(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>
    </div>
  );
}
