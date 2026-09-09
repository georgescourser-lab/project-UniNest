import { getPrisma } from './src/lib/prisma.js';

async function main() {
  const prisma = getPrisma();
  try {
    const properties = await prisma.properties.findMany({
      take: 6,
      orderBy: {
        id: 'desc'
      }
    });
    console.log("Success:", properties.length);
  } catch (error) {
    console.error("Prisma Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
