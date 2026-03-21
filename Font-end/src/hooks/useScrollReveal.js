import { useEffect, useRef } from 'react';

/**
 * Hook to trigger animations when elements scroll into view.
 * @param {Object} options - IntersectionObserver options
 * @returns {React.MutableRefObject} Ref to attach to the element
 */
export const useScrollReveal = (options = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }) => {
    const ref = useRef(null);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                element.classList.add('is-revealed');
                // Optional: Stop observing after reveal if you only want it to happen once
                observer.unobserve(element);
            }
        }, options);

        observer.observe(element);

        return () => {
            if (element) {
                observer.unobserve(element);
            }
        };
    }, [options]);

    return ref;
};

export default useScrollReveal;
