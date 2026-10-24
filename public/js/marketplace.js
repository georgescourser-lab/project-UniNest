// UniNest Second-Hand Student Marketplace Engine (Agent-Controlled Architecture)
// Strictly enforces:
// 1. Pre-Publish Agent Verification: Newly submitted items are PENDING until an authorized agent physically verifies and approves them.
// 2. No buyer-to-seller direct messaging or chats.
// 3. Complete privacy: Seller phone, email, and private hostel room numbers are stored in the agent vault only.
// 4. Agent-controlled inquiries & accompanied appointments.
// 5. Agent-controlled deal updates.

(function() {
  const STORAGE_KEY_PUBLIC = 'uninest_posted_marketplace_items';
  const STORAGE_KEY_PENDING_SUBMISSIONS = 'uninest_pending_verification_submissions';
  const STORAGE_KEY_INQUIRIES = 'uninest_agent_inquiries';

  // Seed initial sample pending submissions for realistic Agent Vetting demonstration
  function initDefaultSubmissions() {
    try {
      if (!localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS)) {
        const seedPending = [
          {
            id: 991,
            listingRef: 'UN-VET-7821',
            title: 'Bruhm 50L Bedside Mini Fridge (Silent Compressor)',
            category: 'Appliances',
            price: 'Ksh 9,800',
            originalPrice: 'Ksh 15,000',
            condition: 'Like New',
            campus: 'KU',
            campusName: 'Kenyatta University (KU)',
            location: 'KU Main Campus Gate B Hub',
            image: 'https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800&q=80',
            description: 'Used for one academic semester. Extremely clean, freeze compartment working 100%. Moving out after 4th year finals.',
            verificationMethod: 'Hostel Visit',
            ownerLegalName: 'Brian Ochieng (KU Finalist)',
            ownerPhone: '0712 345 678',
            ownerEmail: 'b.ochieng@students.ku.ac.ke',
            ownerPrivateAddress: 'Nyayo 3 Hostel, Wing B, Room 14',
            assignedAgentId: 1,
            assignedAgentName: 'Sarah Jenkins (KU Partner Agent)',
            submittedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
            status: 'Pending Agent Verification'
          },
          {
            id: 992,
            listingRef: 'UN-VET-8430',
            title: 'Texas Instruments TI-84 Plus CE Graphing Calculator',
            category: 'Academic',
            price: 'Ksh 4,500',
            originalPrice: 'Ksh 8,000',
            condition: 'Gently Used',
            campus: 'Strathmore',
            campusName: 'Strathmore University',
            location: 'Madaraka Agent Kiosk',
            image: 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&q=80',
            description: 'Color screen, rechargeable battery, cable included. Essential for Financial Engineering / Actuarial courses.',
            verificationMethod: 'Campus Hub Drop-Off',
            ownerLegalName: 'Faith Muthoni (Actuarial Yr 3)',
            ownerPhone: '0745 678 901',
            ownerEmail: 'faith.m@strathmore.edu',
            ownerPrivateAddress: 'Madaraka Estate Block C, Flat 4',
            assignedAgentId: 4,
            assignedAgentName: 'Aisha Mohamed (Strathmore Partner Agent)',
            submittedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
            status: 'Pending Agent Verification'
          }
        ];
        localStorage.setItem(STORAGE_KEY_PENDING_SUBMISSIONS, JSON.stringify(seedPending));
      }
    } catch (e) {
      console.warn('Submissions seed notice:', e);
    }
  }

  // Seed default inquiries
  function initDefaultInquiries() {
    try {
      if (!localStorage.getItem(STORAGE_KEY_INQUIRIES)) {
        const seedInquiries = [
          {
            refCode: 'UN-INQ-40812',
            createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
            itemId: 1,
            itemTitle: 'Ramtons 90L Single-Door Mini Fridge',
            itemPrice: 'Ksh 11,500',
            campus: 'KU',
            clientName: 'Dennis Mutua',
            clientPhone: '0711 345 567',
            clientEmail: 'd.mutua@students.ku.ac.ke',
            preferredDate: '2026-10-14',
            preferredTime: 'Morning (10:00 AM - 12:00 PM)',
            preferredHub: 'KU Gate B Security / Student Center Foyer',
            notes: 'Need agent to plug in to verify freezing before payment.',
            status: 'Agent Confirmed',
            agentName: 'Sarah Jenkins (KU Partner Agent)',
            agentNotes: 'Contacted seller; agreed to meet at Gate B student lounge for power test.',
            dealUpdate: 'Viewing confirmed for Wednesday Oct 14 at 10:30 AM at KU Gate B Lounge. Agent Sarah will be present.'
          },
          {
            refCode: 'UN-INQ-51920',
            createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
            itemId: 3,
            itemTitle: '6kg Gas Cylinder + Burner & Heavy Duty Grill',
            itemPrice: 'Ksh 3,400',
            campus: 'UoN',
            clientName: 'Mercy Achieng',
            clientPhone: '0722 890 123',
            clientEmail: 'm.achieng@students.uonbi.ac.ke',
            preferredDate: '2026-10-13',
            preferredTime: 'Afternoon (2:00 PM - 4:00 PM)',
            preferredHub: 'Chiromo Campus Main Entrance',
            notes: 'Looking to pick this up after chemistry lab session.',
            status: 'Pending Agent Review',
            agentName: 'Brian Omondi (UoN Partner Agent)',
            agentNotes: 'Awaiting student owner confirmation of time slot.',
            dealUpdate: 'Inquiry received. Agent Brian is verifying owner availability for handover.'
          }
        ];
        localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(seedInquiries));
      }
    } catch (e) {
      console.warn('Inquiry storage init notice:', e);
    }
  }

  initDefaultSubmissions();
  initDefaultInquiries();

  // Retrieve public catalog items (Private contact information strictly excluded)
  function getAllItems() {
    let baseItems = [];
    if (window.uniData && Array.isArray(window.uniData.marketplaceItems)) {
      baseItems = window.uniData.marketplaceItems;
    }
    
    let localApproved = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PUBLIC);
      if (stored) {
        localApproved = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading approved items:', e);
    }

    return [...localApproved, ...baseItems].map(item => {
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        price: item.price,
        originalPrice: item.originalPrice,
        condition: item.condition,
        campus: item.campus,
        campusName: item.campusName,
        location: item.location,
        image: item.image,
        sellerType: 'Verified Student Listing',
        listingRef: item.listingRef || `UN-MKT-${item.id}`,
        agentId: item.agentId || 1,
        agentName: item.agentName || 'UniNest Verified Campus Agent',
        description: item.description,
        verifiedListing: true,
        postedAt: item.postedAt || 'Recently'
      };
    });
  }

  function getConditionBadgeClass(condition) {
    if (!condition) return 'condition-good';
    const c = condition.toLowerCase();
    if (c.includes('like new') || c.includes('mint')) return 'condition-like-new';
    if (c.includes('gently') || c.includes('very good')) return 'condition-gently-used';
    return 'condition-good';
  }

  function createMarketplaceCardHtml(item) {
    const condClass = getConditionBadgeClass(item.condition);

    return `
      <div class="marketplace-card" data-id="${item.id}">
        <div class="marketplace-img-wrap">
          <img src="${item.image || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80'}" alt="${item.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80'">
          <div class="marketplace-badges-row">
            <span class="condition-badge ${condClass}">${item.condition || 'Gently Used'}</span>
            <span class="campus-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
              ${item.campus || 'Campus'}
            </span>
          </div>
        </div>
        <div class="marketplace-card-content">
          <div class="marketplace-meta-row">
            <span class="marketplace-category-tag">${item.category || 'General'}</span>
            <span style="font-size: 0.75rem; color: #64748b; font-weight: 500;">
              Ref: ${item.listingRef}
            </span>
          </div>
          <h3 class="marketplace-card-title" title="${item.title}">${item.title}</h3>
          
          <div class="marketplace-price-box">
            <span class="marketplace-price">${item.price}</span>
            ${item.originalPrice ? `<span class="marketplace-original-price">${item.originalPrice}</span>` : ''}
            ${item.originalPrice ? `<span class="marketplace-discount-tag">Save</span>` : ''}
          </div>

          <p style="font-size: 0.85rem; color: var(--color-gray); margin-bottom: 0.85rem; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            ${item.description || ''}
          </p>

          <div class="marketplace-card-footer">
            <div class="marketplace-seller-info" title="Inspected by UniNest Agent • Safe accompanied handover">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              <span style="color: #2563eb; font-weight: 600;">Agent Verified ✓</span>
            </div>
            <div class="marketplace-card-actions">
              <button type="button" class="btn-marketplace-quickview" onclick="UniMarketplace.openQuickView(${item.id})">Details</button>
              <button type="button" class="btn btn-primary" onclick="UniMarketplace.openInquiryModal(${item.id})" style="padding: 0.45rem 0.85rem; font-size: 0.82rem; font-weight: 600; border-radius: var(--border-radius-sm);">
                Book Inspection
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function showToast(msg) {
    let toast = document.getElementById('uni-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'uni-toast';
      toast.className = 'uni-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      <span>${msg}</span>
    `;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  function initHomepageMarketplace() {
    const container = document.getElementById('homepage-marketplace-items');
    if (!container) return;

    const items = getAllItems().slice(0, 4);
    if (!items.length) {
      container.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">No marketplace items currently available.</p>';
      return;
    }

    container.innerHTML = items.map(createMarketplaceCardHtml).join('');

    const pills = document.querySelectorAll('.home-market-pill');
    if (pills.length) {
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const cat = pill.getAttribute('data-category');
          const all = getAllItems();
          const filtered = (cat === 'All') ? all.slice(0, 4) : all.filter(i => i.category === cat).slice(0, 4);
          container.innerHTML = filtered.length ? filtered.map(createMarketplaceCardHtml).join('') : '<p class="text-muted" style="text-align:center; padding: 2rem;">No items listed in this category yet.</p>';
        });
      });
    }
  }

  function initMarketplacePage() {
    const grid = document.getElementById('marketplace-grid');
    if (!grid) return;

    const searchInput = document.getElementById('market-search');
    const campusSelect = document.getElementById('market-campus');
    const conditionSelect = document.getElementById('market-condition');
    const sortSelect = document.getElementById('market-sort');
    const countDisplay = document.getElementById('market-count');
    const pillsContainer = document.getElementById('market-category-pills');

    let currentCategory = 'All';

    function renderFiltered() {
      let items = getAllItems();
      const query = (searchInput?.value || '').toLowerCase().trim();
      const campus = campusSelect?.value || 'All';
      const condition = conditionSelect?.value || 'All';
      const sort = sortSelect?.value || 'featured';

      if (currentCategory !== 'All') {
        items = items.filter(item => item.category === currentCategory);
      }
      if (campus !== 'All') {
        items = items.filter(item => item.campus === campus);
      }
      if (condition !== 'All') {
        items = items.filter(item => item.condition === condition);
      }
      if (query) {
        items = items.filter(item => 
          (item.title && item.title.toLowerCase().includes(query)) ||
          (item.description && item.description.toLowerCase().includes(query)) ||
          (item.category && item.category.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.listingRef && item.listingRef.toLowerCase().includes(query))
        );
      }

      if (sort === 'price-asc') {
        items.sort((a, b) => {
          const pA = parseInt((a.price || '').replace(/[^0-9]/g, '')) || 0;
          const pB = parseInt((b.price || '').replace(/[^0-9]/g, '')) || 0;
          return pA - pB;
        });
      } else if (sort === 'price-desc') {
        items.sort((a, b) => {
          const pA = parseInt((a.price || '').replace(/[^0-9]/g, '')) || 0;
          const pB = parseInt((b.price || '').replace(/[^0-9]/g, '')) || 0;
          return pB - pA;
        });
      } else if (sort === 'newest') {
        items.sort((a, b) => (b.id || 0) - (a.id || 0));
      }

      if (countDisplay) {
        countDisplay.textContent = `Showing ${items.length} ${items.length === 1 ? 'verified item' : 'verified items'}`;
      }

      if (!items.length) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; background: #ffffff; border-radius: var(--border-radius); border: 1px dashed #cbd5e1;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5" style="margin: 0 auto 1rem;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <h3 style="color: var(--color-dark); margin-bottom: 0.5rem;">No items found</h3>
            <p style="color: var(--color-gray); margin-bottom: 1.5rem; max-width: 450px; margin-left: auto; margin-right: auto;">
              No items matching your criteria. Try adjusting filters or submit your item to our agent for verification.
            </p>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.resetFilters()" style="margin-right: 0.5rem;">Reset Filters</button>
            <button type="button" class="btn btn-primary" onclick="UniMarketplace.openPostModal()">Submit Item to Agent</button>
          </div>
        `;
        return;
      }

      grid.innerHTML = items.map(createMarketplaceCardHtml).join('');
    }

    if (searchInput) searchInput.addEventListener('input', renderFiltered);
    if (campusSelect) campusSelect.addEventListener('change', renderFiltered);
    if (conditionSelect) conditionSelect.addEventListener('change', renderFiltered);
    if (sortSelect) sortSelect.addEventListener('change', renderFiltered);

    if (pillsContainer) {
      pillsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.marketplace-pill');
        if (!btn) return;
        pillsContainer.querySelectorAll('.marketplace-pill').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        currentCategory = btn.getAttribute('data-category') || 'All';
        renderFiltered();
      });
    }

    renderFiltered();

    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.hash === '#sell' || urlParams.get('action') === 'sell') {
      setTimeout(openPostModal, 300);
    } else if (window.location.hash === '#agent-portal' || urlParams.get('portal') === 'agent') {
      setTimeout(openAgentPortal, 300);
    } else if (window.location.hash === '#track' || urlParams.get('track') === 'deal') {
      setTimeout(openStatusTrackerModal, 300);
    }
  }

  function openQuickView(id) {
    const item = getAllItems().find(i => i.id == id);
    if (!item) return;

    const modal = document.getElementById('quick-view-modal');
    if (!modal) return;

    const condClass = getConditionBadgeClass(item.condition);

    document.getElementById('qv-title').textContent = item.title;
    document.getElementById('qv-category').textContent = item.category;
    document.getElementById('qv-condition').textContent = item.condition;
    document.getElementById('qv-condition').className = `condition-badge ${condClass}`;
    document.getElementById('qv-campus').textContent = item.campusName || item.campus;
    document.getElementById('qv-location').textContent = item.location || 'Campus Gate Area';
    document.getElementById('qv-price').textContent = item.price;
    
    const origPriceEl = document.getElementById('qv-orig-price');
    if (origPriceEl) {
      if (item.originalPrice) {
        origPriceEl.textContent = item.originalPrice;
        origPriceEl.style.display = 'inline';
      } else {
        origPriceEl.style.display = 'none';
      }
    }

    document.getElementById('qv-image').src = item.image;
    document.getElementById('qv-image').alt = item.title;
    document.getElementById('qv-description').textContent = item.description;
    
    const agentEl = document.getElementById('qv-seller');
    if (agentEl) {
      agentEl.textContent = `${item.agentName} (ID: ${item.listingRef})`;
    }

    document.getElementById('qv-posted').textContent = item.postedAt || 'Recently';
    
    const bookBtn = document.getElementById('qv-book-btn');
    if (bookBtn) {
      bookBtn.onclick = function() {
        closeQuickView();
        openInquiryModal(item.id);
      };
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // =========================================================================
  // Buyer Inquiry / Handover Booking Flow
  // =========================================================================

  function openInquiryModal(itemId) {
    if (window.UniAuth) {
      const allowed = window.UniAuth.requireAuth(() => {
        _doOpenInquiryModal(itemId);
      }, { reason: 'Sign in to request an inspection and contact the authorized agent.' });
      if (!allowed) return;
    }
    _doOpenInquiryModal(itemId);
  }

  function _doOpenInquiryModal(itemId) {
    const item = getAllItems().find(i => i.id == itemId);
    if (!item) return;

    const modal = document.getElementById('inquiry-modal');
    if (!modal) return;

    document.getElementById('inq-item-id').value = item.id;
    document.getElementById('inq-item-title').textContent = item.title;
    document.getElementById('inq-item-price').textContent = item.price;
    document.getElementById('inq-item-ref').textContent = item.listingRef || `UN-MKT-${item.id}`;
    document.getElementById('inq-assigned-agent').textContent = item.agentName;
    document.getElementById('inq-campus-hub').textContent = `${item.campus} (${item.location})`;

    const form = document.getElementById('inquiry-form');
    if (form) {
      form.reset();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateInput = document.getElementById('inq-date');
      if (dateInput) {
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
      }
    }

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeInquiryModal() {
    const modal = document.getElementById('inquiry-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function handleInquirySubmit(event) {
    event.preventDefault();
    const form = event.target;

    const itemId = parseInt(form['inq-item-id'].value);
    const item = getAllItems().find(i => i.id == itemId);
    const clientName = form['inq-client-name'].value.trim();
    const clientPhone = form['inq-client-phone'].value.trim();
    const clientEmail = form['inq-client-email'].value.trim();
    const preferredDate = form['inq-date'].value;
    const preferredTime = form['inq-time'].value;
    const preferredHub = form['inq-hub'].value;
    const notes = form['inq-notes'].value.trim();

    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const refCode = `UN-INQ-${randomDigits}`;

    const newInquiry = {
      refCode,
      createdAt: new Date().toISOString(),
      itemId,
      itemTitle: item ? item.title : 'Marketplace Item',
      itemPrice: item ? item.price : '',
      campus: item ? item.campus : '',
      clientName,
      clientPhone,
      clientEmail,
      preferredDate,
      preferredTime,
      preferredHub,
      notes,
      status: 'Pending Agent Review',
      agentName: item ? item.agentName : 'Authorized UniNest Agent',
      agentNotes: 'New client inquiry received. Coordinate with seller for accompanied handover.',
      dealUpdate: `Your appointment request has been scheduled with ${item ? item.agentName : 'UniNest Agent'}. You will receive confirmation via SMS/Email once the seller verifies the inspection slot.`
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newInquiry);
      localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving agent inquiry:', e);
    }

    closeInquiryModal();
    openConfirmationModal(refCode, newInquiry);
  }

  function openConfirmationModal(refCode, inquiry) {
    const modal = document.getElementById('confirmation-modal');
    if (!modal) {
      showToast(`Request submitted! Reference code: ${refCode}. The agent will coordinate your viewing.`);
      return;
    }

    document.getElementById('conf-ref-code').textContent = refCode;
    document.getElementById('conf-item-title').textContent = inquiry.itemTitle;
    document.getElementById('conf-agent-name').textContent = inquiry.agentName;
    document.getElementById('conf-date-time').textContent = `${inquiry.preferredDate} (${inquiry.preferredTime})`;
    document.getElementById('conf-hub').textContent = inquiry.preferredHub;

    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // =========================================================================
  // Seller Listing Submission (Enters Agent Verification Queue)
  // =========================================================================

  function openPostModal() {
    if (window.UniAuth) {
      const allowed = window.UniAuth.requireAuth(() => {
        _doOpenPostModal();
      }, { reason: 'Sign in to list items on the student marketplace.' });
      if (!allowed) return;
    }
    _doOpenPostModal();
  }

  function _doOpenPostModal() {
    const modal = document.getElementById('post-item-modal');
    if (modal) {
      const user = window.UniAuth ? window.UniAuth.getUser() : null;
      if (user && user.email) {
        const emailInput = document.getElementById('post-owner-email');
        if (emailInput && !emailInput.value) emailInput.value = user.email;
      }
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  let uploadedItemImageDataUrl = '';

  function handleItemFilePreview(input) {
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        uploadedItemImageDataUrl = e.target.result;
        const box = document.getElementById('item-preview-box');
        const img = document.getElementById('item-preview-img');
        const lbl = document.getElementById('item-preview-label');
        if (box && img) {
          img.src = uploadedItemImageDataUrl;
          if (lbl) lbl.textContent = 'Uploaded: ' + file.name;
          box.style.display = 'flex';
        }
      };
      reader.readAsDataURL(file);
    }
  }

  function handleItemUrlPreview(url) {
    const trimmed = (url || '').trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const box = document.getElementById('item-preview-box');
      const img = document.getElementById('item-preview-img');
      const lbl = document.getElementById('item-preview-label');
      if (box && img) {
        img.src = trimmed;
        if (lbl) lbl.textContent = 'Web image URL linked';
        box.style.display = 'flex';
      }
    } else if (!uploadedItemImageDataUrl) {
      const box = document.getElementById('item-preview-box');
      if (box) box.style.display = 'none';
    }
  }

  function closePostModal() {
    const modal = document.getElementById('post-item-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
      uploadedItemImageDataUrl = '';
      const box = document.getElementById('item-preview-box');
      if (box) box.style.display = 'none';
    }
  }

  // When a seller posts an item:
  // It is SAVED to PENDING SUBMISSIONS for AGENT VETTING.
  // It does NOT appear on the public marketplace until the agent approves it!
  function handlePostItemSubmit(event) {
    event.preventDefault();
    const form = event.target;

    const title = form['item-title'].value.trim();
    const category = form['item-category'].value;
    const priceNum = form['item-price'].value.trim();
    const originalPriceNum = form['item-orig-price'].value.trim();
    const condition = form['item-condition'].value;
    const campus = form['item-campus'].value;
    const location = form['item-location'].value.trim();
    const description = form['item-desc'].value.trim();
    let image = uploadedItemImageDataUrl || (form['item-image'] ? form['item-image'].value.trim() : '');
    const verificationMethod = form['verification-method'] ? form['verification-method'].value : 'Hostel Visit';

    // Confidential owner details (Visible only to authorized agents)
    const ownerLegalName = form['owner-name'].value.trim();
    const ownerPhone = form['owner-phone'].value.trim();
    const ownerEmail = form['owner-email'].value.trim();
    const ownerPrivateAddress = form['owner-private-address'].value.trim();

    if (!image) {
      const fallbacks = {
        'Appliances': 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&q=80',
        'Furniture': 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80',
        'Academic': 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?w=800&q=80',
        'Kitchen': 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800&q=80',
        'Bedding': 'https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80'
      };
      image = fallbacks[category] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80';
    }

    const itemId = Date.now();
    const listingRef = `UN-VET-${Math.floor(1000 + Math.random() * 9000)}`;

    const campusAgents = {
      'KU': { id: 1, name: 'Sarah Jenkins (KU Partner Agent)' },
      'JKUAT': { id: 2, name: 'David Kimani (JKUAT Partner Agent)' },
      'UoN': { id: 3, name: 'Brian Omondi (UoN Partner Agent)' },
      'Strathmore': { id: 4, name: 'Aisha Mohamed (Strathmore Partner Agent)' },
      'USIU': { id: 1, name: 'Sarah Jenkins (USIU/KU Partner Agent)' },
      'Daystar': { id: 3, name: 'Brian Omondi (Daystar Partner Agent)' },
      'MKU': { id: 2, name: 'David Kimani (MKU Partner Agent)' }
    };
    const assignedAgent = campusAgents[campus] || { id: 1, name: 'Sarah Jenkins (UniNest Central Agent)' };

    // Intake submission record stored in the Agent's Vetting Queue
    const pendingSubmission = {
      id: itemId,
      listingRef,
      title,
      category,
      price: `Ksh ${parseInt(priceNum).toLocaleString()}`,
      originalPrice: originalPriceNum ? `Ksh ${parseInt(originalPriceNum).toLocaleString()}` : null,
      condition,
      campus,
      campusName: form['item-campus'].options[form['item-campus'].selectedIndex].text,
      location,
      image,
      description,
      verificationMethod,
      ownerLegalName,
      ownerPhone,
      ownerEmail,
      ownerPrivateAddress,
      assignedAgentId: assignedAgent.id,
      assignedAgentName: assignedAgent.name,
      submittedAt: new Date().toISOString(),
      status: 'Pending Agent Verification'
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(pendingSubmission);
      localStorage.setItem(STORAGE_KEY_PENDING_SUBMISSIONS, JSON.stringify(list));
    } catch (e) {
      console.error('Error saving pending submission:', e);
    }

    form.reset();
    closePostModal();

    alert(
      `✓ Item Submitted to Agent Verification Queue!\n\n` +
      `Verification Ticket: ${listingRef}\n` +
      `Assigned Agent: ${assignedAgent.name}\n` +
      `Verification Method: ${verificationMethod}\n\n` +
      `Your item is currently pending verification. Your assigned agent will contact you to conduct the physical inspection before publishing it live on the marketplace. Your contact details remain confidential.`
    );
  }

  // =========================================================================
  // Status Tracker (Clients check status without exposing private contacts)
  // =========================================================================

  function openStatusTrackerModal() {
    const modal = document.getElementById('status-tracker-modal');
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeStatusTrackerModal() {
    const modal = document.getElementById('status-tracker-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function checkInquiryStatus(event) {
    if (event) event.preventDefault();
    const refInput = document.getElementById('tracker-ref-input');
    const resultBox = document.getElementById('tracker-result-box');
    if (!refInput || !resultBox) return;

    const query = refInput.value.trim().toUpperCase();
    if (!query) return;

    // Check inquiries
    let inquiries = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (stored) inquiries = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    // Check pending seller submissions
    let pendingSubmissions = [];
    try {
      const storedSub = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      if (storedSub) pendingSubmissions = JSON.parse(storedSub);
    } catch (e) {
      console.error(e);
    }

    const matchInq = inquiries.find(inq => inq.refCode.toUpperCase() === query);
    const matchSub = pendingSubmissions.find(sub => sub.listingRef.toUpperCase() === query);

    if (matchSub) {
      resultBox.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Verification Ticket</div>
              <strong style="font-size: 1.15rem; color: #0f172a;">${matchSub.listingRef}</strong>
            </div>
            <span style="background: #fef3c7; color: #b45309; font-size: 0.82rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 9999px;">
              ${matchSub.status}
            </span>
          </div>
          <div style="font-size: 0.92rem; color: #334155; margin-bottom: 0.5rem;">
            <strong>Item:</strong> ${matchSub.title} (${matchSub.price})
          </div>
          <div style="font-size: 0.88rem; color: #64748b; margin-bottom: 0.5rem;">
            <strong>Assigned Agent:</strong> ${matchSub.assignedAgentName}
          </div>
          <div style="font-size: 0.88rem; color: #64748b; margin-bottom: 1rem;">
            <strong>Verification Protocol:</strong> ${matchSub.verificationMethod}
          </div>
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 0.85rem 1rem; border-radius: 0 8px 8px 0; font-size: 0.88rem; color: #1e3a8a;">
            💡 <strong>Next Step:</strong> Your agent is preparing the inspection. Once verified, this item will go live with the "Agent Verified ✓" badge.
          </div>
        </div>
      `;
      resultBox.style.display = 'block';
      return;
    }

    if (matchInq) {
      resultBox.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Buyer Inquiry Reference</div>
              <strong style="font-size: 1.15rem; color: #0f172a;">${matchInq.refCode}</strong>
            </div>
            <span style="background: #dcfce7; color: #15803d; font-size: 0.82rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 9999px;">
              ${matchInq.status}
            </span>
          </div>
          <div style="font-size: 0.92rem; color: #334155; margin-bottom: 0.5rem;">
            <strong>Item:</strong> ${matchInq.itemTitle} (${matchInq.itemPrice})
          </div>
          <div style="font-size: 0.88rem; color: #64748b; margin-bottom: 0.5rem;">
            <strong>Supervising Agent:</strong> ${matchInq.agentName}
          </div>
          <div style="font-size: 0.88rem; color: #64748b; margin-bottom: 1rem;">
            <strong>Scheduled Slot:</strong> ${matchInq.preferredDate} • ${matchInq.preferredTime}
          </div>
          <div style="background: #f8fafc; border-left: 4px solid #2563eb; padding: 0.85rem 1rem; border-radius: 0 8px 8px 0; font-size: 0.88rem; color: #1e293b;">
            <strong>Agent Update:</strong><br>${matchInq.dealUpdate}
          </div>
        </div>
      `;
      resultBox.style.display = 'block';
      return;
    }

    resultBox.innerHTML = `
      <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 1.25rem; border-radius: 8px; color: #991b1b; font-size: 0.9rem;">
        No record found matching <code>${query}</code>. Please check your reference code.
      </div>
    `;
    resultBox.style.display = 'block';
  }

  // =========================================================================
  // Verified Campus Agents Known by the System
  // =========================================================================
  const KNOWN_AGENTS = [
    { id: 1, name: 'George Scourser', email: 'georgescourser@gmail.com', campus: 'KU', phone: '254742122668', isLead: true },
    { id: 2, name: 'Odero Carilus', email: 'oderocarilus@gmail.com', campus: 'JKUAT', phone: '254116280954', isLead: true },
    { id: 1, name: 'Sarah Jenkins', email: 'sarah@uninest.com', campus: 'KU', phone: '254711000111' },
    { id: 2, name: 'David Kimani', email: 'david@uninest.com', campus: 'JKUAT', phone: '254722000222' },
    { id: 3, name: 'Brian Omondi', email: 'brian@uninest.com', campus: 'UoN', phone: '254733000333' },
    { id: 4, name: 'Aisha Mohamed', email: 'aisha@uninest.com', campus: 'Strathmore', phone: '254744000444' }
  ];

  let currentActiveAgent = null;

  function getVerifiedAgent(user) {
    if (!user || !user.email) return null;
    const cleanEmail = user.email.trim().toLowerCase();

    // 1. Direct match in KNOWN_AGENTS
    const direct = KNOWN_AGENTS.find(a => a.email.toLowerCase() === cleanEmail);
    if (direct) return direct;

    // 2. Check dynamic agents if loaded via Supabase or window.uniData
    if (window.uniData && Array.isArray(window.uniData.agents)) {
      const match = window.uniData.agents.find(a => a.email && a.email.toLowerCase() === cleanEmail);
      if (match) return match;
    }

    // 3. Fallback admin emails
    if (cleanEmail === 'georgescourser@gmail.com') {
      return { id: 1, name: 'George Scourser', email: cleanEmail, campus: 'KU / All Campuses', isLead: true };
    }
    if (cleanEmail === 'oderocarilus@gmail.com') {
      return { id: 2, name: 'Odero Carilus', email: cleanEmail, campus: 'JKUAT / All Campuses', isLead: true };
    }

    return null;
  }

  function getCurrentVerifiedAgent() {
    if (!window.UniAuth) return null;
    const user = window.UniAuth.getStoredUser();
    return getVerifiedAgent(user);
  }

  function isItemAssignedToAgent(item, agent) {
    if (!item || !agent) return false;

    // Check by agentId or assignedAgentId
    if (item.agentId && (item.agentId === agent.id || item.agentId == agent.id)) return true;
    if (item.assignedAgentId && (item.assignedAgentId === agent.id || item.assignedAgentId == agent.id)) return true;

    // Check by agentName matching
    if (item.agentName && agent.name) {
      const cleanItemAgent = item.agentName.toLowerCase();
      const cleanAgentName = agent.name.toLowerCase();
      const firstName = cleanAgentName.split(' ')[0];
      if (cleanItemAgent.includes(firstName)) return true;
    }

    // Lead agents (George & Odero) can manage their campus or fallback unassigned
    if (agent.isLead && (!item.agentId && !item.assignedAgentId)) return true;

    return false;
  }

  // =========================================================================
  // Authorized Agent Portal (Restricted strictly to Verified Agents)
  // =========================================================================

  let currentAgentTab = 'vetting'; // 'vetting' | 'inquiries' | 'listings'

  function openAgentPortal() {
    if (!window.UniAuth) {
      alert('Authentication initializing. Please try again.');
      return;
    }

    const user = window.UniAuth.getStoredUser();
    if (!user) {
      // Must be logged in
      window.UniAuth.requireAuth(() => {
        openAgentPortal();
      }, { reason: 'Agent sign-in required to access the verification portal.' });
      return;
    }

    // User is logged in, verify if their email is known by the system as an agent
    const agent = getVerifiedAgent(user);
    if (!agent) {
      showAgentAccessDeniedModal(user.email);
      return;
    }

    currentActiveAgent = agent;
    _doOpenAgentPortal(agent);
  }

  function showAgentAccessDeniedModal(userEmail) {
    const modal = document.getElementById('agent-access-denied-modal');
    const emailSpan = document.getElementById('denied-user-email');
    if (emailSpan) emailSpan.textContent = userEmail || 'your email';
    if (modal) {
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    } else {
      alert(`Access Restricted: Only verified campus agents can access this portal.\nYour account (${userEmail}) is not registered as an authorized agent.\nPlease log in with your authorized agent email.`);
    }
  }

  function closeAgentAccessDeniedModal() {
    const modal = document.getElementById('agent-access-denied-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function switchAgentAccount() {
    closeAgentAccessDeniedModal();
    if (window.UniAuth) {
      window.UniAuth.signOut();
      setTimeout(() => {
        window.UniAuth.openAuthModal('signin');
      }, 300);
    }
  }

  function _doOpenAgentPortal(agent) {
    const modal = document.getElementById('agent-portal-modal');
    if (!modal) return;

    currentActiveAgent = agent || getCurrentVerifiedAgent();

    // Update portal title and badge with the verified agent identity
    const badgeEl = document.getElementById('agent-portal-badge');
    if (badgeEl && currentActiveAgent) {
      badgeEl.innerHTML = `✓ Authenticated Agent: <strong>${currentActiveAgent.name}</strong> (${currentActiveAgent.email}) • Agent ID #${currentActiveAgent.id}`;
    }

    switchAgentTab('vetting');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeAgentPortal() {
    const modal = document.getElementById('agent-portal-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  function switchAgentTab(tab) {
    currentAgentTab = tab;
    const tabVetting = document.getElementById('agent-tab-vetting');
    const tabInquiries = document.getElementById('agent-tab-inquiries');
    const tabListings = document.getElementById('agent-tab-listings');

    const containerVetting = document.getElementById('agent-portal-submissions-list');
    const containerInquiries = document.getElementById('agent-portal-inquiries-list');
    const containerListings = document.getElementById('agent-portal-listings-list');

    if (tabVetting) tabVetting.classList.toggle('active', tab === 'vetting');
    if (tabInquiries) tabInquiries.classList.toggle('active', tab === 'inquiries');
    if (tabListings) tabListings.classList.toggle('active', tab === 'listings');

    if (containerVetting) containerVetting.style.display = (tab === 'vetting') ? 'block' : 'none';
    if (containerInquiries) containerInquiries.style.display = (tab === 'inquiries') ? 'block' : 'none';
    if (containerListings) containerListings.style.display = (tab === 'listings') ? 'block' : 'none';

    const agent = currentActiveAgent || getCurrentVerifiedAgent();

    if (tab === 'vetting') {
      renderAgentVettingQueue(agent);
    } else if (tab === 'inquiries') {
      renderAgentInquiriesQueue(agent);
    } else if (tab === 'listings') {
      renderAgentListingsQueue(agent);
    }
  }

  // Renders Tab 1: Submissions waiting for physical inspection & approval
  function renderAgentVettingQueue(agent) {
    const container = document.getElementById('agent-portal-submissions-list');
    if (!container) return;

    if (!agent) agent = currentActiveAgent || getCurrentVerifiedAgent();

    let pending = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      if (stored) pending = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    // Filter to items assigned to THIS agent (or unassigned for leads)
    if (agent) {
      pending = pending.filter(item => isItemAssignedToAgent(item, agent));
    }

    // Update count badge
    const badge = document.getElementById('badge-vetting-count');
    if (badge) badge.textContent = pending.length;

    if (!pending.length) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" style="margin: 0 auto 0.5rem;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <h4 style="color: #0f172a; margin-bottom: 0.25rem;">All Submissions Verified</h4>
          <p style="color: #64748b; font-size: 0.88rem;">No items currently awaiting physical verification.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = pending.map(item => {
      const isHostelVisit = item.verificationMethod === 'Hostel Visit';

      return `
        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap;">
            <img src="${item.image}" alt="${item.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0;">
            
            <div style="flex: 1; min-width: 260px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                <span style="font-size: 0.75rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">Ticket: ${item.listingRef}</span>
                <span style="font-size: 0.78rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 9999px; background: ${isHostelVisit ? '#fee2e2' : '#e0f2fe'}; color: ${isHostelVisit ? '#b91c1c' : '#0369a1'};">
                  ${isHostelVisit ? '🏠 Hostel Room Visit Required' : '📍 Campus Hub Drop-Off'}
                </span>
              </div>

              <h4 style="font-size: 1.15rem; color: #0f172a; margin-bottom: 0.25rem;">${item.title}</h4>
              <div style="font-weight: 700; color: #0f172a; font-size: 1.05rem; margin-bottom: 0.5rem;">${item.price} <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">(Campus: ${item.campus})</span></div>

              <!-- Confidential Owner Record for the Agent -->
              <div style="background: #f8fafc; border: 1px dashed #94a3b8; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.84rem; margin-bottom: 0.75rem;">
                <div style="font-weight: 700; color: #d97706; margin-bottom: 0.25rem;">🔒 Confidential Seller Record (Agent Vault):</div>
                <div><strong>Student Name:</strong> ${item.ownerLegalName}</div>
                <div><strong>Phone / M-Pesa:</strong> <a href="tel:${item.ownerPhone}" style="color: #2563eb; font-weight: 600;">${item.ownerPhone}</a></div>
                <div><strong>Student Email:</strong> ${item.ownerEmail}</div>
                <div><strong>Private Hostel Room:</strong> <span style="color: #b91c1c; font-weight: 600;">${item.ownerPrivateAddress}</span></div>
              </div>

              <div style="font-size: 0.84rem; color: #475569; margin-bottom: 1rem; line-height: 1.4;">
                <strong>Item Description:</strong> ${item.description}
              </div>

              <!-- 4-Point Physical Verification Actions -->
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-primary" onclick="UniMarketplace.approveAndPublishSubmission('${item.listingRef}')" style="padding: 0.55rem 1.1rem; font-size: 0.85rem; font-weight: 600; background: #16a34a; border-color: #16a34a;">
                  ✓ Physically Verified: Approve & Publish Live
                </button>
                <button type="button" class="btn btn-secondary" onclick="UniMarketplace.scheduleInspectionVisit('${item.listingRef}')" style="padding: 0.55rem 1rem; font-size: 0.85rem;">
                  📅 Schedule Inspection Visit
                </button>
                <button type="button" class="btn btn-secondary" onclick="UniMarketplace.rejectSubmission('${item.listingRef}')" style="padding: 0.55rem 0.85rem; font-size: 0.85rem; color: #dc2626;">
                  Reject / Retest
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Renders Tab 2: Buyer inquiries and accompanied handovers
  function renderAgentInquiriesQueue() {
    const container = document.getElementById('agent-portal-inquiries-list');
    if (!container) return;

    let inquiries = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (stored) inquiries = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const badge = document.getElementById('badge-inquiries-count');
    if (badge) badge.textContent = inquiries.length;

    if (!inquiries.length) {
      container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No buyer inquiries in queue.</p>';
      return;
    }

    container.innerHTML = inquiries.map(inq => {
      return `
        <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <span style="font-weight: 700; color: #0f172a; font-size: 1.05rem;">${inq.refCode}</span>
              <span style="font-size: 0.85rem; color: #64748b; margin-left: 0.5rem;">${inq.itemTitle} (${inq.itemPrice})</span>
            </div>
            <span style="font-size: 0.82rem; font-weight: 600; padding: 0.25rem 0.65rem; border-radius: 9999px; background: #e0f2fe; color: #0369a1;">
              ${inq.status}
            </span>
          </div>

          <div style="background: #f8fafc; border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 0.85rem; font-size: 0.85rem;">
            <strong>Buyer Details:</strong> ${inq.clientName} • Phone: <a href="tel:${inq.clientPhone}" style="color: #2563eb;">${inq.clientPhone}</a> • Email: ${inq.clientEmail}<br>
            <strong>Requested Slot:</strong> ${inq.preferredDate} (${inq.preferredTime}) at <em>${inq.preferredHub}</em>
            ${inq.notes ? `<div style="margin-top: 0.25rem; color: #475569;">Note: "${inq.notes}"</div>` : ''}
          </div>

          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" onclick="UniMarketplace.updateInquiryByAgent('${inq.refCode}', 'Agent Confirmed')" style="padding: 0.45rem 0.85rem; font-size: 0.82rem;">
              ✓ Confirm Handover Slot
            </button>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.updateInquiryByAgent('${inq.refCode}', 'Completed')" style="padding: 0.45rem 0.85rem; font-size: 0.82rem;">
              Mark Handover Done
            </button>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.promptDealUpdate('${inq.refCode}')" style="padding: 0.45rem 0.85rem; font-size: 0.82rem;">
              Send Deal Update
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // AGENT ACTION: Verify & Approve -> Publishes the item to the public catalog
  function approveAndPublishSubmission(listingRef) {
    let pending = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      if (stored) pending = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const itemIndex = pending.findIndex(i => i.listingRef === listingRef);
    if (itemIndex === -1) return;

    const item = pending[itemIndex];

    // Remove from pending
    pending.splice(itemIndex, 1);
    localStorage.setItem(STORAGE_KEY_PENDING_SUBMISSIONS, JSON.stringify(pending));

    // Create public item (Stripped of confidential owner phone, email, and room number)
    const publicItem = {
      id: item.id,
      title: item.title,
      category: item.category,
      price: item.price,
      originalPrice: item.originalPrice,
      condition: item.condition,
      campus: item.campus,
      campusName: item.campusName,
      location: item.location,
      image: item.image,
      sellerType: 'Verified Student Listing',
      listingRef: item.listingRef,
      agentId: item.assignedAgentId,
      agentName: item.assignedAgentName,
      description: item.description,
      verifiedListing: true,
      postedAt: 'Just now'
    };

    // Add to approved public list
    try {
      const storedPub = localStorage.getItem(STORAGE_KEY_PUBLIC);
      const pubList = storedPub ? JSON.parse(storedPub) : [];
      pubList.unshift(publicItem);
      localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(pubList));
    } catch (e) {
      console.error(e);
    }

    renderAgentVettingQueue();
    initMarketplacePage();
    initHomepageMarketplace();

    showToast(`✓ Listing ${listingRef} verified and approved! It is now LIVE on the marketplace with the Agent Verified badge.`);
  }

  // AGENT ACTION: Schedule on-site hostel inspection visit
  function scheduleInspectionVisit(listingRef) {
    const slot = prompt(`Enter scheduled date & time for on-site inspection visit (e.g. Tomorrow at 3:00 PM):`);
    if (!slot || !slot.trim()) return;

    showToast(`Inspection visit scheduled for ${listingRef}: ${slot.trim()}. Seller notified via SMS/Email.`);
  }

  // AGENT ACTION: Reject submission
  function rejectSubmission(listingRef) {
    if (!confirm(`Are you sure you want to reject submission ${listingRef}? The seller will be notified to correct defects.`)) return;

    let pending = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      if (stored) pending = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    pending = pending.filter(i => i.listingRef !== listingRef);
    localStorage.setItem(STORAGE_KEY_PENDING_SUBMISSIONS, JSON.stringify(pending));

    renderAgentVettingQueue();
    showToast(`Submission ${listingRef} rejected and archived.`);
  }

  function updateInquiryByAgent(refCode, newStatus) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (!stored) return;
      let list = JSON.parse(stored);
      const target = list.find(i => i.refCode === refCode);
      if (target) {
        target.status = newStatus;
        if (newStatus === 'Agent Confirmed') {
          target.dealUpdate = `Agent confirmed: Handover scheduled for ${target.preferredDate} at ${target.preferredHub}. UniNest agent will supervise the inspection.`;
        } else if (newStatus === 'Completed') {
          target.dealUpdate = 'Handover successfully completed under agent supervision. Thank you for using UniNest.';
        }
        localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(list));
        renderAgentInquiriesQueue();
        showToast(`Inquiry ${refCode} updated to "${newStatus}"`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Renders Tab 3: Active listings assigned to this agent (with Agent Deletion Manager)
  function renderAgentListingsQueue(agent) {
    const container = document.getElementById('agent-portal-listings-list');
    if (!container) return;

    if (!agent) {
      agent = currentActiveAgent || getCurrentVerifiedAgent();
    }

    if (!agent) {
      container.innerHTML = `<p style="text-align: center; color: #dc2626; padding: 2rem;">Unauthorized. Please sign in as a verified agent.</p>`;
      return;
    }

    const allPublic = getAllItems();
    // Filter strictly to items assigned to THIS agent!
    const agentItems = allPublic.filter(item => isItemAssignedToAgent(item, agent));

    const badge = document.getElementById('badge-listings-count');
    if (badge) badge.textContent = agentItems.length;

    if (!agentItems.length) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1rem; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5e1;">
          <h4 style="color: #0f172a; margin-bottom: 0.25rem;">No Active Listings for Agent #${agent.id}</h4>
          <p style="color: #64748b; font-size: 0.88rem;">You currently have no approved items live under your agent portal (${agent.name}).</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; color: #166534;">
        🛡️ <strong>Agent Ownership Protection:</strong> You are viewing <strong>${agentItems.length} active listings</strong> assigned to your portal. Only you can delete or modify these items. Items assigned to other campus agents are strictly protected and cannot be deleted from your portal.
      </div>
      ${agentItems.map(item => `
        <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; justify-content: space-between; flex-wrap: wrap;">
          <div style="display: flex; gap: 1rem; align-items: center;">
            <img src="${item.image}" alt="${item.title}" style="width: 72px; height: 72px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1;">
            <div>
              <div style="font-size: 0.75rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">Ticket: ${item.listingRef || 'UN-MKT-' + item.id}</div>
              <h4 style="font-size: 1rem; color: #0f172a; margin: 0.15rem 0;">${item.title}</h4>
              <div style="font-weight: 700; color: #0f172a; font-size: 0.95rem;">${item.price} <span style="font-size: 0.8rem; color: #64748b; font-weight: normal;">• Campus: ${item.campus || 'General'}</span></div>
              <div style="font-size: 0.78rem; color: #16a34a; font-weight: 600; margin-top: 0.2rem;">✓ Supervised by: ${agent.name}</div>
            </div>
          </div>
          <div>
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.deleteAgentItem(${item.id}, '${item.listingRef || ''}')" style="background: #fee2e2; border-color: #fca5a5; color: #dc2626; font-size: 0.85rem; padding: 0.5rem 1rem; font-weight: 600; border-radius: 9999px; cursor: pointer;">
              🗑️ Delete Item
            </button>
          </div>
        </div>
      `).join('')}
    `;
  }

  // AGENT ACTION: Delete item (Only the assigned agent can delete this item)
  function deleteAgentItem(itemId, itemRef) {
    const currentAgent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!currentAgent) {
      alert('Unauthorized: Only verified agents can delete items.');
      return;
    }

    const allItems = getAllItems();
    const targetItem = allItems.find(i => i.id == itemId || (itemRef && i.listingRef === itemRef));

    if (!targetItem) {
      showToast('Item not found or already deleted.', 'error');
      return;
    }

    // STRICT VALIDATION: "he/she can only delete item on his portal only not an item for another agent"
    if (!isItemAssignedToAgent(targetItem, currentAgent)) {
      alert(`⚠️ Unauthorized Action:\n\nYou can only delete items assigned to your own portal (${currentAgent.name} - Agent #${currentAgent.id}).\n\nThis item is assigned to ${targetItem.agentName || 'another agent'} and cannot be deleted by you.`);
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete this listing from your portal?\n\n` +
      `Item: "${targetItem.title}"\n` +
      `Price: ${targetItem.price}\n` +
      `Ticket: ${targetItem.listingRef || 'N/A'}\n\n` +
      `This will permanently remove the item from the live student marketplace.`
    );

    if (!confirmed) return;

    // 1. Remove from localStorage STORAGE_KEY_PUBLIC
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PUBLIC);
      if (stored) {
        let pubList = JSON.parse(stored);
        pubList = pubList.filter(i => !(i.id == itemId || (itemRef && i.listingRef === itemRef)));
        localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(pubList));
      }
    } catch (e) {
      console.error(e);
    }

    // 2. Also remove from local fallback array in memory if present
    if (window.uniData && Array.isArray(window.uniData.marketplaceItems)) {
      window.uniData.marketplaceItems = window.uniData.marketplaceItems.filter(i => !(i.id == itemId || (itemRef && i.listingRef === itemRef)));
    }

    // 3. Re-render portal and public catalog
    renderAgentListingsQueue(currentAgent);
    initMarketplacePage();
    initHomepageMarketplace();

    showToast(`✓ Listing "${targetItem.title}" deleted successfully from your portal.`);
  }

  function promptDealUpdate(refCode) {
    const msg = prompt(`Enter deal update message for client (${refCode}) - Private seller contacts will remain hidden:`);
    if (!msg || !msg.trim()) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (!stored) return;
      let list = JSON.parse(stored);
      const target = list.find(i => i.refCode === refCode);
      if (target) {
        target.dealUpdate = msg.trim();
        localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(list));
        renderAgentInquiriesQueue();
        showToast(`Deal update dispatched for ${refCode}.`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  function resetFilters() {
    const searchInput = document.getElementById('market-search');
    const campusSelect = document.getElementById('market-campus');
    const conditionSelect = document.getElementById('market-condition');
    const sortSelect = document.getElementById('market-sort');
    const pillsContainer = document.getElementById('market-category-pills');

    if (searchInput) searchInput.value = '';
    if (campusSelect) campusSelect.value = 'All';
    if (conditionSelect) conditionSelect.value = 'All';
    if (sortSelect) sortSelect.value = 'featured';
    if (pillsContainer) {
      pillsContainer.querySelectorAll('.marketplace-pill').forEach((p, idx) => {
        p.classList.toggle('active', idx === 0);
      });
    }

    initMarketplacePage();
  }

  // Keyboard and modal closing
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeQuickView();
      closePostModal();
      closeInquiryModal();
      closeConfirmationModal();
      closeStatusTrackerModal();
      closeAgentPortal();
      closeAgentAccessDeniedModal();
    }
  });

  document.addEventListener('click', (e) => {
    if (e.target.classList && e.target.classList.contains('uni-modal-overlay')) {
      closeQuickView();
      closePostModal();
      closeInquiryModal();
      closeConfirmationModal();
      closeStatusTrackerModal();
      closeAgentPortal();
      closeAgentAccessDeniedModal();
    }
  });

  // Global namespace export
  window.UniMarketplace = {
    getAllItems,
    initHomepageMarketplace,
    initMarketplacePage,
    openQuickView,
    closeQuickView,
    openInquiryModal,
    closeInquiryModal,
    handleInquirySubmit,
    openConfirmationModal,
    closeConfirmationModal,
    openPostModal,
    closePostModal,
    handlePostItemSubmit,
    handleItemFilePreview,
    handleItemUrlPreview,
    openStatusTrackerModal,
    closeStatusTrackerModal,
    checkInquiryStatus,
    openAgentPortal,
    closeAgentPortal,
    closeAgentAccessDeniedModal,
    switchAgentAccount,
    switchAgentTab,
    renderAgentListingsQueue,
    deleteAgentItem,
    approveAndPublishSubmission,
    scheduleInspectionVisit,
    rejectSubmission,
    updateInquiryByAgent,
    promptDealUpdate,
    resetFilters,
    showToast
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHomepageMarketplace();
    if (document.getElementById('marketplace-grid')) {
      initMarketplacePage();
    }
  });
})();
