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
  const STORAGE_KEY_DELETED_REFS = 'uninest_deleted_marketplace_refs';
  const CLEAN_SLATE_VERSION = 'uninest_clean_slate_v4_20261124';
  const RESET_EPOCH_ID = 1795469500000;

  const SEED_SUBMISSION_IDS = new Set([991, 992, 1, 2, 3, 4, 5, 6, 7, 8, 8001, 9001]);
  const SEED_SUBMISSION_REFS = new Set(['UN-VET-7821', 'UN-VET-8430', 'UN-VET-8001', 'UN-MKT-101', 'UN-MKT-102', 'UN-MKT-103', 'UN-MKT-104', 'UN-MKT-105', 'UN-MKT-106', 'UN-MKT-107', 'UN-MKT-108']);
  const SEED_INQUIRY_REFS = new Set(['UN-INQ-40812', 'UN-INQ-51920']);

  // Ensure any legacy seeded placeholder items/submissions/inquiries are purged
  function initDefaultSubmissions() {
    try {
      if (localStorage.getItem('uninest_storage_version') !== CLEAN_SLATE_VERSION) {
        localStorage.removeItem(STORAGE_KEY_PUBLIC);
        localStorage.removeItem('uninest_public_marketplace_items');
        localStorage.removeItem(STORAGE_KEY_PENDING_SUBMISSIONS);
        localStorage.removeItem('uninest_sold_items');
        localStorage.removeItem(STORAGE_KEY_INQUIRIES);
        localStorage.removeItem(STORAGE_KEY_DELETED_REFS);
        document.cookie = 'uninest_posted_houses_meta=; path=/; max-age=0; SameSite=Lax';
        document.cookie = 'uninest_sold_houses_archive=; path=/; max-age=0; SameSite=Lax';
        localStorage.setItem('uninest_storage_version', CLEAN_SLATE_VERSION);
      }

      const rawPending = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      if (rawPending) {
        const parsed = JSON.parse(rawPending);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(item => item && Number(item.id) >= RESET_EPOCH_ID && !SEED_SUBMISSION_IDS.has(Number(item.id)) && !SEED_SUBMISSION_REFS.has(item.listingRef));
          localStorage.setItem(STORAGE_KEY_PENDING_SUBMISSIONS, JSON.stringify(cleaned));
        }
      }
      const rawPublic = localStorage.getItem(STORAGE_KEY_PUBLIC);
      if (rawPublic) {
        const parsedPub = JSON.parse(rawPublic);
        if (Array.isArray(parsedPub)) {
          const cleanedPub = parsedPub.filter(item => item && Number(item.id) >= RESET_EPOCH_ID && !SEED_SUBMISSION_IDS.has(Number(item.id)) && !SEED_SUBMISSION_REFS.has(item.listingRef));
          localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(cleanedPub));
        }
      }
    } catch (e) {
      console.warn('Submissions cleanup notice:', e);
    }
  }

  function initDefaultInquiries() {
    try {
      const rawInquiries = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (rawInquiries) {
        const parsed = JSON.parse(rawInquiries);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(inq => !SEED_INQUIRY_REFS.has(inq.refCode));
          localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.warn('Inquiry cleanup notice:', e);
    }
  }

  initDefaultSubmissions();
  initDefaultInquiries();

  let serverMarketplaceItems = [];
  let isFetchingServerItems = false;

  function getDeletedRefsSet() {
    const deleted = new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DELETED_REFS);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) arr.forEach(function(r) { deleted.add(String(r)); });
      }
    } catch (e) {}
    return deleted;
  }

  function recordDeletedRef(itemId, itemRef) {
    try {
      const set = getDeletedRefsSet();
      if (itemId != null) set.add(String(itemId));
      if (itemRef) set.add(String(itemRef));
      localStorage.setItem(STORAGE_KEY_DELETED_REFS, JSON.stringify(Array.from(set)));
    } catch (e) {}
  }

  function syncMarketplaceFromServer(callback) {
    if (isFetchingServerItems) return;
    isFetchingServerItems = true;
    fetch('/api/marketplace', { cache: 'no-store' })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        isFetchingServerItems = false;
        if (data && Array.isArray(data.items)) {
          const deletedRefs = getDeletedRefsSet();
          let localStored = [];
          try {
            const rawLocal = localStorage.getItem(STORAGE_KEY_PUBLIC);
            if (rawLocal) {
              const parsed = JSON.parse(rawLocal);
              if (Array.isArray(parsed)) localStored = parsed;
            }
          } catch (e) {}

          const seen = new Set();
          const merged = [];
          for (const item of [...data.items, ...localStored]) {
            if (!item || Number(item.id) < RESET_EPOCH_ID) continue;
            const refKey = String(item.listingRef || item.id);
            if (seen.has(refKey)) continue;
            if (deletedRefs.has(String(item.id)) || (item.listingRef && deletedRefs.has(String(item.listingRef)))) continue;
            seen.add(refKey);
            merged.push(item);
          }

          serverMarketplaceItems = merged;
          try {
            localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(merged));
          } catch(e) {}
          if (typeof callback === 'function') callback(merged);
          if (typeof window.__uninestReRenderMarketplace === 'function') {
            window.__uninestReRenderMarketplace();
          }
          initHomepageMarketplace();
        }
      })
      .catch(function(e) {
        isFetchingServerItems = false;
        console.warn('Could not sync marketplace from cloud:', e);
      });
  }

  // Auto-sync on script load
  syncMarketplaceFromServer();

  // Retrieve public catalog items (Private contact information strictly excluded)
  function getAllItems() {
    const soldRefs = getDeletedRefsSet();
    try {
      const rawSold = localStorage.getItem('uninest_sold_items');
      if (rawSold) {
        const soldArr = JSON.parse(rawSold);
        if (Array.isArray(soldArr)) {
          soldArr.forEach(function(s) {
            if (s.listingRef) soldRefs.add(String(s.listingRef));
            if (s.id) soldRefs.add(String(s.id));
          });
        }
      }
    } catch (e) {}

    function isItemSold(item) {
      if (!item) return true;
      if (Number(item.id) < RESET_EPOCH_ID) return true;
      if (item.status && item.status.toLowerCase() !== 'live') return true;
      const ref = item.listingRef ? String(item.listingRef) : null;
      const idStr = item.id != null ? String(item.id) : null;
      if (ref && soldRefs.has(ref)) return true;
      if (idStr && soldRefs.has(idStr)) return true;
      return false;
    }

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

    const seen = new Set();
    const result = [];
    const combinedSources = [...(serverMarketplaceItems || []), ...(localApproved || []), ...(baseItems || [])];
    for (const item of combinedSources) {
      if (isItemSold(item)) continue;
      const key = item.listingRef || item.id;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
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
        agentId: item.agentId || item.assignedAgentId || 1,
        agentName: item.agentName || item.assignedAgentName || 'UniNest Verified Campus Agent',
        description: item.description,
        verifiedListing: true,
        postedAt: item.postedAt || 'Recently'
      });
    }
    return result;
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
        window.__uninestReRenderMarketplace = renderFiltered;
    renderFiltered();
    syncMarketplaceFromServer(function() {
      renderFiltered();
    });
      });
    }

    window.__uninestReRenderMarketplace = renderFiltered;
    renderFiltered();
    syncMarketplaceFromServer(function() {
      renderFiltered();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const inspectId = urlParams.get('inspect');
    if (inspectId) {
      setTimeout(() => openInquiryModal(inspectId), 300);
    } else if (window.location.hash === '#sell' || urlParams.get('action') === 'sell') {
      setTimeout(openPostModal, 300);
    } else if (window.location.hash === '#agent-portal' || urlParams.get('portal') === 'agent') {
      setTimeout(openAgentPortal, 300);
    } else if (
      window.location.hash.startsWith('#track') ||
      urlParams.get('track') === 'deal' ||
      urlParams.get('ref')
    ) {
      const refParam =
        urlParams.get('ref') ||
        (window.location.hash.includes('ref=')
          ? window.location.hash.split('ref=')[1]
          : '');
      setTimeout(() => openStatusTrackerModal(refParam), 300);
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
    if (!window.UniAuth) {
      alert('Authentication initializing. Please try again.');
      return;
    }
    window.UniAuth.requireAuth(() => {
      _doOpenInquiryModal(itemId);
    }, { reason: 'Sign in to request an inspection and contact the authorized agent.' });
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
      const user = window.UniAuth ? window.UniAuth.getUser() : null;
      if (user) {
        const nameInput = document.getElementById('inq-client-name');
        const emailInput = document.getElementById('inq-client-email');
        if (nameInput && user.name) nameInput.value = user.name;
        if (emailInput && user.email) emailInput.value = user.email;
      }
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
    if (!window.UniAuth || !window.UniAuth.isAuthenticated()) {
      if (window.UniAuth) {
        window.UniAuth.requireAuth(() => {
          handleInquirySubmit(event);
        }, { reason: 'Please sign in before submitting an inspection request.' });
      }
      return;
    }
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
      listingRef: item ? (item.listingRef || `UN-MKT-${item.id}`) : '',
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
      agentId: item ? (item.agentId || item.assignedAgentId) : null,
      agentName: item ? (item.agentName || 'Authorized UniNest Agent') : 'Authorized UniNest Agent',
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

    // Persist to central cloud database across all devices
    fetch('/api/marketplace/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInquiry),
    }).catch(function(e) {
      console.warn('Inquiry cloud post notice:', e);
    });

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
    if (!window.UniAuth) {
      alert('Authentication initializing. Please try again.');
      return;
    }
    window.UniAuth.requireAuth(() => {
      _doOpenPostModal();
    }, { reason: 'Sign in to list items on the student marketplace.' });
  }

  function _doOpenPostModal() {
    const modal = document.getElementById('post-item-modal');
    if (modal) {
      const user = window.UniAuth ? window.UniAuth.getUser() : null;
      if (user) {
        const emailInput = document.getElementById('owner-email') || document.getElementById('post-owner-email');
        const nameInput = document.getElementById('owner-name');
        if (emailInput && !emailInput.value && user.email) emailInput.value = user.email;
        if (nameInput && !nameInput.value && user.name) nameInput.value = user.name;
      }
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
  }

  let uploadedItemImageDataUrl = '';

  function compressImageDataUrl(rawDataUrl, callback) {
    if (!rawDataUrl || typeof rawDataUrl !== 'string') {
      callback('');
      return;
    }
    const img = new Image();
    img.onload = function() {
      try {
        const maxDim = 900;
        let width = img.width || 800;
        let height = img.height || 600;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.8);
          callback(compressed || rawDataUrl);
          return;
        }
      } catch (err) {
        console.warn('Image compression fallback:', err);
      }
      callback(rawDataUrl);
    };
    img.onerror = function() {
      callback(rawDataUrl);
    };
    img.src = rawDataUrl;
  }

  function handleItemFilePreview(input) {
    if (input && input.files && input.files[0]) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = function(e) {
        const rawResult = e.target.result;
        compressImageDataUrl(rawResult, function(compressedUrl) {
          uploadedItemImageDataUrl = compressedUrl || rawResult;
          const box = document.getElementById('item-preview-box');
          const img = document.getElementById('item-preview-img');
          const lbl = document.getElementById('item-preview-label');
          if (box && img) {
            img.src = uploadedItemImageDataUrl;
            if (lbl) lbl.textContent = 'Uploaded: ' + file.name;
            box.style.display = 'flex';
          }
        });
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
      const status = document.getElementById('post-item-status');
      if (status) {
        status.textContent = '';
        status.style.display = 'none';
      }
    }
  }

  // When a seller posts an item:
  // It is SAVED to PENDING SUBMISSIONS for AGENT VETTING.
  // It does NOT appear on the public marketplace until the agent approves it!
  function handlePostItemSubmit(event) {
    event.preventDefault();
    if (!window.UniAuth || !window.UniAuth.isAuthenticated()) {
      if (window.UniAuth) {
        window.UniAuth.requireAuth(() => {
          handlePostItemSubmit(event);
        }, { reason: 'Please sign in before submitting a listing.' });
      }
      return;
    }
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const status = document.getElementById('post-item-status');
    const setSubmissionStatus = function(message, isError) {
      if (status) {
        status.textContent = message;
        status.style.color = isError ? '#b91c1c' : '#b45309';
        status.style.display = 'block';
      }
    };

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Submitting...';
    }

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
      'KU': { id: 1, name: 'George Scourser' },
      'JKUAT': { id: 2, name: 'Odero Carilus' },
      'UoN': { id: 1, name: 'George Scourser' },
      'Strathmore': { id: 2, name: 'Odero Carilus' },
      'USIU': { id: 1, name: 'George Scourser' },
      'Daystar': { id: 2, name: 'Odero Carilus' },
      'MKU': { id: 2, name: 'Odero Carilus' },
      'Moi': { id: 1, name: 'George Scourser' },
      'Egerton': { id: 2, name: 'Odero Carilus' }
    };
    const assignedAgent = campusAgents[campus] || { id: 1, name: 'George Scourser' };

    const activeUser = window.UniAuth ? window.UniAuth.getUser() : null;
    const isPosterAgent =
      !!getCurrentVerifiedAgent() ||
      (ownerEmail &&
        ['georgescourser@gmail.com', 'oderocarilus@gmail.com'].includes(
          ownerEmail.trim().toLowerCase()
        ));
    const initialStatus = isPosterAgent ? 'Live' : 'Pending Agent Verification';

    // Intake submission record (automatically Live when posted by a verified agent)
    const pendingSubmission = {
      id: itemId,
      listingRef: isPosterAgent ? `UN-MKT-${Math.floor(1000 + Math.random() * 9000)}` : listingRef,
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
      ownerEmail: ownerEmail || (activeUser && activeUser.email) || '',
      ownerPrivateAddress,
      assignedAgentId: assignedAgent.id,
      assignedAgentName: assignedAgent.name,
      submittedAt: new Date().toISOString(),
      status: initialStatus,
      verifiedListing: isPosterAgent
    };

    // Persist to central cloud database across all devices
    fetch('/api/marketplace', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-uninest-agent-email': (activeUser && activeUser.email) || ownerEmail || '',
      },
      body: JSON.stringify(pendingSubmission),
    })
      .then(function(res) {
        return res.json().then(function(data) {
          if (!res.ok || !data || !data.success || !data.item) {
            throw new Error((data && data.error) || 'The listing could not be submitted.');
          }
          return data;
        });
      })
      .then(function(cloudRes) {
        const savedItem = cloudRes.item;
        const isLiveNow = savedItem.status === 'Live';

        if (isLiveNow) {
          serverMarketplaceItems = [
            savedItem,
            ...(serverMarketplaceItems || []).filter(i => i.listingRef !== savedItem.listingRef && i.id != savedItem.id)
          ];
          try {
            const storedPub = localStorage.getItem(STORAGE_KEY_PUBLIC);
            const pubList = storedPub ? JSON.parse(storedPub) : [];
            const filteredPub = pubList.filter(i => i.listingRef !== savedItem.listingRef && i.id != savedItem.id);
            filteredPub.unshift(savedItem);
            localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(filteredPub));
          } catch (storageError) {
            console.error('Error saving public item locally:', storageError);
          }
        } else {
          try {
            const stored = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
            const list = stored ? JSON.parse(stored) : [];
            list.unshift(savedItem);
            localStorage.setItem(STORAGE_KEY_PENDING_SUBMISSIONS, JSON.stringify(list));
          } catch (storageError) {
            console.error('Error saving pending submission locally:', storageError);
          }
        }

        syncMarketplaceFromServer();
        initMarketplacePage();
        initHomepageMarketplace();
        form.reset();
        closePostModal();

        if (isLiveNow) {
          showToast(`✓ Item "${savedItem.title}" (${savedItem.listingRef}) is now LIVE on the marketplace across all accounts!`);
        } else {
          alert(
            `✓ Item Submitted to Agent Verification Queue!\n\n` +
            `Verification Ticket: ${cloudRes.listingRef || listingRef}\n` +
            `Assigned Agent: ${assignedAgent.name}\n` +
            `Verification Method: ${verificationMethod}\n\n` +
            `Your item is currently pending verification. Your assigned agent will contact you to conduct the physical inspection before publishing it live on the marketplace. Your contact details remain confidential.`
          );
        }
      })
      .catch(function(err) {
        console.error('Marketplace submission failed:', err);
        setSubmissionStatus(err.message || 'The listing could not be submitted. Please try again.', true);
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = 'Submit Listing to Agent';
        }
      });
  }

  // =========================================================================
  // Status Tracker (Clients check status without exposing private contacts)
  // =========================================================================

  function openStatusTrackerModal(prefillRef) {
    if (!window.UniAuth) {
      alert('Authentication initializing. Please try again.');
      return;
    }
    window.UniAuth.requireAuth(() => {
      const modal = document.getElementById('status-tracker-modal');
      if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Automatically load this client's active deals from cloud & local storage
        renderClientActiveDeals();

        if (prefillRef) {
          const refInput = document.getElementById('tracker-ref-input');
          if (refInput) {
            refInput.value = prefillRef.trim().toUpperCase();
            checkInquiryStatus(null, prefillRef);
          }
        }
      }
    }, { reason: 'Sign in to track your inquiry and deal status.' });
  }

  function closeStatusTrackerModal() {
    const modal = document.getElementById('status-tracker-modal');
    if (modal) {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
  }

  // Renders the signed-in client's active deals stream
  function renderClientActiveDeals() {
    const container = document.getElementById('client-active-deals-container');
    if (!container) return;

    const user = window.UniAuth ? window.UniAuth.getUser() : null;
    const clientEmail = (user && user.email) ? user.email.trim().toLowerCase() : '';

    container.innerHTML = `
      <div style="text-align: center; padding: 1.25rem; color: #64748b; font-size: 0.85rem; background: #f8fafc; border-radius: 10px; border: 1px dashed #cbd5e1;">
        <span>🔄 Loading your live deals and inquiries...</span>
      </div>
    `;

    // Fetch from central cloud database and merge with local storage
    const fetchCloud = clientEmail 
      ? fetch('/api/marketplace/inquiries?clientEmail=' + encodeURIComponent(clientEmail)).then(r => r.ok ? r.json() : null).catch(() => null)
      : Promise.resolve(null);

    fetchCloud.then(data => {
      let cloudInquiries = (data && Array.isArray(data.inquiries)) ? data.inquiries : [];

      let localInquiries = [];
      try {
        const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) localInquiries = parsed;
        }
      } catch (e) {}

      // Combine by refCode (cloud takes precedence or updates local)
      const seen = new Set();
      const combined = [];

      for (const inq of cloudInquiries) {
        const ref = (inq.refCode || '').trim().toUpperCase();
        if (!ref || seen.has(ref)) continue;
        seen.add(ref);
        combined.push(inq);
      }

      for (const inq of localInquiries) {
        const ref = (inq.refCode || '').trim().toUpperCase();
        if (!ref || seen.has(ref)) continue;
        if (!clientEmail || (inq.clientEmail && inq.clientEmail.toLowerCase() === clientEmail) || inq.clientName) {
          seen.add(ref);
          combined.push(inq);
        }
      }

      if (!combined.length) {
        container.innerHTML = `
          <div style="background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 12px; padding: 1.5rem; text-align: center; margin-bottom: 1rem;">
            <div style="font-size: 1.75rem; margin-bottom: 0.35rem;">🤝</div>
            <h4 style="color: #1e293b; margin: 0 0 0.25rem 0; font-size: 1rem;">No Active Deals Yet</h4>
            <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 1rem 0;">
              When you request an item handover or book a house viewing, your supervised deal will appear here automatically with live progress updates.
            </p>
            <div style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
              <a href="/marketplace.html" class="btn btn-secondary" style="font-size: 0.82rem; padding: 0.4rem 0.85rem;">Browse Marketplace</a>
              <a href="/search" class="btn btn-primary" style="font-size: 0.82rem; padding: 0.4rem 0.85rem;">Browse Houses</a>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h4 style="margin: 0; font-size: 1rem; color: #0f172a; font-weight: 700;">
              Your Active Deals (${combined.length})
            </h4>
            <span style="font-size: 0.78rem; color: #16a34a; font-weight: 600;">✓ Live Agent Sync</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; max-height: 260px; overflow-y: auto; padding-right: 4px;">
            ${combined.map(inq => {
              const isDone = (inq.status || '').toLowerCase() === 'completed';
              const isConfirmed = isDone || (inq.status || '').toLowerCase().includes('confirmed');
              const badgeStyle = isDone 
                ? 'background: #dcfce7; color: #15803d; border: 1px solid #86efac;'
                : isConfirmed
                ? 'background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd;'
                : 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;';

              return `
                <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 0.85rem 1rem; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem; gap: 0.5rem; flex-wrap: wrap;">
                    <div>
                      <span style="font-family: monospace; font-size: 0.78rem; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 0.15rem 0.45rem; border-radius: 4px;">
                        ${inq.refCode}
                      </span>
                      <strong style="font-size: 0.95rem; color: #0f172a; margin-left: 0.4rem;">${inq.itemTitle}</strong>
                    </div>
                    <span style="font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 9999px; ${badgeStyle}">
                      ${inq.status || 'Pending Review'}
                    </span>
                  </div>
                  <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 0.35rem;">
                    <strong>Supervising Agent:</strong> ${inq.agentName || 'Verified UniNest Agent'} • <strong>Slot:</strong> ${inq.preferredDate || 'Flexible'} (${inq.preferredTime || 'Daytime'})
                  </div>
                  <div style="background: #f8fafc; border-left: 3px solid #2563eb; padding: 0.45rem 0.7rem; border-radius: 0 6px 6px 0; font-size: 0.8rem; color: #1e293b; margin-bottom: 0.45rem;">
                    ${inq.dealUpdate || 'Request logged. Waiting for agent confirmation.'}
                  </div>
                  <button type="button" class="btn btn-secondary" onclick="UniMarketplace.checkInquiryStatus(null, '${inq.refCode}')" style="font-size: 0.78rem; padding: 0.35rem 0.75rem; width: 100%; justify-content: center;">
                    View Detailed Progress Timeline &rarr;
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });
  }

  function renderDealTimelineCard(item) {
    const status = item.status || 'Pending Agent Review';
    const isDone = status.toLowerCase() === 'completed';
    const isConfirmed = isDone || status.toLowerCase().includes('confirmed') || status.toLowerCase().includes('visit');

    const badgeBg = isDone ? '#dcfce7' : isConfirmed ? '#dbeafe' : '#fef3c7';
    const badgeColor = isDone ? '#15803d' : isConfirmed ? '#1d4ed8' : '#b45309';
    const badgeBorder = isDone ? '#86efac' : isConfirmed ? '#93c5fd' : '#fde68a';

    const step1Done = true;
    const step2Done = isConfirmed;
    const step3Done = isDone;

    return `
      <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 14px; padding: 1.5rem; box-shadow: 0 4px 14px rgba(0,0,0,0.05);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.25rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="font-size: 0.72rem; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px;">Deal Reference Code</div>
            <strong style="font-size: 1.25rem; color: #0f172a; font-family: monospace;">${item.refCode || item.listingRef}</strong>
          </div>
          <span style="background: ${badgeBg}; color: ${badgeColor}; font-size: 0.82rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 9999px; border: 1px solid ${badgeBorder};">
            ${status}
          </span>
        </div>

        <!-- Visual Progress Stepper -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin: 1.25rem 0; position: relative; padding: 0 0.5rem;">
          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; z-index: 1;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #16a34a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">✓</div>
            <span style="font-size: 0.72rem; font-weight: 600; color: #16a34a; margin-top: 0.35rem;">Request Registered</span>
          </div>
          <div style="flex: 1; height: 3px; background: ${step2Done ? '#16a34a' : '#e2e8f0'}; margin-top: -16px;"></div>
          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; z-index: 1;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${step2Done ? '#16a34a' : '#e2e8f0'}; color: ${step2Done ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
              ${step2Done ? '✓' : '2'}
            </div>
            <span style="font-size: 0.72rem; font-weight: 600; color: ${step2Done ? '#16a34a' : '#64748b'}; margin-top: 0.35rem;">Agent Coordinated</span>
          </div>
          <div style="flex: 1; height: 3px; background: ${step3Done ? '#16a34a' : '#e2e8f0'}; margin-top: -16px;"></div>
          <div style="display: flex; flex-direction: column; align-items: center; text-align: center; flex: 1; z-index: 1;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${step3Done ? '#16a34a' : '#e2e8f0'}; color: ${step3Done ? '#fff' : '#64748b'}; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
              ${step3Done ? '✓' : '3'}
            </div>
            <span style="font-size: 0.72rem; font-weight: 600; color: ${step3Done ? '#16a34a' : '#64748b'}; margin-top: 0.35rem;">Handover Done</span>
          </div>
        </div>

        <!-- Deal Attributes -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 1rem; margin-bottom: 1rem; font-size: 0.88rem;">
          <div style="margin-bottom: 0.45rem;">
            <strong>Deal Target:</strong> ${item.itemTitle || item.title || 'Marketplace Item'} ${item.itemPrice || item.price ? `(${item.itemPrice || item.price})` : ''}
          </div>
          <div style="margin-bottom: 0.45rem;">
            <strong>Supervising Agent:</strong> <span style="color: #2563eb; font-weight: 600;">${item.agentName || item.assignedAgentName || 'Authorized UniNest Campus Agent'}</span>
          </div>
          <div style="margin-bottom: 0.45rem;">
            <strong>Scheduled Slot:</strong> ${item.preferredDate || 'Flexible Window'} • ${item.preferredTime || 'Daytime'}
          </div>
          <div>
            <strong>Handover Point:</strong> ${item.preferredHub || item.location || 'Accompanied Campus Hub'}
          </div>
        </div>

        <!-- Agent Deal Update -->
        <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 0.85rem 1rem; border-radius: 0 8px 8px 0; font-size: 0.88rem; color: #1e3a8a;">
          <div style="font-weight: 700; margin-bottom: 0.25rem;">📢 Live Agent Deal Update:</div>
          <div>${item.dealUpdate || 'Your inquiry is logged in the system. The supervising agent will accompany your inspection and verify all items before handover.'}</div>
        </div>
      </div>
    `;
  }

  function checkInquiryStatus(event, queryOverride) {
    if (event) event.preventDefault();
    if (!window.UniAuth || !window.UniAuth.isAuthenticated()) {
      if (window.UniAuth) {
        window.UniAuth.requireAuth(() => {
          checkInquiryStatus(null, queryOverride);
        }, { reason: 'Please sign in to track your inquiry or verification ticket status.' });
      }
      return;
    }
    const refInput = document.getElementById('tracker-ref-input');
    const resultBox = document.getElementById('tracker-result-box');
    if (!resultBox) return;

    const query = (queryOverride || (refInput ? refInput.value : '')).trim().toUpperCase();
    if (!query) return;

    if (refInput && !refInput.value) {
      refInput.value = query;
    }

    resultBox.style.display = 'block';
    resultBox.innerHTML = `
      <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 1.5rem; text-align: center; color: #2563eb;">
        <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍</div>
        <div style="font-weight: 600; font-size: 0.95rem; color: #0f172a;">Connecting to Agent Network...</div>
        <div style="font-size: 0.82rem; color: #64748b; margin-top: 0.25rem;">Looking up real-time deal status for <code>${query}</code></div>
      </div>
    `;

    // 1. Check local storage first for instant display
    let localInq = null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          localInq = list.find(i => (i.refCode || '').trim().toUpperCase() === query);
        }
      }
    } catch (e) {}

    // Check pending seller submissions in local storage
    let localSub = null;
    try {
      const storedSub = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      if (storedSub) {
        const list = JSON.parse(storedSub);
        if (Array.isArray(list)) {
          localSub = list.find(s => (s.listingRef || '').trim().toUpperCase() === query);
        }
      }
    } catch (e) {}

    if (localInq) {
      resultBox.innerHTML = renderDealTimelineCard(localInq);
    } else if (localSub) {
      resultBox.innerHTML = `
        <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div>
              <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Verification Ticket</div>
              <strong style="font-size: 1.15rem; color: #0f172a;">${localSub.listingRef}</strong>
            </div>
            <span style="background: #fef3c7; color: #b45309; font-size: 0.82rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 9999px;">
              ${localSub.status}
            </span>
          </div>
          <div style="font-size: 0.92rem; color: #334155; margin-bottom: 0.5rem;">
            <strong>Item:</strong> ${localSub.title} (${localSub.price})
          </div>
          <div style="font-size: 0.88rem; color: #64748b; margin-bottom: 0.5rem;">
            <strong>Assigned Agent:</strong> ${localSub.assignedAgentName || 'Verified UniNest Agent'}
          </div>
          <div style="font-size: 0.88rem; color: #64748b; margin-bottom: 1rem;">
            <strong>Verification Protocol:</strong> ${localSub.verificationMethod || 'Hostel Physical Verification'}
          </div>
          <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 0.85rem 1rem; border-radius: 0 8px 8px 0; font-size: 0.88rem; color: #1e3a8a;">
            💡 <strong>Next Step:</strong> Your agent is preparing physical inspection. Once verified, this item goes live with the "Agent Verified ✓" badge.
          </div>
        </div>
      `;
    }

    // 2. Query central cloud store API for live cloud-synced status across all devices
    fetch('/api/marketplace/inquiries?ref=' + encodeURIComponent(query))
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && data.inquiry) {
          resultBox.innerHTML = renderDealTimelineCard(data.inquiry);
          resultBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else if (!localInq && !localSub) {
          // Check marketplace items API in case it's a seller ticket code
          fetch('/api/marketplace?scope=agent')
            .then(mr => mr.ok ? mr.json() : null)
            .then(mData => {
              const matchedItem = (mData && Array.isArray(mData.items)) 
                ? mData.items.find(i => (i.listingRef || '').trim().toUpperCase() === query)
                : null;

              if (matchedItem) {
                resultBox.innerHTML = `
                  <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 1.5rem; box-shadow: var(--shadow-sm);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                      <div>
                        <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">Marketplace Listing Ticket</div>
                        <strong style="font-size: 1.15rem; color: #0f172a;">${matchedItem.listingRef}</strong>
                      </div>
                      <span style="background: ${matchedItem.status === 'Sold' ? '#fee2e2' : '#dcfce7'}; color: ${matchedItem.status === 'Sold' ? '#991b1b' : '#15803d'}; font-size: 0.82rem; font-weight: 700; padding: 0.35rem 0.85rem; border-radius: 9999px;">
                        ${matchedItem.status || 'Live'}
                      </span>
                    </div>
                    <div style="font-size: 0.92rem; color: #334155; margin-bottom: 0.5rem;">
                      <strong>Item:</strong> ${matchedItem.title} (${matchedItem.price})
                    </div>
                    <div style="font-size: 0.88rem; color: #64748b; margin-bottom: 0.5rem;">
                      <strong>Supervising Agent:</strong> ${matchedItem.assignedAgentName || 'Verified UniNest Agent'}
                    </div>
                    <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 0.85rem 1rem; border-radius: 0 8px 8px 0; font-size: 0.88rem; color: #1e3a8a;">
                      ${matchedItem.status === 'Sold' ? 'This item has been successfully sold under agent supervision and archived.' : 'This listing is active and verified by an authorized UniNest agent.'}
                    </div>
                  </div>
                `;
              } else {
                resultBox.innerHTML = `
                  <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 1.25rem; border-radius: 10px; color: #991b1b; font-size: 0.88rem;">
                    <strong>No record found matching <code>${query}</code></strong>
                    <p style="margin: 0.35rem 0 0 0; color: #7f1d1d; font-size: 0.82rem;">
                      Please check that your reference code was typed correctly (e.g. UN-INQ-40812 or UN-PROP-20194). If you recently submitted your inquiry while signed in, check your Active Deals list above.
                    </p>
                  </div>
                `;
              }
            })
            .catch(() => {
              resultBox.innerHTML = `
                <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 1.25rem; border-radius: 10px; color: #991b1b; font-size: 0.88rem;">
                  No record found matching <code>${query}</code>. Please check your reference code.
                </div>
              `;
            });
        }
      })
      .catch(err => {
        console.warn('Live track error:', err);
      });
  }

  // =========================================================================
  // Verified Campus Agents Known by the System (Strictly Verified Emails Only)
  // =========================================================================
  const KNOWN_AGENTS = [
    { id: 1, name: 'George Scourser', email: 'georgescourser@gmail.com', campus: 'KU / All Campuses', phone: '254742122668', isLead: true },
    { id: 2, name: 'Odero Carilus', email: 'oderocarilus@gmail.com', campus: 'JKUAT / All Campuses', phone: '254116280954', isLead: true }
  ];

  let currentActiveAgent = null;

  function getVerifiedAgent(user) {
    if (!user || !user.email) return null;
    const cleanEmail = user.email.trim().toLowerCase();

    // Strictly allow ONLY the verified agent emails in KNOWN_AGENTS
    const direct = KNOWN_AGENTS.find(a => a.email.toLowerCase() === cleanEmail);
    return direct || null;
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

  function fetchAgentPendingSubmissions(agent, callback) {
    const currentAgent = agent || currentActiveAgent || getCurrentVerifiedAgent();
    const agentEmail = (currentAgent && currentAgent.email) || '';
    fetch('/api/marketplace?scope=agent', {
      headers: {
        'x-uninest-agent-email': agentEmail,
      },
    })
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        if (data && Array.isArray(data.items)) {
          const pending = data.items.filter(function(i) {
            return i.status === 'Pending Agent Verification';
          });
          try {
            localStorage.setItem(STORAGE_KEY_PENDING_SUBMISSIONS, JSON.stringify(pending));
          } catch(e) {}
          if (typeof callback === 'function') callback(pending);
          renderAgentVettingQueue(agent);
        }
      })
      .catch(function(e) {
        console.warn('Agent queue cloud fetch notice:', e);
      });
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

    // Sync submissions and buyer inquiries from cloud across all devices
    fetchAgentPendingSubmissions(currentActiveAgent);
    fetchAgentInquiries(currentActiveAgent);
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

  function formatPhoneForWhatsApp(phone) {
    if (!phone) return '';
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1);
    } else if (clean.startsWith('7') || clean.startsWith('1')) {
      clean = '254' + clean;
    }
    return clean;
  }

  function fetchAgentInquiries(agent, callback) {
    fetch('/api/marketplace/inquiries')
      .then(function(res) { return res.ok ? res.json() : null; })
      .then(function(data) {
        if (data && Array.isArray(data.inquiries)) {
          try {
            const rawStored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
            const localList = rawStored ? JSON.parse(rawStored) : [];
            const seen = new Set();
            const merged = [];

            // Cloud inquiries take precedence
            for (const inq of data.inquiries) {
              const k = (inq.refCode || '').toUpperCase();
              if (seen.has(k)) continue;
              seen.add(k);
              merged.push(inq);
            }

            for (const inq of localList) {
              const k = (inq.refCode || '').toUpperCase();
              if (seen.has(k)) continue;
              seen.add(k);
              merged.push(inq);
            }

            localStorage.setItem(STORAGE_KEY_INQUIRIES, JSON.stringify(merged));
          } catch (e) {}

          const currentAgent = agent || currentActiveAgent || getCurrentVerifiedAgent();
          if (currentAgentTab === 'inquiries') {
            renderAgentInquiriesQueue(currentAgent);
          } else if (currentAgentTab === 'listings') {
            renderAgentListingsQueue(currentAgent);
          }

          if (typeof callback === 'function') callback();
        }
      })
      .catch(function(err) {
        console.warn('Could not sync inquiries from cloud:', err);
        if (typeof callback === 'function') callback();
      });
  }

  let activeListingInquiryFilter = 'all';

  function filterInquiriesByListing(listingId) {
    activeListingInquiryFilter = listingId;
    renderAgentInquiriesQueue(currentActiveAgent, listingId);
  }

  // Renders Tab 2: Buyer inquiries and accompanied handovers (with integrated assigned listings)
  function renderAgentInquiriesQueue(agent, filterListingId) {
    const container = document.getElementById('agent-portal-inquiries-list');
    if (!container) return;

    if (!agent) agent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!agent) {
      container.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Unauthorized. Please sign in as a verified agent.</p>';
      return;
    }

    if (filterListingId !== undefined) {
      activeListingInquiryFilter = filterListingId;
    }

    let allInquiries = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (stored) allInquiries = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const allPublic = getAllItems();
    const agentListings = allPublic.filter(item => isItemAssignedToAgent(item, agent));

    // Inquiries that belong to this agent's assigned listings or explicitly assigned to this agent
    const relevantInquiries = allInquiries.filter(inq => {
      // 1. Direct match with agent's assigned items
      const matchesAgentItem = agentListings.some(item => 
        (inq.itemId && (item.id == inq.itemId)) ||
        (inq.listingRef && item.listingRef === inq.listingRef) ||
        (inq.itemTitle && item.title && inq.itemTitle.toLowerCase() === item.title.toLowerCase())
      );
      if (matchesAgentItem) return true;

      // 2. Direct agent name / id match
      if (inq.agentId && (inq.agentId === agent.id || inq.agentId == agent.id)) return true;
      if (inq.agentName && agent.name && inq.agentName.toLowerCase().includes(agent.name.toLowerCase().split(' ')[0])) return true;

      // 3. For lead agents (George & Odero), show all campus inquiries so nothing is missed
      if (agent.isLead) return true;

      return false;
    });

    const badge = document.getElementById('badge-inquiries-count');
    if (badge) badge.textContent = relevantInquiries.length;

    // Apply active listing filter if selected
    let displayedInquiries = relevantInquiries;
    if (activeListingInquiryFilter && activeListingInquiryFilter !== 'all') {
      displayedInquiries = relevantInquiries.filter(inq => 
        (inq.itemId && String(inq.itemId) === String(activeListingInquiryFilter)) ||
        (inq.listingRef && inq.listingRef === activeListingInquiryFilter)
      );
    }

    // Build filter dropdown options
    const filterOptions = [
      `<option value="all">🌟 All Buyer Inquiries (${relevantInquiries.length})</option>`,
      ...agentListings.map(item => {
        const count = relevantInquiries.filter(inq => 
          (inq.itemId && item.id == inq.itemId) || 
          (inq.listingRef && item.listingRef === inq.listingRef) ||
          (inq.itemTitle && item.title && inq.itemTitle.toLowerCase() === item.title.toLowerCase())
        ).length;
        const selected = (String(activeListingInquiryFilter) === String(item.id) || activeListingInquiryFilter === item.listingRef) ? 'selected' : '';
        return `<option value="${item.id}" ${selected}>📦 ${item.title} (${item.price}) • [${count} buyer(s)]</option>`;
      })
    ].join('');

    const filterBarHtml = `
      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem;">
          <div>
            <div style="font-size: 0.82rem; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">
              Assigned Listings Integration
            </div>
            <div style="font-size: 0.85rem; color: #64748b;">
              View client contact details and manage handovers for your supervised listings.
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <label for="agent-inquiries-filter-select" style="font-size: 0.85rem; font-weight: 600; color: #334155;">Filter by Item:</label>
            <select id="agent-inquiries-filter-select" onchange="UniMarketplace.filterInquiriesByListing(this.value)" style="padding: 0.45rem 0.85rem; border-radius: 8px; border: 1.5px solid #cbd5e1; font-size: 0.85rem; background: #ffffff; color: #0f172a; font-weight: 600; min-width: 220px;">
              ${filterOptions}
            </select>
          </div>
        </div>
      </div>
    `;

    if (!displayedInquiries.length) {
      container.innerHTML = `
        ${filterBarHtml}
        <div style="text-align: center; padding: 3rem 1.5rem; background: #ffffff; border-radius: 12px; border: 1.5px dashed #cbd5e1;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🤝</div>
          <h4 style="color: #0f172a; margin: 0 0 0.35rem 0;">No Inquiries Found for this Filter</h4>
          <p style="color: #64748b; font-size: 0.88rem; margin: 0;">
            ${activeListingInquiryFilter !== 'all' ? 'No buyers have inquired about this specific listing yet.' : 'There are currently no buyer inquiries registered for your portal.'}
          </p>
          ${activeListingInquiryFilter !== 'all' ? `
            <button type="button" class="btn btn-secondary" onclick="UniMarketplace.filterInquiriesByListing('all')" style="margin-top: 1rem; font-size: 0.85rem; padding: 0.45rem 1rem;">
              View All Inquiries
            </button>
          ` : ''}
        </div>
      `;
      return;
    }

    container.innerHTML = `
      ${filterBarHtml}
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${displayedInquiries.map(inq => {
          // Find matched listing
          const matchedItem = agentListings.find(item => 
            (inq.itemId && (item.id == inq.itemId)) ||
            (inq.listingRef && item.listingRef === inq.listingRef) ||
            (inq.itemTitle && item.title && inq.itemTitle.toLowerCase() === item.title.toLowerCase())
          ) || allPublic.find(item => 
            (inq.itemId && (item.id == inq.itemId)) ||
            (inq.listingRef && item.listingRef === inq.listingRef) ||
            (inq.itemTitle && item.title && inq.itemTitle.toLowerCase() === item.title.toLowerCase())
          );

          const isCompleted = (inq.status || '').toLowerCase() === 'completed';
          const isConfirmed = isCompleted || (inq.status || '').toLowerCase().includes('confirmed');

          const statusBg = isCompleted ? '#dcfce7' : isConfirmed ? '#dbeafe' : '#fef3c7';
          const statusColor = isCompleted ? '#15803d' : isConfirmed ? '#1d4ed8' : '#b45309';
          const statusBorder = isCompleted ? '#86efac' : isConfirmed ? '#93c5fd' : '#fde68a';

          const waPhone = formatPhoneForWhatsApp(inq.clientPhone);
          const waMessage = `Hello ${inq.clientName}, I am ${agent.name}, your assigned UniNest Agent for "${inq.itemTitle}" (Ref: ${inq.refCode}). I am reaching out to coordinate your accompanied handover.`;

          return `
            <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 1.35rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              <!-- Top Row: Ref and Status -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                  <span style="font-family: monospace; font-size: 0.82rem; font-weight: 700; color: #2563eb; background: #eff6ff; padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid #bfdbfe;">
                    ${inq.refCode}
                  </span>
                  <span style="font-size: 0.85rem; color: #64748b;">Submitted ${inq.createdAt ? new Date(inq.createdAt).toLocaleDateString() : 'Recently'}</span>
                </div>
                <span style="font-size: 0.8rem; font-weight: 700; padding: 0.3rem 0.8rem; border-radius: 9999px; background: ${statusBg}; color: ${statusColor}; border: 1px solid ${statusBorder};">
                  ${inq.status || 'Pending Review'}
                </span>
              </div>

              <!-- Matched Assigned Listing Banner -->
              ${matchedItem ? `
                <div style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 0.85rem 1rem; margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                  <img src="${matchedItem.image}" alt="${matchedItem.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; border: 1px solid #cbd5e1; flex-shrink: 0;">
                  <div style="flex: 1; min-width: 200px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.35rem;">
                      <span style="font-size: 0.72rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">
                        Assigned Item: ${matchedItem.listingRef || 'UN-MKT-' + matchedItem.id}
                      </span>
                      <span style="font-size: 0.72rem; background: #dcfce7; color: #166534; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px;">
                        ✓ Supervised on your portal
                      </span>
                    </div>
                    <h4 style="margin: 0.15rem 0; font-size: 1.05rem; color: #0f172a;">${matchedItem.title}</h4>
                    <div style="font-size: 0.88rem; color: #475569; font-weight: 600;">
                      ${matchedItem.price} <span style="font-size: 0.8rem; font-weight: normal; color: #64748b;">• Campus: ${matchedItem.campus || 'General Campus'} • Hub: ${matchedItem.location || 'Campus Center'}</span>
                    </div>
                  </div>
                </div>
              ` : `
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.65rem 0.85rem; margin-bottom: 1rem; font-size: 0.88rem; color: #334155;">
                  <strong>Listing Target:</strong> ${inq.itemTitle} ${inq.itemPrice ? `(${inq.itemPrice})` : ''}
                </div>
              `}

              <!-- Client / Buyer Contact Box -->
              <div style="background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 10px; padding: 1.15rem; margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div style="display: flex; align-items: center; gap: 0.6rem;">
                    <div style="width: 38px; height: 38px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem;">
                      ${(inq.clientName || 'C').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style="font-size: 1.05rem; font-weight: 700; color: #0f172a;">${inq.clientName}</div>
                      <div style="font-size: 0.78rem; color: #64748b;">Prospective Buyer / Client Details</div>
                    </div>
                  </div>

                  <!-- Direct Call & WhatsApp Action Buttons -->
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <a href="tel:${inq.clientPhone}" class="btn btn-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 600;">
                      📞 Call ${inq.clientPhone}
                    </a>
                    <a href="https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem; background: #25D366; color: #ffffff; border-color: #22c55e; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 600;">
                      💬 Chat on WhatsApp
                    </a>
                    <a href="mailto:${inq.clientEmail}?subject=UniNest%20Handover%20Inquiry%20(${encodeURIComponent(inq.refCode)})" class="btn btn-secondary" style="padding: 0.4rem 0.85rem; font-size: 0.82rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem;">
                      ✉️ Email
                    </a>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.65rem; font-size: 0.85rem; padding-top: 0.65rem; border-top: 1px solid #f1f5f9;">
                  <div><strong>Phone:</strong> <a href="tel:${inq.clientPhone}" style="color: #2563eb; font-weight: 600;">${inq.clientPhone}</a></div>
                  <div><strong>Email:</strong> <a href="mailto:${inq.clientEmail}" style="color: #2563eb;">${inq.clientEmail}</a></div>
                  <div><strong>Requested Slot:</strong> ${inq.preferredDate} (${inq.preferredTime})</div>
                  <div><strong>Handover Point:</strong> ${inq.preferredHub}</div>
                </div>

                ${inq.notes ? `
                  <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 0.65rem 0.85rem; margin-top: 0.75rem; font-size: 0.82rem; color: #334155;">
                    <strong>Client Note:</strong> "${inq.notes}"
                  </div>
                ` : ''}

                <div style="background: #eff6ff; border-left: 3px solid #2563eb; padding: 0.55rem 0.85rem; border-radius: 0 6px 6px 0; font-size: 0.82rem; color: #1e3a8a; margin-top: 0.75rem;">
                  <strong>Agent Update Dispatched:</strong> ${inq.dealUpdate || 'Request received. Waiting for agent confirmation.'}
                </div>
              </div>

              <!-- Deal Control Actions -->
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center;">
                <button type="button" class="btn btn-primary" onclick="UniMarketplace.updateInquiryByAgent('${inq.refCode}', 'Agent Confirmed')" style="padding: 0.5rem 1rem; font-size: 0.85rem; font-weight: 600;">
                  ✓ Confirm Handover Slot
                </button>
                <button type="button" class="btn btn-secondary" onclick="UniMarketplace.updateInquiryByAgent('${inq.refCode}', 'Completed')" style="padding: 0.5rem 1rem; font-size: 0.85rem; background: #dcfce7; border-color: #86efac; color: #15803d; font-weight: 600;">
                  🤝 Mark Handover Done & Sold
                </button>
                <button type="button" class="btn btn-secondary" onclick="UniMarketplace.promptDealUpdate('${inq.refCode}')" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
                  📢 Send Deal Update
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // AGENT ACTION: Verify & Approve -> Publishes the item to the public catalog
  function approveAndPublishSubmission(listingRef) {
    const currentAgent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!currentAgent) {
      alert('Unauthorized: Only verified agents can approve and publish submissions.');
      return;
    }
    let pending = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PENDING_SUBMISSIONS);
      if (stored) pending = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

    const itemIndex = pending.findIndex(i => i.listingRef === listingRef);
    if (itemIndex !== -1) {
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
        status: 'Live',
        verifiedListing: true,
        postedAt: 'Just now'
      };

      // Add to in-memory serverMarketplaceItems and approved public localStorage
      serverMarketplaceItems = [
        publicItem,
        ...(serverMarketplaceItems || []).filter(i => i.listingRef !== item.listingRef && i.id != item.id)
      ];
      try {
        const storedPub = localStorage.getItem(STORAGE_KEY_PUBLIC);
        const pubList = storedPub ? JSON.parse(storedPub) : [];
        const filteredPub = pubList.filter(i => i.listingRef !== item.listingRef && i.id != item.id);
        filteredPub.unshift(publicItem);
        localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(filteredPub));
      } catch (e) {
        console.error(e);
      }
    }

    renderAgentVettingQueue();
    initMarketplacePage();
    initHomepageMarketplace();

    // Persist approval to central cloud database across all devices
    const agentEmail = currentAgent.email || '';
    fetch('/api/marketplace', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-uninest-agent-email': agentEmail,
      },
      body: JSON.stringify({ action: 'approve', listingRef: listingRef }),
    })
      .then(function(res) {
        if (res.ok) {
          fetchAgentPendingSubmissions(currentAgent);
          syncMarketplaceFromServer();
        }
      })
      .catch(function(err) {
        console.warn('Marketplace cloud approve notice:', err);
      });

    showToast(`✓ Listing ${listingRef} verified and approved! It is now LIVE on the marketplace with the Agent Verified badge.`);
  }

  // AGENT ACTION: Schedule on-site hostel inspection visit
  function scheduleInspectionVisit(listingRef) {
    const currentAgent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!currentAgent) {
      alert('Unauthorized: Only verified agents can schedule inspection visits.');
      return;
    }
    const slot = prompt(`Enter scheduled date & time for on-site inspection visit (e.g. Tomorrow at 3:00 PM):`);
    if (!slot || !slot.trim()) return;

    const agentEmail = currentAgent.email || '';
    fetch('/api/marketplace', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-uninest-agent-email': agentEmail,
      },
      body: JSON.stringify({ action: 'schedule', listingRef: listingRef, updateData: { slot: slot.trim() } }),
    }).catch(function(e) {});

    showToast(`Inspection visit scheduled for ${listingRef}: ${slot.trim()}. Seller notified via SMS/Email.`);
  }

  // AGENT ACTION: Reject submission
  function rejectSubmission(listingRef) {
    const currentAgent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!currentAgent) {
      alert('Unauthorized: Only verified agents can reject submissions.');
      return;
    }
    if (!confirm(`Are you sure you want to reject submission ${listingRef}? The seller will be notified to correct defects.`)) return;

    const agentEmail = currentAgent.email || '';
    fetch('/api/marketplace', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-uninest-agent-email': agentEmail,
      },
      body: JSON.stringify({ action: 'reject', listingRef: listingRef }),
    }).catch(function(e) {});

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
    const currentAgent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!currentAgent) {
      alert('Unauthorized: Only verified agents can update buyer inquiries.');
      return;
    }
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

        // Sync inquiry update to central cloud store
        fetch('/api/marketplace/inquiries', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-uninest-agent-email': currentAgent.email || '',
          },
          body: JSON.stringify({
            refCode: refCode,
            status: newStatus,
            dealUpdate: target.dealUpdate,
          }),
        }).catch(function(err) {
          console.warn('Inquiry sync warning:', err);
        });

        // AUTOMATIC SOLD INTEGRATION: When handover is marked "Completed", automatically mark item as SOLD and remove from marketplace!
        if (newStatus === 'Completed' && target.itemId) {
          markAgentItemSold(target.itemId, target.itemTitle || '');
        }

        renderAgentInquiriesQueue();
        showToast(`Inquiry ${refCode} updated to "${newStatus}"`);
      }
    } catch (e) {
      console.error(e);
    }
  }

  // Renders Tab 3: Active listings assigned to this agent (with integrated buyer inquiries & client details)
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

    let allInquiries = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_INQUIRIES);
      if (stored) allInquiries = JSON.parse(stored);
    } catch (e) {
      console.error(e);
    }

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
        🛡️ <strong>Assigned Listings & Inquiries Hub:</strong> You are managing <strong>${agentItems.length} active listings</strong> assigned to your portal (${agent.name}). Buyer inquiries and client contact details are linked directly below each item.
      </div>
      ${agentItems.map(item => {
        // Find matching inquiries for this item
        const itemInquiries = allInquiries.filter(inq => 
          (inq.itemId && (item.id == inq.itemId)) ||
          (inq.listingRef && item.listingRef === inq.listingRef) ||
          (inq.itemTitle && item.title && inq.itemTitle.toLowerCase() === item.title.toLowerCase())
        );

        return `
          <div style="background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 1.35rem; margin-bottom: 1.25rem; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <!-- Listing Header & Actions -->
            <div style="display: flex; gap: 1rem; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; margin-bottom: 1rem;">
              <div style="display: flex; gap: 1rem; align-items: center;">
                <img src="${item.image}" alt="${item.title}" style="width: 76px; height: 76px; object-fit: cover; border-radius: 10px; border: 1px solid #cbd5e1; flex-shrink: 0;">
                <div>
                  <div style="font-size: 0.75rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">Ticket: ${item.listingRef || 'UN-MKT-' + item.id}</div>
                  <h4 style="font-size: 1.1rem; color: #0f172a; margin: 0.15rem 0;">${item.title}</h4>
                  <div style="font-weight: 700; color: #0f172a; font-size: 1rem;">${item.price} <span style="font-size: 0.82rem; color: #64748b; font-weight: normal;">• Campus: ${item.campus || 'General'} • ${item.location || 'Campus Center'}</span></div>
                  <div style="font-size: 0.78rem; color: #16a34a; font-weight: 600; margin-top: 0.2rem;">✓ Supervised by: ${agent.name}</div>
                </div>
              </div>
              <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button type="button" class="btn btn-primary" onclick="UniMarketplace.markAgentItemSold(${item.id}, '${item.listingRef || ''}')" style="background: #dcfce7; border: 1px solid #86efac; color: #15803d; font-size: 0.85rem; padding: 0.5rem 1rem; font-weight: 600; border-radius: 9999px; cursor: pointer;">
                  ✓ Mark as Sold
                </button>
                <button type="button" class="btn btn-secondary" onclick="UniMarketplace.deleteAgentItem(${item.id}, '${item.listingRef || ''}')" style="background: #fee2e2; border-color: #fca5a5; color: #dc2626; font-size: 0.85rem; padding: 0.5rem 1rem; font-weight: 600; border-radius: 9999px; cursor: pointer;">
                  🗑️ Delete Item
                </button>
              </div>
            </div>

            <!-- Integrated Buyer Inquiries & Client Details Section -->
            <div style="border-top: 1.5px solid #f1f5f9; padding-top: 1rem; margin-top: 0.5rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.95rem; font-weight: 700; color: #0f172a;">👥 Interested Clients (${itemInquiries.length})</span>
                  ${itemInquiries.length > 0 ? `
                    <span style="font-size: 0.75rem; font-weight: 700; background: #e0f2fe; color: #0284c7; padding: 0.15rem 0.55rem; border-radius: 9999px;">
                      ${itemInquiries.length} Active Inquiry(ies)
                    </span>
                  ` : ''}
                </div>
                ${itemInquiries.length > 0 ? `
                  <button type="button" class="btn btn-secondary" onclick="UniMarketplace.switchAgentTab('inquiries'); UniMarketplace.filterInquiriesByListing('${item.id}');" style="padding: 0.35rem 0.75rem; font-size: 0.78rem;">
                    Focus in Inquiries Tab &rarr;
                  </button>
                ` : ''}
              </div>

              ${itemInquiries.length > 0 ? `
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                  ${itemInquiries.map(inq => {
                    const isCompleted = (inq.status || '').toLowerCase() === 'completed';
                    const isConfirmed = isCompleted || (inq.status || '').toLowerCase().includes('confirmed');
                    const badgeBg = isCompleted ? '#dcfce7' : isConfirmed ? '#dbeafe' : '#fef3c7';
                    const badgeColor = isCompleted ? '#15803d' : isConfirmed ? '#1d4ed8' : '#b45309';
                    const badgeBorder = isCompleted ? '#86efac' : isConfirmed ? '#93c5fd' : '#fde68a';

                    const waPhone = formatPhoneForWhatsApp(inq.clientPhone);
                    const waMessage = `Hello ${inq.clientName}, I am ${agent.name}, your UniNest Agent regarding "${item.title}" (${inq.refCode}). I am contacting you to coordinate your accompanied handover.`;

                    return `
                      <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.5rem;">
                          <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #2563eb; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem;">
                              ${(inq.clientName || 'C').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <strong style="font-size: 0.98rem; color: #0f172a;">${inq.clientName}</strong>
                              <span style="font-family: monospace; font-size: 0.75rem; color: #64748b; margin-left: 0.35rem;">(${inq.refCode})</span>
                            </div>
                          </div>
                          <span style="font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 9999px; background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">
                            ${inq.status || 'Pending Review'}
                          </span>
                        </div>

                        <!-- Client Contact Details & Direct Connect -->
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.5rem; font-size: 0.84rem; margin-bottom: 0.65rem;">
                          <div>📞 <strong>Phone:</strong> <a href="tel:${inq.clientPhone}" style="color: #2563eb; font-weight: 600;">${inq.clientPhone}</a></div>
                          <div>✉️ <strong>Email:</strong> <a href="mailto:${inq.clientEmail}" style="color: #2563eb;">${inq.clientEmail}</a></div>
                          <div>📅 <strong>Requested Slot:</strong> ${inq.preferredDate} (${inq.preferredTime})</div>
                          <div>📍 <strong>Handover Hub:</strong> ${inq.preferredHub}</div>
                        </div>

                        ${inq.notes ? `
                          <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 0.45rem 0.65rem; border-radius: 6px; font-size: 0.8rem; color: #334155; margin-bottom: 0.65rem;">
                            <strong>Client Note:</strong> "${inq.notes}"
                          </div>
                        ` : ''}

                        <!-- Quick Communication & Handover Actions -->
                        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
                          <a href="tel:${inq.clientPhone}" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;">
                            📞 Call Client
                          </a>
                          <a href="https://wa.me/${waPhone}?text=${encodeURIComponent(waMessage)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #25D366; color: #ffffff; border-color: #22c55e; text-decoration: none; display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600;">
                            💬 WhatsApp Client
                          </a>
                          <button type="button" class="btn btn-primary" onclick="UniMarketplace.updateInquiryByAgent('${inq.refCode}', 'Agent Confirmed')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; font-weight: 600;">
                            ✓ Confirm Slot
                          </button>
                          <button type="button" class="btn btn-secondary" onclick="UniMarketplace.updateInquiryByAgent('${inq.refCode}', 'Completed')" style="padding: 0.35rem 0.75rem; font-size: 0.8rem; background: #dcfce7; border-color: #86efac; color: #15803d; font-weight: 600;">
                            🤝 Complete Handover
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              ` : `
                <div style="font-size: 0.82rem; color: #64748b; background: #f8fafc; padding: 0.75rem 1rem; border-radius: 8px; border: 1px dashed #cbd5e1;">
                  ℹ️ No buyer inquiries placed yet for this item. As soon as a student requests an inspection or handover, their contact details (Name, Phone, WhatsApp, and Slot) will appear right here.
                </div>
              `}
            </div>
          </div>
        `;
      }).join('')}
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

    // 1. Remove from localStorage STORAGE_KEY_PUBLIC and record tombstone
    recordDeletedRef(itemId, itemRef || targetItem.listingRef);
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

    // 2. Remove from memory arrays immediately
    serverMarketplaceItems = serverMarketplaceItems.filter(i => !(i.id == itemId || (itemRef && i.listingRef === itemRef)));
    if (window.uniData && Array.isArray(window.uniData.marketplaceItems)) {
      window.uniData.marketplaceItems = window.uniData.marketplaceItems.filter(i => !(i.id == itemId || (itemRef && i.listingRef === itemRef)));
    }

    // 3. Delete from central cloud store
    const agentEmail = currentAgent.email || (window.UniAuth && window.UniAuth.getCurrentUser && window.UniAuth.getCurrentUser()?.email) || '';
    const deleteParam = itemRef ? ('ref=' + encodeURIComponent(itemRef)) : ('id=' + encodeURIComponent(itemId));
    fetch('/api/marketplace?' + deleteParam, {
      method: 'DELETE',
      headers: {
        'x-uninest-agent-email': agentEmail,
      },
    }).catch(function(err) {
      console.warn('Cloud store delete warning:', err);
    });

    // 4. Re-render portal and public catalog
    renderAgentListingsQueue(currentAgent);
    initMarketplacePage();
    initHomepageMarketplace();
    if (typeof window.__uninestReRenderMarketplace === 'function') {
      window.__uninestReRenderMarketplace();
    }

    showToast(`✓ Listing "${targetItem.title}" deleted successfully from your portal.`);
  }

  function markAgentItemSold(itemId, itemRef) {
    const currentAgent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!currentAgent) {
      alert('Unauthorized: Only verified agents can mark items as sold.');
      return;
    }

    const allItems = getAllItems();
    const targetItem = allItems.find(i => i.id == itemId || (itemRef && i.listingRef === itemRef));
    if (!targetItem) {
      showToast('Item not found or already sold.', 'error');
      return;
    }

    if (!isItemAssignedToAgent(targetItem, currentAgent)) {
      alert(`⚠️ Unauthorized Action: You can only manage items assigned to your portal (${currentAgent.name}).`);
      return;
    }

    // 1. Add to local sold archive
    try {
      const rawSold = localStorage.getItem('uninest_sold_items');
      const soldList = rawSold ? JSON.parse(rawSold) : [];
      const soldListing = {
        id: `item-live-${targetItem.id}-${Date.now()}`,
        title: targetItem.title,
        kind: 'item',
        subCategory: targetItem.category || 'Marketplace',
        price: targetItem.price,
        originalPrice: targetItem.originalPrice || undefined,
        campus: targetItem.campus || 'Campus',
        campusName: targetItem.campusName || targetItem.campus || 'Campus',
        location: targetItem.location || 'Campus Hub',
        image: targetItem.image,
        listingRef: targetItem.listingRef || `UN-MKT-${targetItem.id}`,
        agentName: currentAgent.name || targetItem.agentName || 'Verified UniNest Agent',
        soldAt: 'Just now',
        description: targetItem.description || 'Sold via verified UniNest campus agent.',
        amenitiesOrCondition: [targetItem.condition || 'Verified', 'Agent Handover ✓']
      };
      if (!soldList.some(s => s.listingRef === soldListing.listingRef)) {
        soldList.unshift(soldListing);
        localStorage.setItem('uninest_sold_items', JSON.stringify(soldList));
      }

      // 2. Remove from localStorage STORAGE_KEY_PUBLIC and record tombstone
      recordDeletedRef(itemId, itemRef || targetItem.listingRef);
      const stored = localStorage.getItem(STORAGE_KEY_PUBLIC);
      if (stored) {
        let pubList = JSON.parse(stored);
        pubList = pubList.filter(i => !(i.id == itemId || (itemRef && i.listingRef === itemRef)));
        localStorage.setItem(STORAGE_KEY_PUBLIC, JSON.stringify(pubList));
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Remove immediately from memory arrays
    serverMarketplaceItems = serverMarketplaceItems.filter(i => !(i.id == itemId || (itemRef && i.listingRef === itemRef)));
    if (window.uniData && Array.isArray(window.uniData.marketplaceItems)) {
      window.uniData.marketplaceItems = window.uniData.marketplaceItems.filter(i => !(i.id == itemId || (itemRef && i.listingRef === itemRef)));
    }

    // 4. Send PATCH to central cloud store so it marks status as 'Sold' and removes it everywhere
    const agentEmail = currentAgent.email || (window.UniAuth && window.UniAuth.getCurrentUser && window.UniAuth.getCurrentUser()?.email) || '';
    fetch('/api/marketplace', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'x-uninest-agent-email': agentEmail,
      },
      body: JSON.stringify({
        action: 'sold',
        id: itemId,
        listingRef: itemRef || targetItem.listingRef,
        itemData: targetItem,
      }),
    })
      .then(function(res) { return res.json(); })
      .catch(function(err) {
        console.warn('Could not sync sold status to cloud store:', err);
      });

    // 5. Notify all components & re-render portal and public catalog
    try {
      window.dispatchEvent(new CustomEvent('uninest:item-sold', {
        detail: { itemId: itemId, listingRef: itemRef || targetItem.listingRef, title: targetItem.title }
      }));
    } catch (e) {}

    renderAgentListingsQueue(currentAgent);
    initMarketplacePage();
    initHomepageMarketplace();
    if (typeof window.__uninestReRenderMarketplace === 'function') {
      window.__uninestReRenderMarketplace();
    }

    showToast(`✓ "${targetItem.title}" marked as SOLD and automatically removed from the marketplace. Added to the Sold Archive (/sold)!`);
  }

  function promptDealUpdate(refCode) {
    const currentAgent = currentActiveAgent || getCurrentVerifiedAgent();
    if (!currentAgent) {
      alert('Unauthorized: Only verified agents can dispatch deal updates.');
      return;
    }
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
      }
      fetch('/api/marketplace/inquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-uninest-agent-email': currentAgent.email || '',
        },
        body: JSON.stringify({
          refCode: refCode,
          dealUpdate: msg.trim(),
        }),
      }).catch(function(err) {
        console.warn('Deal update cloud sync warning:', err);
      });
      renderAgentInquiriesQueue();
      showToast(`Deal update dispatched for ${refCode}.`);
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
    syncMarketplaceFromServer,
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
    markAgentItemSold,
    approveAndPublishSubmission,
    scheduleInspectionVisit,
    rejectSubmission,
    updateInquiryByAgent,
    filterInquiriesByListing,
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
