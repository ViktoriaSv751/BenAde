import type { CapacitorConfig } from "@capacitor/cli";

/* The native apps are thin shells around the live web app: the same code the browser gets,
   with native notifications, splash screen and status bar. Change `server.url` when the
   production domain changes (e.g. a custom domain). */
const config: CapacitorConfig = {
  appId: "hu.benade.app",
  appName: "BenAde",
  webDir: "cap-www",
  server: {
    url: process.env.CAP_SERVER_URL || "https://benade.vercel.app",
    cleartext: false,
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#0B1530",
    preferredContentMode: "mobile",
  },
  android: {
    backgroundColor: "#0B1530",
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: true, backgroundColor: "#0B1530", androidScaleType: "CENTER_CROP", showSpinner: false },
    StatusBar: { style: "DARK", backgroundColor: "#0B1530", overlaysWebView: false },
    LocalNotifications: { smallIcon: "ic_stat_benade", iconColor: "#1E5EFF" },
  },
};

export default config;
