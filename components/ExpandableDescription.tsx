import { useState } from "react";

export default function ExpandableDescription({
  description,
}: {
  description: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const maxLength = 80;

  if (description.length <= maxLength) {
    return <p className="text-gray-300 text-sm mb-4">{description}</p>;
  }

  return (
    <div className="text-gray-300 text-sm mb-4">
      {isExpanded ? description : `${description.slice(0, maxLength)}...`}
      <button
        onClick={(e) => {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }}
        className="ml-1 text-accent-brand hover:text-[#00F5A8] font-medium transition-colors"
      >
        {isExpanded ? "Read less" : "Read more"}
      </button>
    </div>
  );
}
