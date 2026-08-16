package com.spending.tracker.service;

import com.spending.tracker.service.SplitBillLogic.Item;
import com.spending.tracker.service.SplitBillLogic.PersonDebt;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SplitBillLogicTest {

    @Test
    @DisplayName("Equal split - 3 people share 1 item equally")
    void calculateSplit_equalSplit() {
        List<Item> items = List.of(
                new Item("Pizza", 30.00, Arrays.asList("Alice", "Bob", "Charlie"))
        );

        List<PersonDebt> result = SplitBillLogic.calculateSplit(30.00, items, 0, 0);

        assertEquals(3, result.size());
        for (PersonDebt pd : result) {
            assertEquals(10.00, pd.amount, 0.001);
        }
    }

    @Test
    @DisplayName("Unequal split - different items for different people")
    void calculateSplit_unequalSplit() {
        List<Item> items = List.of(
                new Item("Steak", 40.00, List.of("Alice")),
                new Item("Salad", 15.00, List.of("Bob")),
                new Item("Water", 5.00, Arrays.asList("Alice", "Bob"))
        );

        List<PersonDebt> result = SplitBillLogic.calculateSplit(60.00, items, 0, 0);

        assertEquals(2, result.size());

        PersonDebt alice = result.stream().filter(p -> p.name.equals("Alice")).findFirst().orElseThrow();
        PersonDebt bob = result.stream().filter(p -> p.name.equals("Bob")).findFirst().orElseThrow();

        // Alice: 40.00 (steak) + 2.50 (half water) = 42.50
        assertEquals(42.50, alice.amount, 0.001);
        // Bob: 15.00 (salad) + 2.50 (half water) = 17.50
        assertEquals(17.50, bob.amount, 0.001);
    }

    @Test
    @DisplayName("Split with proportional tax only")
    void calculateSplit_withTaxOnly() {
        List<Item> items = List.of(
                new Item("Burger", 20.00, List.of("Alice")),
                new Item("Fries", 10.00, List.of("Bob"))
        );

        // 10% tax
        List<PersonDebt> result = SplitBillLogic.calculateSplit(33.00, items, 10.0, 0);

        PersonDebt alice = result.stream().filter(p -> p.name.equals("Alice")).findFirst().orElseThrow();
        PersonDebt bob = result.stream().filter(p -> p.name.equals("Bob")).findFirst().orElseThrow();

        // Alice: 20.00 + 10% tax (2.00) = 22.00
        assertEquals(22.00, alice.amount, 0.001);
        // Bob: 10.00 + 10% tax (1.00) = 11.00
        assertEquals(11.00, bob.amount, 0.001);
    }

    @Test
    @DisplayName("Split with tip divided equally")
    void calculateSplit_withTipOnly() {
        List<Item> items = List.of(
                new Item("Pasta", 15.00, List.of("Alice")),
                new Item("Soup", 5.00, List.of("Bob"))
        );

        // $6 tip split 2 ways = $3 each
        List<PersonDebt> result = SplitBillLogic.calculateSplit(26.00, items, 0, 6.0);

        PersonDebt alice = result.stream().filter(p -> p.name.equals("Alice")).findFirst().orElseThrow();
        PersonDebt bob = result.stream().filter(p -> p.name.equals("Bob")).findFirst().orElseThrow();

        // Alice: 15.00 + 3.00 tip = 18.00
        assertEquals(18.00, alice.amount, 0.001);
        // Bob: 5.00 + 3.00 tip = 8.00
        assertEquals(8.00, bob.amount, 0.001);
    }

    @Test
    @DisplayName("Split with both tax and tip")
    void calculateSplit_withTaxAndTip() {
        List<Item> items = List.of(
                new Item("Ramen", 12.00, List.of("Alice")),
                new Item("Sushi", 18.00, List.of("Bob"))
        );

        // 10% tax, $5 tip
        List<PersonDebt> result = SplitBillLogic.calculateSplit(35.20, items, 10.0, 5.0);

        PersonDebt alice = result.stream().filter(p -> p.name.equals("Alice")).findFirst().orElseThrow();
        PersonDebt bob = result.stream().filter(p -> p.name.equals("Bob")).findFirst().orElseThrow();

        // Alice: 12.00 + 1.20 tax + 2.50 tip = 15.70
        assertEquals(15.70, alice.amount, 0.001);
        // Bob: 18.00 + 1.80 tax + 2.50 tip = 22.30
        assertEquals(22.30, bob.amount, 0.001);
    }

    @Test
    @DisplayName("Split with rounding - odd amounts (tiền lẻ)")
    void calculateSplit_roundingOddAmounts() {
        List<Item> items = List.of(
                new Item("Shared Dish", 100.00, Arrays.asList("Alice", "Bob", "Charlie"))
        );

        // 7% tax, $3 tip - creates odd decimal amounts
        List<PersonDebt> result = SplitBillLogic.calculateSplit(110.00, items, 7.0, 3.0);

        assertEquals(3, result.size());

        PersonDebt alice = result.stream().filter(p -> p.name.equals("Alice")).findFirst().orElseThrow();
        // Alice: (100/3) + 7% of (100/3) + (3/3)
        // = 33.333... + 2.333... + 1.00 = 36.666... -> rounded to 36.67
        assertEquals(36.67, alice.amount, 0.001);
    }

    @Test
    @DisplayName("Empty items list returns empty result")
    void calculateSplit_emptyItems() {
        List<PersonDebt> result = SplitBillLogic.calculateSplit(0, Collections.emptyList(), 0, 0);
        assertTrue(result.isEmpty());
    }

    @Test
    @DisplayName("Items with null consumers are skipped")
    void calculateSplit_nullConsumers() {
        List<Item> items = List.of(
                new Item("Complimentary Bread", 0.00, null),
                new Item("Main Course", 50.00, List.of("Alice"))
        );

        List<PersonDebt> result = SplitBillLogic.calculateSplit(50.00, items, 0, 0);

        assertEquals(1, result.size());
        assertEquals("Alice", result.get(0).name);
        assertEquals(50.00, result.get(0).amount, 0.001);
    }

    @Test
    @DisplayName("Single person pays full amount")
    void calculateSplit_singlePerson() {
        List<Item> items = List.of(
                new Item("Solo Meal", 25.00, List.of("Alice"))
        );

        List<PersonDebt> result = SplitBillLogic.calculateSplit(25.00, items, 10.0, 5.0);

        assertEquals(1, result.size());
        // Alice: 25.00 + 2.50 tax + 5.00 tip = 32.50
        assertEquals(32.50, result.get(0).amount, 0.001);
    }

    @Test
    @DisplayName("Split with shared and individual items (ratio-based)")
    void calculateSplit_sharedAndIndividualItems() {
        List<Item> items = List.of(
                new Item("Appetizer Platter", 30.00, Arrays.asList("Alice", "Bob", "Charlie")),
                new Item("Steak", 50.00, List.of("Alice", "Bob")),
                new Item("Dessert", 15.00, List.of("Charlie"))
        );

        List<PersonDebt> result = SplitBillLogic.calculateSplit(95.00, items, 0, 0);

        assertEquals(3, result.size());

        PersonDebt alice = result.stream().filter(p -> p.name.equals("Alice")).findFirst().orElseThrow();
        PersonDebt bob = result.stream().filter(p -> p.name.equals("Bob")).findFirst().orElseThrow();
        PersonDebt charlie = result.stream().filter(p -> p.name.equals("Charlie")).findFirst().orElseThrow();

        // Alice: 10.00 (1/3 appetizer) + 25.00 (1/2 steak) = 35.00
        assertEquals(35.00, alice.amount, 0.001);
        // Bob: 10.00 (1/3 appetizer) + 25.00 (1/2 steak) = 35.00
        assertEquals(35.00, bob.amount, 0.001);
        // Charlie: 10.00 (1/3 appetizer) + 15.00 (dessert) = 25.00
        assertEquals(25.00, charlie.amount, 0.001);
    }

    @Test
    @DisplayName("Results are sorted alphabetically by name")
    void calculateSplit_resultsSortedByName() {
        List<Item> items = List.of(
                new Item("Food", 30.00, Arrays.asList("Charlie", "Alice", "Bob"))
        );

        List<PersonDebt> result = SplitBillLogic.calculateSplit(30.00, items, 0, 0);

        assertEquals("Alice", result.get(0).name);
        assertEquals("Bob", result.get(1).name);
        assertEquals("Charlie", result.get(2).name);
    }
}
