import { Platform } from "react-native";
import {
  AdEventType,
  InterstitialAd,
} from "react-native-google-mobile-ads";

const IOS_INTERSTITIAL_ID = "ca-app-pub-7166427778546018/4217213345";
const ANDROID_INTERSTITIAL_ID = "ca-app-pub-7166427778546018/7928034709";
const UNIT_ID = Platform.OS === "ios" ? IOS_INTERSTITIAL_ID : ANDROID_INTERSTITIAL_ID;

const MIN_INTERVAL_MS = 45_000;

let ad = InterstitialAd.createForAdRequest(UNIT_ID);
let loaded = false;
let loading = false;
let lastShownAt = 0;

ad.addAdEventListener(AdEventType.LOADED, () => {
  loaded = true;
  loading = false;
});

ad.addAdEventListener(AdEventType.ERROR, () => {
  loaded = false;
  loading = false;
});

export function preloadInterstitial(isPaidSubscriber?: boolean) {
  if (Platform.OS === "web") return;
  if (isPaidSubscriber) return;
  if (loaded || loading) return;
  loading = true;
  ad.load();
}

export async function maybeShowInterstitial(isPaidSubscriber?: boolean) {
  if (Platform.OS === "web") return false;
  if (isPaidSubscriber) return false;

  const now = Date.now();
  if (now - lastShownAt < MIN_INTERVAL_MS) {
    preloadInterstitial(isPaidSubscriber);
    return false;
  }

  if (!loaded) {
    preloadInterstitial(isPaidSubscriber);
    return false;
  }

  return new Promise<boolean>((resolve) => {
    let closed = false;

    const closeSub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      if (closed) return;
      closed = true;
      closeSub();
      errSub();
      loaded = false;
      loading = false;
      lastShownAt = Date.now();
      ad = InterstitialAd.createForAdRequest(UNIT_ID);
      ad.addAdEventListener(AdEventType.LOADED, () => {
        loaded = true;
        loading = false;
      });
      ad.addAdEventListener(AdEventType.ERROR, () => {
        loaded = false;
        loading = false;
      });
      preloadInterstitial(false);
      resolve(true);
    });

    const errSub = ad.addAdEventListener(AdEventType.ERROR, () => {
      if (closed) return;
      closed = true;
      closeSub();
      errSub();
      loaded = false;
      loading = false;
      preloadInterstitial(false);
      resolve(false);
    });

    ad.show().catch(() => {
      if (closed) return;
      closed = true;
      closeSub();
      errSub();
      loaded = false;
      loading = false;
      preloadInterstitial(false);
      resolve(false);
    });
  });
}
