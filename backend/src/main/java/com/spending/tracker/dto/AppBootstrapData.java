package com.spending.tracker.dto;

import com.spending.tracker.entity.Budget;
import com.spending.tracker.entity.SavingsGoal;
import com.spending.tracker.entity.Transaction;
import com.spending.tracker.entity.Wallet;

import java.util.ArrayList;
import java.util.List;

public class AppBootstrapData {

    private List<Wallet> wallets = new ArrayList<>();
    private List<Transaction> transactions = new ArrayList<>();
    private List<SavingsGoal> savingsGoals = new ArrayList<>();
    private List<Budget> budgets = new ArrayList<>();

    public AppBootstrapData() {
    }

    public AppBootstrapData(
            List<Wallet> wallets,
            List<Transaction> transactions,
            List<SavingsGoal> savingsGoals,
            List<Budget> budgets) {
        this.wallets = wallets != null ? wallets : new ArrayList<>();
        this.transactions = transactions != null ? transactions : new ArrayList<>();
        this.savingsGoals = savingsGoals != null ? savingsGoals : new ArrayList<>();
        this.budgets = budgets != null ? budgets : new ArrayList<>();
    }

    public List<Wallet> getWallets() {
        return wallets;
    }

    public void setWallets(List<Wallet> wallets) {
        this.wallets = wallets;
    }

    public List<Transaction> getTransactions() {
        return transactions;
    }

    public void setTransactions(List<Transaction> transactions) {
        this.transactions = transactions;
    }

    public List<SavingsGoal> getSavingsGoals() {
        return savingsGoals;
    }

    public void setSavingsGoals(List<SavingsGoal> savingsGoals) {
        this.savingsGoals = savingsGoals;
    }

    public List<Budget> getBudgets() {
        return budgets;
    }

    public void setBudgets(List<Budget> budgets) {
        this.budgets = budgets;
    }
}
