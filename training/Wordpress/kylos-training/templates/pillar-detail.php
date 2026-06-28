<?php
get_header();

$training = get_page_by_path('training', OBJECT, 'page');
$training_url = $training ? get_permalink($training->ID) : '/training/';
$current_post = get_queried_object();
$parent_post = $current_post ? get_post($current_post->post_parent) : null;
$parent_name = $parent_post ? $parent_post->post_name : 'training';
$pillar_name = $current_post ? get_the_title($current_post->ID) : '';
?>

<div class="kx-layout" style="padding-top:220px;">
  <?php echo do_shortcode('[kylos_pillar_sidebar]'); ?>

  <main class="kx-main">
    <div class="kx-noise" style="position:absolute;inset:0;z-index:0"></div>

    <nav class="kx-mobile-nav" style="display:none;margin-bottom:20px">
      <a href="<?php echo esc_url($training_url); ?>" class="kx-btn kx-btn--secondary" style="text-decoration:none;font-size:12px;padding:8px 16px">
        <span class="dashicons dashicons-arrow-left-alt2" style="font-size:16px"></span> Back to Training
      </a>
      <?php if ($parent_name !== 'training') { ?>
      <a href="<?php echo esc_url(get_permalink(get_page_by_path('training/' . $parent_name))); ?>" class="kx-btn kx-btn--ghost" style="text-decoration:none;font-size:12px;padding:8px 16px">
        <?php echo esc_html($pillar_name); ?>
      </a>
      <?php } ?>
    </nav>

    <?php the_content(); ?>
  </main>
</div>

<div id="kx-toast" class="kx-toast">
  <span class="dashicons dashicons-sensors" style="font-size:20px;color:var(--primary)"></span>
  <p id="kx-toast-text" class="kx-body-sm" style="color:var(--on-surface);margin:0;font-weight:600"></p>
</div>

<style>
@media (max-width: 768px) {
  .kx-mobile-nav { display: flex !important; gap: 8px; flex-wrap: wrap; }
}
</style>

<?php get_footer(); ?>
