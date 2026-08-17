package com.spending.tracker.dto;

import com.spending.tracker.entity.Bill;
import com.spending.tracker.entity.SavingsGoal;
import com.spending.tracker.entity.Transaction;
import com.spending.tracker.entity.Wallet;

import java.util.ArrayList;
import java.util.List;

public class SyncDataRequest {

    private List<Wallet> wallets = new ArrayList<>();
    private List<Transaction> transactions = new ArrayList<>();
    private List<SavingsGoal> savingsGoals = new ArrayList<>();
    private List<Bill> splitBills = new ArrayList<>();

    public SyncDataRequest() {}

    public SyncDataRequest(
            List<Wallet> wallets,
            List<Transaction> transactions,
            List<SavingsGoal> savingsGoals,
            List<Bill> splitBills) {
        this.wallets = wallets != null ? wallets : new ArrayList<>();
        this.transactions = transactions != null ? transactions : new ArrayList<>();
        this.savingsGoals = savingsGoals != null ? savingsGoals : new ArrayList<>();
        this.splitBills = splitBills != null ? splitBills : new ArrayList<>();
    }

    public List<Wallet> getWallets() {
        return wallets;
    }

    public void setWallets(List<Wallet> wallets) {
        this.wallets = wallets != null ? wallets : new ArrayList<>();
    }

    public List<Transaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<Transaction> transactions) {
        this.transactions = transactions != null ? transactions : new ArrayList<>();
    }

    public List<SavingsGoal> getSavingsGoals() {
        return savingsGoals;
    }

    public void setSavingsGoals(List<SavingsGoal> savingsGoals) {
        this.savingsGoals = savingsGoals != null ? savingsGoals : new ArrayList<>();
    }

    public List<Bill> getSplitBills() {
        return splitBills;
    }

    public void setSplitBills(List<Bill> splitBills) {
        this.splitBills = splitBills != null ? splitBills : new ArrayList<>();
    }
}
