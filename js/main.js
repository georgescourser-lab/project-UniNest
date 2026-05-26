// Core functionality for UniNest

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  
  const path = window.location.pathname;
  if (path.includes('search.html') || document.body.classList.contains('page-search')) {
    initSearchPage();
  } else if (path.includes('property.html') || document.body.classList.contains('page-property')) {
    initPropertyPage();
  } else if (path.includes('agents.html') || document.body.classList.contains('page-agents')) {
    initAgentsPage();
  } else {
    initHomepage();
  }
});

function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }
    });
  }
}

// Global Toggle Fav function
window.toggleFav = function(event, el) {
  event.preventDefault();
  el.classList.toggle('active');
}

// Skeleton Generators
function createPropertySkeleton() {
  return `
    <div class="skeleton-card carousel-item" style="flex: 0 0 320px;">
      <div class="skeleton skeleton-img"></div>
      <div class="skeleton skeleton-title"></div>
      <div class="skeleton skeleton-text"></div>
      <div class="skeleton skeleton-text" style="width: 50%;"></div>
    </div>
  `;
}

function createPropertyCard(property, isCarousel = false) {
  const itemClass = isCarousel ? 'carousel-item' : '';
  return `
    <a href="property.html?id=${property.id}" class="property-card animate-fade-in-up ${itemClass}">
      <div class="property-image">
        <img src="${property.image}" alt="${property.title}">
        <div class="property-badges">
          <span class="badge badge-primary">${property.type}</span>
        </div>
      </div>
      <div class="property-content">
        <div class="property-price">${property.rent}<span> / month</span></div>
        <h3 class="property-title">${property.title}</h3>
        <div class="property-location">
          ${property.location}
        </div>
        <div class="property-amenities">
          ${property.amenities.slice(0,2).map(a => `<span class="amenity">• ${a}</span>`).join('')}
        </div>
      </div>
    </a>
  `;
}

function createAgentSkeleton() {
  return `
    <div class="skeleton-card" style="text-align: center;">
      <div class="skeleton" style="width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 1rem;"></div>
      <div class="skeleton skeleton-title" style="margin: 0 auto 0.5rem;"></div>
      <div class="skeleton skeleton-text" style="width: 50%; margin: 0 auto 1.5rem;"></div>
      <div class="skeleton skeleton-text" style="height: 2.5rem; border-radius: 9999px;"></div>
    </div>
  `;
}

function createAgentCard(agent) {
  return `
    <div class="agent-card animate-fade-in-up">
      <img src="${agent.image}" alt="${agent.name}">
      <h3>${agent.name}</h3>
      <div class="agent-stats">
        <span>★ ${agent.rating} (${agent.reviews})</span>
        <span>${agent.listingsCount} Listings</span>
      </div>
      <a href="https://wa.me/${agent.whatsapp}" target="_blank" class="btn btn-primary" style="background-color: #25D366; width: 100%;">
        WhatsApp
      </a>
    </div>
  `;
}

// Homepage Logic
function initHomepage() {
  const featuredContainer = document.getElementById('featured-listings');
  if (featuredContainer && window.uniData) {
    // Show skeletons
    featuredContainer.innerHTML = Array(4).fill(createPropertySkeleton()).join('');
    
    // Simulate network delay
    setTimeout(() => {
      const featured = window.uniData.properties.slice(0, 6);
      featuredContainer.innerHTML = featured.map(p => createPropertyCard(p, true)).join('');
    }, 800);
  }
  
  const searchForm = document.getElementById('home-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('search-type').value;
      const location = document.getElementById('search-location').value;
      window.location.href = `search.html?type=${type}&location=${location}`;
    });
  }
}

// Search Page Logic
function initSearchPage() {
  const resultsContainer = document.getElementById('search-results');
  const typeFilter = document.getElementById('filter-type');
  
  const urlParams = new URLSearchParams(window.location.search);
  const initialType = urlParams.get('type');
  
  if (initialType && initialType !== 'Any' && typeFilter) {
    typeFilter.value = initialType;
  }
  
  const renderResults = () => {
    // Show skeletons
    resultsContainer.innerHTML = Array(6).fill(createPropertySkeleton().replace('carousel-item', '')).join('');
    
    setTimeout(() => {
      let filtered = window.uniData.properties;
      if (typeFilter && typeFilter.value !== 'Any') {
        filtered = filtered.filter(p => p.type === typeFilter.value);
      }
      
      if (filtered.length === 0) {
        resultsContainer.innerHTML = '<p class="text-muted">No properties found matching your criteria.</p>';
      } else {
        resultsContainer.innerHTML = filtered.map(p => createPropertyCard(p, false)).join('');
      }
    }, 800);
  };
  
  renderResults();
  
  if (typeFilter) {
    typeFilter.addEventListener('change', renderResults);
  }
}

// Property Page Logic
function initPropertyPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const propId = parseInt(urlParams.get('id')) || 1;
  const property = window.uniData.properties.find(p => p.id === propId);
  const agent = window.uniData.agents.find(a => a.id === property?.agentId);
  
  if (property) {
    document.title = `${property.title} | UniNest`;
    
    setTimeout(() => {
      // Remove skeleton classes and inject data
      document.getElementById('prop-title').textContent = property.title;
      document.getElementById('prop-title').classList.remove('skeleton', 'skeleton-title');
      
      document.getElementById('prop-location').textContent = property.location;
      document.getElementById('prop-location').classList.remove('skeleton', 'skeleton-text');
      
      document.getElementById('prop-price').textContent = property.rent;
      document.getElementById('prop-type-badge').textContent = property.type;
      
      const descEl = document.getElementById('prop-desc');
      descEl.textContent = property.description;
      descEl.classList.remove('skeleton');
      descEl.style.height = 'auto';
      
      // Images Carousel
      const carouselHtml = property.images.map(img => `<img src="${img}" alt="Property view">`).join('');
      document.getElementById('prop-carousel').innerHTML = carouselHtml;
      document.getElementById('prop-carousel').classList.remove('skeleton');
      
      // Amenities
      const amenitiesHTML = property.amenities.map(a => `<div class="amenity">• ${a}</div>`).join('');
      document.getElementById('prop-amenities').innerHTML = amenitiesHTML;
      
      // Agent
      if (agent) {
        document.getElementById('agent-img').src = agent.image;
        document.getElementById('agent-img').style.display = 'block';
        document.getElementById('agent-name').textContent = agent.name;
        document.getElementById('agent-name').classList.remove('skeleton', 'skeleton-title');
        
        document.getElementById('agent-whatsapp').href = `https://wa.me/${agent.whatsapp}`;
      }
    }, 800);
  }
}

// Agents Page Logic
function initAgentsPage() {
  const agentsContainer = document.getElementById('agents-list');
  if (agentsContainer && window.uniData) {
    agentsContainer.innerHTML = Array(3).fill(createAgentSkeleton()).join('');
    
    setTimeout(() => {
      agentsContainer.innerHTML = window.uniData.agents.map(createAgentCard).join('');
    }, 800);
  }
}
