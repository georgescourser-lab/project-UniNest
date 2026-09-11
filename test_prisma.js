import { config } from 'dotenv';
config({ path: '.env' });
import { PrismaClient } from '@prisma/client';

const connectionString = "postgresql://postgres:Scourser%402005@db.yuknsftjeoxifpjqumyk.supabase.co:5432/postgres";
console.log("Testing direct connection...");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString
    }
  }
});

async function main() {
  try {
    const properties = await prisma.properties.findMany({ take: 1 });
    console.log("Success!", properties.length);
  } catch (e) {
    console.error("FULL ERROR:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
