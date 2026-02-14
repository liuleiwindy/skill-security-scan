/**
 * WeChat in-app image preview helper.
 *
 * Notes:
 * - In WeChat H5, direct save-to-album is restricted.
 * - Best available UX is opening native image preview so user can long-press save.
 */

declare global {
  interface Window {
    WeixinJSBridge?: {
      invoke: (
        method: string,
        params: Record<string, unknown>,
        callback?: (res: { err_msg?: string }) => void
      ) => void;
    };
  }
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (typeof window === "undefined") {
    return url;
  }

  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

function waitForWeixinBridge(timeoutMs = 3000): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window is undefined"));
  }

  if (window.WeixinJSBridge?.invoke) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("WeixinJSBridge not available"));
    }, timeoutMs);

    const onReady = () => {
      cleanup();
      resolve();
    };

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      document.removeEventListener("WeixinJSBridgeReady", onReady as EventListener);
    };

    document.addEventListener("WeixinJSBridgeReady", onReady as EventListener, {
      once: true,
    });
  });
}

export async function openWeChatImagePreview(imageUrl: string): Promise<void> {
  await waitForWeixinBridge();

  const absoluteUrl = toAbsoluteUrl(imageUrl);

  await new Promise<void>((resolve, reject) => {
    window.WeixinJSBridge?.invoke(
      "imagePreview",
      {
        current: absoluteUrl,
        urls: [absoluteUrl],
      },
      (res) => {
        const msg = res?.err_msg ?? "";
        if (msg.includes(":ok") || msg === "") {
          resolve();
          return;
        }
        reject(new Error(`WeixinJSBridge imagePreview failed: ${msg}`));
      }
    );
  });
}

