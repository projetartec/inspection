import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const portraitMql = window.matchMedia("(orientation: portrait)");
    const widthMql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const onChange = () => {
      // Consider it mobile only if width is small AND orientation is portrait
      setIsMobile(widthMql.matches && portraitMql.matches);
    };

    portraitMql.addEventListener("change", onChange);
    widthMql.addEventListener("change", onChange);
    
    // Initial check
    onChange();

    return () => {
        portraitMql.removeEventListener("change", onChange);
        widthMql.removeEventListener("change", onChange);
    }
  }, [])

  return !!isMobile
}
