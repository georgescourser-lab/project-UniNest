const properties = [];

const agents = [
  {
    id: 1,
    name: "George Scourser",
    image: "/images/agent-george.jpg",
    rating: 5.0,
    reviews: 0,
    listingsCount: 0,
    whatsapp: "",
    email: "georgescourser@gmail.com"
  },
  {
    id: 2,
    name: "Odero Carilus",
    image: "/images/odero.jpg",
    rating: 5.0,
    reviews: 0,
    listingsCount: 0,
    whatsapp: "",
    email: "oderocarilus@gmail.com"
  }
];

const marketplaceItems = [];

// Export to window for global access
window.uniData = { properties, agents, marketplaceItems };
