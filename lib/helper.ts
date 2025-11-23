import { TokenDataItem } from "@/lib/cashtag.types";

const timeUnits = [
  { unit: "y", seconds: 31536000 }, // years
  { unit: "mo", seconds: 2628000 }, // months
  { unit: "d", seconds: 86400 }, // days
  { unit: "h", seconds: 3600 }, // hours
  { unit: "m", seconds: 60 }, // minutes
  { unit: "s", seconds: 1 }, // seconds
];

export const convertMillisecondsToAge = (seconds: number, steps = 1) => {
  const age = [];
  let remainingSeconds = seconds;

  for (const timeUnit of timeUnits) {
    if (remainingSeconds >= timeUnit.seconds) {
      const count = Math.floor(remainingSeconds / timeUnit.seconds);
      age.push(`${count}${timeUnit.unit}`);
      remainingSeconds %= timeUnit.seconds;
    }
    if (age?.length === steps) break;
  }

  return age.join(" ");
};

export function formatAge(hours: number): string {
  if (hours > 24 && hours % 24 === 0) {
    return `${hours / 24} day${hours / 24 > 1 ? "s" : ""}`;
  }
  return `${hours} hour${hours > 1 ? "s" : ""}`;
}

export const formatNumber = (num: number) => {
  const abbreviations = ["", "K", "M", "B", "T"];
  let index = 0;

  if (typeof num === "string") {
    num = parseFloat(num);
  }

  if (
    num === null ||
    num === undefined ||
    typeof num !== "number" ||
    isNaN(num) ||
    !isFinite(num)
  ) {
    return "0";
  } else if (Math.abs(num) > 100000000000000) {
    return num > 0 ? ">100T" : "<-100T";
  }

  const isNegative = num < 0;
  num = Math.abs(num);

  while (num >= 1000 && index < abbreviations.length - 1) {
    num /= 1000;
    index++;
  }

  const formatted = num.toFixed(1);
  const result = formatted.endsWith(".0")
    ? formatted.slice(0, -2) + abbreviations[index]
    : formatted + abbreviations[index];

  return isNegative ? `-${result}` : result;
};

export const formatNumber2 = (num: number) => {
  const abbreviations = ["", "K", "M", "B", "T"];
  let index = 0;

  if (typeof num === "string") {
    num = parseFloat(num);
  }

  if (
    num === null ||
    num === undefined ||
    typeof num !== "number" ||
    isNaN(num) ||
    !isFinite(num)
  ) {
    return "0";
  } else if (Math.abs(num) > 100000000000000) {
    return num > 0 ? ">100T" : "<-100T";
  }

  const isNegative = num < 0;
  num = Math.abs(num);

  while (num >= 1000 && index < abbreviations.length - 1) {
    num /= 1000;
    index++;
  }

  const formatted = num.toFixed(2);
  const result =
    formatted.endsWith(".0") || formatted.endsWith(".00")
      ? formatted.slice(0, formatted.indexOf(".")) + abbreviations[index]
      : formatted + abbreviations[index];

  return isNegative ? `-${result}` : result;
};

export const formatX = (num: number) => {
  const abbreviations = ["", "M", "T"];
  let index = 0;

  if (typeof num === "string") {
    num = parseFloat(num);
  }

  if (
    num === null ||
    num === undefined ||
    typeof num !== "number" ||
    isNaN(num) ||
    !isFinite(num)
  ) {
    return "0";
  } else if (num > 100000000000000) {
    return ">100T";
  }

  while (num >= 1000000 && index < abbreviations?.length - 1) {
    num /= 1000000;
    index++;
  }

  const formatted = num.toFixed(1);
  return formatted.endsWith(".0")
    ? formatted.slice(0, -2) + abbreviations[index]
    : formatted + abbreviations[index];
};

export const truncateText = (text: string, maxLength: number) => {
  if (text == null) {
    return "";
  }
  if (text?.length > maxLength) {
    return `${text.slice(0, maxLength - 2)}...`;
  }
  return text;
};

export const convertMillisecondsToHumanReadable = (timestamp: number) => {
  const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
  const timeDifference = Math.abs(currentTime - timestamp); // Difference in seconds

  const days = Math.floor(timeDifference / (3600 * 24)); // Calculate days
  const hours = Math.floor((timeDifference % (3600 * 24)) / 3600); // Remaining hours
  const minutes = Math.floor((timeDifference % 3600) / 60); // Remaining minutes
  const seconds = timeDifference % 60; // Remaining seconds

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m ${seconds}s`;
  }
};

export const convertsecondsToHumanReadable = (ageInSeconds: number) => {
  let seconds = ageInSeconds;
  const secondsInYear = 365.25 * 24 * 60 * 60;
  const secondsInMonth = 30.44 * 24 * 60 * 60;

  const years = Math.floor(seconds / secondsInYear);
  seconds %= secondsInYear;

  const months = Math.floor(seconds / secondsInMonth);
  seconds %= secondsInMonth;

  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= 24 * 60 * 60;

  const hours = Math.floor(seconds / (60 * 60));
  seconds %= 60 * 60;

  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const formattedAge = [];

  if (years > 0) formattedAge.push(`${years}y`);
  if (months > 0) formattedAge.push(`${months}m`);
  if (days > 0) formattedAge.push(`${days}d`);
  if (hours > 0) formattedAge.push(`${hours}h`);
  if (minutes > 0) formattedAge.push(`${minutes}m`);
  if (seconds > 0) formattedAge.push(`${seconds}s`);

  // If no time components were greater than zero, return '0s'
  return formattedAge.slice(0, 2).join(" ") || "-";
};

export const convertIsoToHumanReadable = (Timestamp: string | number) => {
  const timeUnitsWithDaysAndYears = [
    { unit: "y", seconds: 365 * 24 * 60 * 60 },
    { unit: "mo", seconds: 2628000 },
    { unit: "d", seconds: 24 * 60 * 60 },
    { unit: "h", seconds: 60 * 60 },
    { unit: "m", seconds: 60 },
    { unit: "s", seconds: 1 },
  ];

  const age = [];
  const currentTime = new Date().getTime();
  const givenTime = new Date(Timestamp).getTime();
  let remainingSeconds = Math.floor((currentTime - givenTime) / 1000); // Convert to seconds

  for (const timeUnit of timeUnitsWithDaysAndYears) {
    if (remainingSeconds >= timeUnit.seconds) {
      const count = Math.floor(remainingSeconds / timeUnit.seconds);
      age.push(`${count}${timeUnit.unit}`);
      remainingSeconds %= timeUnit.seconds;
    }
    // Stop once we have two time units (e.g., '2d 5h')
    if (age.length === 2) break;
  }

  return age.join(" ");
};

export const convertIsoToHumanReadableUnit = (
  Timestamp: string | number,
  ageLength: number = 1,
  trading_since?: string | number
) => {
  const timeUnitsWithDaysAndYears = [
    { unit: "y", seconds: 365 * 24 * 60 * 60 },
    { unit: "M", seconds: 2628000 },
    { unit: "d", seconds: 24 * 60 * 60 },
    { unit: "h", seconds: 60 * 60 },
    { unit: "m", seconds: 60 },
    { unit: "s", seconds: 1 },
  ];

  const age = [];
  const currentTime = new Date().getTime();
  const givenTime = new Date(Timestamp + "Z").getTime();
  let remainingSeconds = 0;
  if (trading_since) {
    const launchDate = new Date(Number(trading_since) * 1000).getTime();
    remainingSeconds = Math.abs(Math.floor((givenTime - launchDate) / 1000)); // Convert to seconds
  } else {
    remainingSeconds = Math.floor((currentTime - givenTime) / 1000); // Convert to seconds
  }

  for (const timeUnit of timeUnitsWithDaysAndYears) {
    if (remainingSeconds >= timeUnit.seconds) {
      const count = Math.floor(remainingSeconds / timeUnit.seconds);
      age.push(`${count}${timeUnit.unit}`);
      remainingSeconds %= timeUnit.seconds;
    }
    if (age.length === ageLength) break;
  }
  return age.join(" ");
};

export const getSubtractedValue = (aTime: string) => {
  const unit = aTime.slice(-1);
  const value = parseInt(aTime.slice(0, -1));

  switch (unit) {
    case "d":
      return value * 60 * 60 * 24;
    case "h":
      return value * 60 * 60;
    default:
      return value * 60 * 60; // or handle the default case as needed
  }
};

export const convertSecondsToFormattedUnit = (ageInSeconds: number) => {
  let seconds = ageInSeconds;
  const secondsInYear = 365.25 * 24 * 60 * 60;
  const secondsInMonth = 30.44 * 24 * 60 * 60;

  const years = Math.floor(seconds / secondsInYear);
  seconds %= secondsInYear;

  const months = Math.floor(seconds / secondsInMonth);
  seconds %= secondsInMonth;

  const days = Math.floor(seconds / (24 * 60 * 60));
  seconds %= 24 * 60 * 60;

  const hours = Math.floor(seconds / (60 * 60));
  seconds %= 60 * 60;

  const minutes = Math.floor(seconds / 60);
  seconds = Math.floor(seconds % 60);

  const formattedAge = [];
  // if (years > 0) {
  //   formattedAge.push(`${years}y`);
  //   if (months > 0) {
  //     formattedAge.push(`${months}m`);
  //   }
  // } else if (months > 0) {
  //   formattedAge.push(`${months}M`);
  // } else if (days > 0) {
  //   formattedAge.push(`${days}d`);
  // } else if (hours > 0) {
  //   formattedAge.push(`${hours}h`);
  // } else if (minutes > 0) {
  //   formattedAge.push(`${minutes}m`);
  // } else if (seconds > 0) {
  //   formattedAge.push(`${seconds}s`);
  // } else {
  //   formattedAge.push(`0s`); // If all units are zero
  // }

  if (years > 0) {
    formattedAge.push(`${years}y`);
    if (months > 0) {
      formattedAge.push(`${months}m`);
    }
  } else if (months > 0) {
    formattedAge.push(`${months}m`);
    if (days > 0) {
      formattedAge.push(`${days}d`);
    }
  } else if (days > 0) {
    formattedAge.push(`${days}d`);
    if (hours > 0) {
      formattedAge.push(`${hours}h`);
    }
  } else if (hours > 0) {
    formattedAge.push(`${hours}h`);
    if (minutes > 0) {
      formattedAge.push(`${minutes}m`);
    }
  } else if (minutes > 0) {
    formattedAge.push(`${minutes}m`);
    if (seconds > 0) {
      formattedAge.push(`${seconds}s`);
    }
  } else if (seconds > 0) {
    formattedAge.push(`${seconds}s`);
  } else {
    formattedAge.push(`0s`); // If all units are zero
  }

  return formattedAge.join(" "); // Join all elements into a string
};

export const calculateLaunchDateTime = (ageInSeconds: number): string => {
  // Get current date and subtract the age in seconds
  const currentDate = new Date();
  const launchDate = new Date(currentDate.getTime() - ageInSeconds * 1000);

  // Array of month names
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  // Format date components with padding
  const day = launchDate.getUTCDate();
  const month = months[launchDate.getUTCMonth()];
  const year = launchDate.getUTCFullYear();
  const hours = launchDate.getUTCHours().toString().padStart(2, "0");
  const minutes = launchDate.getUTCMinutes().toString().padStart(2, "0");

  // Return formatted string
  return `${day} ${month} ${year} ${hours}:${minutes} (UTC)`;
};

export const CHAIN_ICONS: Record<string, string> = {
  base: "/base_circle.svg",
  solana: "/sol.svg",
  "solana devnet": "/sol.svg", // Handle space in name
  ethereum: "/eth.svg",
  celo: "/celo.svg",
};

export const chainIcon = (chainName: string): string => {
  const normalizedName = chainName.toLowerCase().trim();
  
  // Direct lookup first
  if (CHAIN_ICONS[normalizedName]) {
    return CHAIN_ICONS[normalizedName];
  }
  
  // Fallback logic for common variations
  if (normalizedName.includes("solana")) {
    return "/sol.svg";
  }
  if (normalizedName.includes("base")) {
    return "/base_circle.svg";
  }
  if (normalizedName.includes("ethereum")) {
    return "/eth.svg";
  }
  if (normalizedName.includes("celo")) {
    return "/celo.svg";
  }
  
  // Default fallback
  return "/sol.svg";
};

export const getRequiredWalletForChain = (chain: string): 'evm_wallet' | 'solana_wallet' | null => {
  if (!chain) return null;
  const chainLower = chain.toLowerCase();
  
  // Handle chain IDs (e.g., "solana-devnet", "solana-mainnet", "base-mainnet")
  if (chainLower.includes('solana')) return 'solana_wallet';
  if (chainLower.includes('base') || chainLower.includes('ethereum') || chainLower.includes('polygon') || chainLower.includes('celo')) {
    return 'evm_wallet';
  }
  
  // Handle blockchain names (legacy support)
  if (chainLower === 'solana') return 'solana_wallet';
  if (['base', 'ethereum', 'celo'].includes(chainLower)) return 'evm_wallet';
  
  return null;
};

// Function to debounce a callback
export function debounce<T extends (...args: string[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;

  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => {
      callback(...args);
    }, delay);
  };
}

export const setCookie = (name: string, value: string, days: number) => {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/`;
};

export async function getCookie(name: string) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const cookiePart = parts.pop();
    return cookiePart ? cookiePart.split(";").shift() : undefined;
  }
  return undefined;
}

export const deleteCookie = (name: string) => {
  document.cookie = `${name}=; Max-Age=0; path=/;`;
};

export const isAccessKeyValid = async () => {
  const accessKey = await getCookie("accessKey");

  return !!accessKey;
};

export const setTestCookie = (name: string, value: string, seconds: number) => {
  const expires = new Date(Date.now() + seconds * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; expires=${expires}; path=/; Secure; SameSite=Strict`;
};

export function abbreviateString(str: string): string {
  if (str.length <= 8) {
    // If the string length is too short, return it unchanged
    return str;
  }

  // Take the first 5 characters and the last 3 characters, and join with "..."
  return `${str.slice(0, 5)}...${str.slice(-3)}`;
}

// Color scale function
export const getPercentageColor = (percentChange: number, border: boolean) => {
  // For positive changes - Green gradient
  if (percentChange > 0) {
    if (border) {
      return "#1F845A";
    }
    return "#164B35";
  }

  // For negative changes - Red gradient
  if (percentChange < 0) {
    if (border) {
      return "#C9372C";
    }
    return "#5D1F1A";
  }

  // For zero changes - Yellow gradient
  if (border) {
    return "#946F00";
  }
  return "#533F04";
};

export const calculateGridBoxStyles = (width: number, height: number) => {
  const size = Math.min(width, height);
  return {
    borderRadius: Math.max(4, Math.min(16, size * 0.05)),
    iconSize: Math.max(10, Math.min(40, size * 0.15)),
    fontSize: {
      name: Math.max(10, Math.min(24, size * 0.08)),
      percentage: Math.max(8, Math.min(20, size * 0.06)),
    },
    padding: Math.max(4, size * 0.02),
  };
};

export const convertToNumber = (value: string): number => {
  const multipliers = {
    K: 1000,
    M: 1000000,
    B: 1000000000,
    T: 1000000000000,
  };

  const cleanVal = value.trim();
  const number = parseFloat(cleanVal);
  const multiplier =
    multipliers[cleanVal.slice(-1) as keyof typeof multipliers] || 1;
  return number * multiplier;
};

export function convertToHours(timeValue: string): number {
  // Split the input string into a number and a unit
  const [amount, unit] = timeValue.toLowerCase().split(" ");

  // Ensure the amount is parsed as a number
  const value = parseInt(amount, 10);

  if (isNaN(value) || !unit) {
    throw new Error("Invalid input format. Expected format: '<number> <unit>'");
  }

  switch (unit) {
    case "day":
    case "days":
      return value * 24; // Convert days to hours
    case "hour":
    case "hours":
      return value; // Already in hours
    default:
      throw new Error(`Unsupported time unit: ${unit}`);
  }
}

export const generateAgeFilter = (
  value: string
): { age_gte?: number; age_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { age_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      age_gte: Number(min) * 3600,
      age_lte: Number(max) * 3600,
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      age_lte: Number(cleanValue.slice(1)) * 3600,
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      age_gte: Number(cleanValue.slice(1)) * 3600,
    };
  }

  // Default case: treat as exact value
  return {
    age_gte: Number(cleanValue) * 3600,
    age_lte: Number(cleanValue) * 3600,
  };
};

export const generateMarketCapFilter = (
  value: string
): { market_cap_gte?: number; market_cap_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { market_cap_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      market_cap_gte: convertToNumber(min),
      market_cap_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      market_cap_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      market_cap_gte: convertToNumber(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    market_cap_gte: convertToNumber(cleanValue),
    market_cap_lte: convertToNumber(cleanValue),
  };
};

export const generateAthMarketCapFilter = (
  value: string
): { ath_market_cap_gte?: number; ath_market_cap_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { ath_market_cap_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      ath_market_cap_gte: convertToNumber(min),
      ath_market_cap_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      ath_market_cap_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      ath_market_cap_gte: convertToNumber(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    ath_market_cap_gte: convertToNumber(cleanValue),
    ath_market_cap_lte: convertToNumber(cleanValue),
  };
};

export const generateLiquidityFilter = (
  value: string
): { liquidity_gte?: number; liquidity_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { liquidity_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      liquidity_gte: convertToNumber(min),
      liquidity_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      liquidity_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      liquidity_gte: convertToNumber(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    liquidity_gte: convertToNumber(cleanValue),
    liquidity_lte: convertToNumber(cleanValue),
  };
};

export const generateVolumeFilter = (
  value: string
): { vol_24hr_gte?: number; vol_24hr_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { vol_24hr_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      vol_24hr_gte: convertToNumber(min),
      vol_24hr_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      vol_24hr_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      vol_24hr_gte: convertToNumber(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    vol_24hr_gte: convertToNumber(cleanValue),
    vol_24hr_lte: convertToNumber(cleanValue),
  };
};
export const generateReturnFilter = (
  value: string
): { x_gte?: number; x_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { x_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      x_gte: convertToNumber(min),
      x_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      x_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      x_gte: convertToNumber(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    x_gte: convertToNumber(cleanValue),
    x_lte: convertToNumber(cleanValue),
  };
};
export const generateAvgViewsFilter = (
  value: string
): { avg_views_gte?: number; avg_views_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { avg_views_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      avg_views_gte: convertToNumber(min),
      avg_views_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      avg_views_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      avg_views_gte: convertToNumber(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    avg_views_gte: convertToNumber(cleanValue),
    avg_views_lte: convertToNumber(cleanValue),
  };
};
export const generateTotalViewsFilter = (
  value: string
): { total_views_gte?: number; total_views_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { total_views_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      total_views_gte: convertToNumber(min),
      total_views_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      total_views_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      total_views_gte: convertToNumber(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    total_views_gte: convertToNumber(cleanValue),
    total_views_lte: convertToNumber(cleanValue),
  };
};
export const formatToUTC = (dateTimeStr: string): string => {
  if (!dateTimeStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
    return "";
  }

  // Since input is already UTC, we can directly parse it
  const [datePart, timePart] = dateTimeStr.split("T");
  const [year, month, day] = datePart.split("-");
  const [hours, minutes] = timePart.split(":");

  // Return formatted string with seconds set to 00
  return `${year}-${month}-${day} ${hours}:${minutes}:00`;
};
export const generateFirstMentionFilter = (
  value: string
): { first_mention_gte?: string; first_mention_lte?: string } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { first_mention_gte: "" };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("--")) {
    const [min, max] = cleanValue.split("--").map((v) => v.trim());
    return {
      first_mention_gte: formatToUTC(min),
      first_mention_lte: formatToUTC(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      first_mention_lte: formatToUTC(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      first_mention_gte: formatToUTC(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    first_mention_gte: formatToUTC(cleanValue),
    first_mention_lte: formatToUTC(cleanValue),
  };
};

export const generateLastMentionFilter = (
  value: string
): { last_mention_gte?: string; last_mention_lte?: string } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { last_mention_gte: "" };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("--")) {
    const [min, max] = cleanValue.split("--").map((v) => v.trim());
    return {
      last_mention_gte: formatToUTC(min),
      last_mention_lte: formatToUTC(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      last_mention_lte: formatToUTC(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      last_mention_gte: formatToUTC(cleanValue.slice(1)),
    };
  }

  // Default case: treat as exact value
  return {
    last_mention_gte: formatToUTC(cleanValue),
    last_mention_lte: formatToUTC(cleanValue),
  };
};

export const generateHoldersFilter = (
  value: string
): { holders_count_gte?: number; holders_count_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { holders_count_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      holders_count_gte: convertToNumber(min),
      holders_count_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      holders_count_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      holders_count_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    holders_count_gte: 0,
  };
};

export const generateFollowersFilter = (
  value: string
): { followers_count_gte?: number; followers_count_lte?: number } => {
  if (value === "All") {
    return { followers_count_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      followers_count_gte: convertToNumber(min),
      followers_count_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      followers_count_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      followers_count_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    followers_count_gte: 0,
  };
};

export const generateSmartFollowersFilter = (
  value: string
): { smart_followers_gte?: number; smart_followers_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { smart_followers_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      smart_followers_gte: convertToNumber(min),
      smart_followers_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      smart_followers_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      smart_followers_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    smart_followers_gte: 0,
  };
};

export const generateInfluencerFilter = (
  value: string
): { influencer_count_gte?: number; influencer_count_lte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { influencer_count_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      influencer_count_gte: convertToNumber(min),
      influencer_count_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      influencer_count_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      influencer_count_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    influencer_count_gte: 0,
  };
};

export const generateAccountFilter = (
  value: string
): {
  total_unique_accounts_lte?: number;
  total_unique_accounts_gte?: number;
} => {
  // Return all if value is 'All'
  if (value === "All") {
    return { total_unique_accounts_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      total_unique_accounts_gte: convertToNumber(min),
      total_unique_accounts_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      total_unique_accounts_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      total_unique_accounts_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    total_unique_accounts_gte: 0,
  };
};

export const generateMktcapChangeFilter = (
  value: string
): { market_cap_change_lte?: number; market_cap_change_gte?: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { market_cap_change_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      market_cap_change_gte: convertToNumber(min),
      market_cap_change_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      market_cap_change_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      market_cap_change_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    market_cap_change_gte: 0,
  };
};

export const generateMention15minFilter = (
  mention_15min: string
): { mention_count_15min_lte?: number; mention_count_15min_gte?: number } => {
  const value = mention_15min; // Default to 24h

  // Only check time periods that are provided

  // Return all if value is 'All'
  if (value === "All") {
    return { mention_count_15min_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      mention_count_15min_gte: convertToNumber(min),
      mention_count_15min_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      mention_count_15min_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      mention_count_15min_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    mention_count_15min_gte: 0,
  };
};
export const generateMention1hrFilter = (
  mention_1hr: string
): { mention_count_1hr_lte?: number; mention_count_1hr_gte?: number } => {
  const value = mention_1hr; // Default to 24h

  // Only check time periods that are provided

  // Return all if value is 'All'
  if (value === "All") {
    return { mention_count_1hr_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      mention_count_1hr_gte: convertToNumber(min),
      mention_count_1hr_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      mention_count_1hr_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      mention_count_1hr_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    mention_count_1hr_gte: 0,
  };
};
export const generateMention6hrFilter = (
  mention_6hr: string
): { mention_count_6hr_lte?: number; mention_count_6hr_gte?: number } => {
  const value = mention_6hr; // Default to 24h

  // Only check time periods that are provided

  // Return all if value is 'All'
  if (value === "All") {
    return { mention_count_6hr_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      mention_count_6hr_gte: convertToNumber(min),
      mention_count_6hr_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      mention_count_6hr_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      mention_count_6hr_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    mention_count_6hr_gte: 0,
  };
};
export const generateMention24hrFilter = (
  mention_24hr: string
): { mention_count_24hr_lte?: number; mention_count_24hr_gte?: number } => {
  const value = mention_24hr; // Default to 24h

  // Only check time periods that are provided

  // Return all if value is 'All'
  if (value === "All") {
    return { mention_count_24hr_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      mention_count_24hr_gte: convertToNumber(min),
      mention_count_24hr_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      mention_count_24hr_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      mention_count_24hr_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    mention_count_24hr_gte: 0,
  };
};

export const generateMentionChange24hrFilter = (
  mention_change_24hr: string
): { mention_change_24hr_lte?: number; mention_change_24hr_gte?: number } => {
  const value = mention_change_24hr; // Default to 24h
  // Only check time periods that are provided

  // Return all if value is 'All'
  if (value === "All") {
    return { mention_change_24hr_gte: 0 };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      mention_change_24hr_gte: convertToNumber(min),
      mention_change_24hr_lte: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      mention_change_24hr_lte: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      mention_change_24hr_gte: convertToNumber(cleanValue.slice(1)),
    };
  }
  // Default case: treat as exact value
  return {
    mention_change_24hr_gte: 0,
  };
};

export const isDateTime = (value: string) => {
  if (!value) return false;
  const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
  return dateTimeRegex.test(value);
};

export const getUTCUnixTimestamp = (dateTimeStr: string) => {
  const localDate = new Date(dateTimeStr);
  // Get the timezone offset in milliseconds
  const timezoneOffset = localDate.getTimezoneOffset() * 60 * 1000;

  // Add timezone offset to convert to UTC
  const utcTimestamp = Math.floor(
    (localDate.getTime() + timezoneOffset) / 1000
  );

  return utcTimestamp;
};

export const parseRangeValue = (
  value: string
): { min: number | undefined; max: number | undefined } => {
  // Handle different range formats
  if (value.startsWith(">")) {
    // Greater than format: ">50"
    const isDate = isDateTime(value.slice(1));
    return {
      min: isDate
        ? getUTCUnixTimestamp(value.slice(1))
        : convertToNumber(value.slice(1)),
      max: undefined,
    };
  } else if (value.startsWith("<")) {
    // Less than format: "<100"
    const isDate = isDateTime(value.slice(1));
    return {
      min: undefined,
      max: isDate
        ? getUTCUnixTimestamp(value.slice(1))
        : convertToNumber(value.slice(1)),
    };
  } else if (value.includes("--")) {
    // Range format: "50-100"
    const [minValue, maxValue] = value.split("--").map((num) => num.trim());
    const min = getUTCUnixTimestamp(minValue);
    const max = getUTCUnixTimestamp(maxValue);
    return { min, max };
  } else if (value.includes("-")) {
    // Range format: "50-100"
    const [minValue, maxValue] = value.split("-").map((num) => num.trim());
    const min = convertToNumber(minValue);
    const max = convertToNumber(maxValue);
    return { min, max };
  }

  // Default case if format doesn't match
  return { min: 0, max: undefined };
};

export const isCoin = (item: number) => {
  return Boolean(item);
};

export const isBinanceCoin = (item: TokenDataItem) => {
  return Boolean(item.is_coin && item.is_binance);
};

export const capitalizeAndTruncate = (text: string, maxLength: number) => {
  if (!text) {
    return;
  }

  const capitalizedText = text
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return truncateText(capitalizedText, maxLength);
};

export const calculateColorClass = (
  value: number | null,
  median: number
): string => {
  if (value !== null && median >= 0) {
    if (value <= 5) return "below-median";
    if (value < 1.5 * median) return "below-median";
    if (value >= 1.5 * median && value < 2 * median) return "at-median";
    if (value >= 2 * median) return "above-median";
  }
  return "";
};

export const calculateMedian = (values: number[]): number => {
  const validValues = values.filter((val) => val !== null && !isNaN(val));
  if (validValues.length === 0) return 0;

  const sorted = [...validValues].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
};

export const getSmartDecimalPlaces = (price: number): number => {
  if (price === 0) return 2;
  if (price < 0.0001) return 8;
  if (price < 0.01) return 6;
  if (price < 1) return 4;
  if (price < 100) return 3;
  return 2;
};

export const formatPriceNumber = (price: number): string => {
  // Handle invalid inputs
  if (typeof price !== "number" || isNaN(price) || !isFinite(price)) {
    return "0";
  }

  // Handle zero
  if (price === 0) {
    return "0";
  }

  // For numbers greater than or equal to 10, use the existing formatNumber function
  if (Math.abs(price) >= 10) {
    return formatNumber(price);
  }

  // Get the absolute value for comparison but keep the sign for final output
  const absPrice = Math.abs(price);
  const sign = price < 0 ? "-" : "";

  // For numbers between 1 and 10, show 2 decimal places
  if (absPrice >= 1) {
    return sign + absPrice.toFixed(2);
  }

  // For numbers between 0.01 and 1, show 4 decimal places
  if (absPrice >= 0.01) {
    return sign + absPrice.toFixed(4);
  }

  // For numbers between 0.0001 and 0.01, show 6 decimal places
  if (absPrice >= 0.0001) {
    return sign + absPrice.toFixed(6);
  }

  // For very small numbers
  if (absPrice < 0.0001) {
    try {
      // Convert to scientific notation
      const scientificStr = absPrice.toExponential(2);
      // Split into base and exponent
      const [base, exponent] = scientificStr.split("e-");
      const expNum = parseInt(exponent);

      if (isNaN(expNum)) {
        return "0";
      }

      // Format as 0.0...0XX where number of zeros is based on the exponent
      const zeros = "0".repeat(expNum - 1);
      const baseNum = parseFloat(base).toFixed(2).replace("0.", "");
      return sign + `0.${zeros}${baseNum}`;
    } catch (error) {
      console.error("Error formatting small number:", error);
      return "0";
    }
  }

  // Fallback
  return sign + price.toString();
};
export const capitalizeWords = (str: string) => {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const convertSelectedTimeInterval = (interval: string) => {
  // Extract the last character (time unit) and the numeric value
  const unit = interval.slice(-1); // 'm', 'h', or 'd'
  const value = parseInt(interval.slice(0, -1), 10); // Numeric value

  // Map the unit to the full period name
  const unitMap: Record<string, string> = {
    m: "minute",
    h: "hour",
    d: "day",
  };

  return {
    period: unitMap[unit],
    period_value: value,
  };
};

const getFormattedDateTime = (timestamp: Date) => {
  const date = new Date(timestamp);
  // Format to local time
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Helper function to add hours to a date
const addHours = (date: Date, hours: number): Date => {
  const newDate = new Date(date);
  newDate.setHours(newDate.getHours() + hours);
  return newDate;
};

// Helper function to add days to a date
const addDays = (date: Date, days: number) => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

// Helper function to subtract hours from current date
const subtractHours = (hours: number) => {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date;
};

// Helper function to subtract days from current date
const subtractDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Type definition for filter configurations
type FilterConfig = {
  name: string;
  showValue: boolean;
  dropdownCategory: string;
  defaultOption: { value: string; label: string };
  options: Array<{ label: string; value: string }>;
  valueType: string;
  inputType: string;
  filterDescription: boolean;
  filteredKey: string;
};

type FilterConfigs = Record<string, FilterConfig>;

export const generateFilterOptions = (
  launchTimestamp: string,
  filterNames: {
    firstFilterName: string; // replaces firstPost
    lastFilterName: string; // replaces lastPost
  }
): FilterConfigs => {
  const launchDate = new Date(Number(launchTimestamp) * 1000);
  const utcLaunchDate = new Date(
    launchDate.getTime() + launchDate.getTimezoneOffset() * 60000
  );
  const filters: FilterConfigs = {};

  // Before/After Launch filter (previously firstPost)
  filters[filterNames.firstFilterName] = {
    name: "First Post",
    showValue: true,
    dropdownCategory: "First Post",
    defaultOption: { value: "All", label: "All" },
    options: [
      {
        label: "Before launch",
        value: `<${getFormattedDateTime(utcLaunchDate)}`,
      },
      {
        label: "In 1 hour",
        value: `${getFormattedDateTime(utcLaunchDate)}--${getFormattedDateTime(
          addHours(utcLaunchDate, 1)
        )}`,
      },
      {
        label: "In 4 hours",
        value: `${getFormattedDateTime(utcLaunchDate)}--${getFormattedDateTime(
          addHours(utcLaunchDate, 4)
        )}`,
      },
      {
        label: "In 1 day",
        value: `${getFormattedDateTime(utcLaunchDate)}--${getFormattedDateTime(
          addDays(utcLaunchDate, 1)
        )}`,
      },
      {
        label: "In 7 days",
        value: `${getFormattedDateTime(utcLaunchDate)}--${getFormattedDateTime(
          addDays(utcLaunchDate, 7)
        )}`,
      },
    ],
    valueType: "",
    inputType: "datetime",
    filterDescription: true,
    filteredKey: "first_post",
  };

  // Recent filter (previously lastPost)
  filters[filterNames.lastFilterName] = {
    name: "Last Post",
    showValue: true,
    dropdownCategory: "Last Post",
    defaultOption: { value: "All", label: "All" },
    options: [
      {
        label: "Last 1 hour",
        value: `>${getFormattedDateTime(subtractHours(1))}`,
      },
      {
        label: "Last 4 hours",
        value: `>${getFormattedDateTime(subtractHours(4))}`,
      },
      {
        label: "Last 1 day",
        value: `>${getFormattedDateTime(subtractDays(1))}`,
      },
      {
        label: "Last 7 days",
        value: `>${getFormattedDateTime(subtractDays(7))}`,
      },
    ],
    valueType: "",
    inputType: "datetime",
    filterDescription: true,
    filteredKey: "last_post",
  };

  return filters;
};

export const generatePumpFilterValues = (
  value: string
): { minimum: number; maximum: number } => {
  // Return all if value is 'All'
  if (value === "All") {
    return { minimum: 0, maximum: Infinity };
  }
  const cleanValue = value.replace(/\$/g, "");

  // Check if it's a range (contains hyphen)
  if (cleanValue.includes("-")) {
    const [min, max] = cleanValue.split("-").map((v) => v.trim());
    return {
      minimum: convertToNumber(min),
      maximum: convertToNumber(max),
    };
  }

  // Handle single comparison operators
  if (cleanValue.startsWith("<")) {
    return {
      minimum: 0,
      maximum: convertToNumber(cleanValue.slice(1)),
    };
  }

  if (cleanValue.startsWith(">")) {
    return {
      minimum: convertToNumber(cleanValue.slice(1)),
      maximum: Infinity,
    };
  }
  // Default case: treat as exact value
  return {
    minimum: 0,
    maximum: Infinity,
  };
};

export const getUTCTimestamp = (dateTimeStr: string): number => {
  return Date.UTC(
    parseInt(dateTimeStr?.slice(0, 4)), // year
    parseInt(dateTimeStr?.slice(5, 7)) - 1, // month (0-based)
    parseInt(dateTimeStr?.slice(8, 10)), // day
    parseInt(dateTimeStr?.slice(11, 13)), // hour
    parseInt(dateTimeStr?.slice(14, 16)), // minute
    parseInt(dateTimeStr?.slice(17, 19)) // second
  );
};

export function percentToXTimes(percentChange: number): string {
  return formatNumber(1 + percentChange / 100) + "x";
}

export function parseMarketCapRange(optionValue: string) {
  let min = "";
  let max = "";
  if (optionValue === "All") {
    return { min: "All", max: "All" }; // No restrictions for "All"
  }

  if (optionValue.startsWith("<")) {
    // Case: Less than a value
    max = optionValue.slice(1);
    min = "";
  } else if (optionValue.startsWith(">")) {
    // Case: Greater than a value
    min = optionValue.slice(1);
    max = "";
  } else if (optionValue.includes("--")) {
    // Case: Range (e.g., '500000-2000000')
    const [minValue, maxValue] = optionValue.split("--").map(String);
    min = minValue;
    max = maxValue;
  } else if (optionValue.includes("-")) {
    // Case: Range (e.g., '500000-2000000')
    const [minValue, maxValue] = optionValue.split("-").map(String);
    min = minValue;
    max = maxValue;
  }

  return { min, max };
}

export const getChainShortName = (chain: string): string | undefined =>
  CHAIN_SHORT_NAMES[chain.toLowerCase()];

export function countNonEmptyMinMax(
  filters: Record<string, { min: string; max: string }>
): number {
  return Object.values(filters).reduce((count, { min, max }) => {
    return count + (min.trim() !== "" || max.trim() !== "" ? 1 : 0);
  }, 0);
}

// Helper function to check if two URLSearchParams objects have the same key-value pairs
// regardless of their order
export const areParamsEqual = (
  params1: URLSearchParams,
  params2: URLSearchParams
) => {
  // Convert both URLSearchParams to sorted arrays for order-independent comparison
  const params1Entries = Array.from(params1.entries()).sort();
  const params2Entries = Array.from(params2.entries()).sort();

  // If they have different numbers of parameters, they can't be equal
  if (params1Entries.length !== params2Entries.length) {
    return false;
  }

  // Compare the sorted arrays as strings
  return JSON.stringify(params1Entries) === JSON.stringify(params2Entries);
};

export const isUnsafe = (timestamp: string | number) => {
  const currentTime = new Date().getTime();
  const givenTime = new Date(timestamp).getTime();
  const remainingSeconds = Math.floor((givenTime - currentTime) / 1000); // Convert to seconds

  return remainingSeconds <= 7 * 24 * 60 * 60; // 7 days in seconds
};

export const countRemainingTime = (timestamp: string | number) => {
  const timeUnitsWithDaysAndYears = [
    { unit: "y", seconds: 365 * 24 * 60 * 60 },
    { unit: "mo", seconds: 2628000 },
    { unit: "d", seconds: 24 * 60 * 60 },
    { unit: "h", seconds: 60 * 60 },
    { unit: "m", seconds: 60 },
    { unit: "s", seconds: 1 },
  ];

  const remainingTime = [];
  const currentTime = new Date().getTime();
  const givenTime = new Date(timestamp + "Z").getTime();
  let remainingSeconds = Math.floor((givenTime - currentTime) / 1000); // Convert to seconds

  // If the time is already expired, return 'Expired'
  if (remainingSeconds <= 0) {
    return "Expired";
  }

  for (const timeUnit of timeUnitsWithDaysAndYears) {
    if (remainingSeconds >= timeUnit.seconds) {
      const count = Math.floor(remainingSeconds / timeUnit.seconds);
      remainingTime.push(`${count}${timeUnit.unit}`);
      remainingSeconds %= timeUnit.seconds;
    }
    // Stop once we have two time units (e.g., '2d 5h')
    if (remainingTime.length === 2) break;
  }

  return remainingTime.join(" ");
};

export function formatTimeRemaining(timeRemaining: number): string {
  const totalSeconds = Math.ceil(timeRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (timeRemaining >= 3600000) {
    // More than or equal to 1 hour
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  } else {
    // Less than 1 hour
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
      2,
      "0"
    )}`;
  }
}

export const isLessThanThreshold = (expiryDate: string) => {
  if (!expiryDate) return true;

  // Get current time in UTC
  const currentTime = Date.now();

  // Ensure expiryDate is treated as UTC
  const expiryTime = new Date(expiryDate + "Z").getTime();

  // Calculate difference in milliseconds
  const timeDifference = expiryTime - currentTime;

  // Convert to seconds
  const secondsDifference = timeDifference / 1000;

  // 2 days, 23 hours, 30 minutes in seconds:
  // (2 * 24 * 60 * 60) + (23 * 60 * 60) + (30 * 60) = 254,400 seconds
  const threshold = 2 * 24 * 60 * 60 + 23 * 60 * 60 + 55 * 60;

  return secondsDifference < threshold;
};

export function formatToMonthYear(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

export const convertToTimeIntervalData = (
  filteredInfluencers: CommunityInfluencer[],
  selectedTimePeriod: string,
  ohlcMaxTime: number
) => {
  // Convert time period to milliseconds
  const getIntervalMilliseconds = (period: string) => {
    const match = period.match(/(\d+)([mhd])/);
    if (!match) {
      throw new Error("Invalid period format");
    }
    const [value, unit] = match.slice(1) as [string, keyof typeof multiplier];
    const multiplier = {
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return parseInt(value) * multiplier[unit];
  };

  const intervalMs = getIntervalMilliseconds(selectedTimePeriod);

  const roundToNearestFiveMinutes = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const minutes = date.getUTCMinutes();
    const roundedMinutes = Math.floor(minutes / 5) * 5;
    date.setUTCMinutes(roundedMinutes, 0, 0);
    return Math.floor(date.getTime() / 1000);
  };

  // Convert all influencer timestamps to Unix timestamp (seconds)
  const influencersWithTimestamp = filteredInfluencers.map((influencer) => ({
    ...influencer,
    timestamp: roundToNearestFiveMinutes(
      Math.floor(new Date(influencer.first_tweet_time + "Z").getTime() / 1000)
    ),
  }));

  // Find the min and max timestamps
  const timestamps = influencersWithTimestamp.map((inf) => inf.timestamp);
  const minTimestamp = Math.min(...timestamps);
  const maxTimestamp = Math.max(...timestamps);

  // Extract time components using modulo arithmetic
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  // Get milliseconds since start of day in UTC
  const ohlcTimeMS = (ohlcMaxTime * 1000) % MS_PER_DAY;

  // Calculate start of day for minTimestamp in UTC
  const minDateMS = minTimestamp * 1000;
  const minDateStartOfDayMS = minDateMS - (minDateMS % MS_PER_DAY);

  // Apply time component from ohlcMaxTime to minTimestamp
  const minTimestampNew = (minDateStartOfDayMS + ohlcTimeMS) / 1000;

  // Generate interval timestamps
  const intervalSeconds = intervalMs / 1000;
  const intervals = [];
  for (let t = minTimestampNew; t <= maxTimestamp; t += intervalSeconds) {
    intervals.push(t);
  }

  // Group influencers by interval
  const result = intervals.map((intervalStart) => {
    const intervalEnd = intervalStart + intervalSeconds;

    // Find influencers that posted in this interval
    const intervalInfluencers = influencersWithTimestamp.filter(
      (inf) => inf.timestamp >= intervalStart && inf.timestamp < intervalEnd
    );

    // Count mentions per influencer in this interval
    const influencerCounts = intervalInfluencers.reduce((acc, influencer) => {
      acc[influencer.author_handle] = (acc[influencer.author_handle] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Format influencers according to the desired structure
    const formattedInfluencers = Object.entries(influencerCounts).map(
      ([author_handle, mention_count]) => {
        const influencer = intervalInfluencers.find(
          (inf) => inf.author_handle === author_handle
        );
        return {
          author_handle,
          mention_count,
          profile_image_url: influencer?.profile_image_url || "",
          followers_count: influencer?.followers_count || 0,
          engagement_score: influencer?.engagement_score || 0,
          first_tweet_time: influencer?.first_tweet_time || "",
          first_tweet_id: influencer?.first_tweet_id || 0,
        };
      }
    );

    return {
      timestamp: intervalStart,
      influencers: formattedInfluencers,
    };
  });

  // Remove intervals with no influencers
  return result.filter((interval) => interval.influencers.length > 0);
};
export const mergeInfluencerData = (
  existingData: FullMentionData[],
  newData: FullMentionData[]
): FullMentionData[] => {
  // Create a merged data structure
  const mergedData = Array.isArray(existingData) ? [...existingData] : [];

  // Create a map of existing timestamps for quick lookup
  const timestampMap = new Map(
    existingData.map((item) => [item.timestamp, item])
  );

  // Process each item in the new data
  newData.forEach((newItem) => {
    if (timestampMap.has(newItem.timestamp)) {
      // Timestamp exists - merge influencers
      const existingEntry = timestampMap.get(newItem.timestamp);

      // Create a map of existing handles for quick lookup
      const existingHandles = new Set(
        existingEntry?.influencers.map((inf) => inf.author_handle)
      );

      // Add new influencers that don't exist
      newItem.influencers.forEach((newInfluencer) => {
        if (!existingHandles.has(newInfluencer.author_handle)) {
          existingEntry?.influencers.push(newInfluencer);
        }
      });
    } else {
      // Timestamp doesn't exist - add entire new entry
      mergedData.push(newItem);
    }
  });

  // Sort by timestamp
  return mergedData.sort((a, b) => a.timestamp - b.timestamp);
};
