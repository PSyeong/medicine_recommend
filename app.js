// OpenFDA API Base
const FDA_API = 'https://api.fda.gov/drug/label.json';

// DOM
const views = document.querySelectorAll('.view');
const navBtns = document.querySelectorAll('.nav-btn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const viewDetail = document.getElementById('viewDetail');
const detailContent = document.getElementById('detailContent');
const backBtn = document.getElementById('backBtn');

// Navigation
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const viewName = btn.dataset.view;
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    views.forEach(v => {
      v.classList.remove('active');
      v.classList.add('hidden');
      if (v.id === `view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`) {
        v.classList.add('active');
        v.classList.remove('hidden');
      }
    });
  });
});

// 한글 → 영문 변환
function toSearchTerms(query) {
  const q = query.trim().replace(/"/g, '').toLowerCase();
  const mapped = KOREAN_TO_ENGLISH[q];
  if (mapped) return mapped.split(/\s+/);
  return [q];
}

// Search - OpenFDA (한글/영문 지원)
async function searchDrugs(query) {
  if (!query.trim()) return;
  searchResults.innerHTML = '<div class="loading">검색 중...</div>';
  const terms = toSearchTerms(query);
  const searchParts = terms.flatMap(t => [
    `openfda.brand_name:"${t}"`,
    `openfda.generic_name:"${t}"`
  ]);
  const searchQuery = searchParts.join('+OR+');
  try {
    const res = await fetch(`${FDA_API}?search=${encodeURIComponent(searchQuery)}&limit=20`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || 'API 오류');
    if (!data.results || data.results.length === 0) {
      searchResults.innerHTML = '<p class="error">검색 결과가 없습니다. 다른 검색어로 시도해 보세요 (예: 타이레놀, 이부프로펜, tylenol)</p>';
      return;
    }
    renderSearchResults(data.results);
  } catch (err) {
    searchResults.innerHTML = `<p class="error">검색 실패: ${err.message}</p>`;
  }
}

function renderSearchResults(results) {
  searchResults.innerHTML = results.map(drug => {
    const brand = drug.openfda?.brand_name?.[0] || '-';
    const generic = drug.openfda?.generic_name?.[0] || '-';
    const purpose = drug.purpose?.[0]?.substring(0, 80) || drug.indications_and_usage?.[0]?.substring(0, 80) || '';
    return `
      <div class="drug-card" data-id="${results.indexOf(drug)}">
        <h3>${brand}</h3>
        <p>성분: ${generic}</p>
        ${purpose ? `<p>${purpose}...</p>` : ''}
      </div>
    `;
  }).join('');
  document.querySelectorAll('.drug-card').forEach(card => {
    card.addEventListener('click', () => showDetail(results[parseInt(card.dataset.id)]));
  });
}

function showDetail(drug) {
  const brand = drug.openfda?.brand_name?.[0] || '알 수 없음';
  const generic = drug.openfda?.generic_name?.[0] || '-';
  const sections = [
    { title: '효능·효과', data: drug.indications_and_usage?.[0] || drug.purpose?.[0] || '정보 없음' },
    { title: '용법·용량', data: drug.dosage_and_administration?.[0] || drug.dosage_and_administration?.[0] || '정보 없음' },
    { title: '주의사항', data: drug.warnings?.[0] || drug.precautions?.[0] || '정보 없음' },
    { title: '부작용', data: drug.adverse_reactions?.[0] || '정보 없음' },
    { title: '금기', data: drug.contraindications?.[0] || '정보 없음' },
    { title: '약물 상호작용', data: drug.drug_interactions?.[0] || '정보 없음' },
    { title: '임신·수유', data: drug.pregnancy_or_breast_feeding?.[0] || '정보 없음' },
  ];
  detailContent.innerHTML = `
    <div class="detail-section">
      <h3>기본 정보</h3>
      <p><strong>상품명:</strong> ${brand}</p>
      <p><strong>성분명:</strong> ${generic}</p>
    </div>
    ${sections.map(s => `
      <div class="detail-section">
        <h3>${s.title}</h3>
        <p>${s.data.substring(0, 1500)}${s.data.length > 1500 ? '...' : ''}</p>
      </div>
    `).join('')}
  `;
  document.getElementById('viewSearch').classList.remove('active');
  document.getElementById('viewSearch').classList.add('hidden');
  viewDetail.classList.add('active');
  viewDetail.classList.remove('hidden');
}

backBtn.addEventListener('click', () => {
  viewDetail.classList.remove('active');
  viewDetail.classList.add('hidden');
  document.getElementById('viewSearch').classList.add('active');
  document.getElementById('viewSearch').classList.remove('hidden');
});

searchBtn.addEventListener('click', () => searchDrugs(searchInput.value));
searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') searchDrugs(searchInput.value); });

// Interaction Checker
const interactionDrugInput = document.getElementById('interactionDrugInput');
const addDrugBtn = document.getElementById('addDrugBtn');
const interactionDrugList = document.getElementById('interactionDrugList');
const checkInteractionBtn = document.getElementById('checkInteractionBtn');
const interactionResult = document.getElementById('interactionResult');

let interactionDrugs = [];

addDrugBtn.addEventListener('click', () => {
  const name = interactionDrugInput.value.trim();
  if (name && !interactionDrugs.includes(name)) {
    interactionDrugs.push(name);
    renderInteractionList();
    interactionDrugInput.value = '';
  }
});

function renderInteractionList() {
  interactionDrugList.innerHTML = interactionDrugs.map((d, i) => `
    <span class="drug-tag">${d} <button data-i="${i}">×</button></span>
  `).join('');
  interactionDrugList.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      interactionDrugs.splice(parseInt(btn.dataset.i), 1);
      renderInteractionList();
    });
  });
}

function normalizeDrugName(name) {
  return name.toLowerCase().replace(/\s/g, '');
}

checkInteractionBtn.addEventListener('click', () => {
  if (interactionDrugs.length < 2) {
    interactionResult.innerHTML = '<p class="warning">2개 이상의 약을 추가해 주세요.</p>';
    return;
  }
  const found = [];
  for (let i = 0; i < interactionDrugs.length; i++) {
    for (let j = i + 1; j < interactionDrugs.length; j++) {
      const d1 = normalizeDrugName(interactionDrugs[i]);
      const d2 = normalizeDrugName(interactionDrugs[j]);
      for (const [drug, interactions] of Object.entries(INTERACTION_DATABASE)) {
        const drugNorm = normalizeDrugName(drug);
        const match1 = drugNorm.includes(d1) || d1.includes(drugNorm);
        const match2 = interactions.some(int => {
          const intNorm = normalizeDrugName(int);
          return intNorm.includes(d2) || d2.includes(intNorm);
        });
        if (match1 && match2) found.push(`${interactionDrugs[i]} ↔ ${interactionDrugs[j]}: 상호작용 가능`);
      }
    }
  }
  if (found.length > 0) {
    interactionResult.innerHTML = '<p class="danger"><strong>⚠️ 상호작용 주의:</strong></p>' + [...new Set(found)].map(f => `<p>• ${f}</p>`).join('');
  } else {
    interactionResult.innerHTML = '<p class="success">등록된 데이터에서 알려진 상호작용이 없습니다. 전문가 상담을 권장합니다.</p>';
  }
});

// Pill Identifier
const pillShape = document.getElementById('pillShape');
const pillColor = document.getElementById('pillColor');
const pillImprint = document.getElementById('pillImprint');
const identifyPillBtn = document.getElementById('identifyPillBtn');
const pillResults = document.getElementById('pillResults');

identifyPillBtn.addEventListener('click', () => {
  const shape = pillShape.value;
  const color = pillColor.value;
  const imprint = pillImprint.value.trim().toUpperCase();
  if (!shape && !color && !imprint) {
    pillResults.innerHTML = '<p class="warning">모양, 색상, 각인 중 하나 이상을 선택해 주세요.</p>';
    return;
  }
  const matches = PILL_DATABASE.filter(p => {
    const shapeMatch = !shape || p.shape === shape;
    const colorMatch = !color || p.color === color;
    const imprintMatch = !imprint || p.imprint.toUpperCase().includes(imprint) || imprint.includes(p.imprint.toUpperCase());
    return shapeMatch && colorMatch && imprintMatch;
  });
  const shapeLabels = { round: '원형', oval: '타원형', capsule: '캡슐형', rectangle: '사각형', diamond: '다이아몬드', hexagon: '육각형', octagon: '팔각형', triangle: '삼각형' };
  const colorLabels = { white: '흰색', yellow: '노란색', orange: '주황색', red: '빨간색', pink: '분홍색', blue: '파란색', green: '초록색', brown: '갈색', gray: '회색' };
  if (matches.length === 0) {
    pillResults.innerHTML = '<p class="warning">검색 조건에 맞는 알약이 없습니다. 조건을 완화하거나 다른 각인을 입력해 보세요.</p>';
    return;
  }
  pillResults.innerHTML = matches.map(p => `
    <div class="drug-card pill-card">
      <h3>${p.name}</h3>
      <p>성분: ${p.ingredient} | ${p.strength}</p>
      <p class="pill-meta">모양: ${shapeLabels[p.shape] || p.shape} / 색: ${colorLabels[p.color] || p.color} / 각인: ${p.imprint}</p>
    </div>
  `).join('');
});

// My Medications
const medicationInput = document.getElementById('medicationInput');
const addMedicationBtn = document.getElementById('addMedicationBtn');
const medicationList = document.getElementById('medicationList');
const checkAllergyBtn = document.getElementById('checkAllergyBtn');
const checkMyInteractionsBtn = document.getElementById('checkMyInteractionsBtn');

let myMedications = JSON.parse(localStorage.getItem('myMedications') || '[]');

function saveMedications() {
  localStorage.setItem('myMedications', JSON.stringify(myMedications));
  renderMedicationList();
}

function renderMedicationList() {
  medicationList.innerHTML = myMedications.map((m, i) => `
    <span class="med-tag">${m} <button data-i="${i}">×</button></span>
  `).join('');
  medicationList.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      myMedications.splice(parseInt(btn.dataset.i), 1);
      saveMedications();
    });
  });
}

addMedicationBtn.addEventListener('click', () => {
  const name = medicationInput.value.trim();
  if (name && !myMedications.includes(name)) {
    myMedications.push(name);
    saveMedications();
    medicationInput.value = '';
  }
});

checkMyInteractionsBtn.addEventListener('click', () => {
  interactionDrugs = [...myMedications];
  renderInteractionList();
  document.querySelector('[data-view="interaction"]').click();
  setTimeout(() => checkInteractionBtn.click(), 100);
});

checkAllergyBtn.addEventListener('click', () => {
  if (myMedications.length === 0) {
    alert('먼저 복용 중인 약을 추가해 주세요.');
    return;
  }
  const allergy = prompt('알레르기가 있는 성분을 입력하세요 (예: 페니실린, 아스피린):');
  if (!allergy || !allergy.trim()) return;
  const allergyKey = Object.keys(ALLERGY_INGREDIENTS).find(k => k.toLowerCase().includes(allergy.toLowerCase()) || allergy.toLowerCase().includes(k.toLowerCase()));
  const group = allergyKey ? ALLERGY_INGREDIENTS[allergyKey] : null;
  if (!group) {
    const found = myMedications.filter(m => m.toLowerCase().includes(allergy.toLowerCase()) || allergy.toLowerCase().includes(m.toLowerCase()));
    if (found.length > 0) {
      alert(`⚠️ 알레르기 주의: "${found.join(', ')}"에 "${allergy}" 성분이 포함될 수 있습니다. 의사와 상담하세요.`);
    } else {
      alert('저장된 약 목록에서 해당 알레르기 성분이 발견되지 않았습니다. 등록된 알레르기 그룹: 페니실린, 설폰아마이드, 아스피린, 세팔로스포린');
    }
    return;
  }
  const found = myMedications.filter(m => group.some(g => m.toLowerCase().includes(g.toLowerCase()) || g.toLowerCase().includes(m.toLowerCase())));
  if (found.length > 0) {
    alert(`⚠️ 알레르기 주의: ${found.join(', ')}에 ${allergyKey} 계열 성분이 포함될 수 있습니다. 반드시 의사와 상담하세요.`);
  } else {
    alert('저장된 약 목록에서 해당 알레르기 성분이 발견되지 않았습니다.');
  }
});

renderMedicationList();
