export const unstable_settings = {
    skipLegacyRedirects: true,
};

import { Stack } from "expo-router";

export default function AuthLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
}
