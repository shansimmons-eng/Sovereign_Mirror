<?php get_header(); ?>

<div id="kylos-hub" class="kxh-light">
  <div class="kxh-inner">
    <div class="kxh-header">
      <img src="<?php echo esc_url(KYLOS_TRAINING_URL . 'assets/kylos-red-800.png'); ?>" alt="Kylos Arc" class="kxh-logo">
      <div class="kxh-wordmark">
        <div class="kxh-title">KYLOS ARC TRAINING</div>
        <div class="kxh-sub">COGNOSCENTAE ULTRANS</div>
      </div>
      <label class="kxh-theme-toggle" id="kxh-theme-toggle" title="Toggle light/dark">
        <input type="checkbox" id="kxh-theme-checkbox">
        <span class="kxh-theme-track"></span>
        <span class="kxh-theme-thumb"></span>
      </label>
    </div>

    <p class="kxh-intro">Nine pillars of epistemic and sovereign development. Complete each module in sequence to advance.</p>

    <div class="kxh-grid">
      <?php
      $pillars = [
        ['id'=>1,'slug'=>'intellectual_veracity',    'title'=>'Intellectual Veracity',    'sub'=>'Logical Fallacies · Cognitive Biases · Epistemic Hygiene',                          'live'=>true,  'color'=>'#F43F5E'],
        ['id'=>2,'slug'=>'relational_integrity',      'title'=>'Relational Integrity',     'sub'=>'Conflict Resolution · Communication Protocols · Covenant-Based Coordination',      'live'=>true,  'color'=>'#3F5EF4'],
        ['id'=>3,'slug'=>'environmental_stewardship', 'title'=>'Environmental Stewardship','sub'=>'Regenerative Design · Circular Economics · Ecological Intelligence',               'live'=>true,  'color'=>'#3FF4D5'],
        ['id'=>4,'slug'=>'technological_fluency',     'title'=>'Technological Fluency',    'sub'=>'AI Alignment · Systems Architecture · Exponential Tooling',                        'live'=>true,  'color'=>'#F47B3F'],
        ['id'=>5,'slug'=>'physiological_optimization','title'=>'Physiological Optimization','sub'=>'Sleep Architecture · Metabolic Flexibility · Stress Adaptation · Longevity',     'live'=>true,  'color'=>'#F43F5E'],
        ['id'=>6,'slug'=>'temporal_discipline',       'title'=>'Temporal Discipline',      'sub'=>'Deep Work · Attention Economics · Deadline Architecture',                          'live'=>false, 'color'=>'#3F5EF4'],
        ['id'=>7,'slug'=>'creative_synthesis',        'title'=>'Creative Synthesis',       'sub'=>'Cross-Domain Transfer · Lateral Thinking · Innovation Pipeline',                   'live'=>false, 'color'=>'#F43FB8'],
        ['id'=>8,'slug'=>'collaborative_governance',  'title'=>'Collaborative Governance', 'sub'=>'DAO Primitives · Consent-Based Governance · Meritocratic Allocation',             'live'=>false, 'color'=>'#3FF4D5'],
        ['id'=>9,'slug'=>'the_flourishing_metric',    'title'=>'The Flourishing Metric',   'sub'=>'Multi-Capital Accounting · Wellbeing Indices · Anti-Fragility',                   'live'=>false, 'color'=>'#5EF43F'],
      ];
      foreach ($pillars as $p):
        $url       = home_url('/training/' . $p['slug'] . '/');
        $icon_url  = KYLOS_TRAINING_URL . 'assets/icons/pillar-' . $p['id'] . '.webp';
        $badge_url = KYLOS_TRAINING_URL . 'badge/pillar' . $p['id'] . '-badge100.png';
        $num       = str_pad($p['id'], 2, '0', STR_PAD_LEFT);
      ?>
      <div class="kxh-card<?php echo $p['live'] ? '' : ' kxh-card--stub'; ?>" data-pillar="<?php echo $p['id']; ?>" style="--pillar-accent:<?php echo $p['color']; ?>">
        <div class="kxh-card-top">
          <img src="<?php echo esc_url($icon_url); ?>" alt="" class="kxh-icon">
          <img src="<?php echo esc_url($badge_url); ?>" alt="Pillar <?php echo $p['id']; ?> badge" class="kxh-badge">
        </div>

        <div class="kxh-card-meta">
          <span class="kxh-pillar-num">PILLAR <?php echo $num; ?></span>
          <?php if ($p['live']): ?>
            <span class="kxh-status kxh-status--live">LIVE</span>
          <?php else: ?>
            <span class="kxh-status kxh-status--soon">COMING SOON</span>
          <?php endif; ?>
        </div>

        <div class="kxh-card-body">
          <div class="kxh-card-title"><?php echo esc_html($p['title']); ?></div>
          <div class="kxh-card-sub"><?php echo esc_html($p['sub']); ?></div>
        </div>

        <?php if ($p['live']): ?>
        <div class="kxh-card-actions">
          <button class="kxh-btn-video" data-pillar="<?php echo $p['id']; ?>">&#9654; VIDEO</button>
          <a href="<?php echo esc_url($url); ?>" class="kxh-btn-enter">ENTER MODULE &#8594;</a>
        </div>
        <?php endif; ?>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
</div>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ══════════════════════════════════════════════════════════════
   HUB — wide layout (max-width 1280px, centered)
   ══════════════════════════════════════════════════════════════ */
#kylos-hub {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
  transition: background 0.25s, color 0.25s;
}

/* Light mode (default) */
#kylos-hub.kxh-light {
  background: #fef6f2;
  color: #383B3D;
}
/* Dark mode */
#kylos-hub.kxh-dark {
  background: #0a0a0f;
  color: #C2C9CC;
}

.kxh-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 180px 24px 4rem;
}

/* ── Header ────────────────────────────────────────────────── */
.kxh-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
}
.kxh-light .kxh-header { border-bottom: 1px solid rgba(244,63,94,0.15); }
.kxh-dark  .kxh-header { border-bottom: 1px solid rgba(244,63,94,0.2); }

.kxh-logo { width: 48px; height: 48px; object-fit: contain; flex-shrink: 0; }
.kxh-wordmark { display: flex; flex-direction: column; gap: 2px; }

.kxh-light .kxh-title { color: #191B1C; }
.kxh-dark  .kxh-title { color: #e8e8e8; }
.kxh-title { font-size: 30px; font-weight: bold; letter-spacing: 0.15em; }

.kxh-light .kxh-sub { color: rgba(0,0,0,0.35); }
.kxh-dark  .kxh-sub { color: rgba(255,255,255,0.3); }
.kxh-sub { font-size: 20px; letter-spacing: 0.2em; }

/* Theme toggle — iOS-style switch */
.kxh-theme-toggle {
  margin-left: auto;
  position: relative;
  width: 52px;
  height: 28px;
  flex-shrink: 0;
  cursor: pointer;
}
.kxh-theme-toggle input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}
.kxh-theme-track {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  transition: background 0.3s;
}
.kxh-dark .kxh-theme-track { background: #383B3D; }
.kxh-light .kxh-theme-track { background: #C2C9CC; }
.kxh-theme-toggle input:checked ~ .kxh-theme-track { background: #F43F5E; }
.kxh-theme-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  transition: transform 0.3s;
}
.kxh-theme-toggle input:checked ~ .kxh-theme-thumb {
  transform: translateX(24px);
}

/* ── Intro ─────────────────────────────────────────────────── */
.kxh-light .kxh-intro { color: rgba(0,0,0,0.45); }
.kxh-dark  .kxh-intro { color: rgba(255,255,255,0.35); }
.kxh-intro { font-size: 1rem; letter-spacing: 0.06em; line-height: 1.6; margin-bottom: 2rem; max-width: 600px; }

/* ── Grid — 3x3 desktop, stacked mobile ───────────────────── */
.kxh-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

/* ── Card ──────────────────────────────────────────────────── */
.kxh-card {
  border-radius: 4px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  transition: border-color 0.35s ease, box-shadow 0.35s ease, transform 0.2s ease;
  border-left: 6px solid var(--pillar-accent, rgba(255,255,255,0.07));
  position: relative;
  overflow: hidden;
}
.kxh-light .kxh-card {
  background: rgba(255,255,255,0.7);
  border: 1px solid rgba(0,0,0,0.07);
  border-left: 6px solid var(--pillar-accent, rgba(0,0,0,0.07));
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}
.kxh-dark .kxh-card {
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.07);
  border-left: 6px solid var(--pillar-accent, rgba(255,255,255,0.07));
}

.kxh-card:hover {
  transform: translateY(-3px);
}
.kxh-light .kxh-card:hover {
  border-color: rgba(0,0,0,0.12);
  border-left-color: var(--pillar-accent);
  box-shadow: 0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px var(--pillar-accent, transparent);
}
.kxh-dark .kxh-card:hover {
  border-color: var(--pillar-accent);
  border-left-color: var(--pillar-accent);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 20px color-mix(in srgb, var(--pillar-accent) 20%, transparent);
}

/* Top accent gradient line */
.kxh-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--pillar-accent, transparent), transparent);
  opacity: 0.5;
}

.kxh-card--stub { opacity: 0.45; pointer-events: none; }
.kxh-card--complete { border-left-color: #3FF4D5 !important; }

/* ── Card inner elements ───────────────────────────────────── */
.kxh-card-top { display: flex; justify-content: space-between; align-items: flex-start; }
.kxh-icon { width: 40px; height: 40px; object-fit: contain; }
.kxh-light .kxh-icon { filter: none; }
.kxh-dark  .kxh-icon { filter: invert(1) sepia(0.3) brightness(0.65); }
.kxh-badge { width: 36px; height: 36px; object-fit: contain; opacity: 0.12; transition: opacity 0.3s; }
.kxh-badge--earned { opacity: 1 !important; }

.kxh-card-meta { display: flex; align-items: center; gap: 0.5rem; }
.kxh-light .kxh-pillar-num { color: rgba(0,0,0,0.25); }
.kxh-dark  .kxh-pillar-num { color: rgba(255,255,255,0.2); }
.kxh-pillar-num { font-size: 0.6rem; letter-spacing: 0.15em; }

.kxh-status { font-size: 0.5rem; letter-spacing: 0.15em; padding: 2px 8px; border-radius: 2px; font-weight: 600; }
.kxh-status--live {
  background: rgba(244,63,94,0.1);
  color: #F43F5E;
  border: 1px solid rgba(244,63,94,0.25);
}
.kxh-dark .kxh-status--live {
  background: rgba(244,63,94,0.12);
  border-color: rgba(244,63,94,0.3);
}
.kxh-status--soon {
  background: rgba(0,0,0,0.03);
  color: rgba(0,0,0,0.3);
  border: 1px solid rgba(0,0,0,0.08);
}
.kxh-dark .kxh-status--soon {
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.2);
  border-color: rgba(255,255,255,0.08);
}

.kxh-light .kxh-card-title { color: #191B1C; }
.kxh-dark  .kxh-card-title { color: #e8e8e8; }
.kxh-card-title { font-size: 0.85rem; letter-spacing: 0.07em; font-weight: bold; margin-bottom: 0.35rem; }

.kxh-light .kxh-card-sub { color: rgba(0,0,0,0.4); }
.kxh-dark  .kxh-card-sub { color: rgba(255,255,255,0.28); }
.kxh-card-sub { font-size: 0.68rem; line-height: 1.55; min-width: 0; }

/* ── Card actions ──────────────────────────────────────────── */
.kxh-card-actions { display: flex; gap: 0.5rem; margin-top: auto; }

.kxh-btn-video {
  flex: 0 0 auto; padding: 0.45rem 0.75rem;
  background: transparent;
  font-family: 'Courier New', monospace;
  font-size: 0.72rem; letter-spacing: 0.1em; cursor: pointer; border-radius: 3px;
  transition: border-color 0.3s ease, color 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
}
.kxh-light .kxh-btn-video { border: 1px solid rgba(63,244,213,0.3); color: rgba(0,128,105,0.7); }
.kxh-light .kxh-btn-video:hover { border-color: rgba(63,244,213,0.8); color: #1a9e85; background: rgba(63,244,213,0.08); box-shadow: 0 0 12px rgba(63,244,213,0.15); }
.kxh-dark  .kxh-btn-video { border: 1px solid rgba(63,244,213,0.25); color: rgba(63,244,213,0.55); }
.kxh-dark  .kxh-btn-video:hover { border-color: #3FF4D5; color: #3FF4D5; box-shadow: 0 0 16px rgba(63,244,213,0.25); }

.kxh-btn-enter {
  flex: 1; padding: 0.45rem 0.75rem; text-align: center; text-decoration: none;
  font-family: 'Courier New', monospace;
  font-size: 0.72rem; letter-spacing: 0.1em; border-radius: 3px; font-weight: 600;
  transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease, box-shadow 0.3s ease, transform 0.15s ease;
}
.kxh-light .kxh-btn-enter {
  background: #F43F5E; border: 1px solid #F43F5E; color: #fff;
}
.kxh-light .kxh-btn-enter:hover { background: #e11d48; border-color: #e11d48; box-shadow: 0 0 16px rgba(244,63,94,0.25); transform: translateY(-1px); }
.kxh-dark  .kxh-btn-enter {
  background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.3); color: #F43F5E;
}
.kxh-dark  .kxh-btn-enter:hover { background: rgba(244,63,94,0.15); border-color: #F43F5E; box-shadow: 0 0 20px rgba(244,63,94,0.2); transform: translateY(-1px); }

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 768px) {
  .kxh-grid { grid-template-columns: 1fr; }
  .kxh-inner { padding-left: 16px; padding-right: 16px; }
}
@media (max-width: 480px) {
  .kxh-title { font-size: 22px; }
  .kxh-sub { font-size: 16px; }
  .kxh-inner { padding-top: 80px; }
}
</style>

<script>
(function() {
  /* ── Theme toggle ── */
  var hub = document.getElementById('kylos-hub');
  var checkbox = document.getElementById('kxh-theme-checkbox');
  var saved = localStorage.getItem('kylos_training_light_mode');
  /* Default to light — value is 'true' (light) or 'false' (dark) */
  var isDark = saved === 'false';
  checkbox.checked = isDark;
  setTheme(isDark);

  checkbox.addEventListener('change', function() {
    isDark = checkbox.checked;
    setTheme(isDark);
    localStorage.setItem('kylos_training_light_mode', isDark ? 'false' : 'true');
  });

  function setTheme(dark) {
    if (dark) {
      hub.className = 'kxh-dark';
    } else {
      hub.className = 'kxh-light';
    }
  }

  /* ── Mark completed pillars ── */
  try {
    var progress = JSON.parse(localStorage.getItem('kylos_pillar_progress') || '{}');
    document.querySelectorAll('.kxh-card').forEach(function(card) {
      var id = card.getAttribute('data-pillar');
      if (progress[id]) {
        card.classList.add('kxh-card--complete');
        var badge = card.querySelector('.kxh-badge');
        if (badge) badge.classList.add('kxh-badge--earned');
      }
    });
  } catch(e) {}
})();
</script>

<?php get_footer(); ?>
