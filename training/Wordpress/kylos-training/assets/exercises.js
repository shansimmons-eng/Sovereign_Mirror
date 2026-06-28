/**
 * Kylos ARC Training - Interactive Exercises
 * Handles drag-and-drop diagnostics, flip cards, and calibration buttons
 */
(function() {
  'use strict';

  // ============================================
  // Drag & Drop Exercises
  // ============================================
  function initDragDrop(container) {
    const flipInner = container.querySelector('.kx-flip-inner');
    const dropZone = container.querySelector('.kx-drop-zone');
    const chips = container.querySelectorAll('.kx-chip');
    const shakeStyle = document.createElement('style');
    shakeStyle.textContent = '@keyframes kxShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}.kx-shake{animation:kxShake .4s ease-in-out}';
    document.head.appendChild(shakeStyle);

    if (!flipInner || !dropZone) return;

    chips.forEach(function(chip) {
      chip.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', chip.getAttribute('data-answer'));
        chip.style.opacity = '0.5';
      });
      chip.addEventListener('dragend', function() {
        chip.style.opacity = '1';
      });
    });

    dropZone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropZone.classList.add('kx-drop-over');
    });

    dropZone.addEventListener('dragleave', function() {
      dropZone.classList.remove('kx-drop-over');
    });

    dropZone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropZone.classList.remove('kx-drop-over');
      var answer = e.dataTransfer.getData('text/plain');
      var correct = dropZone.getAttribute('data-correct');

      if (answer === correct) {
        flipInner.classList.add('kx-flipped');
        container.classList.add('kx-pulse-success');
        if (typeof kxScore !== 'undefined' && kxScore.current_pillar) {
          updateScore(kxScore.current_pillar, 100, 'drag-drop');
        }
        setTimeout(function() {
          container.classList.remove('kx-pulse-success');
        }, 3000);
      } else {
        dropZone.classList.add('kx-shake');
        dropZone.style.borderColor = 'var(--error)';
        if (typeof kxScore !== 'undefined' && kxScore.current_pillar) {
          updateScore(kxScore.current_pillar, -25, 'drag-drop');
        }
        setTimeout(function() {
          dropZone.classList.remove('kx-shake');
          dropZone.style.borderColor = '';
        }, 600);
      }
    });

    // Touch support
    var draggedChip = null;
    chips.forEach(function(chip) {
      chip.addEventListener('touchstart', function(e) {
        draggedChip = chip;
        chip.style.opacity = '0.5';
      });
    });

    document.addEventListener('touchend', function(e) {
      if (!draggedChip) return;
      draggedChip.style.opacity = '1';
      var touch = e.changedTouches[0];
      var dropRect = dropZone.getBoundingClientRect();
      if (touch.clientX >= dropRect.left && touch.clientX <= dropRect.right &&
          touch.clientY >= dropRect.top && touch.clientY <= dropRect.bottom) {
        var answer = draggedChip.getAttribute('data-answer');
        var correct = dropZone.getAttribute('data-correct');
        if (answer === correct) {
          flipInner.classList.add('kx-flipped');
          container.classList.add('kx-pulse-success');
          if (typeof kxScore !== 'undefined' && kxScore.current_pillar) {
            updateScore(kxScore.current_pillar, 100, 'drag-drop');
          }
          setTimeout(function() { container.classList.remove('kx-pulse-success'); }, 3000);
        } else {
          dropZone.classList.add('kx-shake');
          dropZone.style.borderColor = 'var(--error)';
          if (typeof kxScore !== 'undefined' && kxScore.current_pillar) {
            updateScore(kxScore.current_pillar, -25, 'drag-drop');
          }
          setTimeout(function() { dropZone.classList.remove('kx-shake'); dropZone.style.borderColor = ''; }, 600);
        }
      }
      draggedChip = null;
    });
  }

  // ============================================
  // Calibration Exercises
  // ============================================
  function initCalibration(container) {
    var buttons = container.querySelectorAll('.kx-cal-btn');
    var metricBar = container.querySelector('.kx-metric-fill');
    var metricVal = container.querySelector('.kx-metric-val');
    var toast = document.getElementById('kx-toast');
    var toastText = document.getElementById('kx-toast-text');

    buttons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        var feedback = btn.getAttribute('data-feedback');
        var val = parseInt(btn.getAttribute('data-metric'), 10);

        if (metricBar) metricBar.style.width = val + '%';
        if (metricVal) metricVal.textContent = val + '%';

        if (toast && toastText) {
          toastText.textContent = feedback;
          toast.classList.add('kx-toast-visible');
          setTimeout(function() { toast.classList.remove('kx-toast-visible'); }, 4000);
        }

        buttons.forEach(function(b) { b.classList.remove('kx-cal-active'); });
        btn.classList.add('kx-cal-active');

        // Score based on which button was clicked
        var isCorrectChoice = btn.getAttribute('data-feedback').indexOf('activated') > -1 ||
                              btn.getAttribute('data-feedback').indexOf('identified') > -1 ||
                              btn.getAttribute('data-feedback').indexOf('achieved') > -1 ||
                              btn.getAttribute('data-feedback').indexOf('injected') > -1 ||
                              btn.getAttribute('data-feedback').indexOf('confirmed') > -1;
        var points = isCorrectChoice ? 100 : -25;
        if (typeof kxScore !== 'undefined' && kxScore.current_pillar) {
          updateScore(kxScore.current_pillar, points, 'calibration');
        }
      });
    });
  }

  // ============================================
  // Accordion / Pulldown
  // ============================================
  function initAccordion(trigger) {
    trigger.addEventListener('click', function() {
      var accordion = trigger.closest('.kx-accordion');
      var content = accordion.querySelector('.kx-accordion-content');
      var icon = accordion.querySelector('.kx-accordion-icon');
      var isOpen = content.style.maxHeight && content.style.maxHeight !== '0px';

      if (isOpen) {
        content.style.maxHeight = '0px';
        icon.style.transform = 'rotate(0deg)';
      } else {
        content.style.maxHeight = content.scrollHeight + 'px';
        icon.style.transform = 'rotate(180deg)';
      }
    });
  }

  // ============================================
  // Three.js Spiral (Pillar 3 - Spectrograph of Intent)
  // ============================================
  function initSpiral() {
    var container = document.getElementById('kx-spiral-container');
    if (!container || typeof THREE === 'undefined') return;

    var width = container.clientWidth;
    var height = container.clientHeight || 280;

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 15;

    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.insertBefore(renderer.domElement, container.firstChild);

    var friction = 0.0;
    var targetFriction = 0.42;
    var goldenRose = new THREE.Color(0xB90538);
    var frictionColor = new THREE.Color(0x94a3b8);

    var particleCount = 1500;
    var positions = new Float32Array(particleCount * 3);
    var colors = new Float32Array(particleCount * 3);
    var sizes = new Float32Array(particleCount);

    var geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    var material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFriction: { value: 0 }
      },
      vertexShader: [
        'uniform float uTime;',
        'uniform float uFriction;',
        'attribute float size;',
        'varying vec3 vColor;',
        'void main() {',
        '  vColor = color;',
        '  vec3 pos = position;',
        '  if (uFriction > 0.05) {',
        '    pos.x += sin(pos.y + uTime * 2.0) * uFriction * 1.5;',
        '    pos.z += cos(pos.x + uTime * 2.0) * uFriction * 1.5;',
        '  }',
        '  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);',
        '  gl_PointSize = size * (40.0 / -mvPosition.z);',
        '  gl_Position = projectionMatrix * mvPosition;',
        '}'
      ].join('\n'),
      fragmentShader: [
        'varying vec3 vColor;',
        'void main() {',
        '  if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;',
        '  gl_FragColor = vec4(vColor, 0.85);',
        '}'
      ].join('\n'),
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    var points = new THREE.Points(geometry, material);
    scene.add(points);

    function updateSpiral() {
      var time = Date.now() * 0.001;
      var posAttr = geometry.attributes.position;
      var colAttr = geometry.attributes.color;
      var sizeAttr = geometry.attributes.size;

      for (var i = 0; i < particleCount; i++) {
        var t = (i / particleCount) * Math.PI * 24;
        var r = (i / particleCount) * 6 + 1.5;

        var x = Math.cos(t + time * 0.4) * r;
        var y = (i / particleCount - 0.5) * 12;
        var z = Math.sin(t + time * 0.4) * r;

        if (friction > 0.1) {
          var jitter = (friction - 0.1) * 4.0;
          x += (Math.random() - 0.5) * jitter;
          y += (Math.random() - 0.5) * jitter;
          z += (Math.random() - 0.5) * jitter;
        }

        posAttr.setXYZ(i, x, y, z);

        var lerpColor = new THREE.Color().copy(goldenRose).lerp(frictionColor, friction);
        colAttr.setXYZ(i, lerpColor.r, lerpColor.g, lerpColor.b);

        sizeAttr.setX(i, friction > 0.6 ? 1.5 : 2.5);
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    function animate() {
      requestAnimationFrame(animate);
      friction += (targetFriction - friction) * 0.05;
      material.uniforms.uFriction.value = friction;
      material.uniforms.uTime.value = Date.now() * 0.001;
      updateSpiral();
      points.rotation.y += 0.0015;
      renderer.render(scene, camera);
    }

    animate();

    // Slider connection
    var slider = document.getElementById('kx-noise-slider');
    var display = document.getElementById('kx-noise-display');
    if (slider) {
      slider.addEventListener('input', function() {
        targetFriction = parseInt(slider.value, 10) / 100;
        if (display) display.textContent = targetFriction.toFixed(2);
      });
    }

    // Resize handler
    window.addEventListener('resize', function() {
      var w = container.clientWidth;
      var h = container.clientHeight || 280;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
  }

  // ============================================
  // Intervention Sequencing (Pillar 2 - WEFE Nexus)
  // ============================================
  function initIntervention(container) {
    var items = container.querySelectorAll('.kx-toolkit-item');
    var slots = container.querySelectorAll('.kx-sequence-slot');
    var submitBtn = container.querySelector('.kx-intervention-submit');
    var feedbackEl = container.querySelector('.kx-intervention-feedback');
    var correctInput = container.querySelector('.kx-intervention-correct');
    var feedbackInput = container.querySelector('.kx-intervention-feedback-data');
    var draggedItem = null;
    var placedCount = 0;
    var submitted = false;

    function checkAllFilled() {
      placedCount = 0;
      slots.forEach(function(s) { if (s.getAttribute('data-placed')) placedCount++; });
      if (submitBtn) {
        submitBtn.disabled = placedCount < 3;
        submitBtn.style.opacity = placedCount < 3 ? '0.5' : '1';
        submitBtn.style.cursor = placedCount < 3 ? 'not-allowed' : 'pointer';
      }
    }

    items.forEach(function(item) {
      item.addEventListener('dragstart', function(e) {
        draggedItem = item;
        e.dataTransfer.setData('text/plain', item.getAttribute('data-id'));
        item.style.opacity = '0.5';
      });
      item.addEventListener('dragend', function() {
        item.style.opacity = '1';
        draggedItem = null;
      });
    });

    slots.forEach(function(slot) {
      slot.addEventListener('dragover', function(e) {
        e.preventDefault();
        slot.style.borderColor = 'var(--primary)';
        slot.style.background = 'rgba(185,5,56,0.05)';
      });
      slot.addEventListener('dragleave', function() {
        slot.style.borderColor = '';
        slot.style.background = '';
      });
      slot.addEventListener('drop', function(e) {
        e.preventDefault();
        slot.style.borderColor = '';
        slot.style.background = '';
        var id = e.dataTransfer.getData('text/plain');
        if (!id) return;
        var sourceItem = container.querySelector('.kx-toolkit-item[data-id="' + id + '"]');
        if (!sourceItem) return;
        var name = sourceItem.querySelector('.kx-label').textContent;
        slot.innerHTML = '<span class="kx-label" style="color:var(--primary);min-width:20px">' + (Array.from(slots).indexOf(slot) + 1) + '.</span><span class="kx-label" style="color:var(--on-surface)">' + name + '</span>';
        slot.setAttribute('data-placed', id);
        sourceItem.style.opacity = '0.4';
        sourceItem.setAttribute('draggable', 'false');
        checkAllFilled();
      });
    });

    if (submitBtn) {
      submitBtn.addEventListener('click', function() {
        if (submitted || placedCount < 3) return;
        submitted = true;
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.5';

        var sequence = [];
        slots.forEach(function(s) { sequence.push(s.getAttribute('data-placed')); });
        var correct = JSON.parse(correctInput.value);
        var feedback = JSON.parse(feedbackInput.value);
        var isCorrect = JSON.stringify(sequence) === JSON.stringify(correct);

        feedbackEl.style.display = 'block';
        if (isCorrect) {
          feedbackEl.style.background = 'rgba(74,222,128,0.15)';
          feedbackEl.style.border = '1px solid rgba(74,222,128,0.3)';
          feedbackEl.style.color = '#166534';
          feedbackEl.textContent = feedback.correct;
          if (typeof kxScore !== 'undefined' && kxScore.current_pillar) {
            updateScore(kxScore.current_pillar, 100, 'intervention');
          }
        } else {
          feedbackEl.style.background = 'rgba(244,63,94,0.15)';
          feedbackEl.style.border = '1px solid rgba(244,63,94,0.3)';
          feedbackEl.style.color = '#9f1239';
          feedbackEl.textContent = feedback.wrong_order || feedback.wrong_choice;
          if (typeof kxScore !== 'undefined' && kxScore.current_pillar) {
            updateScore(kxScore.current_pillar, -25, 'intervention');
          }
        }
        var toast = document.getElementById('kx-toast');
        var toastText = document.getElementById('kx-toast-text');
        if (toast && toastText) {
          toastText.textContent = isCorrect ? 'Sequence verified. Resonance updated.' : 'Thermodynamic deficit. Try again.';
          toast.classList.add('kx-toast-visible');
          setTimeout(function() { toast.classList.remove('kx-toast-visible'); }, 4000);
        }
      });
    }
  }

  // ============================================
  // Parameter Adjustment (Pillar 4 - Boltzmann Temp)
  // ============================================
  function initParameter(container) {
    var sliders = container.querySelectorAll('.kx-param-slider');
    sliders.forEach(function(slider) {
      slider.addEventListener('input', function() {
        var val = parseFloat(slider.value);
        var safeMin = parseFloat(slider.getAttribute('data-safe-min'));
        var safeMax = parseFloat(slider.getAttribute('data-safe-max'));
        var label = container.querySelector('.kx-param-val');
        var ctrl = slider.closest('.kx-param-control');
        if (label && ctrl === container.querySelectorAll('.kx-param-control')[0]) {
          label.textContent = val.toFixed(1) + slider.closest('.kx-param-control').querySelector('.kx-label').textContent.match(/°C|%$/)[0];
        }
        // Color feedback
        if (val >= safeMin && val <= safeMax) {
          slider.style.accentColor = 'var(--primary)';
        } else {
          slider.style.accentColor = 'var(--error)';
        }
      });
    });
  }

  // ============================================
  // Data Separation (Pillar 6 - Tombstone)
  // ============================================
  function initSeparation(container) {
    var items = container.querySelectorAll('.kx-data-item');
    var zones = container.querySelectorAll('.kx-separation-zone');
    var tombstoneBtn = container.querySelector('.kx-tombstone-btn');
    var draggedItem = null;

    items.forEach(function(item) {
      item.addEventListener('dragstart', function(e) {
        draggedItem = item;
        e.dataTransfer.setData('text/plain', item.getAttribute('data-id'));
        item.style.opacity = '0.5';
      });
      item.addEventListener('dragend', function() {
        item.style.opacity = '1';
        draggedItem = null;
      });
    });

    zones.forEach(function(zone) {
      zone.addEventListener('dragover', function(e) {
        e.preventDefault();
        zone.style.borderColor = 'var(--primary)';
      });
      zone.addEventListener('dragleave', function() {
        zone.style.borderColor = '';
      });
      zone.addEventListener('drop', function(e) {
        e.preventDefault();
        zone.style.borderColor = '';
        var id = e.dataTransfer.getData('text/plain');
        var sourceItem = container.querySelector('.kx-data-item[data-id="' + id + '"]');
        if (!sourceItem) return;
        var itemsContainer = zone.querySelector('.kx-separation-items');
        var clone = sourceItem.cloneNode(true);
        clone.style.cursor = 'default';
        clone.removeAttribute('draggable');
        itemsContainer.appendChild(clone);
        sourceItem.style.display = 'none';
      });
    });

    if (tombstoneBtn) {
      tombstoneBtn.addEventListener('click', function() {
        var causalItems = container.querySelector('.kx-separation-zone[data-zone="causal"] .kx-separation-items');
        var punitiveItems = container.querySelector('.kx-separation-zone[data-zone="punitive"] .kx-separation-items');
        var toast = document.getElementById('kx-toast');
        var toastText = document.getElementById('kx-toast-text');
        var allPlaced = causalItems.children.length > 0 && punitiveItems.children.length > 0;
        if (!allPlaced) {
          if (toast && toastText) {
            toastText.textContent = 'Not all punitive elements deprecated. Trauma loop still active.';
            toast.classList.add('kx-toast-visible');
            setTimeout(function() { toast.classList.remove('kx-toast-visible'); }, 4000);
          }
          return;
        }
        // Check correctness
        var causalCorrect = true;
        var punitiveCorrect = true;
        Array.from(causalItems.children).forEach(function(el) {
          if (el.getAttribute('data-type') !== 'causal') causalCorrect = false;
        });
        Array.from(punitiveItems.children).forEach(function(el) {
          if (el.getAttribute('data-type') !== 'punitive') punitiveCorrect = false;
        });
        if (toast && toastText) {
          if (causalCorrect && punitiveCorrect) {
            toastText.textContent = 'Error tombstoned. Historical record preserved. Retaliatory weight deprecated to 0%.';
          } else {
            toastText.textContent = 'Causal data contaminated with punitive currency. Remediation Layer failed.';
          }
          toast.classList.add('kx-toast-visible');
          setTimeout(function() { toast.classList.remove('kx-toast-visible'); }, 4000);
        }
      });
    }
  }

  // ============================================
  // Three-Way Consensus (Pillar 8 - P-Gate)
  // ============================================
  function initConsensus(container) {
    var pgateBtn = container.querySelector('.kx-pgate-btn');
    var hitlButtons = container.querySelectorAll('.kx-hitl-approve, .kx-hitl-modify, .kx-hitl-reject');
    var hitlVerdict = null;

    hitlButtons.forEach(function(btn) {
      btn.addEventListener('click', function() {
        hitlButtons.forEach(function(b) { b.style.borderColor = ''; b.style.background = ''; });
        btn.style.borderColor = 'var(--primary)';
        btn.style.background = 'rgba(185,5,56,0.1)';
        hitlVerdict = btn.classList.contains('kx-hitl-approve') ? 'APPROVE' : (btn.classList.contains('kx-hitl-modify') ? 'CONDITIONAL' : 'REJECT');
        // Update the Human Intent verdict display
        var feedCards = container.querySelectorAll('.kx-feed-card');
        feedCards.forEach(function(card) {
          if (card.querySelector('.kx-label').textContent === 'Human Intent') {
            var verdictSpan = card.querySelectorAll('.kx-label')[1];
            if (verdictSpan) {
              verdictSpan.textContent = hitlVerdict;
              verdictSpan.style.color = hitlVerdict === 'APPROVE' ? 'var(--primary)' : (hitlVerdict === 'CONDITIONAL' ? 'var(--tertiary)' : 'var(--error)');
            }
          }
        });
      });
    });

    if (pgateBtn) {
      pgateBtn.addEventListener('click', function() {
        var toast = document.getElementById('kx-toast');
        var toastText = document.getElementById('kx-toast-text');
        if (!hitlVerdict) {
          if (toast && toastText) {
            toastText.textContent = 'Consensus incomplete. All three feeds must align before physicalization.';
            toast.classList.add('kx-toast-visible');
            setTimeout(function() { toast.classList.remove('kx-toast-visible'); }, 4000);
          }
          return;
        }
        if (toast && toastText) {
          if (hitlVerdict === 'APPROVE') {
            toastText.textContent = 'P-Gate unlocked. Human ethical intent aligned with objective capacity. Tripartite consensus achieved.';
            pgateBtn.innerHTML = '<span class="dashicons dashicons-unlock" style="font-size:16px"></span> P-Gate Unlocked';
            pgateBtn.style.background = 'var(--primary)';
            pgateBtn.style.color = 'var(--on-primary)';
          } else {
            toastText.textContent = 'P-Gate locked. Proposal cannot be universalized without causing systemic collapse.';
          }
          toast.classList.add('kx-toast-visible');
          setTimeout(function() { toast.classList.remove('kx-toast-visible'); }, 4000);
        }
      });
    }
  }

  // ============================================
  // Score Update System
  // ============================================
  var scoredExercises = {};

  function updateScore(pillar, points, exerciseType) {
    if (typeof kxScore === 'undefined' || !kxScore.user_id) return;
    var scoreKey = pillar + '_' + exerciseType;
    if (scoredExercises[scoreKey]) return;
    scoredExercises[scoreKey] = true;

    var data = new FormData();
    data.append('action', 'kx_update_score');
    data.append('nonce', kxScore.nonce);
    data.append('pillar', pillar);
    data.append('points', points);
    data.append('exercise_type', exerciseType);

    fetch(kxScore.ajax_url, { method: 'POST', body: data })
      .then(function(r) { return r.json(); })
      .then(function(resp) {
        if (resp.success) {
          if (resp.data.already_scored) return;
          var scoreEl = document.getElementById('kx-total-score');
          if (scoreEl) scoreEl.textContent = resp.data.total;
          updateBadge(resp.data.completed_pillars || []);
        }
      });
  }

  function updateBadge(completedPillars) {
    var items = document.querySelectorAll('.kx-badge-item');
    if (!items.length) return;

    var sorted = completedPillars.slice().sort();
    var highest = 0;
    for (var i = 0; i < sorted.length; i++) {
      for (var j = 0; j < items.length; j++) {
        if (items[j].getAttribute('data-pillar') === sorted[i]) {
          var num = parseInt(items[j].getAttribute('data-num'), 10);
          if (num === highest + 1) highest = num;
        }
      }
    }

    items.forEach(function(item) {
      var num = parseInt(item.getAttribute('data-num'), 10);
      var isUnlocked = num <= highest;
      item.style.opacity = isUnlocked ? '1' : '0.35';
      item.style.borderColor = isUnlocked ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)';

      if (isUnlocked && !item.querySelector('img')) {
        var slug = item.getAttribute('data-pillar');
        var img = document.createElement('img');
        img.src = (typeof kxScore !== 'undefined' ? kxScore.badge_url : '') + 'assets/badges/pillar' + num + '-badge100.png';
        img.alt = 'Pillar ' + num + ' Badge';
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
        item.innerHTML = '';
        item.appendChild(img);
      }
    });
  }

  // ============================================
  // Mouse-move depth effect on glass panels
  // ============================================
  function initDepthEffect() {
    document.addEventListener('mousemove', function(e) {
      var panels = document.querySelectorAll('.kx-card--glass');
      panels.forEach(function(panel) {
        var rect = panel.getBoundingClientRect();
        var dx = (e.clientX - (rect.left + rect.width / 2)) * 0.003;
        var dy = (e.clientY - (rect.top + rect.height / 2)) * 0.003;
        panel.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      });
    });
  }

  // ============================================
  // Init on DOMContentLoaded
  // ============================================
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.kx-accordion-trigger').forEach(initAccordion);
    document.querySelectorAll('.kx-exercise-dragdrop').forEach(initDragDrop);
    document.querySelectorAll('.kx-exercise-calibration').forEach(initCalibration);
    document.querySelectorAll('.kx-exercise-intervention').forEach(initIntervention);
    document.querySelectorAll('.kx-exercise-parameter').forEach(initParameter);
    document.querySelectorAll('.kx-exercise-separation').forEach(initSeparation);
    document.querySelectorAll('.kx-exercise-consensus').forEach(initConsensus);
    initSpiral();
    initDepthEffect();
  });
})();