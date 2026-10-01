import { describe, expect, it } from "vitest";
import { classifyTransactionCategory } from "./categoryClassifier";

describe("classifyTransactionCategory", () => {
  it.each([
    ["cà phê sáng", "Drinks"],
    ["đổ xăng", "Fuel"],
    ["ăn phở", "Food"],
    ["tiền điện tháng 9", "Housing"],
    ["lương tháng", "Salary"],
    ["momo transfer", "Bank"],
    ["mua crypto", "Investment"],
    ["unknown title", "Others"],
    ["   ", "Others"],
  ])("classifies %s as %s", (title, expected) => {
    expect(classifyTransactionCategory(title)).toBe(expected);
  });
});
