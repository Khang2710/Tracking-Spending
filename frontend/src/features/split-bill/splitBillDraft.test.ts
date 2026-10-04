import { describe, expect, it } from "vitest";
import { removeDraftParticipant } from "./splitBillDraft";

const items = [
  { id: 1, name: "Dinner", price: 30, discount: 0, consumers: ["Khang", "Minh"] },
  { id: 2, name: "Tea", price: 10, discount: 0, consumers: ["Minh"] },
];

describe("split bill draft participants", () => {
  it("only removes a friend from the current draft and every assigned item", () => {
    const result = removeDraftParticipant({
      participants: ["Minh", "An"], items, payer: "An", myName: "Khang", participant: "Minh",
    });

    expect(result.participants).toEqual(["An"]);
    expect(result.items.map((item) => item.consumers)).toEqual([["Khang"], []]);
    expect(result.payer).toBe("An");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("resets Who Paid to me when the removed friend was the payer", () => {
    const result = removeDraftParticipant({
      participants: ["Minh", "An"], items: [], payer: "Minh", myName: "Khang", participant: "Minh",
    });

    expect(result.payer).toBe("Khang");
    expect(result.requiresConfirmation).toBe(true);
  });

  it("never removes my account", () => {
    const result = removeDraftParticipant({
      participants: ["Minh"], items, payer: "Khang", myName: "Khang", participant: "Khang",
    });

    expect(result.participants).toEqual(["Minh"]);
    expect(result.items).toEqual(items);
    expect(result.blocked).toBe(true);
  });
});
