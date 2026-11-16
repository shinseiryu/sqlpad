import React, { useCallback, useState } from 'react';

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * Tracks an element's rendered size (border box, as getBoundingClientRect
 * reports it) with a ResizeObserver. Attach the returned callback ref to the
 * element to measure. Until the first measurement, `initialSize` is returned.
 */
export function useElementSize<T extends Element = HTMLDivElement>(
  initialSize: ElementSize = { width: -1, height: -1 },
): [(element: T | null) => (() => void) | undefined, ElementSize] {
  const [size, setSize] = useState<ElementSize>(initialSize);

  const ref = useCallback((element: T | null) => {
    if (!element) {
      return undefined;
    }
    const measure = () => {
      const { width, height } = element.getBoundingClientRect();
      setSize((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}

interface MeasureProps {
  onResize: (size: ElementSize) => void;
  children: (args: {
    measureRef: (element: HTMLDivElement | null) => (() => void) | undefined;
  }) => React.ReactNode;
}

/**
 * Render-prop form of useElementSize for class components.
 */
export function Measure({ onResize, children }: MeasureProps) {
  const [measureRef, size] = useElementSize();
  const { width, height } = size;

  React.useEffect(() => {
    if (width >= 0 && height >= 0) {
      onResize({ width, height });
    }
    // onResize identity is not stable for callers; react to size only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  return <>{children({ measureRef })}</>;
}
