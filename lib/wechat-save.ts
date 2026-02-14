/**
 * WeChat in-app image preview helper.
 *
 * Notes:
 * - In WeChat H5, direct save-to-album is restricted.
 * - Best available UX is opening native image preview so user can long-press save.
 */

declare global {
  interface WxLike {
    previewImage?: (options: {
      current: string;
      urls: string[];
      success?: () => void;
      fail?: (res: { errMsg?: string; err_msg?: string }) => void;
      complete?: () => void;
    }) => void;
  }

  interface Window {
    wx?: WxLike;
    jWeixin?: WxLike;
    WeixinJSBridge?: {
      invoke: (
        method: string,
        params: Record<string, unknown>,
        callback?: (res: { err_msg?: string }) => void
      ) => void;
    };
  }
}

const WX_SDK_URLS = [
  "https://res.wx.qq.com/open/js/jweixin-1.6.0.js",
  "https://res2.wx.qq.com/open/js/jweixin-1.6.0.js",
] as const;

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (typeof window === "undefined") {
    return url;
  }

  return `${window.location.origin}${url.startsWith("/") ? "" : "/"}${url}`;
}

async function loadScriptWithTimeout(src: string, timeoutMs = 3000): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("window is undefined");
  }

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;

    const timeoutId = window.setTimeout(() => {
      script.remove();
      reject(new Error(`script load timeout: ${src}`));
    }, timeoutMs);

    script.onload = () => {
      window.clearTimeout(timeoutId);
      resolve();
    };

    script.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(new Error(`script load failed: ${src}`));
    };

    document.head.appendChild(script);
  });
}

async function ensureWxSdkLoaded(): Promise<WxLike | undefined> {
  if (typeof window === "undefined") {
    return undefined;
  }

  if (window.wx?.previewImage) {
    return window.wx;
  }

  for (const sdkUrl of WX_SDK_URLS) {
    try {
      await loadScriptWithTimeout(sdkUrl);
      const wx = window.wx ?? window.jWeixin;
      if (wx?.previewImage) {
        return wx;
      }
    } catch {
      // try next CDN
    }
  }

  return window.wx ?? window.jWeixin;
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

async function openByWxPreviewImage(absoluteUrl: string): Promise<void> {
  const wx = await ensureWxSdkLoaded();
  if (!wx?.previewImage) {
    throw new Error("wx.previewImage not available");
  }

  await new Promise<void>((resolve, reject) => {
    wx.previewImage?.({
      current: absoluteUrl,
      urls: [absoluteUrl],
      success: () => resolve(),
      fail: (res) => {
        reject(
          new Error(
            `wx.previewImage failed: ${res.errMsg ?? res.err_msg ?? "unknown"}`
          )
        );
      },
      complete: () => {
        // no-op
      },
    });
  });
}

async function openByWeixinBridge(absoluteUrl: string): Promise<void> {
  await waitForWeixinBridge();

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

export async function openWeChatImagePreview(imageUrl: string): Promise<void> {
  const absoluteUrl = toAbsoluteUrl(imageUrl);
  try {
    await openByWxPreviewImage(absoluteUrl);
  } catch {
    // Fallback path works in many WeChat webview cases without JS-SDK signature chain.
    await openByWeixinBridge(absoluteUrl);
  }
}
