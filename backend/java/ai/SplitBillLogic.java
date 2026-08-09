package ai;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

public class SplitBillLogic {

    public static class Item {
        public String name;
        public double price;
        public List<String> consumers;

        public Item(String name, double price, List<String> consumers) {
            this.name = name;
            this.price = price;
            this.consumers = consumers;
        }
    }

    public static class PersonDebt {
        public String name;
        public double amount;

        public PersonDebt(String name, double amount) {
            this.name = name;
            this.amount = amount;
        }

        @Override
        public String toString() {
            return String.format("%s: $%.2f", name, amount);
        }
    }

    /**
     * Calculates the exact amount each person has to pay for the bill.
     * Formula: (Personal Item Cost) + (Proportional Tax) + (Equal Tip Share)
     *
     * @param total      The total bill amount (used for record reference).
     * @param items      The list of items eaten with their prices and list of consumers.
     * @param taxPercent The tax rate as a percentage (e.g. 10.0 for 10%).
     * @param tip        The flat tip amount to be divided equally.
     * @return A list of PersonDebt records rounded to 2 decimal places.
     */
    public static List<PersonDebt> calculateSplit(
            double total,
            List<Item> items,
            double taxPercent,
            double tip
    ) {
        // Find all unique participants
        Set<String> allParticipants = new HashSet<>();
        for (Item item : items) {
            if (item.consumers != null) {
                allParticipants.addAll(item.consumers);
            }
        }

        int numPeople = allParticipants.size();
        if (numPeople == 0) {
            return Collections.emptyList();
        }

        // Calculate item share (I_p) for each person
        Map<String, Double> itemShares = new HashMap<>();
        for (String person : allParticipants) {
            itemShares.put(person, 0.0);
        }

        for (Item item : items) {
            if (item.consumers == null || item.consumers.isEmpty()) {
                continue;
            }
            double pricePerPerson = item.price / item.consumers.size();
            for (String person : item.consumers) {
                itemShares.put(person, itemShares.get(person) + pricePerPerson);
            }
        }

        // Calculate total share for each person: (I_p) + (Tax proportionally) + (Tip / N)
        double tipShare = tip / numPeople;
        List<PersonDebt> results = new ArrayList<>();

        for (String person : allParticipants) {
            double personalItemCost = itemShares.get(person);
            double personalTax = personalItemCost * (taxPercent / 100.0);
            double totalShare = personalItemCost + personalTax + tipShare;

            // Round to 2 decimal places
            BigDecimal rounded = new BigDecimal(Double.toString(totalShare))
                    .setScale(2, RoundingMode.HALF_UP);

            results.add(new PersonDebt(person, rounded.doubleValue()));
        }

        // Sort results by name for consistency
        results.sort(Comparator.comparing(p -> p.name));
        return results;
    }

    public static void main(String[] args) {
        // Sample execution
        List<Item> items = new ArrayList<>();
        items.add(new Item("Steak", 50.00, Arrays.asList("Alice", "Bob")));
        items.add(new Item("Salad", 12.00, Arrays.asList("Alice")));
        items.add(new Item("Pizza", 24.00, Arrays.asList("Bob", "Charlie")));
        items.add(new Item("Soda", 8.00, Arrays.asList("Alice", "Bob", "Charlie")));

        double taxPercent = 10.0; // 10%
        double tip = 15.00; // Flat tip
        double total = 118.40; // steak(50) + salad(12) + pizza(24) + soda(8) = 94.00 subtotal. Tax is 9.40. Tip is 15.00. Total is 118.40.

        List<PersonDebt> split = calculateSplit(total, items, taxPercent, tip);
        System.out.println("--- Split Bill Results ---");
        for (PersonDebt debt : split) {
            System.out.println(debt);
        }
    }
}
