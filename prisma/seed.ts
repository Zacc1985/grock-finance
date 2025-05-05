import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        name: 'Groceries',
        type: 'EXPENSE',
        budget: 500,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Savings',
        type: 'SAVING',
        budget: 1000,
      },
    }),
    prisma.category.create({
      data: {
        name: 'Investment',
        type: 'INVESTMENT',
        budget: 2000,
      },
    }),
  ]);

  // Create a recurring expense
  await prisma.recurringExpense.create({
    data: {
      name: 'Monthly Rent',
      amount: 1200,
      frequency: 'MONTHLY',
      nextDueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      categoryId: categories[0].id,
      bucket: 'NEED',
      isAutomatic: true,
    },
  });

  // Create a goal
  await prisma.goal.create({
    data: {
      name: 'Emergency Fund',
      targetAmount: 10000,
      currentAmount: 5000,
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
      status: 'IN_PROGRESS',
      categoryId: categories[1].id,
    },
  });

  // Create some transactions
  await Promise.all([
    prisma.transaction.create({
      data: {
        amount: 150,
        description: 'Weekly Groceries',
        type: 'EXPENSE',
        date: new Date(),
        categoryId: categories[0].id,
        bucket: 'NEED',
        tags: '[]',
      },
    }),
    prisma.transaction.create({
      data: {
        amount: 500,
        description: 'Monthly Savings',
        type: 'INCOME',
        date: new Date(),
        categoryId: categories[1].id,
        bucket: 'SAVING',
        tags: '[]',
      },
    }),
  ]);

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 