'use client';

import * as React from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import styles from "./carousel.module.css";
const CarouselContext = React.createContext(null);
function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within a <Carousel />');
  }
  return context;
}
function Carousel({
  orientation = 'horizontal',
  opts,
  setApi,
  plugins,
  className,
  children,
  ...props
}) {
  const [carouselRef, api] = useEmblaCarousel({
    ...opts,
    axis: orientation === 'horizontal' ? 'x' : 'y'
  }, plugins);
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const onSelect = React.useCallback(api => {
    if (!api) return;
    setCanScrollPrev(api.canScrollPrev());
    setCanScrollNext(api.canScrollNext());
  }, []);
  const scrollPrev = React.useCallback(() => {
    api?.scrollPrev();
  }, [api]);
  const scrollNext = React.useCallback(() => {
    api?.scrollNext();
  }, [api]);
  const handleKeyDown = React.useCallback(event => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollPrev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollNext();
    }
  }, [scrollPrev, scrollNext]);
  React.useEffect(() => {
    if (!api || !setApi) return;
    setApi(api);
  }, [api, setApi]);
  React.useEffect(() => {
    if (!api) return;
    onSelect(api);
    api.on('reInit', onSelect);
    api.on('select', onSelect);
    return () => {
      api?.off('select', onSelect);
    };
  }, [api, onSelect]);
  return <CarouselContext.Provider value={{
    carouselRef,
    api: api,
    opts,
    orientation: orientation || (opts?.axis === 'y' ? 'vertical' : 'horizontal'),
    scrollPrev,
    scrollNext,
    canScrollPrev,
    canScrollNext
  }}>
      <div onKeyDownCapture={handleKeyDown} className={cn(styles["carousel-class-1"], className)} role="region" aria-roledescription="carousel" data-slot="carousel" {...props}>
        {children}
      </div>
    </CarouselContext.Provider>;
}
function CarouselContent({
  className,
  ...props
}) {
  const {
    carouselRef,
    orientation
  } = useCarousel();
  return <div ref={carouselRef} className={styles["carousel-class-2"]} data-slot="carousel-content">
      <div className={cn(styles["carousel-class-3"], orientation === 'horizontal' ? styles["carousel-class-4"] : styles["carousel-class-5"], className)} {...props} />
    </div>;
}
function CarouselItem({
  className,
  ...props
}) {
  const {
    orientation
  } = useCarousel();
  return <div role="group" aria-roledescription="slide" data-slot="carousel-item" className={cn(styles["carousel-class-6"], orientation === 'horizontal' ? styles["carousel-class-7"] : styles["carousel-class-8"], className)} {...props} />;
}
function CarouselPrevious({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}) {
  const {
    orientation,
    scrollPrev,
    canScrollPrev
  } = useCarousel();
  return <Button data-slot="carousel-previous" variant={variant} size={size} className={cn(styles["carousel-class-9"], orientation === 'horizontal' ? styles["carousel-class-10"] : styles["carousel-class-11"], className)} disabled={!canScrollPrev} onClick={scrollPrev} {...props}>
      <ArrowLeft />
      <span className={styles["carousel-class-12"]}>Previous slide</span>
    </Button>;
}
function CarouselNext({
  className,
  variant = 'outline',
  size = 'icon',
  ...props
}) {
  const {
    orientation,
    scrollNext,
    canScrollNext
  } = useCarousel();
  return <Button data-slot="carousel-next" variant={variant} size={size} className={cn(styles["carousel-class-9"], orientation === 'horizontal' ? styles["carousel-class-13"] : styles["carousel-class-14"], className)} disabled={!canScrollNext} onClick={scrollNext} {...props}>
      <ArrowRight />
      <span className={styles["carousel-class-12"]}>Next slide</span>
    </Button>;
}
export { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext };
