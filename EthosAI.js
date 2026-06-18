
// ── state ────────────────────────────────────────────
var FLAGS = {};   // { FLAG_NAME: score_value }
var ANS   = {};   // { q_id: numeric_value }

var DOMAIN_LABEL = {
  healthcare:'Healthcare', finance:'Finance', hiring:'Hiring',
  education:'Education', surveillance:'Surveillance',
  autonomous:'Autonomous System', customer_support:'Customer Support', general:'General AI'
};

// ── step navigation ──────────────────────────────────
function goStep(n) {
  for (var i = 1; i <= 3; i++) {
    document.getElementById('s' + i).style.display = (i === n) ? 'block' : 'none';
  }
  document.getElementById('results').style.display = 'none';
  document.getElementById('loading').style.display = 'none';
  updateBar(n);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBar(active) {
  for (var i = 1; i <= 4; i++) {
    var el = document.getElementById('si' + i);
    el.classList.remove('active', 'done');
    if (i < active)  el.classList.add('done');
    if (i === active) el.classList.add('active');
  }
}

// ── flag toggle ──────────────────────────────────────
function toggleFlag(name, score, el) {
  el.classList.toggle('on');
  if (el.classList.contains('on')) {
    FLAGS[name] = score;
  } else {
    delete FLAGS[name];
  }
}

// ── answer picker ────────────────────────────────────
function pick(qid, val, el) {
  var siblings = el.parentElement.querySelectorAll('.opt');
  for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('sel');
  el.classList.add('sel');
  ANS[qid] = val;
}

// ── scoring ──────────────────────────────────────────

// Bias: 4 MCQ questions × max 2pts = max 8
function calcBias() {
  var keys = ['b1','b2','b3','b4'];
  var s = 0;
  for (var i = 0; i < keys.length; i++) s += (ANS[keys[i]] || 0);
  return s;
}

// Privacy: flag-based, max 26
function calcPrivacy() {
  var pKeys = ['PRIVACY_PERSONAL_DATA_FLAG','PRIVACY_CAMERA_FLAG','PRIVACY_CLOUD_FLAG',
               'PRIVACY_BIOMETRIC_FLAG','PRIVACY_NO_ENCRYPTION_FLAG','PRIVACY_NO_CONSENT_FLAG'];
  var s = 0;
  for (var i = 0; i < pKeys.length; i++) {
    if (FLAGS[pKeys[i]]) s += FLAGS[pKeys[i]];
  }
  return s;
}

// Normalize to 0–10
function norm(score, maxScore) {
  if (maxScore === 0) return 0;
  return (score / maxScore) * 10;
}

// Risk helpers
function riskClass(score) {
  if (score <= 20) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 60) return 'medium';
  if (score <= 80) return 'high';
  return 'critical';
}
function riskLabel(score) {
  if (score <= 20) return 'LOW RISK';
  if (score <= 40) return 'MODERATE RISK';
  if (score <= 60) return 'MEDIUM RISK';
  if (score <= 80) return 'HIGH RISK';
  return 'CRITICAL RISK';
}
function riskColor(normScore) {
  if (normScore <= 2) return '#7effc4';
  if (normScore <= 4) return '#a8ffda';
  if (normScore <= 6) return '#ffd166';
  if (normScore <= 8) return '#ff6b6b';
  return '#ff3c3c';
}
function bCls(normScore) {
  if (normScore <= 4) return 'b-low';
  if (normScore <= 6) return 'b-med';
  if (normScore <= 8) return 'b-high';
  return 'b-crit';
}

// ── main report ──────────────────────────────────────
function runReport() {
  // hide all steps
  for (var i = 1; i <= 3; i++) document.getElementById('s' + i).style.display = 'none';
  document.getElementById('loading').style.display = 'block';
  document.getElementById('results').style.display = 'none';

  setTimeout(function() {
    document.getElementById('loading').style.display = 'none';

    var name   = document.getElementById('aiName').value.trim() || 'Unnamed AI';
    var domain = document.getElementById('domain').value || 'general';

    // raw scores
    var rawBias = calcBias();   // 0–8
    var rawPriv = calcPrivacy(); // 0–26

    // normalize to 0–10
    var nBias = norm(rawBias,  8);
    var nPriv = norm(rawPriv, 26);

    // weighted total: Bias 50% + Privacy 50% → 0–10
    var total = (nBias * 0.50) + (nPriv * 0.50);

    // final score 0–100
    var finalScore = Math.min(100, Math.round(total * 10));

    var cat    = riskClass(finalScore);
    var catLbl = riskLabel(finalScore);

    // show results
    document.getElementById('results').style.display = 'block';
    updateBar(4);

    document.getElementById('rbanner').className   = 'rbanner ' + cat;
    document.getElementById('rcatn').textContent   = catLbl;
    document.getElementById('rsubn').textContent   = name + '  ·  ' + (DOMAIN_LABEL[domain] || 'General AI');
    document.getElementById('rscore').textContent  = finalScore;
    document.getElementById('rname').textContent   = name;
    document.getElementById('rdomain').textContent = DOMAIN_LABEL[domain] || 'General AI';

    setTimeout(function() {
      document.getElementById('rbarfill').style.width = finalScore + '%';
    }, 120);

    // ── pillars ──
    var pillars = [
      { label:'Bias',    icon:'⚖️',  raw: rawBias, norm: nBias, maxRaw: 8,  weight:'×0.50', contrib: Math.round(nBias*0.50*10)/10 },
      { label:'Privacy', icon:'🔐', raw: rawPriv, norm: nPriv, maxRaw: 26, weight:'×0.50', contrib: Math.round(nPriv*0.50*10)/10 }
    ];

    // formula pills
    var fHtml = '';
    for (var fi = 0; fi < pillars.length; fi++) {
      var p   = pillars[fi];
      var col = riskColor(p.norm);
      fHtml +=
        '<div class="formula-pill">' +
          '<div class="fp-label">' + p.icon + ' ' + p.label + '</div>' +
          '<div class="fp-score" style="color:' + col + '">' + Math.round(p.norm * 10) / 10 + ' / 10</div>' +
          '<div class="fp-weight" style="color:#6b6b88">' + p.weight + '</div>' +
          '<div class="fp-contrib" style="color:' + col + '">contrib: ' + p.contrib + '</div>' +
        '</div>';
    }
    document.getElementById('formulaRow').innerHTML = fHtml;

    // pillar cards
    var p2Html = '';
    for (var pi = 0; pi < pillars.length; pi++) {
      var pl   = pillars[pi];
      var col2 = riskColor(pl.norm);
      p2Html +=
        '<div class="pcard" style="animation-delay:' + (pi*0.08) + 's">' +
          '<div class="picon">' + pl.icon + '</div>' +
          '<div class="ptitle">' + pl.label + '</div>' +
          '<div class="pscore-big" style="color:' + col2 + '">' + pl.raw + '<span style="font-size:14px;opacity:.4"> / ' + pl.maxRaw + '</span></div>' +
          '<div class="pw-label">weight ' + pl.weight + '</div>' +
          '<div class="pbwrap"><div class="pb" id="ppb' + pi + '" style="width:0%;background:' + col2 + '"></div></div>' +
          '<span class="pbadge ' + bCls(pl.norm) + '">' + (pl.norm <= 3 ? 'LOW' : pl.norm <= 6 ? 'MED' : 'HIGH') + '</span>' +
        '</div>';
    }
    document.getElementById('pgrid2').innerHTML = p2Html;

    setTimeout(function() {
      for (var pi2 = 0; pi2 < pillars.length; pi2++) {
        var el2 = document.getElementById('ppb' + pi2);
        if (el2) el2.style.width = Math.round((pillars[pi2].raw / pillars[pi2].maxRaw) * 100) + '%';
      }
    }, 200);

    // ── privacy flag pills ──
    var allPrivFlags = ['PRIVACY_PERSONAL_DATA_FLAG','PRIVACY_CAMERA_FLAG','PRIVACY_CLOUD_FLAG',
                        'PRIVACY_BIOMETRIC_FLAG','PRIVACY_NO_ENCRYPTION_FLAG','PRIVACY_NO_CONSENT_FLAG'];
    var pillHtml = '';
    for (var fi2 = 0; fi2 < allPrivFlags.length; fi2++) {
      var fname  = allPrivFlags[fi2];
      var active = FLAGS[fname] ? true : false;
      var label  = fname.replace(/_FLAG$/, '').replace(/PRIVACY_/,'').replace(/_/g,' ');
      pillHtml +=
        '<span class="fpill ' + (active ? 'active-flag' : 'inactive-flag') + '">' +
          (active ? '🚩 ' : '✓ ') + label + (active ? ' (+' + FLAGS[fname] + ')' : '') +
        '</span>';
    }
    document.getElementById('privacyFlagPills').innerHTML = pillHtml;

    // ── mitigation suggestions ──────────────────────────
    var sugs = [];
    function addS(icon, title, points, prio) {
      sugs.push({ icon:icon, title:title, points:points, prio:prio });
    }

    // Bias mitigations — driven by Q answers
    var bTotal = (ANS['b1']||0) + (ANS['b2']||0) + (ANS['b3']||0) + (ANS['b4']||0);

    if ((ANS['b1']||0) >= 1 || (ANS['b4']||0) >= 1)
      addS('⚖️', 'Demographic Bias Controls',
        ['Audit model outputs across all demographic groups including gender, age and ethnicity',
         'Remove or anonymise demographic identifiers where they are not strictly required',
         'Implement fairness-aware machine learning techniques (e.g. re-weighting, adversarial debiasing)'],
        (ANS['b1']||0) >= 2 || (ANS['b4']||0) >= 2 ? 'high' : 'medium');

    if ((ANS['b2']||0) >= 1)
      addS('🔬', 'Address Stereotypical Responses',
        ['Review training data sources for embedded offensive or stereotypical patterns',
         'Implement output filters and real-time response monitoring pipelines',
         'Conduct red-team adversarial testing specifically targeting stereotypical outputs'],
        (ANS['b2']||0) >= 2 ? 'high' : 'medium');

    if ((ANS['b3']||0) >= 1)
      addS('🤝', 'Ensure Consistent Response Quality',
        ['Test AI outputs systematically across diverse and varied user profiles',
         'Implement fairness metrics (e.g. equalised odds, demographic parity) to measure consistency',
         'Schedule quarterly cross-demographic output audits post-deployment'],
        (ANS['b3']||0) >= 2 ? 'high' : 'medium');

    if (bTotal >= 4)
      addS('📋', 'Conduct Full Fairness Audit',
        ['Use IBM AI Fairness 360 or Google What-If Tool for formal bias testing',
         'Test for disparate impact across all protected attribute groups',
         'Publish a public bias audit report and commit to a remediation timeline'],
        'critical');

    if (bTotal === 0)
      addS('✅', 'Bias Checks Clear',
        ['No bias concerns detected from this assessment. Maintain ongoing monitoring.',
         'Document your fairness practices and keep evaluation records updated.'],
        'low');

    // Privacy mitigations — driven by flags
    if (FLAGS['PRIVACY_PERSONAL_DATA_FLAG'])
      addS('🗂️', 'Minimise Personal Data Collection',
        ['Apply strict data minimisation — collect only what is absolutely necessary',
         'Implement data anonymisation or pseudonymisation for stored records',
         'Document a clear data retention policy with automated deletion procedures'],
        'high');

    if (FLAGS['PRIVACY_BIOMETRIC_FLAG'])
      addS('👁️', 'Biometric Data Protection',
        ['Store all biometric data using AES-256 encrypted secure storage',
         'Enforce strict role-based access controls — limit who can read biometric records',
         'Require explicit informed consent before any biometric data is captured'],
        'critical');

    if (FLAGS['PRIVACY_CLOUD_FLAG'])
      addS('☁️', 'Secure Cloud Storage',
        ['Enable encryption at rest for all cloud-stored data',
         'Enable encryption in transit using TLS 1.3 or higher',
         'Use a certified compliant cloud provider (ISO 27001, SOC 2 Type II)'],
        'high');

    if (FLAGS['PRIVACY_NO_ENCRYPTION_FLAG'])
      addS('🔐', 'Implement Full Encryption',
        ['Encrypt all data at rest using AES-256',
         'Encrypt all data in transit using TLS — reject unencrypted connections',
         'Use a secure key management system (KMS) for encryption key lifecycle'],
        'critical');

    if (FLAGS['PRIVACY_NO_CONSENT_FLAG'])
      addS('✅', 'Add Consent Mechanism',
        ['Build a clear granular opt-in consent flow before any data collection begins',
         'Allow users to withdraw consent at any time and have their data deleted',
         'Ensure full GDPR / CCPA compliance including right-to-access and portability'],
        'critical');

    if (FLAGS['PRIVACY_CAMERA_FLAG'])
      addS('📸', 'Camera Usage Controls',
        ['Display a visible indicator to users whenever the camera is active',
         'Store camera-captured data with end-to-end encryption',
         'Limit camera data retention to the minimum required period and auto-delete after'],
        'medium');

    if (sugs.length === 0)
      addS('✅', 'All Clear — Maintain Vigilance',
        ['No critical risk flags detected. Continue periodic ethical audits.',
         'Document your ethical AI practices and keep all policies updated.',
         'Consider certifying under ISO/IEC 42001 AI Management System standard.'],
        'low');

    var prioCls = { critical:'prio-crit', high:'prio-high', medium:'prio-medium', low:'prio-low' };
    var sugHtml = '';
    for (var si = 0; si < sugs.length; si++) {
      var sg  = sugs[si];
      var pts = '';
      for (var bi = 0; bi < sg.points.length; bi++) {
        pts += '<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:4px">' +
               '<span style="color:#7effc4;flex-shrink:0">→</span>' +
               '<span>' + sg.points[bi] + '</span></div>';
      }
      sugHtml +=
        '<li class="sug-item" style="animation-delay:' + (si*0.06) + 's">' +
          '<div class="sug-icon">' + sg.icon + '</div>' +
          '<div class="sug-body">' +
            '<div class="sug-title">' + sg.title +
              '<span class="prio ' + prioCls[sg.prio] + '">' + sg.prio.toUpperCase() + '</span>' +
            '</div>' +
            '<div class="sug-desc">' + pts + '</div>' +
          '</div>' +
        '</li>';
    }
    document.getElementById('suglist').innerHTML = sugHtml;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 1100);
}

// ── restart ──────────────────────────────────────────
function restart() {
  FLAGS = {};
  ANS   = {};
  document.querySelectorAll('.flag-item').forEach(function(el){ el.classList.remove('on'); });
  document.querySelectorAll('.opt').forEach(function(el){ el.classList.remove('sel'); });
  document.getElementById('aiName').value    = '';
  document.getElementById('purpose').value   = '';
  document.getElementById('aiType').value    = '';
  document.getElementById('domain').value    = 'general';
  document.getElementById('targetUsers').value = 'general';
  document.getElementById('results').style.display = 'none';
  goStep(1);
}