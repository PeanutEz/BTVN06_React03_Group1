import { type HTMLAttributes, type Ref, forwardRef } from "react";
import { cn } from "@/lib/utils";

// ─── PageContainer ────────────────────────────────────────────────────────────
// Reusable layout container for all client-facing pages.
//
// Usage:
//   <PageContainer>                    — centered, 1280 px max-width, responsive padding
//   <PageContainer fluid>              — full-bleed (no max-width), same h-padding
//   <PageContainer as="section">       — renders as <section> instead of <div>
//   <PageContainer className="py-16">  — add extra spacing
//
// Product grid helper:
//   Wrap children in the `grid` utility from this file for a 4-col responsive grid.
// ──────────────────────────────────────────────────────────────────────────────

type ContainerSize = "sm" | "md" | "lg" | "xl" | "2xl";

const MAX_WIDTHS: Record<ContainerSize, string> = {
  sm:  "max-w-2xl",        // 672 px  — auth / narrow forms
  md:  "max-w-4xl",        // 896 px  — article / checkout
  lg:  "max-w-5xl",        // 1024 px — medium pages
  xl:  "max-w-[1280px]",   // 1280 px — default (matches spec)
  "2xl": "max-w-screen-2xl", // 1536 px — ultra-wide
};

// Horizontal padding is always responsive: 16px → 24px → 32px
const PADDING = "px-4 sm:px-6 lg:px-8";

interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  /** Remove max-width constraint for full-bleed hero sections */
  fluid?: boolean;
  /** Container max-width preset. Defaults to "xl" (1280 px) */
  size?: ContainerSize;
  /** HTML element to render. Defaults to "div" */
  as?: "div" | "section" | "article" | "aside" | "main";
}

/**
 * CenterContainer — centered, max-w-[1280px], responsive px padding.
 * Use for every page section that must be constrained to the content column.
 */
const PageContainer = forwardRef<HTMLElement, PageContainerProps>(
  (
    {
      fluid = false,
      size = "xl",
      as: Tag = "div",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Tag
        // @ts-expect-error — forwardRef on polymorphic tag
        ref={ref}
        className={cn(
          "w-full",
          PADDING,
          !fluid && "mx-auto",
          !fluid && MAX_WIDTHS[size],
          className
        )}
        {...props}
      >
        {children}
      </Tag>
    );
  }
);

PageContainer.displayName = "PageContainer";

// ─── ProductGrid ──────────────────────────────────────────────────────────────
// Pre-wired 4-column responsive grid matching the ecommerce spec.
// Desktop: 4 cols | Tablet: 3 cols | Mobile (≥480): 2 cols | Mobile: 1 col
// ──────────────────────────────────────────────────────────────────────────────

interface ProductGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Override the default gap between cards */
  gap?: string;
}

const ProductGrid = forwardRef<HTMLDivElement, ProductGridProps>(
  ({ gap = "gap-5 sm:gap-6", className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "grid",
        "grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
        gap,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

ProductGrid.displayName = "ProductGrid";

// ─── PageSection ──────────────────────────────────────────────────────────────
// Thin wrapper that combines PageContainer + vertical rhythm.
// Use for each logical section on a page (hero, featured, categories…).
// ──────────────────────────────────────────────────────────────────────────────

interface PageSectionProps extends PageContainerProps {
  /** Vertical padding. Defaults to "py-12 sm:py-16" */
  spacing?: string;
}

const PageSection = forwardRef<HTMLElement, PageSectionProps>(
  ({ spacing = "py-12 sm:py-16", className, children, as = "section", ...rest }, ref) => (
    <PageContainer
      ref={ref as Ref<HTMLElement>}
      as={as}
      className={cn(spacing, className)}
      {...rest}
    >
      {children}
    </PageContainer>
  )
);

PageSection.displayName = "PageSection";

// ─── SectionHeader ────────────────────────────────────────────────────────────
// Consistent heading + optional sub-heading + optional action link row.
// ──────────────────────────────────────────────────────────────────────────────

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-6 sm:mb-8", className)}>
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm sm:text-base text-gray-500">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export { PageContainer, ProductGrid, PageSection, SectionHeader };
export type {
  PageContainerProps,
  ProductGridProps,
  PageSectionProps,
  SectionHeaderProps,
};
