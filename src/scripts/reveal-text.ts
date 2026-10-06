/** A brief lead-in lets the page register before the hero starts revealing. */
export const TEXT_REVEAL_LEAD_IN_MS = 180;

/** A deterministic, one-shot sweep across complete lines of hero text. */
export async function revealText(targets: HTMLElement[]): Promise<void> {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || document.hidden) {
    document.body.classList.add('landing-text-ready');
    return;
  }

  let headingIndex = 0;
  const animations = targets.map((target) => {
    const heading = target.dataset.textReveal === 'heading';
    // Clip the complete text block: every wrapped line shares one sweep edge.
    return target.animate(
      [
        { clipPath: 'inset(-0.12em 100% -0.12em -0.05em)', opacity: 0.35 },
        { clipPath: 'inset(-0.12em -0.05em -0.12em -0.05em)', opacity: 1 },
      ],
      {
        duration: 620,
        delay: TEXT_REVEAL_LEAD_IN_MS + (heading ? headingIndex++ * 140 : 320),
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        fill: 'both',
      },
    );
  });

  // Reveal only after the first animation frame's styles are installed.
  document.body.classList.add('landing-text-ready');

  // Finish immediately if the tab is hidden or motion preferences change.
  const finish = () => animations.forEach((animation) => animation.finish());
  const onVisibility = () => {
    if (document.hidden) finish();
  };
  const onMotion = () => {
    if (motion.matches) finish();
  };
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', onMotion);

  try {
    await Promise.all(animations.map((animation) => animation.finished));
  } finally {
    document.removeEventListener('visibilitychange', onVisibility);
    motion.removeEventListener('change', onMotion);
    animations.forEach((animation) => animation.cancel());
  }
}
