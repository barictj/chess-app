// app/(tabs)/_layout.tsx
export const unstable_settings = {
    skipLegacyRedirects: true,
};

import { Tabs } from "expo-router";

export default function TabsLayout() {
    return (
        <Tabs>
            <Tabs.Screen name="index" options={{ title: "Home" }} />
            <Tabs.Screen name="chess" options={{ title: "Chess" }} />
        </Tabs>
    );
}
