<?php get_header(); ?>

<div id="kylos-hub">
  <div class="kxh-header">
    <img src="<?php echo esc_url(KYLOS_TRAINING_URL . 'assets/kylos-red-800.png'); ?>" alt="Kylos Arc" class="kxh-logo">
    <div class="kxh-wordmark">
      <div class="kxh-title">KYLOS ARC TRAINING</div>
      <div class="kxh-sub">COGNOSCENTAE ULTRANS</div>
    </div>
  </div>

  <p class="kxh-intro">Nine pillars of epistemic and sovereign development. Complete each module in sequence to advance.</p>

  <div class="kxh-grid">
    <?php
    $pillars = [
      ['id'=>1,'slug'=>'intellectual_veracity',    'title'=>'Intellectual Veracity',    'sub'=>'Logical Fallacies · Cognitive Biases · Epistemic Hygiene',                          'live'=>true],
      ['id'=>2,'slug'=>'relational_integrity',      'title'=>'Relational Integrity',     'sub'=>'Conflict Resolution · Communication Protocols · Covenant-Based Coordination',      'live'=>true],
      ['id'=>3,'slug'=>'environmental_stewardship', 'title'=>'Environmental Stewardship','sub'=>'Regenerative Design · Circular Economics · Ecological Intelligence',               'live'=>true],
      ['id'=>4,'slug'=>'technological_fluency',     'title'=>'Technological Fluency',    'sub'=>'AI Alignment · Systems Architecture · Exponential Tooling',                        'live'=>false],
      ['id'=>5,'slug'=>'physiological_optimization','title'=>'Physiological Optimization','sub'=>'Sleep Architecture · Metabolic Flexibility · Stress Adaptation · Longevity',     'live'=>false],
      ['id'=>6,'slug'=>'temporal_discipline',       'title'=>'Temporal Discipline',      'sub'=>'Deep Work · Attention Economics · Deadline Architecture',                          'live'=>false],
      ['id'=>7,'slug'=>'creative_synthesis',        'title'=>'Creative Synthesis',       'sub'=>'Cross-Domain Transfer · Lateral Thinking · Innovation Pipeline',                   'live'=>false],
      ['id'=>8,'slug'=>'collaborative_governance',  'title'=>'Collaborative Governance', 'sub'=>'DAO Primitives · Consent-Based Governance · Meritocratic Allocation',             'live'=>false],
      ['id'=>9,'slug'=>'the_flourishing_metric',    'title'=>'The Flourishing Metric',   'sub'=>'Multi-Capital Accounting · Wellbeing Indices · Anti-Fragility',                   'live'=>false],
    ];
    foreach ($pillars as $p):
      $url       = home_url('/training/' . $p['slug'] . '/');
      $icon_url  = KYLOS_TRAINING_URL . 'assets/icons/pillar-' . $p['id'] . '.webp';
      $badge_url = KYLOS_TRAINING_URL . 'badge/pillar' . $p['id'] . '-badge100.png';
      $num       = str_pad($p['id'], 2, '0', STR_PAD_LEFT);
    ?>
    <div class="kxh-card<?php echo $p['live'] ? '' : ' kxh-card--stub'; ?>" data-pillar="<?php echo $p['id']; ?>">
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

<style>
#kylos-hub {
  background: #0a0a0f;
  min-height: 100vh;
  padding: 2rem 1.5rem 4rem;
  font-family: 'Courier New', Courier, monospace;
  color: #C2C9CC;
}
.kxh-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(244,63,94,0.2);
  margin-bottom: 2rem;
}
.kxh-logo { width: 48px; height: 48px; object-fit: contain; flex-shrink: 0; }
.kxh-wordmark { display: flex; flex-direction: column; gap: 2px; }
.kxh-title { color: #e8e8e8; font-size: 1rem; font-weight: bold; letter-spacing: 0.15em; }
.kxh-sub   { color: rgba(255,255,255,0.3); font-size: 0.6rem; letter-spacing: 0.2em; }
.kxh-intro { color: rgba(255,255,255,0.35); font-size: 0.75rem; letter-spacing: 0.06em; line-height: 1.6; margin-bottom: 2rem; max-width: 600px; }
.kxh-grid  { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }
.kxh-card  { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.07); border-radius: 3px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.9rem; transition: border-color 0.2s; }
.kxh-card:hover { border-color: rgba(244,63,94,0.25); }
.kxh-card--stub { opacity: 0.45; pointer-events: none; }
.kxh-card--complete { border-color: rgba(63,244,213,0.2); }
.kxh-card-top  { display: flex; justify-content: space-between; align-items: flex-start; }
.kxh-icon  { width: 40px; height: 40px; object-fit: contain; filter: invert(1) sepia(0.3) brightness(0.65); }
.kxh-badge { width: 36px; height: 36px; object-fit: contain; opacity: 0.12; transition: opacity 0.3s; }
.kxh-badge--earned { opacity: 1 !important; }
.kxh-card-meta { display: flex; align-items: center; gap: 0.5rem; }
.kxh-pillar-num { color: rgba(255,255,255,0.2); font-size: 0.6rem; letter-spacing: 0.15em; }
.kxh-status { font-size: 0.5rem; letter-spacing: 0.15em; padding: 1px 6px; border-radius: 2px; }
.kxh-status--live { background: rgba(244,63,94,0.12); color: #F43F5E; border: 1px solid rgba(244,63,94,0.3); }
.kxh-status--soon { background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.08); }
.kxh-card-title { color: #e8e8e8; font-size: 0.85rem; letter-spacing: 0.07em; font-weight: bold; margin-bottom: 0.35rem; }
.kxh-card-sub   { color: rgba(255,255,255,0.28); font-size: 0.68rem; line-height: 1.55; }
.kxh-card-actions { display: flex; gap: 0.5rem; margin-top: auto; }
.kxh-btn-video {
  flex: 0 0 auto; padding: 0.4rem 0.7rem;
  background: transparent; border: 1px solid rgba(63,244,213,0.25);
  color: rgba(63,244,213,0.55); font-family: 'Courier New', monospace;
  font-size: 0.6rem; letter-spacing: 0.1em; cursor: pointer; border-radius: 2px;
  transition: border-color 0.15s, color 0.15s;
}
.kxh-btn-video:hover { border-color: rgba(63,244,213,0.6); color: #3FF4D5; }
.kxh-btn-enter {
  flex: 1; padding: 0.4rem 0.75rem; text-align: center; text-decoration: none;
  background: rgba(244,63,94,0.08); border: 1px solid rgba(244,63,94,0.3);
  color: #F43F5E; font-family: 'Courier New', monospace;
  font-size: 0.6rem; letter-spacing: 0.1em; border-radius: 2px;
  transition: background 0.15s, border-color 0.15s;
}
.kxh-btn-enter:hover { background: rgba(244,63,94,0.15); border-color: rgba(244,63,94,0.5); color: #F43F5E; }
@media (max-width: 480px) {
  #kylos-hub { padding: 1.25rem 1rem 3rem; }
  .kxh-grid  { grid-template-columns: 1fr; }
  .kxh-title { font-size: 0.85rem; }
}
</style>

<script>
(function() {
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
