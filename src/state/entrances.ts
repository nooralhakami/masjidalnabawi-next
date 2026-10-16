import { signal } from '@preact/signals';
import { CAR_ENTRANCES, type CarEntranceId } from '../data-next/car-entrances';

/**
 * Which of the new vehicle entrances are open. All start closed (owner, 2026-10-16). Like the
 * restrooms' status, a change stays on the supervisor's device, in this page, until a server
 * shares it with every visitor.
 */
export const entranceOpen = signal<Record<CarEntranceId, boolean>>(Object.fromEntries(CAR_ENTRANCES.map((e) => [e.id, false])) as Record<CarEntranceId, boolean>);

export function toggleEntrance(id: CarEntranceId): void {
  entranceOpen.value = { ...entranceOpen.value, [id]: !entranceOpen.value[id] };
}
