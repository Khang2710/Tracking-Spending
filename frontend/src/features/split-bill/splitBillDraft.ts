export interface DraftSplitItem {
  id: number;
  name: string;
  price: number;
  discount: number;
  consumers: string[];
}

type RemoveDraftParticipantInput<T extends DraftSplitItem> = {
  participants: string[];
  items: T[];
  payer: string;
  myName: string;
  participant: string;
};

export function removeDraftParticipant<T extends DraftSplitItem>({ participants, items, payer, myName, participant }: RemoveDraftParticipantInput<T>) {
  if (participant === myName) {
    return { participants, items, payer, requiresConfirmation: false, blocked: true };
  }

  const isAssigned = items.some((item) => item.consumers.includes(participant));
  const isPayer = payer === participant;
  return {
    participants: participants.filter((name) => name !== participant),
    items: items.map((item) => ({ ...item, consumers: item.consumers.filter((name) => name !== participant) })),
    payer: isPayer ? myName : payer,
    requiresConfirmation: isAssigned || isPayer,
    blocked: false,
  };
}
