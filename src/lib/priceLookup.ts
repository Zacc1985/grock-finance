// Common price lookups for frequently purchased items
export const commonPrices: Record<string, { price: number; category: string; bucket: string }> = {
  // Fast Food
  "mcdonalds #7": { price: 7.50, category: "Dining", bucket: "WANT" },
  "mcdonalds big mac": { price: 5.99, category: "Dining", bucket: "WANT" },
  "mcdonalds quarter pounder": { price: 6.49, category: "Dining", bucket: "WANT" },
  "mcdonalds mcdouble": { price: 3.99, category: "Dining", bucket: "WANT" },
  "mcdonalds fries": { price: 3.99, category: "Dining", bucket: "WANT" },
  
  // Coffee
  "starbucks venti": { price: 5.45, category: "Dining", bucket: "WANT" },
  "starbucks grande": { price: 4.95, category: "Dining", bucket: "WANT" },
  "starbucks tall": { price: 4.45, category: "Dining", bucket: "WANT" },
  
  // Gas (average prices per gallon)
  "gas": { price: 3.50, category: "Transport", bucket: "NEED" },
  
  // Common Groceries
  "milk": { price: 4.99, category: "Groceries", bucket: "NEED" },
  "bread": { price: 3.99, category: "Groceries", bucket: "NEED" },
  "eggs": { price: 5.99, category: "Groceries", bucket: "NEED" },
  
  // Entertainment
  "movie ticket": { price: 15.00, category: "Entertainment", bucket: "WANT" },
  "netflix": { price: 15.49, category: "Entertainment", bucket: "WANT" },
  "spotify": { price: 9.99, category: "Entertainment", bucket: "WANT" },
};

// Function to look up price and details for an item
export function lookupPrice(item: string): { price: number; category: string; bucket: string } | null {
  // Convert to lowercase and remove special characters for matching
  const normalizedItem = item.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  
  // Try exact match first
  if (commonPrices[normalizedItem]) {
    return commonPrices[normalizedItem];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(commonPrices)) {
    if (normalizedItem.includes(key) || key.includes(normalizedItem)) {
      return value;
    }
  }
  
  return null;
}

// Function to get spending patterns
export function analyzeSpendingPattern(transactions: any[]): string {
  const patterns: string[] = [];
  
  // Check for frequent fast food purchases
  const fastFoodCount = transactions.filter(t => 
    t.category === "Dining" && 
    t.description.toLowerCase().includes("mcdonalds")
  ).length;
  
  if (fastFoodCount >= 3) {
    patterns.push(`You've had ${fastFoodCount} fast food meals this week. Consider meal prepping to save money!`);
  }
  
  // Check for high entertainment spending
  const entertainmentTotal = transactions
    .filter(t => t.category === "Entertainment")
    .reduce((sum, t) => sum + t.amount, 0);
    
  if (entertainmentTotal > 100) {
    patterns.push(`Your entertainment spending is $${entertainmentTotal} this month. That's higher than usual!`);
  }
  
  // Check for good saving habits
  const savingsTotal = transactions
    .filter(t => t.bucket === "SAVING")
    .reduce((sum, t) => sum + t.amount, 0);
    
  if (savingsTotal > 200) {
    patterns.push(`Great job saving $${savingsTotal} this month! Keep it up!`);
  }
  
  return patterns.join(' ');
} 