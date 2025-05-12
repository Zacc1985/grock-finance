interface BudgetAnalysis {
  monthlyIncome: number;
  needsSpent: number;
  wantsSpent: number;
  savingsSpent: number;
  categoryBreakdown: Array<{
    category: string;
    spent: number;
    budget?: number;
  }>;
  goals: Array<{
    name: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string | null;
    monthlyRequired: number;
  }>;
}

interface CoachingMessage {
  mainMessage: string;
  details: string[];
  suggestions: string[];
  severity: 'success' | 'warning' | 'danger';
}

export function generateCoachingMessage(analysis: BudgetAnalysis): CoachingMessage {
  const {
    monthlyIncome,
    needsSpent,
    wantsSpent,
    savingsSpent,
    categoryBreakdown,
    goals
  } = analysis;

  // Calculate budget limits based on 50/30/20 rule
  const needsLimit = monthlyIncome * 0.5;
  const wantsLimit = monthlyIncome * 0.3;
  const savingsLimit = monthlyIncome * 0.2;

  // Calculate percentages
  const needsPercentage = (needsSpent / needsLimit) * 100;
  const wantsPercentage = (wantsSpent / wantsLimit) * 100;
  const savingsPercentage = (savingsSpent / savingsLimit) * 100;

  // Initialize message components
  const details: string[] = [];
  const suggestions: string[] = [];
  let mainMessage = '';
  let severity: 'success' | 'warning' | 'danger' = 'success';

  // Analyze needs spending
  if (needsPercentage > 100) {
    severity = 'danger';
    details.push(`You've exceeded your needs budget by ${(needsPercentage - 100).toFixed(1)}%`);
    
    // Find specific categories that are over budget
    const overBudgetNeeds = categoryBreakdown
      .filter(cat => cat.budget && cat.spent > cat.budget)
      .map(cat => `${cat.category} (${((cat.spent / cat.budget!) * 100).toFixed(1)}% over budget)`);
    
    if (overBudgetNeeds.length > 0) {
      details.push(`Over budget in: ${overBudgetNeeds.join(', ')}`);
    }

    suggestions.push('Consider reviewing your essential expenses to find areas where you can reduce spending');
    suggestions.push('Look for ways to reduce utility bills or find more affordable housing options');
  } else if (needsPercentage > 80) {
    severity = 'warning';
    details.push(`You're close to your needs budget limit (${needsPercentage.toFixed(1)}% used)`);
    suggestions.push('Start planning for next month\'s essential expenses');
  }

  // Analyze wants spending
  if (wantsPercentage > 100) {
    severity = severity === 'success' ? 'warning' : 'danger';
    details.push(`You've exceeded your wants budget by ${(wantsPercentage - 100).toFixed(1)}%`);
    
    // Find specific categories that are over budget
    const overBudgetWants = categoryBreakdown
      .filter(cat => cat.budget && cat.spent > cat.budget)
      .map(cat => `${cat.category} (${((cat.spent / cat.budget!) * 100).toFixed(1)}% over budget)`);
    
    if (overBudgetWants.length > 0) {
      details.push(`Over budget in: ${overBudgetWants.join(', ')}`);
    }

    suggestions.push('Consider implementing a "cooling-off" period before making non-essential purchases');
    suggestions.push('Look for free or lower-cost alternatives for entertainment and dining out');
  } else if (wantsPercentage > 80) {
    severity = severity === 'success' ? 'warning' : severity;
    details.push(`You're close to your wants budget limit (${wantsPercentage.toFixed(1)}% used)`);
    suggestions.push('Start planning your discretionary spending for the rest of the month');
  }

  // Analyze savings
  if (savingsPercentage < 80) {
    severity = severity === 'success' ? 'warning' : severity;
    details.push(`You're behind on your savings target (${savingsPercentage.toFixed(1)}% of target)`);
    
    // Check impact on goals
    const atRiskGoals = goals.filter(goal => {
      const monthsUntilDeadline = goal.deadline 
        ? (new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 30)
        : null;
      return monthsUntilDeadline && goal.monthlyRequired > (savingsLimit / goals.length);
    });

    if (atRiskGoals.length > 0) {
      details.push(`Your savings rate may affect these goals: ${atRiskGoals.map(g => g.name).join(', ')}`);
    }

    suggestions.push('Consider setting up automatic transfers to your savings account');
    suggestions.push('Look for ways to increase your income or reduce expenses to boost savings');
  }

  // Generate main message based on severity
  if (severity === 'danger') {
    mainMessage = '🚨 Your spending needs immediate attention!';
  } else if (severity === 'warning') {
    mainMessage = '⚠️ Your budget needs some adjustments';
  } else {
    mainMessage = '✅ You\'re on track with your budget!';
  }

  // Add positive reinforcement if appropriate
  if (severity === 'success') {
    const positiveAspects = [];
    if (needsPercentage < 80) positiveAspects.push('managing essential expenses well');
    if (wantsPercentage < 80) positiveAspects.push('keeping discretionary spending under control');
    if (savingsPercentage >= 100) positiveAspects.push('exceeding your savings target');

    if (positiveAspects.length > 0) {
      details.push(`Great job ${positiveAspects.join(' and ')}!`);
    }
  }

  return {
    mainMessage,
    details,
    suggestions,
    severity
  };
} 