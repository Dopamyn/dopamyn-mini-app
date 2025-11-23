import { Info } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface TooltipInfoProps {
  text: string;
  className?: string;
  icon?: React.ReactNode;
}

const TooltipInfo: React.FC<TooltipInfoProps> = ({
  text,
  className = "",
  icon,
}) => {
  const [show, setShow] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const iconRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && iconRef.current && tooltipRef.current) {
      const iconRect = iconRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      let left = "50%";
      let translateX = "-50%";

      // If tooltip would overflow right
      if (iconRect.left + tooltipRect.width / 2 > viewportWidth) {
        left = "100%";
        translateX = "-100%";
      }
      // If tooltip would overflow left
      else if (iconRect.left - tooltipRect.width / 2 < 0) {
        left = "0";
        translateX = "0";
      }

      setTooltipStyle({
        left,
        transform: `translateX(${translateX})`,
      });
    }
  }, [show, text]);

  return (
    <span
      className={`relative inline-block animate-in fade-in-0 duration-300 ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      tabIndex={0}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      style={{ outline: "none" }}
      ref={iconRef}
    >
      {/* <span
        className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-700 text-white text-xs font-bold cursor-pointer border border-gray-500 hover:bg-accent-brand hover:text-gray-900 transition-colors select-none"
        aria-label="Show info"
      > */}
      {icon ?? <Info className="h-4 w-4" />}
      {/* </span> */}
      {show && (
        <span
          ref={tooltipRef}
          className="absolute z-50 mt-2 w-max max-w-xs bg-gray-900 text-gray-100 text-xs rounded-lg shadow-lg px-3 py-2 border border-gray-700 whitespace-pre-line transition-opacity duration-200 opacity-0 animate-in fade-in-0 opacity-100"
          style={tooltipStyle}
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default TooltipInfo;
