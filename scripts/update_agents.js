const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.properties.updateMany({ data: { agent_id: null } });
  await prisma.agents.deleteMany({});
  await prisma.agents.createMany({
    data: [
      { id: 1, name: 'George Scourser', email: 'georgescourser@gmail.com', whatsapp: '254742122668', image: '/images/agent-george.jpg', rating: 5.0, reviews: 0, listings_count: 0 },
      { id: 2, name: 'Odero Carilus', email: 'oderocarilus@gmail.com', whatsapp: '254116280954', image: null, rating: 5.0, reviews: 0, listings_count: 0 }
    ]
  });
}
main().then(() => console.log('Agents updated')).catch(console.error).finally(() => prisma.$disconnect());
