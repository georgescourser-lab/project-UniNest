// Core functionality for UniNest

document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  
  if (window.fetchSupabaseData) {
    await window.fetchSupabaseData();
  }

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

// Global Toggle Fav function with Auth Gatekeeper
window.toggleFav = function(event, el) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (!window.UniAuth) {
    alert('Please sign in to save properties to your favorites.');
    return;
  }
  window.UniAuth.requireAuth(() => {
    el.classList.toggle('active');
    if (window.UniAuth.showToast) {
      window.UniAuth.showToast(el.classList.contains('active') ? 'Saved to your favorites!' : 'Removed from favorites.', 'success');
    }
  }, { reason: 'Sign in or create an account to save properties to your favorites.' });
};

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
        <img src="${property.image}" alt="${property.title}" onerror="this.src='https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'">
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
  const imgSrc = agent.image ? agent.image.replace(/^\//, '') : 'images/agent-1.svg';
  return `
    <div class="agent-card animate-fade-in-up">
      <img src="${imgSrc}" alt="${agent.name}" onerror="this.src='images/agent-1.svg'" style="object-fit: cover;">
      <h3>${agent.name}</h3>
      <div class="agent-stats">
        <span>★ ${agent.rating || '5.0'} (${agent.reviews || 0})</span>
        <span>${agent.listingsCount || 0} Listings</span>
      </div>
      <a href="search.html" class="btn btn-primary" style="width: 100%;">
        View Managed Listings
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

  // Hook up Hero Search Form
  const searchForm = document.getElementById('home-search-form');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const type = document.getElementById('search-type')?.value || '';
      const location = document.getElementById('search-location')?.value || '';
      const budget = document.getElementById('search-budget')?.value || '';

      const params = new URLSearchParams();
      if (type && type !== 'Any') params.set('type', type);
      if (location) params.set('location', location);
      if (budget) params.set('budget', budget);

      const qs = params.toString();
      window.location.href = qs ? `search.html?${qs}` : 'search.html';
    });
  }
}

// Search Page Logic
function initSearchPage() {
  const resultsContainer = document.getElementById('search-results');
  const typeFilter = document.getElementById('filter-type');
  const applyBtn = document.getElementById('apply-filters-btn') || document.querySelector('.filter-sidebar .btn-primary');
  
  const urlParams = new URLSearchParams(window.location.search);
  const initialType = urlParams.get('type');
  const initialLocation = urlParams.get('location');
  const initialBudget = urlParams.get('budget');
  
  if (initialType && initialType !== 'Any' && typeFilter) {
    typeFilter.value = initialType;
  }
  
  const renderResults = () => {
    if (!resultsContainer) return;
    // Show skeletons
    resultsContainer.innerHTML = Array(6).fill(createPropertySkeleton().replace('carousel-item', '')).join('');
    
    setTimeout(() => {
      let filtered = (window.uniData && window.uniData.properties) ? [...window.uniData.properties] : [];

      // Filter by Property Type
      if (typeFilter && typeFilter.value !== 'Any') {
        filtered = filtered.filter(p => p.type.toLowerCase() === typeFilter.value.toLowerCase());
      }

      // Filter by Location / Campus (if set from search query)
      if (initialLocation && initialLocation !== 'Other') {
        filtered = filtered.filter(p => {
          const loc = (p.location || '').toLowerCase();
          const title = (p.title || '').toLowerCase();
          const desc = (p.description || '').toLowerCase();
          const q = initialLocation.toLowerCase();
          return loc.includes(q) || title.includes(q) || desc.includes(q);
        });
      }

      // Filter by Distance
      const distanceRadio = document.querySelector('input[name="distance"]:checked');
      if (distanceRadio) {
        const text = distanceRadio.parentElement.textContent.trim();
        if (text.includes('1 km')) {
          filtered = filtered.filter(p => parseFloat(p.distance) <= 1.0);
        } else if (text.includes('3 km')) {
          filtered = filtered.filter(p => parseFloat(p.distance) <= 3.0);
        }
      }

      // Filter by Amenities
      const checkedBoxes = Array.from(document.querySelectorAll('.filter-sidebar input[type="checkbox"]:checked'));
      if (checkedBoxes.length) {
        filtered = filtered.filter(p => {
          return checkedBoxes.every(cb => {
            const label = cb.parentElement.textContent.trim();
            if (label.includes('Wi-Fi')) return p.amenities?.some(a => a.toLowerCase().includes('wi-fi'));
            if (label.includes('Security')) return p.amenities?.some(a => a.toLowerCase().includes('security'));
            if (label.includes('Furnished')) return p.amenities?.some(a => a.toLowerCase().includes('furnished'));
            return true;
          });
        });
      }

      // Filter by Budget (if set from search query)
      if (initialBudget) {
        filtered = filtered.filter(p => {
          const rentNum = parseInt((p.rent || '').replace(/\D/g, '')) || 0;
          if (initialBudget === '0-5000') return rentNum <= 5000;
          if (initialBudget === '5000-10000') return rentNum >= 5000 && rentNum <= 10000;
          if (initialBudget === '10000-15000') return rentNum >= 10000 && rentNum <= 15000;
          if (initialBudget === '15000+') return rentNum >= 15000;
          return true;
        });
      }
      
      if (filtered.length === 0) {
        resultsContainer.innerHTML = '<p class="text-muted" style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem;">No properties found matching your criteria. Try adjusting your filters.</p>';
      } else {
        resultsContainer.innerHTML = filtered.map(p => createPropertyCard(p, false)).join('');
      }
    }, 400);
  };
  
  renderResults();
  
  if (typeFilter) {
    typeFilter.addEventListener('change', renderResults);
  }
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      renderResults();
    });
  }
  document.querySelectorAll('.filter-sidebar input').forEach(input => {
    input.addEventListener('change', renderResults);
  });
}

// Property Page Logic
function initPropertyPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const propId = parseInt(urlParams.get('id')) || 1;
  const allProperties = (window.uniData && window.uniData.properties && window.uniData.properties.length) 
    ? window.uniData.properties 
    : (typeof properties !== 'undefined' ? properties : []);
  let property = allProperties.find(p => p.id === propId) || allProperties[0];
  
  const allAgents = (window.uniData && window.uniData.agents && window.uniData.agents.length)
    ? window.uniData.agents
    : (typeof agents !== 'undefined' ? agents : []);
  let agent = allAgents.find(a => a.id === property?.agentId) || allAgents[0];
  
  if (property) {
    document.title = `${property.title} | UniNest`;
    
    setTimeout(() => {
      // Remove skeleton classes and inject data
      const titleEl = document.getElementById('prop-title');
      if (titleEl) {
        titleEl.textContent = property.title;
        titleEl.classList.remove('skeleton', 'skeleton-title');
      }
      
      const locEl = document.getElementById('prop-location');
      if (locEl) {
        locEl.textContent = property.location;
        locEl.classList.remove('skeleton', 'skeleton-text');
      }
      
      const priceEl = document.getElementById('prop-price');
      if (priceEl) priceEl.textContent = property.rent;
      
      const badgeEl = document.getElementById('prop-type-badge');
      if (badgeEl) {
        badgeEl.textContent = property.type;
        badgeEl.style.opacity = '1';
      }
      
      const descEl = document.getElementById('prop-desc');
      if (descEl) {
        descEl.textContent = property.description;
        descEl.classList.remove('skeleton');
        descEl.style.height = 'auto';
      }
      
      // Images Carousel
      const carouselEl = document.getElementById('prop-carousel');
      if (carouselEl && property.images && property.images.length) {
        const carouselHtml = property.images.map(img => `<img src="${img}" alt="Property view" onerror="this.src='https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'">`).join('');
        carouselEl.innerHTML = carouselHtml;
        carouselEl.classList.remove('skeleton');
      }
      
      // Amenities
      const amenitiesEl = document.getElementById('prop-amenities');
      if (amenitiesEl && property.amenities) {
        const amenitiesHTML = property.amenities.map(a => `<div class="amenity">• ${a}</div>`).join('');
        amenitiesEl.innerHTML = amenitiesHTML;
      }
      
      // Agent
      if (agent) {
        const agentImg = document.getElementById('agent-img');
        if (agentImg) {
          agentImg.src = agent.image ? agent.image.replace(/^\//, '') : 'images/agent-1.svg';
          agentImg.style.display = 'block';
        }
        const agentName = document.getElementById('agent-name');
        if (agentName) {
          agentName.textContent = agent.name;
          agentName.classList.remove('skeleton', 'skeleton-title');
        }
        const agentRating = document.getElementById('agent-rating');
        if (agentRating) {
          agentRating.textContent = `★ ${agent.rating || '5.0'} (${agent.reviews || 0} Reviews)`;
        }
      }
    }, 250);
  }
}

// Global Property Viewing Modal Handlers with Auth Gatekeeper
window.openPropertyViewingModal = function() {
  if (!window.UniAuth) {
    alert('Please sign in to schedule an accompanied property viewing.');
    return;
  }
  window.UniAuth.requireAuth(() => {
    const modal = document.getElementById('property-viewing-modal');
    if (modal) {
      const user = window.UniAuth.getUser();
      if (user && user.email) {
        const emailInput = document.getElementById('prop-viewing-email');
        if (emailInput && !emailInput.value) emailInput.value = user.email;
      }
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }, { reason: 'Sign in to schedule an accompanied property viewing with an authorized campus agent.' });
};

window.closePropertyViewingModal = function() {
  const modal = document.getElementById('property-viewing-modal');
  if (modal) {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }
};

window.handlePropertyViewingSubmit = function(event) {
  event.preventDefault();
  if (window.UniAuth && !window.UniAuth.isAuthenticated()) {
    window.UniAuth.requireAuth(() => {
      window.handlePropertyViewingSubmit(event);
    }, { reason: 'Please log in to confirm and register your viewing appointment.' });
    return;
  }

  const name = document.getElementById('prop-viewing-name')?.value;
  const date = document.getElementById('prop-viewing-date')?.value;
  const time = document.getElementById('prop-viewing-time')?.value;
  const refCode = `UN-PROP-${Math.floor(10000 + Math.random() * 90000)}`;

  window.closePropertyViewingModal();
  if (event.target && event.target.reset) {
    event.target.reset();
  }
  if (window.UniAuth && window.UniAuth.showToast) {
    window.UniAuth.showToast(`Viewing request registered! Ref: ${refCode}`, 'success');
  }
  alert(`✓ Viewing Request Confirmed!\n\nReference: ${refCode}\nClient: ${name}\nRequested Slot: ${date} (${time})\n\nAn authorized UniNest agent has received your request and will contact you directly to accompany your viewing.`);
};

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
