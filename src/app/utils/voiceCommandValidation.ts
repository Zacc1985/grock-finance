// Define interfaces for intent configurations
interface BaseIntentConfig {
  requiredParams: string[];
  optionalParams: string[];
}

interface AddExpenseConfig extends BaseIntentConfig {
  validateAmount: (amount: number) => string | null;
  validateCategory: (category: string, validCategories: string[]) => string | null;
}

interface CheckBalanceConfig extends BaseIntentConfig {
  validatePeriod: (period: string) => string | null;
}

interface SetGoalConfig extends BaseIntentConfig {
  validateAmount: (amount: number) => string | null;
  validateDeadline: (deadline: string) => string | null;
}

type IntentConfig = AddExpenseConfig | CheckBalanceConfig | SetGoalConfig | BaseIntentConfig;

/**
 * RESET_BUDGET intent uses only the base config, no validation functions needed.
 */
const RESET_BUDGET_CONFIG: BaseIntentConfig = {
  requiredParams: [],
  optionalParams: []
};

// Define valid intents and their required parameters
export const VALID_INTENTS: Record<string, IntentConfig> = {
  ADD_EXPENSE: {
    requiredParams: ['amount', 'category'],
    optionalParams: ['description'],
    validateAmount: (amount: number) => {
      if (isNaN(amount) || amount <= 0) {
        return 'Amount must be a positive number';
      }
      if (amount > 1000000) {
        return 'Amount seems unusually high. Please confirm if this is correct.';
      }
      return null;
    },
    validateCategory: (category: string, validCategories: string[]) => {
      if (!validCategories.includes(category.toLowerCase())) {
        return `Invalid category. Valid categories are: ${validCategories.join(', ')}`;
      }
      return null;
    }
  },
  CHECK_BALANCE: {
    requiredParams: ['category'],
    optionalParams: ['period'],
    validatePeriod: (period: string) => {
      const validPeriods = ['today', 'week', 'month', 'year'];
      if (period && !validPeriods.includes(period.toLowerCase())) {
        return `Invalid period. Valid periods are: ${validPeriods.join(', ')}`;
      }
      return null;
    }
  },
  SET_GOAL: {
    requiredParams: ['amount', 'name'],
    optionalParams: ['deadline'],
    validateAmount: (amount: number) => {
      if (isNaN(amount) || amount <= 0) {
        return 'Goal amount must be a positive number';
      }
      return null;
    },
    validateDeadline: (deadline: string) => {
      const date = new Date(deadline);
      if (isNaN(date.getTime())) {
        return 'Invalid deadline date format';
      }
      if (date < new Date()) {
        return 'Deadline cannot be in the past';
      }
      return null;
    }
  },
  RESET_BUDGET: RESET_BUDGET_CONFIG
};

// Helper function to extract amount from text
export function extractAmount(text: string): { amount: number | null; error: string | null } {
  // Match patterns like "$50", "50 dollars", "50.99", etc.
  const amountRegex = /\$?\d+(\.\d{1,2})?/;
  const match = text.match(amountRegex);
  
  if (!match) {
    return { amount: null, error: 'No valid amount found in the command' };
  }

  const amount = parseFloat(match[0].replace('$', ''));
  return { amount, error: null };
}

// Helper function to extract category from text
export function extractCategory(text: string, validCategories: string[]): { category: string | null; error: string | null } {
  const lowerText = text.toLowerCase();
  const foundCategory = validCategories.find(cat => 
    lowerText.includes(cat.toLowerCase())
  );

  if (!foundCategory) {
    return { 
      category: null, 
      error: `No valid category found. Valid categories are: ${validCategories.join(', ')}` 
    };
  }

  return { category: foundCategory, error: null };
}

// Main validation function
export function validateVoiceCommand(
  text: string,
  intent: string,
  parameters: Record<string, any>,
  validCategories: string[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const intentConfig = VALID_INTENTS[intent];

  if (!intentConfig) {
    return {
      isValid: false,
      errors: [`Invalid intent. Valid intents are: ${Object.keys(VALID_INTENTS).join(', ')}`]
    };
  }

  // Check required parameters
  for (const param of intentConfig.requiredParams) {
    if (!parameters[param]) {
      errors.push(`Missing required parameter: ${param}`);
    }
  }

  // Type guard functions
  const isAddExpenseConfig = (config: IntentConfig): config is AddExpenseConfig => {
    return 'validateAmount' in config && 'validateCategory' in config;
  };

  const isCheckBalanceConfig = (config: IntentConfig): config is CheckBalanceConfig => {
    return 'validatePeriod' in config;
  };

  const isSetGoalConfig = (config: IntentConfig): config is SetGoalConfig => {
    return 'validateAmount' in config && 'validateDeadline' in config;
  };

  // Validate based on intent type
  if (isAddExpenseConfig(intentConfig)) {
    if (parameters.amount) {
      const amountError = intentConfig.validateAmount(parameters.amount);
      if (amountError) errors.push(amountError);
    }
    if (parameters.category) {
      const categoryError = intentConfig.validateCategory(parameters.category, validCategories);
      if (categoryError) errors.push(categoryError);
    }
  }

  if (isCheckBalanceConfig(intentConfig) && parameters.period) {
    const periodError = intentConfig.validatePeriod(parameters.period);
    if (periodError) errors.push(periodError);
  }

  if (isSetGoalConfig(intentConfig)) {
    if (parameters.amount) {
      const amountError = intentConfig.validateAmount(parameters.amount);
      if (amountError) errors.push(amountError);
    }
    if (parameters.deadline) {
      const deadlineError = intentConfig.validateDeadline(parameters.deadline);
      if (deadlineError) errors.push(deadlineError);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
} 