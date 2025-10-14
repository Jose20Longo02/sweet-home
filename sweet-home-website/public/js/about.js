// Make marquee rows truly seamless by ensuring content is duplicated
// until track width >= 2x container width, then set duration by distance/speed
(function(){
  const SPEED_PX_PER_SEC = 40; // pleasant constant speed

  document.querySelectorAll('.marquee').forEach((wrap) => {
    const track = wrap.querySelector('.track');
    if (!track) return;

    // Check if this is a static display (3 or fewer members)
    const memberCount = parseInt(wrap.getAttribute('data-member-count'), 10);
    if (memberCount <= 3) {
      // Skip animation setup for static displays
      return;
    }

    // Build up content
    const containerWidth = wrap.clientWidth;
    let trackWidth = Array.from(track.children).reduce((w, el) => w + el.getBoundingClientRect().width, 0);

    if (track.children.length === 0) return;

    // Duplicate content until at least 2x container width
    // This prevents visible gaps when looping.
    let safety = 0;
    while (trackWidth < containerWidth * 2 && safety < 20) {
      Array.from(track.children).forEach((node) => {
        track.appendChild(node.cloneNode(true));
      });
      trackWidth = Array.from(track.children).reduce((w, el) => w + el.getBoundingClientRect().width, 0);
      safety++;
    }

    // Compute half-width distance (we animate 0 -> -50% for a seamless loop)
    // Duration = distance / speed
    const halfDistance = trackWidth / 2;
    const durationSec = Math.max(10, halfDistance / SPEED_PX_PER_SEC);

    track.style.animationDuration = durationSec + 's';

    // Pause on hover/touch-hold
    let holding = false;
    const pause = () => { track.style.animationPlayState = 'paused'; };
    const resume = () => { if (!holding) track.style.animationPlayState = 'running'; };
    wrap.addEventListener('mouseenter', pause);
    wrap.addEventListener('mouseleave', resume);
    wrap.addEventListener('touchstart', () => { holding = true; pause(); }, { passive: true });
    wrap.addEventListener('touchend', () => { holding = false; resume(); }, { passive: true });
  });
})();


