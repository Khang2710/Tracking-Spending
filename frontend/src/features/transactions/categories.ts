import {
  Building2,
  Car,
  Coffee,
  Fuel,
  House,
  Plus,
  ShoppingBag,
  ShoppingBasket,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { C } from "../../design/tokens";

export const categoryIcons: Record<string, LucideIcon> = {
  Food: UtensilsCrossed,
  Drinks: Coffee,
  Groceries: ShoppingBasket,
  Shopping: ShoppingBag,
  Fuel,
  Investment: TrendingUp,
  Bank: Building2,
  Salary: Wallet,
  Housing: House,
  Entertainment: Car,
  Others: Plus,
};

export const categoryColors: Record<string, string> = {
  Food: "#FF7043",
  Drinks: "#4FC3F7",
  Groceries: "#66BB6A",
  Shopping: C.gold,
  Fuel: C.red,
  Investment: C.purple,
  Bank: C.green,
  Salary: C.green,
  Housing: C.gold,
  Entertainment: C.purple,
  Others: C.t2,
};
