module.exports = {
  expo: {
    name: 'mobile',
    slug: 'mobile',
    scheme: 'cashregister',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.anonymous.mobile',
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router'],
    extra: {
      apiBaseUrl: process.env.API_BASE_URL || null,
    },
  },
};
