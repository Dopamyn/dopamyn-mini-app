import { useEffect, useState } from "react";

interface ColorData {
  r: number;
  g: number;
  b: number;
  hex: string;
}

/**
 * Hook to extract the dominant color from an image URL
 * @param imageUrl - The URL of the image
 * @param enabled - Whether to process the image (default: true)
 * @returns The dominant color in hex format
 */
export function useDominantColor(
  imageUrl: string | undefined,
  enabled: boolean = true
) {
  const [dominantColor, setDominantColor] = useState<string>("#000000");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!imageUrl || !enabled) {
      setDominantColor("#000000");
      return;
    }

    setIsLoading(true);

    const extractDominantColor = (url: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // Enable CORS

        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            if (!ctx) {
              reject(new Error("Could not get canvas context"));
              return;
            }

            // Set canvas size to image size for full resolution
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw image to canvas
            ctx.drawImage(img, 0, 0);

            // Get image data
            const imageData = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
            const data = imageData.data;

            // Sample pixels (every 10th pixel for performance)
            const colorCounts: { [key: string]: number } = {};
            const sampleRate = 10;

            for (let i = 0; i < data.length; i += 4 * sampleRate) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              const a = data[i + 3];

              // Skip transparent pixels
              if (a < 128) continue;

              // Skip very dark or very light pixels (likely background)
              const brightness = (r + g + b) / 3;
              if (brightness < 20 || brightness > 235) continue;

              // Create color key
              const colorKey = `${r},${g},${b}`;
              colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
            }

            // Find the most common color
            let maxCount = 0;
            let dominantRgb = { r: 0, g: 0, b: 0 };

            for (const [colorKey, count] of Object.entries(colorCounts)) {
              if (count > maxCount) {
                maxCount = count;
                const [r, g, b] = colorKey.split(",").map(Number);
                dominantRgb = { r, g, b };
              }
            }

            // Convert RGB to hex
            const hex = `#${dominantRgb.r
              .toString(16)
              .padStart(2, "0")}${dominantRgb.g
              .toString(16)
              .padStart(2, "0")}${dominantRgb.b.toString(16).padStart(2, "0")}`;
            resolve(hex);
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => {
          reject(new Error("Failed to load image"));
        };

        img.src = url;
      });
    };

    extractDominantColor(imageUrl)
      .then((color) => {
        setDominantColor(color);
        setIsLoading(false);
      })
      .catch((error) => {
        console.warn("Failed to extract dominant color:", error);
        setDominantColor("#000000");
        setIsLoading(false);
      });
  }, [imageUrl, enabled]);

  return { dominantColor, isLoading };
}

/**
 * Hook to extract and log dominant colors from multiple profile images
 * @param quests - Array of quest objects with profile images
 * @param enabled - Whether to process the images (default: true)
 */
export function useProfileImageColors(quests: any[], enabled: boolean = true) {
  const [colors, setColors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (!enabled || !quests.length) return;

    const processImages = async () => {
      const colorPromises = quests.map(async (quest) => {
        const primaryTask =
          quest.tasks && quest.tasks.length > 0 ? quest.tasks[0] : null;
        const imageUrl = primaryTask?.profile_image_url;

        if (!imageUrl) return null;

        try {
          const { dominantColor } = await new Promise<{
            dominantColor: string;
          }>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";

            img.onload = () => {
              try {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                if (!ctx) {
                  reject(new Error("Could not get canvas context"));
                  return;
                }

                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const data = imageData.data;

                const colorCounts: { [key: string]: number } = {};
                const sampleRate = 10;

                for (let i = 0; i < data.length; i += 4 * sampleRate) {
                  const r = data[i];
                  const g = data[i + 1];
                  const b = data[i + 2];
                  const a = data[i + 3];

                  if (a < 128) continue;

                  const brightness = (r + g + b) / 3;
                  if (brightness < 30 || brightness > 225) continue;

                  const colorKey = `${r},${g},${b}`;
                  colorCounts[colorKey] = (colorCounts[colorKey] || 0) + 1;
                }

                let maxCount = 0;
                let dominantRgb = { r: 0, g: 0, b: 0 };

                for (const [colorKey, count] of Object.entries(colorCounts)) {
                  if (count > maxCount) {
                    maxCount = count;
                    const [r, g, b] = colorKey.split(",").map(Number);
                    dominantRgb = { r, g, b };
                  }
                }

                const hex = `#${dominantRgb.r
                  .toString(16)
                  .padStart(2, "0")}${dominantRgb.g
                  .toString(16)
                  .padStart(2, "0")}${dominantRgb.b
                  .toString(16)
                  .padStart(2, "0")}`;
                resolve({ dominantColor: hex });
              } catch (error) {
                reject(error);
              }
            };

            img.onerror = () => reject(new Error("Failed to load image"));
            img.src = imageUrl;
          });

          return {
            questId: quest.id,
            questTitle: quest.title,
            creatorHandle: quest.creator_x_handle,
            imageUrl,
            dominantColor,
          };
        } catch (error) {
          console.warn(`Failed to process image for quest ${quest.id}:`, error);
          return null;
        }
      });

      const results = await Promise.allSettled(colorPromises);
      const successfulResults = results
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value);

      // Console log all the dominant colors
      // console.group("🎨 Profile Image Dominant Colors");
      // successfulResults.forEach((result) => {
      //   console.log(`Quest: ${result.questTitle} (@${result.creatorHandle})`, {
      //     questId: result.questId,
      //     imageUrl: result.imageUrl,
      //     dominantColor: result.dominantColor,
      //     colorPreview: `%c${result.dominantColor}`,
      //     style: `background-color: ${result.dominantColor}; color: white; padding: 2px 8px; border-radius: 4px;`,
      //   });
      // });
      // console.groupEnd();

      // Update state with colors
      const colorsMap: { [key: string]: string } = {};
      successfulResults.forEach((result) => {
        colorsMap[result.questId] = result.dominantColor;
      });
      setColors(colorsMap);
    };

    processImages();
  }, [quests, enabled]);

  return colors;
}
