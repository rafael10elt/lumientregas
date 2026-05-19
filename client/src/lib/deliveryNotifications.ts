import { toast } from "sonner";

export type DeliveryNotificationItem = {
  id: string;
  deliveryCode?: string | null;
  clientName?: string | null;
};

const announcedDeliveryIds = new Set<string>();
let audioContext: AudioContext | null = null;
let audioUnlockListenersRegistered = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;

  const AudioContextCtor =
    window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

async function unlockAudioContext() {
  const context = getAudioContext();
  if (!context || context.state === "running") return;

  try {
    await context.resume();
  } catch {
    // Browsers may still block autoplay until a user gesture is captured.
  }
}

export function primeDeliveryAlertAudio() {
  if (typeof window === "undefined" || audioUnlockListenersRegistered) return;

  audioUnlockListenersRegistered = true;

  const unlock = () => {
    void unlockAudioContext();
  };

  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.addEventListener("touchstart", unlock, { once: true });
}

async function playDeliveryBell() {
  const context = getAudioContext();
  if (!context) return;

  await unlockAudioContext();

  if (context.state !== "running") return;

  const gain = context.createGain();
  gain.gain.value = 0.0001;
  gain.connect(context.destination);

  const startTime = context.currentTime + 0.02;
  const frequencies = [880, 1318.51, 1567.98];

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.42, startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.5);

  frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);

    const offset = index * 0.08;
    oscillator.start(startTime + offset);
    oscillator.stop(startTime + 1.6 + offset);
  });
}

function buildDescription(items: DeliveryNotificationItem[]) {
  if (items.length === 1) {
    const delivery = items[0];
    const code = delivery.deliveryCode || "sem código";
    const client = delivery.clientName ? ` para ${delivery.clientName}` : "";
    return `Entrega ${code}${client}.`;
  }

  const preview = items
    .slice(0, 3)
    .map(item => item.deliveryCode || item.clientName || "nova entrega")
    .join(" • ");

  return items.length > 3 ? `${preview} • +${items.length - 3} novas entregas.` : `${preview}.`;
}

export function notifyDeliveryCreated(items: DeliveryNotificationItem | DeliveryNotificationItem[]) {
  const list = Array.isArray(items) ? items : [items];
  const freshItems = list.filter(item => item?.id && !announcedDeliveryIds.has(item.id));

  if (freshItems.length === 0) return;

  freshItems.forEach(item => announcedDeliveryIds.add(item.id));

  void playDeliveryBell();

  const title = freshItems.length === 1 ? "Nova entrega registrada" : `${freshItems.length} novas entregas registradas`;

  toast.success(title, {
    description: buildDescription(freshItems),
    duration: 5000,
  });
}
