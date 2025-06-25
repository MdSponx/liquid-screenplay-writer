import { useEffect, useRef } from 'react';
import { Block } from '../types';

const FORMAT_BUTTONS_HEIGHT = 80;
const HEADER_HEIGHT = 112;
const SMOOTH_SCROLL_DURATION = 300;
const MANUAL_SCROLL_TIMEOUT = 1000;

export const useAutoScroll = (
  activeBlock: string | null,
  blocks: Block[],
  blockRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>,
) => {
  const isManualScrolling = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout>();
  const scrollAnimation = useRef<number>();
  const lastScrollPosition = useRef(0);
  const lastTypingTime = useRef(Date.now());

  const easeOutQuint = (t: number): number => {
    return 1 - Math.pow(1 - t, 5);
  };

  const smoothScrollTo = (element: HTMLElement, targetScroll: number) => {
    const startScroll = element.scrollTop;
    const distance = targetScroll - startScroll;
    const startTime = performance.now();

    const animateScroll = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / SMOOTH_SCROLL_DURATION, 1);

      const eased = easeOutQuint(progress);
      const currentScroll = startScroll + (distance * eased);
      element.scrollTop = currentScroll;
      lastScrollPosition.current = currentScroll;

      if (progress < 1) {
        scrollAnimation.current = requestAnimationFrame(animateScroll);
      }
    };

    if (scrollAnimation.current) {
      cancelAnimationFrame(scrollAnimation.current);
    }
    scrollAnimation.current = requestAnimationFrame(animateScroll);
  };

  // Handle manual scrolling detection
  useEffect(() => {
    const handleScroll = () => {
      isManualScrolling.current = true;
      lastTypingTime.current = Date.now();
      
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      
      scrollTimeout.current = setTimeout(() => {
        isManualScrolling.current = false;
      }, MANUAL_SCROLL_TIMEOUT);
    };

    window.addEventListener('wheel', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      if (scrollAnimation.current) {
        cancelAnimationFrame(scrollAnimation.current);
      }
    };
  }, []);

  // Handle active block changes
  useEffect(() => {
    if (!activeBlock) return;

    const activeElement = blockRefs.current[activeBlock];
    if (!activeElement) return;

    const scrollContainer = document.querySelector('.screenplay-content');
    if (!scrollContainer) return;

    const checkAndCenterPosition = () => {
      const timeSinceManualScroll = Date.now() - lastTypingTime.current;
      if (isManualScrolling.current && timeSinceManualScroll < MANUAL_SCROLL_TIMEOUT) {
        return;
      }

      const containerRect = scrollContainer.getBoundingClientRect();
      const elementRect = activeElement.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      const availableHeight = viewportHeight - HEADER_HEIGHT - FORMAT_BUTTONS_HEIGHT;
      const targetCenter = HEADER_HEIGHT + (availableHeight / 2);
      const elementCenter = elementRect.top + (elementRect.height / 2);

      const scrollAdjustment = elementCenter - targetCenter;
      const targetScroll = scrollContainer.scrollTop + scrollAdjustment;

      if (Math.abs(scrollAdjustment) > elementRect.height / 2) {
        smoothScrollTo(scrollContainer as HTMLElement, targetScroll);
      }
    };

    const observer = new MutationObserver(() => {
      lastTypingTime.current = Date.now();
      checkAndCenterPosition();
    });

    observer.observe(activeElement, {
      characterData: true,
      childList: true,
      subtree: true
    });

    checkAndCenterPosition();

    return () => observer.disconnect();
  }, [activeBlock, blocks]);
};