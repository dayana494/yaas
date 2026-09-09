import { forwardRef } from 'react';

const Logo = forwardRef(function Logo({ className = '' }, ref) {
  return (
    <span ref={ref} className={`logo-text ${className}`.trim()} aria-label="YAAS">
      YAAS
    </span>
  );
});

export default Logo;
